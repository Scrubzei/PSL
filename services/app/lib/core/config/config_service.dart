import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'app_config.dart';
import 'package:logger/logger.dart';

/// Service for managing application configuration
class ConfigService {
  static const String _configFileName = 'config.json';

  final Logger _logger = Logger();

  AppConfig? _cachedConfig;

  /// Load configuration from disk and environment variables
  Future<AppConfig> loadConfig() async {
    if (_cachedConfig != null) {
      return _cachedConfig!;
    }

    try {
      final configDir = await _getConfigDirectory();
      final configFile = File('${configDir.path}/$_configFileName');

      // Load from JSON if it exists, otherwise use defaults
      Map<String, dynamic> json = {};
      if (await configFile.exists()) {
        final jsonString = await configFile.readAsString();
        json = jsonDecode(jsonString) as Map<String, dynamic>;
      }

      // Create config with LocalConfig (compiled) taking precedence
      final config = AppConfig.fromJsonWithLocalConfig(json);
      _cachedConfig = config;

      _logger.i('Configuration loaded successfully');
      return _cachedConfig!;
    } catch (e) {
      _logger.e('Error loading config: $e');
      return _createDefaultConfig();
    }
  }

  /// Save configuration to disk
  /// Note: API, Discord, and Anti-Cheat settings are compiled via LocalConfig
  /// Only plutoniumPath is saved to config.json
  Future<void> saveConfig(AppConfig config) async {
    try {
      final configDir = await _getConfigDirectory();
      final configFile = File('${configDir.path}/$_configFileName');

      // Only save plutoniumPath to JSON (other settings come from .env)
      final jsonToSave = {'plutoniumPath': config.plutoniumPath};
      await configFile.writeAsString(jsonEncode(jsonToSave));

      // Update cache with new plutonium path but keep env-based values
      _cachedConfig = config;

      _logger.i('Configuration saved successfully');
    } catch (e) {
      _logger.e('Error saving config: $e');
      rethrow;
    }
  }

  /// Get configuration directory
  Future<Directory> _getConfigDirectory() async {
    final appDir = await getApplicationSupportDirectory();
    final configDir = Directory('${appDir.path}/config');
    if (!await configDir.exists()) {
      await configDir.create(recursive: true);
    }
    return configDir;
  }

  /// Create default configuration
  /// Uses LocalConfig values if available, otherwise uses defaults
  AppConfig _createDefaultConfig() {
    // Use empty JSON map so LocalConfig values take precedence
    return AppConfig.fromJsonWithLocalConfig({});
  }

  /// Clear cached configuration
  void clearCache() {
    _cachedConfig = null;
  }
}
