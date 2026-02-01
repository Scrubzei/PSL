import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../core/models/detection_report.dart';

/// Scanner for detecting suspicious processes
class ProcessScanner {
  final Logger _logger = Logger();
  final int? excludePid;
  final String? excludeProcessName;

  ProcessScanner({this.excludePid, this.excludeProcessName});

  // Blacklisted process names (common cheat tools)
  static const List<String> _blacklistedProcesses = [
    'cheatengine',
    'processhacker',
    'xenos',
    'extremeinjector',
    'ghost',
    'aimbot',
    'esp',
    'wallhack',
  ];

  /// Scan for suspicious processes
  /// Returns list of detection reports if any are found
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        _logger.e('Failed to enumerate processes');
        malloc.free(processIds);
        malloc.free(bytesReturned);
        return detections;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();

      // Limit the number of processes we check to avoid performance issues
      // Check up to 128 processes per scan (reduced from 256 to prevent freezing)
      final maxProcessesToCheck = processCount > 128 ? 128 : processCount;

      for (var i = 0; i < maxProcessesToCheck; i++) {
        final processId = processIds[i];
        if (processId == 0) continue;

        // Skip the anti-cheat's own process
        if (excludePid != null && processId == excludePid) {
          continue;
        }

        // Yield periodically to prevent blocking
        if (i % 10 == 0) {
          await Future.delayed(const Duration(milliseconds: 1));
        }

        try {
          final processName = _getProcessName(processId);
          if (processName == null) continue;

          final lowerName = processName.toLowerCase();

          // Skip the anti-cheat's own process by name
          if (excludeProcessName != null && lowerName == excludeProcessName) {
            continue;
          }

          // Check against blacklist first (most common case)
          bool isBlacklisted = false;
          for (final blacklisted in _blacklistedProcesses) {
            if (lowerName.contains(blacklisted)) {
              _logger.w('Found blacklisted process: $processName');

              detections.add(
                DetectionReport(
                  type: CheatType.aiExternal,
                  evidence: {
                    'processName': processName,
                    'processId': processId,
                    'blacklisted': blacklisted,
                  },
                  processName: processName,
                ),
              );
              isBlacklisted = true;
              break;
            }
          }

          // Only check suspicious keywords if not already blacklisted
          if (!isBlacklisted && _isSuspiciousProcessName(lowerName)) {
            _logger.w('Found suspicious process: $processName');

            detections.add(
              DetectionReport(
                type: CheatType.aiExternal,
                evidence: {
                  'processName': processName,
                  'processId': processId,
                  'reason': 'Suspicious name pattern',
                },
                processName: processName,
              ),
            );
          }
        } catch (e) {
          // Skip processes we can't access
          continue;
        }
      }

      malloc.free(processIds);
      malloc.free(bytesReturned);
    } catch (e) {
      _logger.e('Error scanning processes: $e');
    }

    return detections;
  }

  /// Get process name from process ID
  String? _getProcessName(int processId) {
    try {
      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        0,
        processId,
      );

      if (hProcess == 0) {
        return null;
      }

      final moduleName = wsalloc(MAX_PATH);
      final size = calloc<DWORD>()..value = MAX_PATH;

      String? processName;
      if (QueryFullProcessImageName(hProcess, 0, moduleName, size) != 0) {
        final fullPath = moduleName.toDartString();
        processName = fullPath.split('\\').last;
      }

      free(moduleName);
      calloc.free(size);
      CloseHandle(hProcess);

      return processName;
    } catch (e) {
      return null;
    }
  }

  /// Check if process name is suspicious
  bool _isSuspiciousProcessName(String name) {
    final suspiciousKeywords = [
      'ai',
      'overlay',
      'hack',
      'cheat',
      'bot',
      'aim',
      'esp',
      'wall',
    ];

    for (final keyword in suspiciousKeywords) {
      if (name.contains(keyword)) {
        return true;
      }
    }

    return false;
  }
}
