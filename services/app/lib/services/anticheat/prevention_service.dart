import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:crypto/crypto.dart';
import 'package:logger/logger.dart';
import '../../core/models/detection_report.dart';
import '../launcher/plutonium_launcher.dart';
import 'native/anticheat_ffi.dart';

/// Service for protecting child process memory and detecting tampering
class MemoryProtectionService {
  final Logger _logger = Logger();
  final AntiCheatFFI _ffi = AntiCheatFFI();
  final PlutoniumLauncher _launcher;

  // Store baseline hashes for memory regions
  final Map<String, String> _baselineHashes = {};
  final Map<String, int> _protectedRegions = {}; // address -> size

  MemoryProtectionService(this._launcher);

  /// Protect memory regions of the child process
  /// NOTE: Memory protection via VirtualProtectEx is DISABLED because it causes game crashes.
  /// Setting PAGE_READONLY on executable code prevents execution and crashes the game.
  /// We now only use checksum-based detection without modifying memory protection.
  Future<void> protectChildProcessMemory() async {
    _logger.i(
      '[Memory Protection] Memory protection via VirtualProtectEx is disabled to prevent game crashes.',
    );
    _logger.i(
      '[Memory Protection] Using checksum-based detection only (no memory protection flags).',
    );

    final processHandle = _launcher.processHandle;
    final processId = _launcher.processId;

    if (processHandle == null || processId == null) {
      _logger.w(
        '[Memory Protection] Cannot establish baseline: process handle not available (handle: $processHandle, PID: $processId)',
      );
      return;
    }

    _logger.i(
      '[Memory Protection] Process handle available: $processHandle, PID: $processId',
    );

    try {
      _logger.i(
        '[Memory Protection] Waiting 2 seconds for process initialization...',
      );
      // Wait a bit for the process to fully initialize
      await Future.delayed(const Duration(seconds: 2));

      _logger.i(
        '[Memory Protection] Establishing baseline checksums (no memory protection)...',
      );
      // Enumerate modules to establish baseline checksums
      final modules = _ffi.enumerateModules(processId);
      _logger.i(
        '[Memory Protection] Found ${modules.length} modules for baseline checksums',
      );

      int modulesProcessed = 0;

      for (final module in modules) {
        // Skip system modules (they're typically signed and protected)
        if (_isSystemModule(module.fullPath)) {
          _logger.d(
            '[Memory Protection] Skipping system module: ${module.baseName}',
          );
          continue;
        }

        modulesProcessed++;
        _logger.d(
          '[Memory Protection] Establishing baseline for module: ${module.baseName}',
        );

        // Get memory regions for this module
        final regions = _ffi.queryMemoryRegions(processId);
        _logger.d(
          '[Memory Protection] Found ${regions.length} memory regions for module ${module.baseName}',
        );

        for (final region in regions) {
          // Only check executable regions (.text sections)
          if (region.baseAddress >= module.baseAddress &&
              region.baseAddress < module.baseAddress + module.sizeOfImage) {
            // Check if region is executable
            if ((region.protect & PAGE_EXECUTE) != 0 ||
                (region.protect & PAGE_EXECUTE_READ) != 0 ||
                (region.protect & PAGE_EXECUTE_READWRITE) != 0 ||
                (region.protect & PAGE_EXECUTE_WRITECOPY) != 0) {
              // Establish baseline hash WITHOUT protecting memory
              final key =
                  '${module.baseName}_0x${region.baseAddress.toRadixString(16)}';

              final baselineHash = await _computeMemoryHash(
                processHandle,
                region.baseAddress,
                region.regionSize,
              );

              if (baselineHash != null) {
                _baselineHashes[key] = baselineHash;
                _logger.d(
                  '[Memory Protection] Established baseline hash for $key',
                );
              }
            }
          }
        }
      }

      _logger.i(
        '[Memory Protection] Baseline checksums established: ${_baselineHashes.length} regions tracked across $modulesProcessed modules',
      );
    } catch (e) {
      _logger.e('Error establishing memory baseline: $e');
    }
  }

