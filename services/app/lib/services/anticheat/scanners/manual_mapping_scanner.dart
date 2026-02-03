import 'dart:io';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../../core/models/detection_report.dart';
import '../native/anticheat_ffi.dart';

/// Manual mapping scanner - detects manually mapped DLLs
/// Based on UltimateAntiCheat manual mapping detection
class ManualMappingScanner {
  final Logger _logger = Logger();
  final AntiCheatFFI _ffi = AntiCheatFFI();
  final int _currentPid = pid;

  /// Scan for manually mapped modules
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      // Get all loaded modules
      final modules = _ffi.enumerateModules(_currentPid);

      for (final module in modules) {
        // Skip system modules
        if (_isSystemModule(module.fullPath)) {
          continue;
        }

        // Check if module is manually mapped
        // Manually mapped modules typically:
        // 1. Are not in the PEB module list (we can't easily check this from Dart)
        // 2. Have suspicious memory characteristics
        // 3. Don't have a corresponding file on disk
        if (await _isManuallyMapped(module)) {
          detections.add(
            DetectionReport(
              type: CheatType.manualMapping,
              evidence: {
                'module': module.baseName,
                'path': module.fullPath,
                'baseAddress': '0x${module.baseAddress.toRadixString(16)}',
                'reason': 'Module appears to be manually mapped',
              },
              processName: module.baseName,
            ),
          );
        }
      }
    } catch (e) {
      _logger.e('Error in manual mapping scanner: $e');
    }

    return detections;
  }

  /// Check if a module is manually mapped
  Future<bool> _isManuallyMapped(ModuleInfo module) async {
    try {
      // Check 1: Verify file exists on disk
      final file = File(module.fullPath);
      if (!file.existsSync()) {
        // Module loaded but file doesn't exist - likely manually mapped
        return true;
      }

      // Check 2: Check memory protection
      // Manually mapped modules often have different protection flags
      final regions = _ffi.queryMemoryRegions(_currentPid);
      for (final region in regions) {
        if (region.baseAddress == module.baseAddress) {
          // Check for suspicious protection flags
          // Manually mapped modules might have PAGE_EXECUTE_READWRITE
          if ((region.protect & PAGE_EXECUTE_READWRITE) != 0) {
            // This is suspicious - legitimate DLLs shouldn't have RWX protection
            return true;
          }
        }
      }

      // Check 3: Verify module signature
      // Manually mapped modules are typically unsigned
      final isValid = _ffi.validateModuleSignature(module.fullPath);
      if (!isValid && !_isSystemModule(module.fullPath)) {
        // Unsigned non-system module - could be manually mapped
        return true;
      }

      return false;
    } catch (e) {
      _logger.d('Error checking manual mapping: $e');
      return false;
    }
  }

  /// Check if a module is a system module
  bool _isSystemModule(String path) {
    final lowerPath = path.toLowerCase();
    return lowerPath.contains('\\windows\\') ||
        lowerPath.contains('\\system32\\') ||
        lowerPath.contains('\\syswow64\\');
  }
}
