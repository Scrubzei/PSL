import 'dart:io';
import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../../core/models/detection_report.dart';

/// Handle scanner - detects open handles to our process
/// Based on UltimateAntiCheat CheckOpenHandles detection
class HandleScanner {
  final Logger _logger = Logger();
  final int _currentPid = pid;

  /// Scan for suspicious open handles to our process
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      // Enumerate all processes using EnumProcesses (same as ProcessScanner)
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        malloc.free(processIds);
        malloc.free(bytesReturned);
        return detections;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();
      final maxProcessesToCheck = processCount > 128 ? 128 : processCount;
      final suspiciousProcesses = <String>[];

      for (var i = 0; i < maxProcessesToCheck; i++) {
        final processId = processIds[i];
        if (processId == 0) continue;

        // Skip ourselves
        if (processId == _currentPid) {
          continue;
        }

        // Yield periodically to prevent blocking
        if (i % 10 == 0) {
          await Future.delayed(const Duration(milliseconds: 1));
        }

        try {
          final processName = _getProcessName(processId);
          if (processName == null) continue;

          // Try to open our process with PROCESS_QUERY_INFORMATION
          // If successful, the process has a handle to us
          final hProcess = OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            FALSE,
            _currentPid,
          );

          if (hProcess != NULL) {
            // Check if this is a suspicious process
            if (_isSuspiciousProcess(processName)) {
              suspiciousProcesses.add(processName);
            }
            CloseHandle(hProcess);
          }
        } catch (e) {
          // Skip processes we can't access
          continue;
        }
      }

      malloc.free(processIds);
      malloc.free(bytesReturned);

      // Create detection reports for suspicious processes
      for (final processName in suspiciousProcesses) {
        detections.add(
          DetectionReport(
            type: CheatType.openProcessHandles,
            evidence: {
              'processName': processName,
              'reason': 'Process has open handle to our process',
            },
            processName: processName,
          ),
        );
      }
    } catch (e) {
      _logger.e('Error in handle scanner: $e');
    }

    return detections;
  }

  /// Check if a process name is suspicious
  bool _isSuspiciousProcess(String processName) {
    final lowerName = processName.toLowerCase();

    // Common cheat tool names
    final suspiciousKeywords = [
      'cheat',
      'hack',
      'inject',
      'hook',
      'bypass',
      'spoofer',
      'memory',
      'debug',
      'dbg',
      'trainer',
      'mod',
      'modder',
    ];

    // Exclude legitimate system processes
    final excludedProcesses = [
      'explorer.exe',
      'dwm.exe',
      'winlogon.exe',
      'csrss.exe',
      'services.exe',
      'svchost.exe',
      'lsass.exe',
      'smss.exe',
      'taskmgr.exe',
      'taskeng.exe',
      'audiodg.exe',
    ];

    if (excludedProcesses.contains(lowerName)) {
      return false;
    }

    // Check for suspicious keywords
    for (final keyword in suspiciousKeywords) {
      if (lowerName.contains(keyword)) {
        return true;
      }
    }

    return false;
  }

  /// Get process name from process ID (same as ProcessScanner)
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
}