  /// Detect memory tampering by comparing checksums and checking for suspicious memory regions
  /// This includes:
  /// - Executable code regions (.text sections)
  /// - Data sections (.data, .rdata) where hooks might be placed
  /// - Suspicious executable+writable memory (PAGE_EXECUTE_READWRITE)
  /// Returns list of detection reports if tampering is detected
  Future<List<DetectionReport>> detectMemoryTampering() async {
    final detections = <DetectionReport>[];
    final processHandle = _launcher.processHandle;
    final processId = _launcher.processId;

    if (processHandle == null || processId == null) {
      _logger.d(
        '[Memory Tampering Detection] Skipping detection: process handle not available',
      );
      return detections;
    }

    try {
      _logger.d(
        '[Memory Tampering Detection] Starting comprehensive memory tampering detection scan...',
      );

      // Enumerate modules
      final modules = _ffi.enumerateModules(processId);
      _logger.d(
        '[Memory Tampering Detection] Checking ${modules.length} modules for tampering',
      );

      // Track suspicious memory regions (executable + writable)
      final suspiciousRegions = <Map<String, dynamic>>[];

      for (final module in modules) {
        // Skip system modules
        if (_isSystemModule(module.fullPath)) {
          continue;
        }

        // Get memory regions for this module
        final regions = _ffi.queryMemoryRegions(processId);
        for (final region in regions) {
          if (region.baseAddress >= module.baseAddress &&
              region.baseAddress < module.baseAddress + module.sizeOfImage) {
            // Check for suspicious executable+writable memory (common in ESP overlays/hooks)
            if ((region.protect & PAGE_EXECUTE_READWRITE) != 0 ||
                (region.protect & PAGE_EXECUTE_WRITECOPY) != 0) {
              _logger.w(
                '[Memory Tampering Detection] Suspicious executable+writable memory region detected in ${module.baseName} at 0x${region.baseAddress.toRadixString(16)}',
              );
              suspiciousRegions.add({
                'module': module.baseName,
                'address': region.baseAddress,
                'size': region.regionSize,
                'protect': region.protect,
                'reason':
                    'Executable+writable memory (possible hook/injection)',
              });
            }

            // Check executable regions (.text sections) for code tampering
            if ((region.protect & PAGE_EXECUTE) != 0 ||
                (region.protect & PAGE_EXECUTE_READ) != 0) {
              final key =
                  '${module.baseName}_0x${region.baseAddress.toRadixString(16)}';

              // Compute current hash
              final currentHash = await _computeMemoryHash(
                processHandle,
                region.baseAddress,
                region.regionSize,
              );

              if (currentHash == null) {
                // Can't read memory - possible evasion or protection issue
                detections.add(
                  DetectionReport(
                    type: CheatType.memoryTampering,
                    evidence: {
                      'module': module.baseName,
                      'address': '0x${region.baseAddress.toRadixString(16)}',
                      'reason':
                          'Cannot read memory region - possible tampering',
                    },
                    processName: module.baseName,
                  ),
                );
                continue;
              }

              // Check against baseline
              if (_baselineHashes.containsKey(key)) {
                final baselineHash = _baselineHashes[key]!;
                if (currentHash != baselineHash) {
                  _logger.w(
                    '[Memory Tampering Detection] Memory tampering detected in module ${module.baseName} at 0x${region.baseAddress.toRadixString(16)}',
                  );
                  detections.add(
                    DetectionReport(
                      type: CheatType.memoryTampering,
                      evidence: {
                        'module': module.baseName,
                        'address': '0x${region.baseAddress.toRadixString(16)}',
                        'size': region.regionSize,
                        'baselineHash': baselineHash,
                        'currentHash': currentHash,
                        'reason': 'Checksum mismatch in executable code',
                      },
                      processName: module.baseName,
                    ),
                  );
                }
              } else {
                // First time seeing this region - store as baseline
                _baselineHashes[key] = currentHash;
                _logger.d('Stored baseline hash for $key');
              }
            }

            // Also check data sections (.data, .rdata) for hooks
            // ESP overlays often hook functions by modifying function pointers in data sections
            if ((region.protect & PAGE_READWRITE) != 0 ||
                (region.protect & PAGE_WRITECOPY) != 0) {
              // Check data sections for modifications (but only if they're in game modules)
              final key =
                  '${module.baseName}_DATA_0x${region.baseAddress.toRadixString(16)}';

              // Only check data sections for game modules (not system DLLs)
              if (!_isSystemModule(module.fullPath)) {
                final currentHash = await _computeMemoryHash(
                  processHandle,
                  region.baseAddress,
                  region.regionSize > 1024 * 1024
                      ? 1024 * 1024
                      : region.regionSize, // Limit to 1MB for data sections
                );

                if (currentHash != null) {
                  if (_baselineHashes.containsKey(key)) {
                    final baselineHash = _baselineHashes[key]!;
                    if (currentHash != baselineHash) {
                      _logger.w(
                        '[Memory Tampering Detection] Data section modification detected in module ${module.baseName} at 0x${region.baseAddress.toRadixString(16)} (possible hook)',
                      );
                      detections.add(
                        DetectionReport(
                          type: CheatType.memoryTampering,
                          evidence: {
                            'module': module.baseName,
                            'address':
                                '0x${region.baseAddress.toRadixString(16)}',
                            'size': region.regionSize,
                            'baselineHash': baselineHash,
                            'currentHash': currentHash,
                            'reason':
                                'Checksum mismatch in data section (possible function hook)',
                          },
                          processName: module.baseName,
                        ),
                      );
                    }
                  } else {
                    // Store baseline for data sections too
                    _baselineHashes[key] = currentHash;
                  }
                }
              }
            }
          }
        }
      }

      // Report suspicious executable+writable regions
      for (final suspicious in suspiciousRegions) {
        detections.add(
          DetectionReport(
            type: CheatType.memoryTampering,
            evidence: {
              'module': suspicious['module'],
              'address':
                  '0x${(suspicious['address'] as int).toRadixString(16)}',
              'size': suspicious['size'],
              'protect': suspicious['protect'],
              'reason': suspicious['reason'],
            },
            processName: suspicious['module'] as String,
          ),
        );
      }

      if (detections.isEmpty) {
        _logger.d(
          '[Memory Tampering Detection] No memory tampering detected in this scan',
        );
        _logger.d(
          '[Memory Tampering Detection] Scanned ${modules.length} modules, ${_baselineHashes.length} regions tracked',
        );
      } else {
        _logger.w(
          '[Memory Tampering Detection] 🚨 Found ${detections.length} memory tampering detection(s)! 🚨',
        );
        for (final detection in detections) {
          _logger.w(
            '[Memory Tampering Detection] Detection: ${detection.type.name} - ${detection.evidence['reason'] ?? 'Unknown'} in ${detection.processName}',
          );
        }
      }
    } catch (e) {
      _logger.e(
        '[Memory Tampering Detection] Error detecting memory tampering: $e',
      );
    }

    return detections;
  }

