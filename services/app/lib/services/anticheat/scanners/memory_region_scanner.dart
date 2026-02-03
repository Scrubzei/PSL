import 'dart:io';
import 'package:logger/logger.dart';
import 'package:path_provider/path_provider.dart';
import 'package:win32/win32.dart';
import '../../../core/models/detection_report.dart';
import '../native/anticheat_ffi.dart';
import '../../launcher/plutonium_launcher.dart';

/// Scanner for detecting suspicious memory regions
/// Scans for PAGE_EXECUTE_READ regions and dumps them
class MemoryRegionScanner {
  final Logger _logger = Logger();
  final AntiCheatFFI _ffi = AntiCheatFFI();
  final PlutoniumLauncher _launcher = PlutoniumLauncher();

  // Track reported regions to avoid duplicate reports
  final Set<int> _reportedRegions = {};

  /// Scan for suspicious memory regions
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

      // Query memory regions
      final regions = _ffi.queryMemoryRegions(processId);

      for (final region in regions) {
        // Check for suspicious PAGE_EXECUTE_READ regions
        // These are executable but not writable, which is suspicious for injected code
        if (region.protect == PAGE_EXECUTE_READ &&
            region.state == MEM_COMMIT &&
            region.type == MEM_PRIVATE) {
          // Skip if already reported
          if (_reportedRegions.contains(region.baseAddress)) {
            continue;
          }

          _logger.w(
            'Detected suspicious memory region: 0x${region.baseAddress.toRadixString(16)}',
          );

          // Dump the memory region
          final dumpPath = await _dumpMemoryRegion(
            processId,
            region.baseAddress,
            region.regionSize,
          );

          if (dumpPath != null) {
            detections.add(
              DetectionReport(
                type: CheatType.suspiciousMemoryRegion,
                evidence: {
                  'baseAddress': '0x${region.baseAddress.toRadixString(16)}',
                  'regionSize': region.regionSize,
                  'protect': region.protect,
                  'dumpPath': dumpPath,
                },
                processName: 'plutonium',
              ),
            );

            _reportedRegions.add(region.baseAddress);
          }
        }
      }
    } catch (e) {
      _logger.e('Error scanning memory regions: $e');
    }

    return detections;
  }

  /// Dump memory region to file
  /// Returns path to dump file, or null if failed
  Future<String?> _dumpMemoryRegion(
    int processId,
    int baseAddress,
    int regionSize,
  ) async {
    try {
      final appDir = await getApplicationSupportDirectory();
      final dumpsDir = Directory('${appDir.path}/memory_dumps');
      if (!dumpsDir.existsSync()) {
        dumpsDir.createSync(recursive: true);
      }

      final fileName =
          'memory_dump_${baseAddress.toRadixString(16)}_${DateTime.now().millisecondsSinceEpoch}.bin';
      final dumpPath = '${dumpsDir.path}/$fileName';

      // Limit dump size to prevent excessive disk usage
      final maxDumpSize = 10 * 1024 * 1024; // 10MB
      final dumpSize = regionSize > maxDumpSize ? maxDumpSize : regionSize;

      if (_ffi.dumpMemoryRegion(processId, baseAddress, dumpSize, dumpPath)) {
        _logger.i('Dumped memory region to $dumpPath');
        return dumpPath;
      }
    } catch (e) {
      _logger.e('Error dumping memory region: $e');
    }

    return null;
  }

  /// Reset scanner state
  void reset() {
    _reportedRegions.clear();
  }
}
