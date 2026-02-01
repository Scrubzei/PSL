import 'package:logger/logger.dart';
import '../../../core/models/detection_report.dart';
import '../native/anticheat_ffi.dart';
import '../../launcher/plutonium_launcher.dart';

/// Scanner for detecting checksum mismatches
/// Validates .text section checksums to detect modifications
class ChecksumScanner {
  final Logger _logger = Logger();
  final AntiCheatFFI _ffi = AntiCheatFFI();
  final PlutoniumLauncher _launcher = PlutoniumLauncher();

  // Cache of checksums for modules
  final Map<String, List<ChecksumRegion>> _checksumCache = {};
  // Track reported mismatches
  final Set<String> _reportedMismatches = {};

  /// Scan for checksum mismatches
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
        // Skip system modules
        final lowerPath = module.fullPath.toLowerCase();
        if (lowerPath.contains('\\windows\\') ||
            lowerPath.contains('\\system32\\') ||
            lowerPath.contains('\\syswow64\\')) {
          continue;
        }

        // Skip if already reported
        final mismatchKey = '${module.fullPath}_${module.baseAddress}';
        if (_reportedMismatches.contains(mismatchKey)) {
          continue;
        }

        // Get or compute checksums from file
        if (!_checksumCache.containsKey(module.fullPath)) {
          final checksums = _ffi.computeFileChecksums(
            module.fullPath,
            module.baseAddress,
          );
          _checksumCache[module.fullPath] = checksums;
        }

        final cachedChecksums = _checksumCache[module.fullPath]!;

        // Validate each checksum region
        for (final checksumRegion in cachedChecksums) {
          // Compute current checksum from memory
          final currentChecksum = _ffi.computeChecksum(
            processId,
            checksumRegion.start,
            checksumRegion.size,
          );

          // Compare with cached checksum
          if (currentChecksum != 0 &&
              currentChecksum != checksumRegion.checksum) {
            _logger.w(
              'Checksum mismatch detected in ${module.baseName}: ${checksumRegion.name}',
            );

            detections.add(
              DetectionReport(
                type: CheatType.checksumMismatch,
                evidence: {
                  'moduleName': module.baseName,
                  'modulePath': module.fullPath,
                  'sectionName': checksumRegion.name,
                  'expectedChecksum': checksumRegion.checksum,
                  'currentChecksum': currentChecksum,
                  'startAddress': '0x${checksumRegion.start.toRadixString(16)}',
                  'size': checksumRegion.size,
                },
                processName: 'plutonium',
              ),
            );

            _reportedMismatches.add(mismatchKey);
            break; // Report once per module
          }
        }
      }
    } catch (e) {
      _logger.e('Error scanning checksums: $e');
    }

    return detections;
  }

  /// Reset scanner state
  void reset() {
    _checksumCache.clear();
    _reportedMismatches.clear();
  }
}
