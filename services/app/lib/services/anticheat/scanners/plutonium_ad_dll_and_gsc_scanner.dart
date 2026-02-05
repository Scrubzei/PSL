import 'dart:io';
import 'package:logger/logger.dart';
import '../../../core/config/plutonium_appdata_gsc_and_dll_paths.dart';
import '../../../core/models/detection_report.dart';

/// Scanner for detecting suspicious Plutonium mod files.
///
/// Recursively scans `%LOCALAPPDATA%\Plutonium` for `.gsc` and `.dll` files.
/// Any such file whose full path is NOT present in
/// `PLUTONIUM_APPDATA_GSC_AND_DLL_PATHS` is flagged and reported.
class PlutoniumAdDllAndGscScanner {
  final Logger _logger = Logger();

  /// Scan `%LOCALAPPDATA%\Plutonium` for unapproved `.gsc`/`.dll` files.
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      if (!Platform.isWindows) {
        return detections;
      }

      final plutoniumRoot = _getPlutoniumRootPath();
      if (plutoniumRoot == null) {
        _logger.w('Could not determine %LOCALAPPDATA%\\Plutonium path');
        return detections;
      }

      final rootDir = Directory(plutoniumRoot);
      if (!await rootDir.exists()) {
        return detections;
      }

      final allowed = _buildAllowedPathSet(plutoniumRoot);

      var filesChecked = 0;
      await for (final entity in rootDir.list(
        recursive: true,
        followLinks: false,
      )) {
        if (entity is! File) continue;

        final rawPath = entity.path;
        final lowerPath = rawPath.toLowerCase();
        final isGsc = lowerPath.endsWith('.gsc');
        final isDll = lowerPath.endsWith('.dll');
        if (!isGsc && !isDll) continue;

        final normalized = _normalizeWindowsPath(rawPath);
        if (!allowed.contains(normalized)) {
          final fileName = rawPath.split(Platform.pathSeparator).last;
          final ext = isGsc ? 'gsc' : 'dll';

          _logger.w('Found suspicious .$ext file: $rawPath');

          int? size;
          DateTime? lastModified;
          try {
            final stat = await entity.stat();
            size = stat.size;
            lastModified = stat.modified;
          } catch (_) {
            // Ignore stat failures; path alone is enough evidence.
          }

          detections.add(
            DetectionReport(
              type: CheatType.suspiciousAppdataDllOrGsc,
              evidence: {
                'filePath': rawPath,
                'fileName': fileName,
                'extension': ext,
                'fileSize': size,
                'lastModified': lastModified?.toIso8601String(),
                'plutoniumRoot': plutoniumRoot,
                'reason': 'File not in approved Plutonium GSC/DLL allowlist',
              },
              processName: 'Plutonium',
            ),
          );
        }

        filesChecked++;
        if (filesChecked % 200 == 0) {
          // Yield periodically to keep the isolate responsive.
          await Future.delayed(const Duration(milliseconds: 5));
        }
      }
    } catch (e) {
      _logger.e('Error scanning Plutonium mod files: $e');
    }

    return detections;
  }

  /// Get `%LOCALAPPDATA%\Plutonium` root path.
  String? _getPlutoniumRootPath() {
    final localAppData = Platform.environment['LOCALAPPDATA'];
    if (localAppData == null || localAppData.isEmpty) return null;
    return '$localAppData\\Plutonium';
  }

  /// Normalize paths for reliable comparisons on Windows.
  ///
  /// - Lower-cases (Windows paths are case-insensitive)
  /// - Uses backslashes
  /// - Removes redundant trailing slashes
  String _normalizeWindowsPath(String path) {
    var p = path.replaceAll('/', '\\').trim();
    while (p.endsWith('\\')) {
      p = p.substring(0, p.length - 1);
    }
    return p.toLowerCase();
  }

  /// Build a normalized allowlist set for quick membership checks.
  ///
  /// Also adds a "portable" allowlist entry variant that is re-rooted under the
  /// current machine's `%LOCALAPPDATA%\Plutonium`, so the allowlist can remain
  /// stable even if it was generated on a different username/machine.
  Set<String> _buildAllowedPathSet(String plutoniumRoot) {
    final normalizedRoot = _normalizeWindowsPath(plutoniumRoot);
    final allowed = <String>{};

    for (final raw in PLUTONIUM_APPDATA_GSC_AND_DLL_PATHS) {
      allowed.add(_normalizeWindowsPath(raw));

      final rawLower = raw.toLowerCase().replaceAll('/', '\\');
      final marker = '\\plutonium\\';
      final idx = rawLower.indexOf(marker);
      if (idx != -1) {
        final after = raw.substring(idx + marker.length);
        final portable = '$normalizedRoot\\$after';
        allowed.add(_normalizeWindowsPath(portable));
      }
    }

    return allowed;
  }
}
