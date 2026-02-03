import 'dart:io';
import 'package:logger/logger.dart';
import 'package:path_provider/path_provider.dart';
import '../../../core/models/detection_report.dart';
import '../native/anticheat_ffi.dart';
import '../../launcher/plutonium_launcher.dart';

/// Scanner for detecting unsigned modules
/// Checks module signatures and copies unsigned modules for analysis
class ModuleSignatureScanner {
  final Logger _logger = Logger();
  final AntiCheatFFI _ffi = AntiCheatFFI();
  final PlutoniumLauncher _launcher = PlutoniumLauncher();

  // Track checked modules to avoid repeated checks
  final Set<String> _checkedModules = {};

  /// Scan for unsigned modules
  /// Returns list of detection reports if any are found
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      if (!_launcher.isRunning()) {
        return detections;
      }

      final processId = _launcher.processId;
      if (processId == null) {
        return detections;
      }

      // Enumerate modules
      final modules = _ffi.enumerateModules(processId);

      for (final module in modules) {
        // Skip if already checked
        if (_checkedModules.contains(module.fullPath.toLowerCase())) {
          continue;
        }

        // Skip system modules (they're typically signed)
        final lowerPath = module.fullPath.toLowerCase();
        if (lowerPath.contains('\\windows\\') ||
            lowerPath.contains('\\system32\\') ||
            lowerPath.contains('\\syswow64\\')) {
          _checkedModules.add(lowerPath);
          continue;
        }

        // Check if module file exists
        final moduleFile = File(module.fullPath);
        if (!moduleFile.existsSync()) {
          _checkedModules.add(lowerPath);
          continue;
        }

        // Validate module signature
        final isSigned = _ffi.validateModuleSignature(module.fullPath);

        if (!isSigned) {
          _logger.w('Detected unsigned module: ${module.baseName}');

          // Copy unsigned module for analysis
          final copiedPath = await _copyUnsignedModule(
            module.fullPath,
            module.baseName,
          );

          detections.add(
            DetectionReport(
              type: CheatType.unsignedModule,
              evidence: {
                'moduleName': module.baseName,
                'modulePath': module.fullPath,
                'baseAddress': '0x${module.baseAddress.toRadixString(16)}',
                'sizeOfImage': module.sizeOfImage,
                'copiedPath': copiedPath ?? 'Failed to copy',
              },
              processName: 'plutonium',
            ),
          );
        }

        _checkedModules.add(lowerPath);
      }
    } catch (e) {
      _logger.e('Error scanning module signatures: $e');
    }

    return detections;
  }

  /// Copy unsigned module to analysis directory
  /// Returns path to copied file, or null if failed
  Future<String?> _copyUnsignedModule(
    String sourcePath,
    String baseName,
  ) async {
    try {
      final appDir = await getApplicationSupportDirectory();
      final modulesDir = Directory('${appDir.path}/unsigned_modules');
      if (!modulesDir.existsSync()) {
        modulesDir.createSync(recursive: true);
      }

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final destPath = '${modulesDir.path}/${timestamp}_$baseName';

      if (_ffi.copyFile(sourcePath, destPath)) {
        _logger.i('Copied unsigned module to $destPath');
        return destPath;
      }
    } catch (e) {
      _logger.e('Error copying unsigned module: $e');
    }

    return null;
  }

  /// Reset scanner state
  void reset() {
    _checkedModules.clear();
  }
}
