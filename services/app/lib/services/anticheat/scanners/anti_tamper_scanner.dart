import 'dart:io';
import 'package:logger/logger.dart';
import '../../../../core/models/detection_report.dart';
import '../native/anticheat_ffi.dart';

/// Anti-tamper scanner based on UltimateAntiCheat techniques
/// Detects code integrity violations, IAT hooking, and DLL tampering
class AntiTamperScanner {
  final Logger _logger = Logger();
  final AntiCheatFFI _ffi = AntiCheatFFI();

  // Cache for module checksums
  final Map<String, Map<String, int>> _moduleChecksums = {};
  final Map<String, List<ChecksumRegion>> _fileChecksums = {};

  /// Scan for code tampering
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      // Check for IAT hooking
      final iatDetections = await _checkIATHooking();
      detections.addAll(iatDetections);

      // Check code integrity (checksum mismatches)
      final integrityDetections = await _checkCodeIntegrity();
      detections.addAll(integrityDetections);

      // Check for DLL tampering
      final dllDetections = await _checkDLLTampering();
      detections.addAll(dllDetections);

      // Check for writable code sections
      final writableDetections = await _checkWritableCodeSections();
      detections.addAll(writableDetections);
    } catch (e) {
      _logger.e('Error in anti-tamper scanner: $e');
    }

    return detections;
  }

  /// Check for IAT (Import Address Table) hooking
  Future<List<DetectionReport>> _checkIATHooking() async {
    final detections = <DetectionReport>[];

    try {
      // Check common Windows API functions for hooks
      final functionsToCheck = [
        {'module': 'kernel32.dll', 'function': 'CreateFileA'},
        {'module': 'kernel32.dll', 'function': 'CreateFileW'},
        {'module': 'kernel32.dll', 'function': 'ReadFile'},
        {'module': 'kernel32.dll', 'function': 'WriteFile'},
        {'module': 'kernel32.dll', 'function': 'VirtualAlloc'},
        {'module': 'kernel32.dll', 'function': 'VirtualProtect'},
        {'module': 'kernel32.dll', 'function': 'CreateProcessA'},
        {'module': 'kernel32.dll', 'function': 'CreateProcessW'},
        {'module': 'ntdll.dll', 'function': 'NtCreateFile'},
        {'module': 'ntdll.dll', 'function': 'NtReadFile'},
        {'module': 'ntdll.dll', 'function': 'NtWriteFile'},
        {'module': 'ntdll.dll', 'function': 'NtProtectVirtualMemory'},
        {'module': 'ntdll.dll', 'function': 'NtAllocateVirtualMemory'},
      ];

      for (final func in functionsToCheck) {
        final isHooked = _ffi.doesFunctionAppearHooked(
          func['module']!,
          func['function']!,
        );

        if (isHooked) {
          detections.add(
            DetectionReport(
              type: CheatType.badIAT,
              evidence: {
                'module': func['module'],
                'function': func['function'],
                'method': 'IAT hooking',
              },
              processName: func['module'],
            ),
          );
        }
      }
    } catch (e) {
      _logger.e('Error checking IAT hooking: $e');
    }

    return detections;
  }

  /// Check code integrity by comparing checksums
  Future<List<DetectionReport>> _checkCodeIntegrity() async {
    final detections = <DetectionReport>[];
    final currentPid = pid;

    try {
      // Get current process modules
      final modules = _ffi.enumerateModules(currentPid);

      for (final module in modules) {
        // Skip system modules for now (they're typically signed)
        if (_isSystemModule(module.fullPath)) {
          continue;
        }

        // Compute current checksum for .text section
        // First, we need to find the .text section address and size
        // For now, use a simplified approach

        // Check if we have a cached checksum
        if (_moduleChecksums.containsKey(module.baseName)) {
          // Compute file checksums if not cached
          if (!_fileChecksums.containsKey(module.fullPath)) {
            final fileChecksums = _ffi.computeFileChecksums(
              module.fullPath,
              module.baseAddress,
            );
            _fileChecksums[module.fullPath] = fileChecksums;
          }

          // Compare checksums
          final fileChecksums = _fileChecksums[module.fullPath]!;
          for (final region in fileChecksums) {
            if (region.name == '.text' || region.name.startsWith('.text')) {
              final currentChecksum = _ffi.computeChecksum(
                currentPid,
                region.start,
                region.size,
              );

              if (currentChecksum != 0 && currentChecksum != region.checksum) {
                detections.add(
                  DetectionReport(
                    type: CheatType.codeIntegrity,
                    evidence: {
                      'module': module.baseName,
                      'section': region.name,
                      'expectedChecksum': region.checksum,
                      'actualChecksum': currentChecksum,
                      'address': '0x${region.start.toRadixString(16)}',
                    },
                    processName: module.baseName,
                  ),
                );
              }
            }
          }
        } else {
          // First time seeing this module - cache its checksums
          final fileChecksums = _ffi.computeFileChecksums(
            module.fullPath,
            module.baseAddress,
          );
          _fileChecksums[module.fullPath] = fileChecksums;

          final checksumMap = <String, int>{};
          for (final region in fileChecksums) {
            checksumMap[region.name] = region.checksum;
          }
          _moduleChecksums[module.baseName] = checksumMap;
        }
      }
    } catch (e) {
      _logger.e('Error checking code integrity: $e');
    }

    return detections;
  }

  /// Check for DLL tampering (unsigned modules, modified modules)
  Future<List<DetectionReport>> _checkDLLTampering() async {
    final detections = <DetectionReport>[];
    final currentPid = pid;

    try {
      final modules = _ffi.enumerateModules(currentPid);

      for (final module in modules) {
        // Skip system modules
        if (_isSystemModule(module.fullPath)) {
          continue;
        }

        // Check module signature
        final isValid = _ffi.validateModuleSignature(module.fullPath);
        if (!isValid) {
          detections.add(
            DetectionReport(
              type: CheatType.dllTampering,
              evidence: {
                'module': module.baseName,
                'path': module.fullPath,
                'reason': 'Unsigned or invalid signature',
              },
              processName: module.baseName,
            ),
          );
        }
      }
    } catch (e) {
      _logger.e('Error checking DLL tampering: $e');
    }

    return detections;
  }

  /// Check for writable code sections (should be RX, not RWX)
  Future<List<DetectionReport>> _checkWritableCodeSections() async {
    final detections = <DetectionReport>[];
    final currentPid = pid;

    try {
      final regions = _ffi.queryMemoryRegions(currentPid);

      for (final region in regions) {
        // Check for executable + writable memory (suspicious)
        // PAGE_EXECUTE_READWRITE = 0x40, PAGE_EXECUTE_WRITECOPY = 0x80
        if ((region.protect & 0x40) != 0 || (region.protect & 0x80) != 0) {
          // This is suspicious - code sections should not be writable
          detections.add(
            DetectionReport(
              type: CheatType.pageProtections,
              evidence: {
                'address': '0x${region.baseAddress.toRadixString(16)}',
                'size': region.regionSize,
                'protection': '0x${region.protect.toRadixString(16)}',
                'reason': 'Writable executable memory detected',
              },
              processName: Platform.resolvedExecutable
                  .split(Platform.pathSeparator)
                  .last,
            ),
          );
        }
      }
    } catch (e) {
      _logger.e('Error checking writable code sections: $e');
    }

    return detections;
  }

  /// Check if a module is a system module
  bool _isSystemModule(String path) {
    final lowerPath = path.toLowerCase();
    return lowerPath.contains('\\windows\\') ||
        lowerPath.contains('\\system32\\') ||
        lowerPath.contains('\\syswow64\\') ||
        lowerPath.contains('\\program files\\') ||
        lowerPath.contains('\\program files (x86)\\');
  }
}
