import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import '../../core/config/config_service.dart';
import '../../core/models/match.dart';

/// Service for managing matchmaking queue
class QueueService {
  final Logger _logger = Logger();
  final ConfigService _configService = ConfigService();
  late Dio _dio;
  bool _initialized = false;

  /// Initialize the queue service
  Future<void> _ensureInitialized() async {
    if (_initialized) return;

    try {
      final config = await _configService.loadConfig();
      _dio = Dio(
        BaseOptions(
          baseUrl: config.apiBaseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );
      _initialized = true;
    } catch (e) {
      _logger.e('Error initializing queue service: $e');
      rethrow;
    }
  }

  /// Join the matchmaking queue
  Future<void> joinQueue(String playerId) async {
    await _ensureInitialized();

    try {
      final response = await _dio.post(
        '/queue/join',
        data: {'playerId': playerId},
      );

      if (response.statusCode == 200) {
        _logger.i('Successfully joined queue');
      } else {
        throw Exception('Failed to join queue: ${response.statusCode}');
      }
    } catch (e) {
      _logger.e('Error joining queue: $e');
      rethrow;
    }
  }

  /// Leave the matchmaking queue
  Future<void> leaveQueue() async {
    await _ensureInitialized();

    try {
      final response = await _dio.post('/queue/leave');

      if (response.statusCode == 200) {
        _logger.i('Successfully left queue');
      } else {
        throw Exception('Failed to leave queue: ${response.statusCode}');
      }
    } catch (e) {
      _logger.e('Error leaving queue: $e');
      rethrow;
    }
  }

  /// Check queue status
  Future<Map<String, dynamic>> checkQueueStatus() async {
    await _ensureInitialized();

    try {
      final response = await _dio.get('/queue/status');

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception('Failed to check queue status: ${response.statusCode}');
      }
    } catch (e) {
      _logger.e('Error checking queue status: $e');
      rethrow;
    }
  }

  /// Report match score
  Future<void> reportScore(Match match) async {
    await _ensureInitialized();

    try {
      final response = await _dio.post('/match/score', data: match.toJson());

      if (response.statusCode == 200) {
        _logger.i('Score reported successfully');
      } else {
        throw Exception('Failed to report score: ${response.statusCode}');
      }
    } catch (e) {
      _logger.e('Error reporting score: $e');
      rethrow;
    }
  }
}
