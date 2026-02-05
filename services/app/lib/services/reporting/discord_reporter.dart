import 'package:dio/dio.dart';
import 'package:nyxx/nyxx.dart';
import 'package:logger/logger.dart' as logger_pkg;
import '../../core/models/detection_report.dart';
import '../../core/config/config_service.dart';
import '../auth/auth_service.dart';

/// Service for reporting detections to Discord
class DiscordReporter {
  final logger_pkg.Logger _logger = logger_pkg.Logger();
  final ConfigService _configService = ConfigService();
  final AuthService _authService = AuthService();
  final Dio _dio = Dio();
  NyxxGateway? _client;
  bool _isInitialized = false;
  bool _isInitializing = false;

  Future<void> _reportDetectionToBackend(DetectionReport report) async {
    try {
      final config = await _configService.loadConfig();
      final userId = await _authService.getUserId();
      final accessToken = await _authService.getAccessToken();

      final payload = <String, dynamic>{
        'userId': userId,
        'detection': report.toJson(),
      };

      final headers = <String, dynamic>{'Content-Type': 'application/json'};
      if (accessToken != null && accessToken.isNotEmpty) {
        headers['Authorization'] = 'Bearer $accessToken';
      }

      final response = await _dio.post(
        '${config.apiBaseUrl}/anticheat/detections',
        data: payload,
        options: Options(headers: headers, sendTimeout: const Duration(seconds: 8)),
      );

      if (response.statusCode != null &&
          response.statusCode! >= 200 &&
          response.statusCode! < 300) {
        _logger.i('Detection reported to backend successfully');
      } else {
        _logger.w(
          'Backend detection report failed: ${response.statusCode} ${response.data}',
        );
      }
    } catch (e, stackTrace) {
      _logger.e('Error reporting detection to backend: $e');
      _logger.e('Stack trace: $stackTrace');
    }
  }

  /// Initialize Discord bot connection
  Future<void> initialize() async {
    if (_isInitialized || _isInitializing) {
      return;
    }

    _isInitializing = true;

    try {
      final config = await _configService.loadConfig();
      final token = config.discordToken;

      if (token == null || token.isEmpty) {
        _logger.w(
          'Discord token not configured - bot reporting disabled (backend reporting may still work)',
        );
        _isInitializing = false;
        return;
      }

      _client = await Nyxx.connectGateway(
        token,
        GatewayIntents.allUnprivileged,
      );

      // Wait a bit for connection to stabilize
      await Future.delayed(const Duration(seconds: 1));

      _isInitialized = true;
      _isInitializing = false;
      _logger.i('Discord bot connected successfully');
    } catch (e, stackTrace) {
      _logger.e('Error initializing Discord bot: $e');
      _logger.e('Stack trace: $stackTrace');
      _isInitialized = false;
      _isInitializing = false;
      _client = null;
      // Don't rethrow - allow app to continue without Discord
    }
  }

  /// Report a detection to Discord
  Future<void> reportDetection(DetectionReport report) async {
    try {
      // Check if we need to initialize or reinitialize
      if (!_isInitialized && !_isInitializing) {
        await initialize();
      }

      // Wait a bit if still initializing
      int attempts = 0;
      while (_isInitializing && attempts < 10) {
        await Future.delayed(const Duration(milliseconds: 500));
        attempts++;
      }

      if (_client == null || !_isInitialized) {
        _logger.w('Discord bot not available, falling back to backend report');
        await _reportDetectionToBackend(report);
        return;
      }

      final config = await _configService.loadConfig();
      final channelId = config.discordChannelId;

      if (channelId == null || channelId.isEmpty) {
        _logger.w('Discord channel ID not configured');
        return;
      }

      final channel = await _client!.channels.get(Snowflake.parse(channelId));

      if (channel is! TextChannel) {
        _logger.w('Channel is not a text channel');
        return;
      }

      // Get user ID for mention
      final userId = await _authService.getUserId();
      final mention = userId != null ? '<@$userId>' : 'Unknown User';

      // Build evidence fields
      final evidenceFields = <EmbedFieldBuilder>[];
      report.evidence.forEach((key, value) {
        evidenceFields.add(
          EmbedFieldBuilder(name: key, value: value.toString(), isInline: true),
        );
      });

      // Create embed with fields
      final embed = EmbedBuilder(
        title: '🚨 Cheat Detected',
        description: '$mention attempted to use a cheat: ${report.type.name}',
        color: DiscordColor(0xFF0000),
        fields: [
          EmbedFieldBuilder(name: 'User', value: mention, isInline: true),
          EmbedFieldBuilder(
            name: 'Cheat Type',
            value: report.type.name,
            isInline: true,
          ),
          EmbedFieldBuilder(
            name: 'Process',
            value: report.processName ?? 'Unknown',
            isInline: true,
          ),
          EmbedFieldBuilder(
            name: 'Timestamp',
            value: report.timestamp.toIso8601String(),
            isInline: false,
          ),
          ...evidenceFields,
        ],
      );

      await channel.sendMessage(MessageBuilder(embeds: [embed]));
      _logger.i('Detection reported to Discord');
    } catch (e, stackTrace) {
      _logger.e('Error reporting to Discord: $e');
      _logger.e('Stack trace: $stackTrace');

      // If connection is lost, mark as uninitialized for retry
      if (e.toString().contains('disconnected') ||
          e.toString().contains('Shard') ||
          e.toString().contains('Gateway')) {
        _isInitialized = false;
        _client = null;
        _logger.w('Discord connection lost, will retry on next report');
      }

      // Also attempt backend reporting as a fallback in non-release builds.
      await _reportDetectionToBackend(report);
    }
  }

  /// Close Discord connection
  Future<void> close() async {
    try {
      await _client?.close();
      _isInitialized = false;
      _logger.i('Discord bot disconnected');
    } catch (e) {
      _logger.e('Error closing Discord connection: $e');
    }
  }
}
