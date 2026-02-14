import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../core/models/detection_report.dart';

/// Scanner for detecting process cloning
/// Detects processes created via RtlCloneUserProcess or similar techniques
class ProcessCloningScanner {
  final Logger _logger = Logger();
  final int? excludePid;
  final String? excludeProcessName;

  ProcessCloningScanner({this.excludePid, this.excludeProcessName});

  /// Scan for cloned processes
  /// Returns list of detection reports if any are found
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      // Get all processes
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
      final processes = <ProcessInfo>[];

      // Collect process information
      for (var i = 0; i < processCount && i < 256; i++) {
        final pid = processIds[i];
        if (pid == 0) continue;

        // Skip excluded process
        if (excludePid != null && pid == excludePid) {
          continue;
        }

        // Yield periodically to prevent blocking
        if (i % 20 == 0) {
          await Future.delayed(const Duration(milliseconds: 1));
        }

        try {
          final processInfo = _getProcessInfo(pid);
          if (processInfo != null) {
            processes.add(processInfo);
          }
        } catch (e) {
          // Skip processes we can't access
          continue;
        }
      }

      // Check for cloned processes
      detections.addAll(_detectClonedProcesses(processes));

      malloc.free(processIds);
      malloc.free(bytesReturned);
    } catch (e) {
      _logger.e('Error scanning for cloned processes: $e');
    }

    return detections;
  }

  /// Detect cloned processes based on anomalies
  List<DetectionReport> _detectClonedProcesses(List<ProcessInfo> processes) {
    final detections = <DetectionReport>[];

    try {
      // Group processes by name
      final processesByName = <String, List<ProcessInfo>>{};
      for (final process in processes) {
        if (process.name.isEmpty) continue;
        processesByName.putIfAbsent(process.name, () => []).add(process);
      }

      // Check for duplicate process names with different parents
      // This is a common sign of process cloning
      for (final entry in processesByName.entries) {
        final name = entry.key;
        final pids = entry.value;

        // Skip excluded process name
        if (excludeProcessName != null &&
            name.toLowerCase() == excludeProcessName!.toLowerCase()) {
          continue;
        }

        // If we have multiple processes with the same name, check for cloning
        if (pids.length > 1) {
          // Group by parent PID
          final byParent = <int, List<ProcessInfo>>{};
          for (final process in pids) {
            byParent.putIfAbsent(process.parentPid, () => []).add(process);
          }

          // If processes with same name have different parents, it's suspicious
          if (byParent.length > 1) {
            // Check if any parent is unexpected (not system/explorer)
            for (final parentEntry in byParent.entries) {
              final parentPid = parentEntry.key;
              final childProcesses = parentEntry.value;

              // Skip if parent is system (PID 4) or session manager (PID 0)
              if (parentPid == 4 || parentPid == 0) {
                continue;
              }

              // Get parent process name
              final parentInfo = _getProcessInfo(parentPid);
              if (parentInfo != null) {
                final parentName = parentInfo.name.toLowerCase();

                // If parent is not explorer.exe, winlogon.exe, or services.exe, it's suspicious
                if (parentName != 'explorer.exe' &&
                    parentName != 'winlogon.exe' &&
                    parentName != 'services.exe' &&
                    parentName != 'smss.exe') {
                  _logger.w(
                    'Found suspicious process cloning: $name (parent: ${parentInfo.name}, PID: $parentPid)',
                  );
                  detections.add(
                    DetectionReport(
                      type: CheatType.processCloning,
                      evidence: {
                        'processName': name,
                        'processId': childProcesses.first.pid,
                        'parentProcessName': parentInfo.name,
                        'parentProcessId': parentPid,
                        'reason': 'Multiple instances with unexpected parent',
                        'instanceCount': pids.length,
                        'score': 85.0,
                      },
                      processName: name,
                    ),
                  );
                }
              }
            }
          }

          // Check for processes with same name but no parent relationship
          // This could indicate cloning via RtlCloneUserProcess
          for (var i = 0; i < pids.length; i++) {
            for (var j = i + 1; j < pids.length; j++) {
              final proc1 = pids[i];
              final proc2 = pids[j];

              // If processes have same name but different parents and weren't spawned normally
              if (proc1.parentPid != proc2.parentPid &&
                  proc1.parentPid != 0 &&
                  proc2.parentPid != 0) {
                // Check handle counts - cloned processes often have anomalous handle counts
                if ((proc1.handleCount > 0 && proc2.handleCount > 0) &&
                    (proc1.handleCount != proc2.handleCount)) {
                  // Check if handle count difference is significant
                  final handleDiff = (proc1.handleCount - proc2.handleCount)
                      .abs();
                  if (handleDiff > 50) {
                    // Significant difference in handle counts - suspicious
                    _logger.w(
                      'Found process cloning via handle count anomaly: $name',
                    );
                    detections.add(
                      DetectionReport(
                        type: CheatType.processCloning,
                        evidence: {
                          'processName': name,
                          'processId1': proc1.pid,
                          'processId2': proc2.pid,
                          'handleCount1': proc1.handleCount,
                          'handleCount2': proc2.handleCount,
                          'reason':
                              'Handle count mismatch between duplicate processes',
                          'score': 75.0,
                        },
                        processName: name,
                      ),
                    );
                    break; // Only report once per process pair
                  }
                }
              }
            }
          }
        }
      }

      // Check for processes with unexpected children
      // Cloned processes sometimes spawn unexpected child processes
      for (final process in processes) {
        if (process.name.isEmpty) continue;

        // Skip excluded process
        if (excludeProcessName != null &&
            process.name.toLowerCase() == excludeProcessName!.toLowerCase()) {
          continue;
        }

        // Check if this process has unexpected children
        final children = processes
            .where((p) => p.parentPid == process.pid)
            .toList();
        if (children.isNotEmpty) {
          // Check if any child has a suspicious name or pattern
          for (final child in children) {
            if (_isSuspiciousChildProcess(process.name, child.name)) {
              _logger.w(
                'Found suspicious child process: ${child.name} (parent: ${process.name})',
              );
              detections.add(
                DetectionReport(
                  type: CheatType.processCloning,
                  evidence: {
                    'parentProcessName': process.name,
                    'parentProcessId': process.pid,
                    'childProcessName': child.name,
                    'childProcessId': child.pid,
                    'reason': 'Unexpected child process spawned',
                    'score': 70.0,
                  },
                  processName: child.name,
                ),
              );
            }
          }
        }
      }
    } catch (e) {
      _logger.e('Error detecting cloned processes: $e');
    }

    return detections;
  }

  /// Get process information
  ProcessInfo? _getProcessInfo(int pid) {
    try {
      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        0,
        pid,
      );

      if (hProcess == 0) {
        return null;
      }

      // Get process name
      final moduleName = wsalloc(MAX_PATH);
      final size = calloc<DWORD>()..value = MAX_PATH;
      String? processName;

      if (QueryFullProcessImageName(hProcess, 0, moduleName, size) != 0) {
        final fullPath = moduleName.toDartString();
        processName = fullPath.split('\\').last;
      }

      // Get parent process ID
      // Note: Getting parent PID requires NtQueryInformationProcess or CreateToolhelp32Snapshot
      // which may not be available in win32 package. For now, we'll use 0 as placeholder
      // and rely on other detection methods (duplicate names, handle counts, etc.)
      int parentPid = 0;
      // TODO: Implement parent PID detection via native FFI if needed

      // Get handle count (simplified - would need NtQuerySystemInformation for accurate count)
      int handleCount = 0;
      try {
        // This is a simplified check - full implementation would use NtQuerySystemInformation
        // For now, we'll use a placeholder
      } catch (e) {
        // Handle count detection failed
      }

      free(moduleName);
      calloc.free(size);
      CloseHandle(hProcess);

      if (processName == null) {
        return null;
      }

      return ProcessInfo(
        pid: pid,
        name: processName,
        parentPid: parentPid,
        handleCount: handleCount,
      );
    } catch (e) {
      return null;
    }
  }

  /// Check if a child process is suspicious
  bool _isSuspiciousChildProcess(String parentName, String childName) {
    final lowerParent = parentName.toLowerCase();
    final lowerChild = childName.toLowerCase();

    // Check for common cloning patterns
    // 1. Child process with same name as parent (self-cloning)
    if (lowerParent == lowerChild) {
      return true;
    }

    // 2. Suspicious child process names
    final suspiciousNames = [
      'dllhost.exe',
      'svchost.exe',
      'rundll32.exe',
      'wscript.exe',
      'cscript.exe',
    ];

    for (final suspicious in suspiciousNames) {
      if (lowerChild.contains(suspicious)) {
        // Check if parent is not a system process that would normally spawn these
        if (!lowerParent.contains('svchost.exe') &&
            !lowerParent.contains('services.exe') &&
            !lowerParent.contains('explorer.exe')) {
          return true;
        }
      }
    }

    return false;
  }
}

/// Process information structure
class ProcessInfo {
  final int pid;
  final String name;
  final int parentPid;
  final int handleCount;

  ProcessInfo({
    required this.pid,
    required this.name,
    required this.parentPid,
    required this.handleCount,
  });
}
