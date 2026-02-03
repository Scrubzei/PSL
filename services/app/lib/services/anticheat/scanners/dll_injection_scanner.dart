import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../core/models/detection_report.dart';
import '../native/anticheat_ffi.dart';

/// Scanner for detecting DLL injection
/// Monitors loaded modules and detects suspicious DLL loads
/// Based on techniques from UltimateAntiCheat and anti-cheat reference implementations
class DllInjectionScanner {
  final Logger _logger = Logger();
  final AntiCheatFFI _ffi = AntiCheatFFI();

  // Track previously seen modules per process to detect new loads
  final Map<int, Set<String>> _knownModulesPerProcess = {};
  // Track modules that have been verified as signed/legitimate per process
  final Map<int, Set<String>> _verifiedModulesPerProcess = {};
  bool _initialized = false;

  /// Scan for DLL injection
  /// Returns list of detection reports if any are found
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      // Find all Plutonium-related processes
      final plutoniumProcesses = _findPlutoniumProcesses();

      if (plutoniumProcesses.isEmpty) {
        // Reset state when no processes found
        if (_initialized) {
          _knownModulesPerProcess.clear();
          _verifiedModulesPerProcess.clear();
          _initialized = false;
        }
        return detections;
      }

      _logger.d(
        'Found ${plutoniumProcesses.length} Plutonium process(es) to scan',
      );

      // Scan each Plutonium process
      for (final processInfo in plutoniumProcesses) {
        final processId = processInfo['pid'] as int;
        final processName = processInfo['name'] as String;

        _logger.d('Scanning process: $processName (PID: $processId)');

        try {
          final processDetections = await _scanProcess(processId, processName);
          detections.addAll(processDetections);
        } catch (e) {
          _logger.e('Error scanning process $processId: $e');
        }
      }

      // Cleanup: Remove processes that no longer exist
      final activePids = plutoniumProcesses.map((p) => p['pid'] as int).toSet();
      _knownModulesPerProcess.removeWhere(
        (pid, _) => !activePids.contains(pid),
      );
      _verifiedModulesPerProcess.removeWhere(
        (pid, _) => !activePids.contains(pid),
      );

