import 'package:dotenv/dotenv.dart';

/// Application configuration model
class AppConfig {
  final String? plutoniumPath;
  final String apiBaseUrl;
  final String? discordToken;
  final String? discordChannelId;
  final String? discordClientId;
  final String? discordGuildId;
  final String? discordInviteLink;
  final bool antiCheatEnabled;
  final int scanIntervalSeconds;

  AppConfig({
    this.plutoniumPath,
    required this.apiBaseUrl,
    this.discordToken,
    this.discordChannelId,
    this.discordClientId,
    this.discordGuildId,
    this.discordInviteLink,
    this.antiCheatEnabled = true,
    this.scanIntervalSeconds = 15, // Default 15 seconds to reduce CPU usage
  });

  Map<String, dynamic> toJson() => {
    'plutoniumPath': plutoniumPath,
    'apiBaseUrl': apiBaseUrl,
    'discordToken': discordToken, // Will be stored separately in secure storage
    'discordChannelId': discordChannelId,
    'discordClientId': discordClientId,
    'discordGuildId': discordGuildId,
    'discordInviteLink': discordInviteLink,
    'antiCheatEnabled': antiCheatEnabled,
    'scanIntervalSeconds': scanIntervalSeconds,
  };

  factory AppConfig.fromJson(Map<String, dynamic> json) => AppConfig(
    plutoniumPath: json['plutoniumPath'] as String?,
    apiBaseUrl: json['apiBaseUrl'] as String? ?? '',
    discordToken: json['discordToken'] as String?,
    discordChannelId: json['discordChannelId'] as String?,
    discordClientId: json['discordClientId'] as String?,
    discordGuildId: json['discordGuildId'] as String?,
    discordInviteLink: json['discordInviteLink'] as String?,
    antiCheatEnabled: json['antiCheatEnabled'] as bool? ?? true,
    scanIntervalSeconds: json['scanIntervalSeconds'] as int? ?? 15,
  );

  /// Create AppConfig from JSON with environment variables taking precedence
  /// Environment variables override JSON values for: API, Discord, and Anti-Cheat settings
  factory AppConfig.fromJsonWithEnv(Map<String, dynamic> json, DotEnv env) {
    // Helper to get env var with fallback to JSON
    String? getEnvOrJson(String envKey, String jsonKey) {
      final envValue = env[envKey];
      if (envValue != null && envValue.isNotEmpty) {
        return envValue;
      }
      return json[jsonKey] as String?;
    }

    // Helper to get bool from env or JSON
    bool getBoolEnvOrJson(String envKey, String jsonKey, bool defaultValue) {
      final envValue = env[envKey];
      if (envValue != null && envValue.isNotEmpty) {
        return envValue.toLowerCase() == 'true';
      }
      return json[jsonKey] as bool? ?? defaultValue;
    }

    // Helper to get int from env or JSON
    int getIntEnvOrJson(String envKey, String jsonKey, int defaultValue) {
      final envValue = env[envKey];
      if (envValue != null && envValue.isNotEmpty) {
        return int.tryParse(envValue) ?? defaultValue;
      }
      return json[jsonKey] as int? ?? defaultValue;
    }

    return AppConfig(
      plutoniumPath: json['plutoniumPath'] as String?, // Only from JSON
      apiBaseUrl:
          getEnvOrJson('API_BASE_URL', 'apiBaseUrl') ?? 'https://api.1v1lb.com',
      discordToken: getEnvOrJson('DISCORD_TOKEN', 'discordToken'),
      discordChannelId: getEnvOrJson('DISCORD_CHANNEL_ID', 'discordChannelId'),
      discordClientId: getEnvOrJson('DISCORD_CLIENT_ID', 'discordClientId'),
      discordGuildId: getEnvOrJson('DISCORD_GUILD_ID', 'discordGuildId'),
      discordInviteLink: getEnvOrJson(
        'DISCORD_INVITE_LINK',
        'discordInviteLink',
      ),
      antiCheatEnabled: getBoolEnvOrJson(
        'ANTI_CHEAT_ENABLED',
        'antiCheatEnabled',
        true,
      ),
      scanIntervalSeconds: getIntEnvOrJson(
        'SCAN_INTERVAL_SECONDS',
        'scanIntervalSeconds',
        15,
      ),
    );
  }

  AppConfig copyWith({
    String? plutoniumPath,
    String? apiBaseUrl,
    String? discordToken,
    String? discordChannelId,
    String? discordClientId,
    String? discordGuildId,
    String? discordInviteLink,
    bool? antiCheatEnabled,
    int? scanIntervalSeconds,
  }) => AppConfig(
    plutoniumPath: plutoniumPath ?? this.plutoniumPath,
    apiBaseUrl: apiBaseUrl ?? this.apiBaseUrl,
    discordToken: discordToken ?? this.discordToken,
    discordChannelId: discordChannelId ?? this.discordChannelId,
    discordClientId: discordClientId ?? this.discordClientId,
    discordGuildId: discordGuildId ?? this.discordGuildId,
    discordInviteLink: discordInviteLink ?? this.discordInviteLink,
    antiCheatEnabled: antiCheatEnabled ?? this.antiCheatEnabled,
    scanIntervalSeconds: scanIntervalSeconds ?? this.scanIntervalSeconds,
  );
}
