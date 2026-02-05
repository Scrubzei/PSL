import 'local_config.dart';

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

  /// Create `AppConfig` where values from `LocalConfig` take precedence.
  ///
  /// This replaces runtime `.env` loading so values are compiled into the app.
  factory AppConfig.fromJsonWithLocalConfig(Map<String, dynamic> json) {
    String? nonEmpty(String? value) =>
        (value != null && value.trim().isNotEmpty) ? value.trim() : null;

    bool boolOrDefault(bool value, bool defaultValue) => value;

    int intOrDefault(int value, int defaultValue) => value;

    return AppConfig(
      plutoniumPath: json['plutoniumPath'] as String?, // Only from JSON
      apiBaseUrl: nonEmpty(LocalConfig.apiBaseUrl) ??
          (json['apiBaseUrl'] as String? ?? 'https://api.1v1lb.com'),
      discordToken: nonEmpty(LocalConfig.discordToken) ?? json['discordToken'] as String?,
      discordChannelId: nonEmpty(LocalConfig.discordChannelId) ??
          json['discordChannelId'] as String?,
      discordClientId: nonEmpty(LocalConfig.discordClientId) ??
          json['discordClientId'] as String?,
      discordGuildId: nonEmpty(LocalConfig.discordGuildId) ??
          json['discordGuildId'] as String?,
      discordInviteLink: nonEmpty(LocalConfig.discordInviteLink) ??
          json['discordInviteLink'] as String?,
      antiCheatEnabled: boolOrDefault(
        LocalConfig.antiCheatEnabled,
        json['antiCheatEnabled'] as bool? ?? true,
      ),
      scanIntervalSeconds: intOrDefault(
        LocalConfig.scanIntervalSeconds,
        json['scanIntervalSeconds'] as int? ?? 15,
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