  /// Compute SHA256 hash of a memory region
  Future<String?> _computeMemoryHash(
    int hProcess,
    int baseAddress,
    int size,
  ) async {
    try {
      // Limit size to prevent excessive memory allocation
      const maxHashSize = 10 * 1024 * 1024; // 10MB max
      final safeSize = size > maxHashSize ? maxHashSize : size;

      if (safeSize <= 0) {
        return null;
      }

      final buffer = calloc<Uint8>(safeSize);
      final bytesRead = calloc<SIZE_T>();

      final result = ReadProcessMemory(
        hProcess,
        baseAddress.toAddress(),
        buffer,
        safeSize,
        bytesRead,
      );

      if (result == 0) {
        calloc.free(buffer);
        calloc.free(bytesRead);
        return null;
      }

      final readSize = bytesRead.value < safeSize ? bytesRead.value : safeSize;
      final data = buffer.asTypedList(readSize);
      final hash = sha256.convert(data).toString();

      calloc.free(buffer);
      calloc.free(bytesRead);

      return hash;
    } catch (e) {
      _logger.e('Error computing memory hash: $e');
      return null;
    }
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

  /// Clear baseline hashes (call when process restarts)
  void clearBaselines() {
    _baselineHashes.clear();
    _protectedRegions.clear();
  }
}
