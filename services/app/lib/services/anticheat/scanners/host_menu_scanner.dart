import 'dart:io';
import 'package:logger/logger.dart';
import '../../../core/models/detection_report.dart';

/// Scanner for detecting host menu cheats (GSC files)
class HostMenuScanner {
  final Logger _logger = Logger();
  DateTime? _lastHiddenScan;

  static const int _maxFilesPerScan = 200;
  static const Duration _hiddenScanInterval = Duration(minutes: 10);

  /// Scan for host menu cheats
  /// Returns list of detection reports if any are found
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      final scanStart = DateTime.now();
      final storagePath = _getPlutoniumStoragePath();
      if (storagePath == null) {
        _logger.w('Could not determine Plutonium storage path');
        return detections;
      }

      final scriptsDir = Directory('$storagePath/raw/scripts/mp');
      if (!await scriptsDir.exists()) {
        return detections;
      }

      var filesChecked = 0;
      await for (final entity in scriptsDir.list(
        recursive: true,
        followLinks: false,
      )) {
        if (entity is File && entity.path.endsWith('.gsc')) {
          final fileName = entity.path.split(Platform.pathSeparator).last;

          // Only 'ranked.gsc' should exist in ranked matches
          if (fileName != 'ranked.gsc') {
            _logger.w('Found suspicious GSC file: ${entity.path}');

            detections.add(
              DetectionReport(
                type: CheatType.hostMenu,
                evidence: {
                  'filePath': entity.path,
                  'fileName': fileName,
                  'fileSize': await entity.length(),
                },
                processName: 'Plutonium',
              ),
            );
          }
        }

        filesChecked++;
        if (filesChecked % 25 == 0) {
          await Future.delayed(const Duration(milliseconds: 2));
        }

        if (filesChecked >= _maxFilesPerScan) {
          break;
        }
      }

      final shouldScanHidden =
          _lastHiddenScan == null ||
          scanStart.difference(_lastHiddenScan!) >= _hiddenScanInterval;
      if (shouldScanHidden) {
        _lastHiddenScan = scanStart;
        // Also check for hidden files using Dart's file system
        await _scanHiddenFiles(scriptsDir, detections);
      }
    } catch (e) {
      _logger.e('Error scanning for host menus: $e');
    }

    return detections;
  }

  /// Scan for hidden files
  /// On Windows, hidden files have the hidden attribute set
  Future<void> _scanHiddenFiles(
    Directory dir,
    List<DetectionReport> detections,
  ) async {
    try {
      // Use Process to run attrib command to find hidden files
      final result = await Process.run('cmd', [
        '/c',
        'attrib',
        '*.gsc',
        '/s',
      ], workingDirectory: dir.path);

      if (result.exitCode == 0) {
        final output = result.stdout.toString();
        final lines = output.split('\n');

        for (final line in lines) {
          if (line.contains('H') && line.contains('.gsc')) {
            // Line format: "  H      path\to\file.gsc"
            final parts = line.trim().split(RegExp(r'\s+'));
            if (parts.length >= 2) {
              final filePath = parts.last;
              final fileName = filePath.split(Platform.pathSeparator).last;

              if (fileName != 'ranked.gsc' && fileName.endsWith('.gsc')) {
                _logger.w('Found hidden GSC file: $filePath');

                detections.add(
                  DetectionReport(
                    type: CheatType.hostMenu,
                    evidence: {
                      'filePath': filePath,
                      'fileName': fileName,
                      'hidden': true,
                    },
                    processName: 'Plutonium',
                  ),
                );
              }
            }
          }
        }
      }
    } catch (e) {
      _logger.e('Error scanning hidden files: $e');
    }
  }

  /// Get Plutonium storage path
  String? _getPlutoniumStoragePath() {
    final userProfile = Platform.environment['USERPROFILE'];
    if (userProfile == null) return null;
    return '$userProfile\\AppData\\Local\\Plutonium\\storage\\t6';
  }
}
