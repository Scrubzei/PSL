import 'dart:io';
import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../../core/models/detection_report.dart';

/// Anti-debugging scanner based on UltimateAntiCheat techniques
/// Implements multiple debugger detection methods
class AntiDebugScanner {
  final Logger _logger = Logger();

  /// Scan for debugger presence using multiple detection methods
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      // Check IsDebuggerPresent() WinAPI
      if (_isDebuggerPresentWinApi()) {
        detections.add(
          DetectionReport(
            type: CheatType.debugWinApiDebugger,
            evidence: {'method': 'IsDebuggerPresent'},
            processName: Platform.resolvedExecutable
                .split(Platform.pathSeparator)
                .last,
          ),
        );
      }

      // Check PEB BeingDebugged flag
      if (_isDebuggerPresentPEB()) {
        detections.add(
          DetectionReport(
            type: CheatType.debugPEB,
            evidence: {'method': 'PEB BeingDebugged flag'},
            processName: Platform.resolvedExecutable
                .split(Platform.pathSeparator)
                .last,
          ),
        );
      }

      // Check heap flags
      if (_isDebuggerPresentHeapFlags()) {
        detections.add(
          DetectionReport(
            type: CheatType.debugHeapFlag,
            evidence: {'method': 'Heap flags'},
            processName: Platform.resolvedExecutable
                .split(Platform.pathSeparator)
                .last,
          ),
        );
      }

      // Check CloseHandle anti-debug trick
      if (_isDebuggerPresentCloseHandle()) {
        detections.add(
          DetectionReport(
            type: CheatType.debugCloseHandle,
            evidence: {'method': 'CloseHandle trick'},
            processName: Platform.resolvedExecutable
                .split(Platform.pathSeparator)
                .last,
          ),
        );
      }

      // Check debug port
      if (_isDebuggerPresentDebugPort()) {
        detections.add(
          DetectionReport(
            type: CheatType.debugDebugPort,
            evidence: {'method': 'Debug port'},
            processName: Platform.resolvedExecutable
                .split(Platform.pathSeparator)
                .last,
          ),
        );
      }

      // Check process debug flags
      if (_isDebuggerPresentProcessDebugFlags()) {
        detections.add(
          DetectionReport(
            type: CheatType.debugProcessDebugFlags,
            evidence: {'method': 'Process debug flags'},
            processName: Platform.resolvedExecutable
                .split(Platform.pathSeparator)
                .last,
          ),
        );
      }

      // Check kernel debugger
      if (_isKernelDebuggerPresent()) {
        detections.add(
          DetectionReport(
            type: CheatType.debugKernelDebugger,
            evidence: {'method': 'Kernel debugger'},
            processName: Platform.resolvedExecutable
                .split(Platform.pathSeparator)
                .last,
          ),
        );
      }

      // Check for known debugger processes
      final debuggerProcess = _checkKnownDebuggerProcesses();
      if (debuggerProcess != null) {
        detections.add(
          DetectionReport(
            type: CheatType.debugKnownDebuggerProcess,
            evidence: {'processName': debuggerProcess},
            processName: debuggerProcess,
          ),
        );
      }

