import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../../core/models/detection_report.dart';

/// Blacklist scanner - detects blacklisted processes and byte patterns
/// Based on UltimateAntiCheat blacklisted process detection
class BlacklistScanner {
  final Logger _logger = Logger();

  // Blacklisted process names (from UltimateAntiCheat)
  final List<String> _blacklistedProcesses = [
    'cheatengine.exe',
    'cheatengine-x86_64-sse4-avx2.exe',
    'x64dbg.exe',
    'x32dbg.exe',
    'idaq64.exe',
    'idaq.exe',
    'ida.exe',
    'ida64.exe',
    'ollydbg.exe',
    'windbg.exe',
    'immunitydebugger.exe',
    'ghidra.exe',
    'radare2.exe',
    'r2.exe',
    'processhacker.exe',
    'processhacker2.exe',
    'processhacker64.exe',
    'processhacker32.exe',
    'hacker.exe',
    'hacktool.exe',
    'trainer.exe',
    'trainer64.exe',
    'trainer32.exe',
    'memoryviewer.exe',
    'memoryeditor.exe',
    'memoryhack.exe',
    'speedhack.exe',
    'bypass.exe',
    'spoofer.exe',
    'injector.exe',
    'dllinjector.exe',
    'manualmapper.exe',
    'kernelmapper.exe',
    'drivermapper.exe',
    'kdmapper.exe',
    'vulnerabledriver.exe',
    'testdriver.exe',
    'dbk64.exe',
    'darkbyte.exe',
    'darkbytevm.exe',
    'dbvm.exe',
    'dbvm64.exe',
    'dbvm32.exe',
    'vmdebugger.exe',
    'vmdebug.exe',
    'hypervisor.exe',
    'hyperv.exe',
    'vbox.exe',
    'vmware.exe',
    'virtualbox.exe',
    'qemu.exe',
    'bochs.exe',
    'parallels.exe',
    'parallelsdesktop.exe',
    'parallelsvm.exe',
    'vmwareworkstation.exe',
    'vmwareplayer.exe',
    'vmwarefusion.exe',
    'vmwarevsphere.exe',
    'vmwareesxi.exe',
    'vmwarevcenter.exe',
    'vmwarevcloud.exe',
    'vmwarehorizon.exe',
    'vmwareview.exe',
    'vmwarethinapp.exe',
    'vmwareworkspaceone.exe',
    'vmwareairwatch.exe',
    'vmwareunifiedaccessgateway.exe',
    'vmwarensx.exe',
    'vmwarevrealize.exe',
    'vmwarecloudfoundry.exe',
    'vmwarepivotal.exe',
    'vmwarebitnami.exe',
    'vmwarephoton.exe',
    'vmwarelightwave.exe',
    'vmwarewavefront.exe',
    'vmwaretanzu.exe',
    'vmwarecarbonblack.exe',
    'vmwaresecurestate.exe',
    'vmwareappdefense.exe',
    'vmwareworkspaceoneintelligence.exe',
    'vmwareworkspaceoneaccess.exe',
    'vmwareworkspaceoneunifiedendpointmanagement.exe',
    'vmwareworkspaceoneintelligenthub.exe',
    'vmwareworkspaceoneassistant.exe',
    'vmwareworkspaceonemobileflip.exe',
    'vmwareworkspaceoneboxer.exe',
    'vmwareworkspaceonecontent.exe',
    'vmwareworkspaceonebrowser.exe',
    'vmwareworkspaceonecatalog.exe',
    'vmwareworkspaceoneidentity.exe',
    'vmwareworkspaceoneverify.exe',
    'vmwareworkspaceoneintelligence.exe',
    'vmwareworkspaceoneaccess.exe',
    'vmwareworkspaceoneunifiedendpointmanagement.exe',
    'vmwareworkspaceoneintelligenthub.exe',
    'vmwareworkspaceoneassistant.exe',
    'vmwareworkspaceonemobileflip.exe',
    'vmwareworkspaceoneboxer.exe',
    'vmwareworkspaceonecontent.exe',
    'vmwareworkspaceonebrowser.exe',
    'vmwareworkspaceonecatalog.exe',
    'vmwareworkspaceoneidentity.exe',
    'vmwareworkspaceoneverify.exe',
  ];

  /// Scan for blacklisted processes
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      // Use EnumProcesses like ProcessScanner
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

      for (var i = 0; i < maxProcessesToCheck; i++) {
        final processId = processIds[i];
        if (processId == 0) continue;

        // Yield periodically to prevent blocking
        if (i % 10 == 0) {
          await Future.delayed(const Duration(milliseconds: 1));
        }

        try {
          final processName = _getProcessName(processId);
          if (processName == null) continue;

          final lowerName = processName.toLowerCase();

          // Check if process is blacklisted
          if (_blacklistedProcesses.contains(lowerName)) {
            detections.add(
              DetectionReport(
                type: CheatType.blacklistedProcess,
                evidence: {
                  'processName': processName,
                  'processId': processId,
                  'reason': 'Process is in blacklist',
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
      _logger.e('Error in blacklist scanner: $e');
    }

    return detections;
  }

  /// Scan for blacklisted byte patterns in process memory
  /// Note: This is a placeholder - full implementation would require
  /// reading process memory and pattern matching
  Future<List<DetectionReport>> scanBytePatterns(int processId) async {
    final detections = <DetectionReport>[];

    try {
      // Byte pattern scanning would require:
      // 1. Reading process memory
      // 2. Pattern matching against known cheat signatures
      // 3. This is computationally expensive and should be done carefully

      // For now, return empty list as placeholder
      // Full implementation would use FFI to read process memory
    } catch (e) {
      _logger.e('Error scanning byte patterns: $e');
    }

    return detections;
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
}
