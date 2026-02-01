import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:dotenv/dotenv.dart';
import 'app_config.dart';
import 'package:logger/logger.dart';

/// Service for managing application configuration
class ConfigService {
  static const String _configFileName = 'config.json';
  static const String _envFileName = '.env';

  final Logger _logger = Logger();
  final DotEnv _dotEnv = DotEnv();

  AppConfig? _cachedConfig;
  bool _envLoaded = false;

  /// Load environment variables from .env file
  Future<void> _loadEnvFile() async {
    if (_envLoaded) {
      return;
    }

    try {
      // Try multiple locations for .env file
      final locations = <String>[];

      // 1. Current working directory (most common for development)
      final cwd = Directory.current;
      // Check .env.local first (common for local development)
      locations.add('${cwd.path}/.env.local');
      locations.add('${cwd.path}/$_envFileName');

      // 2. Application support directory (for packaged apps)
      try {
        final appDir = await getApplicationSupportDirectory();
        locations.add('${appDir.path}/.env.local');
        locations.add('${appDir.path}/$_envFileName');
      } catch (e) {
        // Ignore if not available
      }

      // 3. Executable directory (where the app is running from)
      try {
        final executablePath = Platform.resolvedExecutable;
        final executableDir = File(executablePath).parent;
        locations.add('${executableDir.path}/.env.local');
        locations.add('${executableDir.path}/$_envFileName');
      } catch (e) {
        // Ignore if not available
      }

      // Try each location until we find the .env file
      bool loaded = false;
      for (final location in locations) {
        final envFile = File(location);
        if (await envFile.exists()) {
          _dotEnv.load([envFile.path]);
          _logger.i('Environment file loaded from: $location');
          loaded = true;
          break;
        }
      }

      if (!loaded) {
        _logger.w(
          'No .env or .env.local file found in any of the checked locations. Using defaults and config.json values.',
        );
        _logger.d('Checked locations: ${locations.join(", ")}');
      }
      _envLoaded = true;
    } catch (e) {
      _logger.w('Error loading .env file: $e. Using defaults.');
      _envLoaded = true; // Mark as loaded to prevent retries
    }
  }

  /// Load configuration from disk and environment variables
  Future<AppConfig> loadConfig() async {
    if (_cachedConfig != null) {
      return _cachedConfig!;
    }

    // Load environment variables first
    await _loadEnvFile();

    try {
      final configDir = await _getConfigDirectory();
      final configFile = File('${configDir.path}/$_configFileName');

      // Load from JSON if it exists, otherwise use defaults
      Map<String, dynamic> json = {};
      if (await configFile.exists()) {
        final jsonString = await configFile.readAsString();
        json = jsonDecode(jsonString) as Map<String, dynamic>;
      }

      // Create config with environment variables taking precedence
      final config = AppConfig.fromJsonWithEnv(json, _dotEnv);
      _cachedConfig = config;

      _logger.i('Configuration loaded successfully');
      return _cachedConfig!;
    } catch (e) {
      _logger.e('Error loading config: $e');
      return _createDefaultConfig();
    }
  }

  /// Save configuration to disk
  /// Note: API, Discord, and Anti-Cheat settings are now loaded from .env file
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
  /// Uses environment variables if available, otherwise uses defaults
  AppConfig _createDefaultConfig() {
    // Use empty JSON map so env vars take precedence
    return AppConfig.fromJsonWithEnv({}, _dotEnv);
  }

  /// Clear cached configuration
  void clearCache() {
    _cachedConfig = null;
  }
}