      // Check DBK64 driver (Dark Byte VM debugger)
      if (_isDBK64DriverLoaded()) {
        detections.add(
          DetectionReport(
            type: CheatType.debugDBK64Driver,
            evidence: {'driver': 'DBK64.sys'},
            processName: Platform.resolvedExecutable
                .split(Platform.pathSeparator)
                .last,
          ),
        );
      }
    } catch (e) {
      _logger.e('Error in anti-debug scanner: $e');
    }

    return detections;
  }

  /// Check IsDebuggerPresent() WinAPI
  bool _isDebuggerPresentWinApi() {
    try {
      return IsDebuggerPresent() != 0;
    } catch (e) {
      _logger.d('Error checking IsDebuggerPresent: $e');
      return false;
    }
  }

  /// Check PEB BeingDebugged flag
  bool _isDebuggerPresentPEB() {
    try {
      // IsDebuggerPresent checks PEB.BeingDebugged flag
      return IsDebuggerPresent() != 0;
    } catch (e) {
      _logger.d('Error checking PEB: $e');
      return false;
    }
  }

  /// Check heap flags for debugger presence
  bool _isDebuggerPresentHeapFlags() {
    try {
      // Heap flag checking requires reading heap structure directly
      // This requires native code to read memory at specific offsets
      // For now, return false as placeholder
      return false; // Placeholder - requires native memory access
    } catch (e) {
      _logger.d('Error checking heap flags: $e');
      return false;
    }
  }

  /// Check CloseHandle anti-debug trick
  bool _isDebuggerPresentCloseHandle() {
    try {
      // CloseHandle anti-debug trick requires native code
      // This is a placeholder - full implementation would:
      // 1. Create an invalid handle
      // 2. Try to close it
      // 3. Check if CloseHandle returns TRUE (indicates debugger)
      return false; // Placeholder
    } catch (e) {
      _logger.d('Error checking CloseHandle trick: $e');
      return false;
    }
  }

  /// Check debug port using NtQueryInformationProcess
  bool _isDebuggerPresentDebugPort() {
    try {
      // NtQueryInformationProcess with ProcessDebugPort (0x7)
      // Returns debug port if debugger is attached
      // This requires calling ntdll.dll functions directly
      // For now, use IsDebuggerPresent as a proxy
      return IsDebuggerPresent() != 0;
    } catch (e) {
      _logger.d('Error checking debug port: $e');
      return false;
    }
  }

  /// Check process debug flags
  bool _isDebuggerPresentProcessDebugFlags() {
    try {
      // NtQueryInformationProcess with ProcessDebugFlags (0x1F)
      // Returns 0 if debugger is present
      // This requires calling ntdll.dll functions directly
      // For now, use IsDebuggerPresent as a proxy
      return IsDebuggerPresent() != 0;
    } catch (e) {
      _logger.d('Error checking process debug flags: $e');
      return false;
    }
  }

  /// Check for kernel debugger using KUSER_SHARED_DATA
  bool _isKernelDebuggerPresent() {
    try {
      // KUSER_SHARED_DATA is at address 0x7FFE0000
      // KdDebuggerEnabled flag is at offset 0x2D4
      // This requires direct memory access
      // For now, return false as placeholder
      return false; // Placeholder - requires direct memory access
    } catch (e) {
      _logger.d('Error checking kernel debugger: $e');
      return false;
    }
  }

  /// Check for known debugger processes
  String? _checkKnownDebuggerProcesses() {
    try {
      final debuggerProcesses = [
        'x64dbg.exe',
        'x32dbg.exe',
        'CheatEngine.exe',
        'cheatengine-x86_64-SSE4-AVX2.exe',
        'idaq64.exe',
        'idaq.exe',
        'ida.exe',
        'ida64.exe',
        'windbg.exe',
        'kd.exe',
        'DbgX.Shell.exe',
        'ollydbg.exe',
        'immunitydebugger.exe',
        'ghidra.exe',
        'radare2.exe',
        'r2.exe',
      ];

      // Enumerate processes using EnumProcesses
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        malloc.free(processIds);
        malloc.free(bytesReturned);
        return null;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();
      final maxProcessesToCheck = processCount > 64 ? 64 : processCount;

      for (var i = 0; i < maxProcessesToCheck; i++) {
        final processId = processIds[i];
        if (processId == 0) continue;

        try {
          final processName = _getProcessName(processId);
          if (processName == null) continue;

          final lowerName = processName.toLowerCase();
          for (final debuggerName in debuggerProcesses) {
            if (lowerName == debuggerName.toLowerCase()) {
              malloc.free(processIds);
              malloc.free(bytesReturned);
              return processName;
            }
          }
        } catch (e) {
          continue;
        }
      }

      malloc.free(processIds);
      malloc.free(bytesReturned);
      return null;
    } catch (e) {
      _logger.d('Error checking known debugger processes: $e');
      return null;
    }
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
        calloc.free(moduleHandles);
        calloc.free(needed);
        CloseHandle(hProcess);
        return null;
      }

      final moduleName = wsalloc(MAX_PATH);
      final size = calloc<DWORD>()..value = MAX_PATH;

      if (GetModuleFileNameEx(
            hProcess,
            moduleHandles[0],
            moduleName,
            size.value,
          ) ==
          0) {
        free(moduleName);
        calloc.free(size);
        calloc.free(moduleHandles);
        calloc.free(needed);
        CloseHandle(hProcess);
        return null;
      }

      final fullPath = moduleName.toDartString();
      final baseName = fullPath.split('\\').last;

      free(moduleName);
      calloc.free(size);
      calloc.free(moduleHandles);
      calloc.free(needed);
      CloseHandle(hProcess);

      return baseName;
    } catch (e) {
      return null;
    }
  }

  /// Check if DBK64 driver is loaded (Dark Byte VM debugger)
  bool _isDBK64DriverLoaded() {
    try {
      // Check for DBK64.sys driver
      // This would require enumerating loaded drivers
      // For now, return false as placeholder
      return false; // Placeholder - requires driver enumeration
    } catch (e) {
      _logger.d('Error checking DBK64 driver: $e');
      return false;
    }
  }
}
