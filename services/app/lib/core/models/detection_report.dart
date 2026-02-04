/// Detection report model for cheat detection events
class DetectionReport {
  final CheatType type;
  final Map<String, dynamic> evidence;
  final DateTime timestamp;
  final String? processName;

  DetectionReport({
    required this.type,
    required this.evidence,
    DateTime? timestamp,
    this.processName,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'type': type.name,
    'evidence': evidence,
    'timestamp': timestamp.toIso8601String(),
    'processName': processName,
  };

  factory DetectionReport.fromJson(Map<String, dynamic> json) =>
      DetectionReport(
        type: CheatType.values.firstWhere(
          (e) => e.name == json['type'],
          orElse: () => CheatType.unknown,
        ),
        evidence: Map<String, dynamic>.from(json['evidence'] ?? {}),
        timestamp: DateTime.parse(json['timestamp']),
        processName: json['processName'],
      );

  @override
  String toString() {
    return 'DetectionReport(type: $type, processName: $processName, timestamp: $timestamp)';
  }
}

/// Types of cheats that can be detected
/// Based on UltimateAntiCheat DetectionFlags
enum CheatType {
  // Existing detections
  hostMenu,
  nonHostMenu,
  injectableMod,
  overlayMenu,
  directMenu,
  duplicateWindow,
  aiExternal,
  dmaDevice,
  dllInjection,
  suspiciousMemoryRegion,
  unsignedModule,
  checksumMismatch,
  memoryTampering, // Child process memory tampering detected
  processCloning, // Process cloning detected
  // Memory and code integrity detections
  pageProtections, // Re-remapping detected
  codeIntegrity, // .text section changes
  dllTampering, // Hooking or modifying loaded DLLs
  badIAT, // IAT hooking
  manualMapping, // Manual DLL mapping detected
  // Process and handle detections
  openProcessHandles, // Open handles to our process
  unsignedDrivers, // Unsigned drivers detected
  injectedIllegalProgram, // Injected unsigned program
  externalIllegalProgram, // External cheat program
  blacklistedProcess, // Blacklisted process running
  // System detections
  registryKeyModifications, // Important registry keys modified
  suspendedThread, // Suspended thread detected
  hypervisor, // Hypervisor/VM detected
  // Debugger detections
  debugWinApiDebugger, // IsDebuggerPresent() returns true
  debugPEB, // PEB BeingDebugged flag set
  debugHardwareRegisters, // Hardware debug registers set
  debugHeapFlag, // Heap flags indicate debugging
  debugInt3, // INT3 breakpoint detected
  debugInt2C, // INT2C breakpoint detected
  debugCloseHandle, // CloseHandle anti-debug trick detected
  debugDebugObject, // Debug object detected
  debugVEHDebugger, // VEH debugger detected
  debugDBK64Driver, // DBK64 driver loaded
  debugKernelDebugger, // Kernel debugger present
  debugTrapFlag, // Trap flag set
  debugDebugPort, // Debug port detected
  debugProcessDebugFlags, // Process debug flags set
  debugRemoteDebugger, // Remote debugger detected
  debugDbgBreak, // DbgBreakPoint detected
  debugKnownDebuggerProcess, // Known debugger process running
  // Game adapter detections
  gameAdapter, // Game adapter device detected (Titan, Cronus, XIM, etc.)

  unknown,
}