      // Log summary
      if (detections.isNotEmpty) {
        _logger.w(
          '🚨🚨🚨 DLL INJECTION SCANNER FOUND ${detections.length} DETECTION(S) 🚨🚨🚨',
        );
        for (final detection in detections) {
          _logger.w(
            '  - ${detection.type.name}: ${detection.evidence['moduleName'] ?? detection.evidence['baseAddress'] ?? 'unknown'}',
          );
        }
      } else {
        _logger.d(
          'DLL injection scanner: No detections (scanned ${plutoniumProcesses.length} process(es))',
        );
      }
    } catch (e) {
      _logger.e('Error scanning for DLL injection: $e');
    }

    return detections;
  }

  /// Find all Plutonium-related processes (launcher, bootstrapper, game)
  List<Map<String, dynamic>> _findPlutoniumProcesses() {
    final processes = <Map<String, dynamic>>[];

    try {
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        malloc.free(processIds);
        malloc.free(bytesReturned);
        return processes;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();
      final plutoniumNames = [
        'plutonium.exe',
        'plutonium-bootstrapper-win32.exe',
        't6mp.exe', // Black Ops 2 Multiplayer
        't6zm.exe', // Black Ops 2 Zombies
        'iw5mp.exe', // MW3
      ];

      for (var i = 0; i < processCount && i < 1024; i++) {
        final processId = processIds[i];
        if (processId == 0) continue;

        try {
          final processName = _getProcessName(processId);
          if (processName == null) continue;

          final lowerName = processName.toLowerCase();
          for (final plutoniumName in plutoniumNames) {
            if (lowerName == plutoniumName.toLowerCase()) {
              processes.add({'pid': processId, 'name': processName});
              _logger.d(
                'Found Plutonium process: $processName (PID: $processId)',
              );
              break;
            }
          }
        } catch (e) {
          // Skip processes we can't access
          continue;
        }
      }

      malloc.free(processIds);
      malloc.free(bytesReturned);
    } catch (e) {
      _logger.e('Error finding Plutonium processes: $e');
    }

    return processes;
  }

  /// Get process name from process ID
  String? _getProcessName(int processId) {
    try {
      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        FALSE,
        processId,
      );

      if (hProcess == NULL) {
        return null;
      }

      final moduleHandles = calloc<HMODULE>(1);
      final needed = calloc<DWORD>();

      if (EnumProcessModules(
            hProcess,
            moduleHandles,
            sizeOf<HMODULE>(),
            needed,
          ) ==
          0) {
        CloseHandle(hProcess);
        malloc.free(moduleHandles);
        malloc.free(needed);
        return null;
      }

      final moduleName = wsalloc(MAX_PATH);
      final size = calloc<DWORD>()..value = MAX_PATH;

      if (GetModuleFileNameEx(
            hProcess,
            moduleHandles[0],
            moduleName,
            size.value,
          ) !=
          0) {
        final fullPath = moduleName.toDartString();
        final processName = fullPath.split('\\').last;
        CloseHandle(hProcess);
        free(moduleName);
        malloc.free(moduleHandles);
        malloc.free(needed);
        malloc.free(size);
        return processName;
      }

      CloseHandle(hProcess);
      free(moduleName);
      malloc.free(moduleHandles);
      malloc.free(needed);
      malloc.free(size);
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Scan a specific process for DLL injection
  Future<List<DetectionReport>> _scanProcess(
    int processId,
    String processName,
  ) async {
    final detections = <DetectionReport>[];

    try {
      // Get current modules
      final currentModules = _ffi.enumerateModules(processId);
      final currentModulePaths = <String>{};

      // Also scan memory regions for manually mapped DLLs
      final memoryRegionDetections = await _scanMemoryRegions(
        processId,
        processName,
        currentModules,
      );
      detections.addAll(memoryRegionDetections);

      // Initialize known modules for this process on first scan
      if (!_knownModulesPerProcess.containsKey(processId)) {
        _knownModulesPerProcess[processId] = {};
        _verifiedModulesPerProcess[processId] = {};
        _initialized = true;

        _logger.w(
          '=== INITIALIZING BASELINE FOR PROCESS $processId ($processName) ===',
        );
        _logger.w('Total modules found: ${currentModules.length}');

        for (final module in currentModules) {
          final lowerPath = module.fullPath.toLowerCase();
          _knownModulesPerProcess[processId]!.add(lowerPath);
          // Mark system DLLs as verified
          if (_isSystemDll(module.fullPath)) {
            _verifiedModulesPerProcess[processId]!.add(lowerPath);
          }
        }

        // Log ALL modules for debugging (including system DLLs)
        _logger.w('=== ALL LOADED MODULES ===');
        for (final module in currentModules) {
          final isSystem = _isSystemDll(module.fullPath);
          _logger.w(
            '  ${isSystem ? "[SYSTEM]" : "[USER]"} ${module.baseName} -> ${module.fullPath} (Base: 0x${module.baseAddress.toRadixString(16)}, Size: ${module.sizeOfImage})',
          );
        }
        _logger.w('=== END MODULE LIST ===');
      }

      final knownModules = _knownModulesPerProcess[processId]!;
      final verifiedModules = _verifiedModulesPerProcess[processId]!;

      for (final module in currentModules) {
        final lowerPath = module.fullPath.toLowerCase();
        currentModulePaths.add(lowerPath);

        // Check if this is a new module (not seen before)
        final isNewModule = !knownModules.contains(lowerPath);

        // Skip system DLLs - they're typically signed and legitimate
        if (_isSystemDll(module.fullPath)) {
          if (isNewModule) {
            knownModules.add(lowerPath);
            verifiedModules.add(lowerPath);
          }
          continue;
        }

        // ULTRA AGGRESSIVE: Check ALL non-system DLLs for unsigned status
        // Flag ANY unsigned DLL that's not a known legitimate game DLL
        // Re-check on every scan to catch DLLs that were already loaded
        final isSigned = _ffi.validateModuleSignature(module.fullPath);
        final isLegitimate = _isLegitimateGameDll(
          module.baseName,
          module.fullPath,
        );

        if (!isSigned && !isLegitimate) {
          // This is an unsigned, non-legitimate DLL - FLAG IT IMMEDIATELY
          _logger.w(
            '🚨 DETECTED UNSIGNED DLL in $processName: ${module.baseName} -> ${module.fullPath}',
          );

          detections.add(
            DetectionReport(
              type: CheatType.unsignedModule,
              evidence: {
                'moduleName': module.baseName,
                'modulePath': module.fullPath,
                'baseAddress': '0x${module.baseAddress.toRadixString(16)}',
                'sizeOfImage': module.sizeOfImage,
                'processId': processId,
                'processName': processName,
                'reason':
                    'Unsigned DLL detected - not in system directories and not a known game DLL',
              },
              processName: processName,
            ),
          );
        } else if (isSigned || isLegitimate) {
          // Mark as verified only if signed OR legitimate
          verifiedModules.add(lowerPath);
        }

        // Check if this is a new module and if it's suspicious
        if (isNewModule) {
          _logger.d(
            'New module detected in $processName: ${module.baseName} -> ${module.fullPath}',
          );

          // Check for suspicious DLL characteristics
          final suspiciousReason = _checkSuspiciousDll(
            module.baseName,
            module.fullPath,
          );

          if (suspiciousReason != null) {
            _logger.w(
              'Detected suspicious DLL injection in $processName: ${module.baseName} - $suspiciousReason',
            );

            detections.add(
              DetectionReport(
                type: CheatType.dllInjection,
                evidence: {
                  'moduleName': module.baseName,
                  'modulePath': module.fullPath,
                  'baseAddress': '0x${module.baseAddress.toRadixString(16)}',
                  'sizeOfImage': module.sizeOfImage,
                  'processId': processId,
                  'processName': processName,
                  'reason': suspiciousReason,
                },
                processName: processName,
              ),
            );
          }

          // Add to known modules
          knownModules.add(lowerPath);
        }
      }

      // Remove modules that are no longer loaded (cleanup)
      knownModules.removeWhere((path) => !currentModulePaths.contains(path));
      verifiedModules.removeWhere((path) => !currentModulePaths.contains(path));
    } catch (e) {
      _logger.e('Error scanning process $processId: $e');
    }

    return detections;
  }

  /// Check if a DLL is a system DLL
  bool _isSystemDll(String fullPath) {
    final lowerPath = fullPath.toLowerCase();
    return lowerPath.contains('\\windows\\') ||
        lowerPath.contains('\\system32\\') ||
        lowerPath.contains('\\syswow64\\') ||
        lowerPath.contains('\\winsxs\\');
  }

  /// Check if a DLL is a known legitimate game DLL
  bool _isLegitimateGameDll(String baseName, String fullPath) {
    final lowerName = baseName.toLowerCase();
    final lowerPath = fullPath.toLowerCase();

    // Known legitimate game DLLs
    final legitimateDlls = [
      'd3d9.dll',
      'd3d11.dll',
      'dxgi.dll',
      'xinput1_3.dll',
      'xinput1_4.dll',
      'xaudio2_7.dll',
      'xaudio2_8.dll',
      'xaudio2_9.dll',
      'msvcr120.dll',
      'msvcp120.dll',
      'vcruntime140.dll',
      'msvcp140.dll',
      'concrt140.dll',
    ];

    if (legitimateDlls.contains(lowerName)) {
      return true;
    }

    // Check if DLL is in the game directory (likely legitimate)
    // This is a heuristic - legitimate mods might also be here
    if (lowerPath.contains('plutonium') || lowerPath.contains('call of duty')) {
      return true;
    }

    return false;
  }

  /// Check if a DLL is suspicious and return the reason
  /// Returns null if not suspicious, or a string describing why it's suspicious
  String? _checkSuspiciousDll(String baseName, String fullPath) {
    final lowerName = baseName.toLowerCase();
    final lowerPath = fullPath.toLowerCase();

    // Check for suspicious patterns in name
    final suspiciousNamePatterns = [
      'hook',
      'inject',
      'cheat',
      'hack',
      'aim',
      'esp',
      'wallhack',
      'bot',
      'bypass',
      'stealth',
      'undetected',
      'orbital', // Specifically check for Orbital VSAT
      'vsat',
      'tom7', // TOM7 Orbital VSAT
      'tom', // TOM7 variants
      'ddos', // VSAT is a DDoS tool
      'stresser',
      'booter',
    ];

    for (final pattern in suspiciousNamePatterns) {
      if (lowerName.contains(pattern) || lowerPath.contains(pattern)) {
        return 'Suspicious name pattern: $pattern';
      }
    }

    // Check for DLLs loaded from suspicious locations
    final suspiciousLocations = [
      '\\temp\\',
      '\\tmp\\',
      '\\appdata\\local\\temp\\',
      '\\appdata\\roaming\\',
      '\\users\\',
      '\\downloads\\',
      '\\desktop\\',
    ];

    for (final location in suspiciousLocations) {
      if (lowerPath.contains(location)) {
        // Allow some legitimate locations
        if (!lowerPath.contains('plutonium') &&
            !lowerPath.contains('call of duty') &&
            !lowerPath.contains('steam') &&
            !lowerPath.contains('program files')) {
          return 'Loaded from suspicious location: $location';
        }
      }
    }

    // Check for DLLs with very short or random-looking names
    // (common for injected DLLs)
    if (baseName.length < 5 && !_isLegitimateGameDll(baseName, fullPath)) {
      return 'Suspicious short DLL name';
    }

    // Check for DLLs with random-looking names (lots of numbers/random chars)
    final randomPattern = RegExp(r'^[a-z]{1,3}\d{3,}\.dll$');
    if (randomPattern.hasMatch(lowerName) &&
        !_isLegitimateGameDll(baseName, fullPath)) {
      return 'Suspicious random-looking DLL name';
    }

    // If it's not a system DLL, not a legitimate game DLL, and not verified,
    // it could be suspicious - but we'll only flag if it's loaded from a suspicious location
    // or has suspicious patterns (already checked above)
    return null;
  }

  /// Scan memory regions for manually mapped DLLs
  /// Based on UltimateAntiCheat DetectManualMapping implementation
  Future<List<DetectionReport>> _scanMemoryRegions(
    int processId,
    String processName,
    List<ModuleInfo> knownModules,
  ) async {
    final detections = <DetectionReport>[];

    try {
      // Get all memory regions
      final regions = _ffi.queryMemoryRegions(processId);

      _logger.d(
        'Scanning ${regions.length} memory regions for manually mapped DLLs',
      );

      for (final region in regions) {
        // Skip non-committed regions
        if (region.state != MEM_COMMIT) {
          continue;
        }

        // Check for executable memory regions
        final isExecutable =
            (region.protect & PAGE_EXECUTE_READ) != 0 ||
            (region.protect & PAGE_EXECUTE_READWRITE) != 0 ||
            (region.protect & PAGE_EXECUTE_WRITECOPY) != 0;

        if (isExecutable) {
          // Check if this region is part of a known module
          bool isKnownModule = false;
          for (final module in knownModules) {
            if (region.baseAddress >= module.baseAddress &&
                region.baseAddress < module.baseAddress + module.sizeOfImage) {
              isKnownModule = true;
              break;
            }
          }

          // If it's executable but not part of a known module, it's suspicious
          if (!isKnownModule) {
            // Check if it's a suspicious size (likely a DLL)
            if (region.regionSize > 4096 &&
                region.regionSize < 100 * 1024 * 1024) {
              _logger.w(
                '🚨 Suspicious executable memory region found: Base=0x${region.baseAddress.toRadixString(16)}, Size=${region.regionSize}, Protect=0x${region.protect.toRadixString(16)}',
              );

              detections.add(
                DetectionReport(
                  type: CheatType.manualMapping,
                  evidence: {
                    'baseAddress': '0x${region.baseAddress.toRadixString(16)}',
                    'regionSize': region.regionSize,
                    'protect': '0x${region.protect.toRadixString(16)}',
                    'processId': processId,
                    'processName': processName,
                    'reason':
                        'Executable memory region not belonging to any known module - possible manually mapped DLL',
                  },
                  processName: processName,
                ),
              );
            }
          }
        }
      }
    } catch (e) {
      _logger.e('Error scanning memory regions: $e');
    }

    return detections;
  }

  /// Reset scanner state
  void reset() {
    _knownModulesPerProcess.clear();
    _verifiedModulesPerProcess.clear();
    _initialized = false;
  }
}
