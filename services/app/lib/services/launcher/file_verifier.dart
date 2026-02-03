import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:path_provider/path_provider.dart';
import 'package:logger/logger.dart';

/// Service for verifying Plutonium file integrity
class FileVerifier {
  final Logger _logger = Logger();

  /// Generate baseline hashes for Plutonium files
  Future<Map<String, String>> generateBaseline(String plutoniumPath) async {
    final baseline = <String, String>{};

    try {
      // Hash DLLs in the main directory
      final dir = Directory(plutoniumPath);
      if (await dir.exists()) {
        await for (final entity in dir.list(recursive: false)) {
          if (entity is File && entity.path.endsWith('.dll')) {
            final hash = await _hashFile(entity);
            baseline[entity.path] = hash;
          }
        }
      }

      // Hash GSC scripts
      final storagePath = _getPlutoniumStoragePath();
      if (storagePath != null) {
        final scriptsDir = Directory('$storagePath/raw/scripts/mp');
        if (await scriptsDir.exists()) {
          await for (final entity in scriptsDir.list(recursive: true)) {
            if (entity is File && entity.path.endsWith('.gsc')) {
              final hash = await _hashFile(entity);
              baseline[entity.path] = hash;
            }
          }
        }
      }

      // Save baseline
      await _saveBaseline(baseline);
      _logger.i('Generated baseline with ${baseline.length} files');

      return baseline;
    } catch (e) {
      _logger.e('Error generating baseline: $e');
      rethrow;
    }
  }

  /// Verify files against baseline
  Future<List<String>> verifyFiles(String plutoniumPath) async {
    final violations = <String>[];

    try {
      final baseline = await _loadBaseline();
      if (baseline.isEmpty) {
        _logger.w('No baseline found, generating new baseline');
        await generateBaseline(plutoniumPath);
        return violations;
      }

      // Check DLLs
      final dir = Directory(plutoniumPath);
      if (await dir.exists()) {
        await for (final entity in dir.list(recursive: false)) {
          if (entity is File && entity.path.endsWith('.dll')) {
            final expectedHash = baseline[entity.path];
            if (expectedHash != null) {
              final currentHash = await _hashFile(entity);
              if (currentHash != expectedHash) {
                violations.add('Modified DLL: ${entity.path}');
              }
            }
          }
        }
      }

      // Check for extra GSC files (host menus)
      final storagePath = _getPlutoniumStoragePath();
      if (storagePath != null) {
        final scriptsDir = Directory('$storagePath/raw/scripts/mp');
        if (await scriptsDir.exists()) {
          await for (final entity in scriptsDir.list(recursive: true)) {
            if (entity is File && entity.path.endsWith('.gsc')) {
              final fileName = entity.path.split(Platform.pathSeparator).last;
              // Only 'ranked.gsc' should exist
              if (fileName != 'ranked.gsc') {
                violations.add('Suspicious GSC file: ${entity.path}');
              }
            }
          }
        }
      }

      if (violations.isNotEmpty) {
        _logger.w('File verification found ${violations.length} violations');
      }

      return violations;
    } catch (e) {
      _logger.e('Error verifying files: $e');
      rethrow;
    }
  }

  /// Hash a file using SHA-256
  Future<String> _hashFile(File file) async {
    final bytes = await file.readAsBytes();
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Get Plutonium storage path
  String? _getPlutoniumStoragePath() {
    final userProfile = Platform.environment['USERPROFILE'];
    if (userProfile == null) return null;
    return '$userProfile\\AppData\\Local\\Plutonium\\storage\\t6';
  }

  /// Save baseline to file
  Future<void> _saveBaseline(Map<String, String> baseline) async {
    final configDir = await getApplicationSupportDirectory();
    final baselineFile = File('${configDir.path}/baseline.json');
    await baselineFile.writeAsString(jsonEncode(baseline));
  }

  /// Load baseline from file
  Future<Map<String, String>> _loadBaseline() async {
    try {
      final configDir = await getApplicationSupportDirectory();
      final baselineFile = File('${configDir.path}/baseline.json');
      if (await baselineFile.exists()) {
        final content = await baselineFile.readAsString();
        final json = jsonDecode(content) as Map<String, dynamic>;
        return Map<String, String>.from(json);
      }
    } catch (e) {
      _logger.e('Error loading baseline: $e');
    }
    return {};
  }
}
