import 'dart:isolate';
import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:logger/logger.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/foundation.dart';
import '../launcher/plutonium_launcher.dart';
import '../reporting/discord_reporter.dart';
import '../../core/models/detection_report.dart';
import '../../core/config/config_service.dart';
// Scanner imports for static method in isolate
import 'scanners/plutonium_ad_dll_and_gsc_scanner.dart'
    show PlutoniumAdDllAndGscScanner;
import 'scanners/overlay_scanner.dart' show OverlayScanner;
import 'scanners/process_scanner.dart' show ProcessScanner;
import 'scanners/dma_scanner.dart' show DmaScanner;
import 'scanners/anti_debug_scanner.dart' show AntiDebugScanner;
import 'scanners/anti_tamper_scanner.dart' show AntiTamperScanner;
import 'scanners/handle_scanner.dart' show HandleScanner;
import 'scanners/thread_scanner.dart' show ThreadScanner;
import 'scanners/manual_mapping_scanner.dart' show ManualMappingScanner;
import 'scanners/hypervisor_scanner.dart' show HypervisorScanner;
import 'scanners/blacklist_scanner.dart' show BlacklistScanner;
import 'scanners/registry_scanner.dart' show RegistryScanner;
import 'scanners/dll_injection_scanner.dart' show DllInjectionScanner;
import 'scanners/adapter_detector.dart' show AdapterDetector;
import 'scanners/process_cloning_scanner.dart' show ProcessCloningScanner;

/// Main detection engine coordinator
class DetectionEngine {
  final Logger _logger = Logger();
  final ConfigService _configService = ConfigService();
  final PlutoniumLauncher _launcher = PlutoniumLauncher();
  final DiscordReporter _discordReporter = DiscordReporter();

  // Note: Scanners are instantiated in the isolate, not here
  // to allow proper memory isolation

  Isolate? _scanIsolate;
  bool _isScanning = false;
  ReceivePort? _receivePort;

  // Track which detections have already been reported to prevent duplicates
  final Set<String> _reportedDetections = {};

  // Stream controller for broadcasting detections to UI
  final _detectionStreamController =
      StreamController<List<DetectionReport>>.broadcast();

  /// Stream of detections for UI to listen to
  Stream<List<DetectionReport>> get detectionStream =>
      _detectionStreamController.stream;

  /// Start the detection scanning loop
  Future<void> startScanning() async {
    if (_isScanning) {
      _logger.w('Scanning already in progress');
      return;
    }

    try {
      final config = await _configService.loadConfig();
      if (!config.antiCheatEnabled) {
        _logger.i('Anti-cheat is disabled');
        return;
      }

      _receivePort = ReceivePort();

      // Set up listener before spawning isolate to avoid race conditions
      _receivePort!.listen((message) {
        if (message is List<DetectionReport>) {
          // Broadcast detections to UI listeners
          _detectionStreamController.add(message);
          // Handle detections (report to Discord, kill process, etc.)
          _handleDetections(message);
        }
      });

      // Get current process info to exclude from scans
      final currentPid = pid;
      final executablePath = Platform.resolvedExecutable;
      final executableName = executablePath
          .split(Platform.pathSeparator)
          .last
          .toLowerCase();

      // Pass config data to the isolate (can't use ConfigService in isolates)
      final isolateData = {
        'sendPort': _receivePort!.sendPort,
        'scanIntervalSeconds': config.scanIntervalSeconds,
        'excludePid': currentPid,
        'excludeProcessName': executableName,
      };

      // Spawn isolate asynchronously to prevent blocking the UI
      // Don't await - let it spawn in the background
      Isolate.spawn(_scanLoop, isolateData)
          .then((isolate) {
            _scanIsolate = isolate;
            _isScanning = true;
            _logger.i('Detection engine started');
          })
          .catchError((error, stackTrace) {
            _logger.e('Failed to spawn scan isolate: $error');
            _logger.e('Stack trace: $stackTrace');
            _receivePort?.close();
            _receivePort = null;
            _isScanning = false;
          });

      // Mark as scanning immediately (will be updated when isolate actually spawns)
      // This prevents multiple start attempts
      _isScanning = true;
      _logger.i('Detection engine starting...');
    } catch (e) {
      _logger.e('Error starting detection engine: $e');
    }
  }

  /// Stop the detection scanning loop
  Future<void> stopScanning() async {
    if (!_isScanning) {
      return;
    }

    try {
      _scanIsolate?.kill(priority: Isolate.immediate);
      _receivePort?.close();
      _scanIsolate = null;
      _receivePort = null;
      _isScanning = false;
      // Clear reported detections when stopping to allow fresh reports on restart
      _reportedDetections.clear();
      _logger.i('Detection engine stopped');
    } catch (e) {
      _logger.e('Error stopping detection engine: $e');
    }
  }

  /// Dispose resources
  void dispose() {
    _detectionStreamController.close();
  }

  /// Scan loop running in isolate
  static void _scanLoop(Map<String, dynamic> isolateData) async {
    final logger = Logger();
    final sendPort = isolateData['sendPort'] as SendPort;
    final rawScanIntervalSeconds = isolateData['scanIntervalSeconds'] as int;
    final scanIntervalSeconds = rawScanIntervalSeconds < 5
        ? 5
        : rawScanIntervalSeconds;
    final excludePid = isolateData['excludePid'] as int;
    final excludeProcessName = isolateData['excludeProcessName'] as String;

    // Wait before initializing scanners to prevent blocking during app launch
    await Future.delayed(const Duration(seconds: 3));

    // Initialize scanners after delay to prevent blocking
    final appdataModScanner = PlutoniumAdDllAndGscScanner();
    final overlayScanner = OverlayScanner(
      excludePid: excludePid,
      excludeProcessName: excludeProcessName,
    );
    final processScanner = ProcessScanner(
      excludePid: excludePid,
      excludeProcessName: excludeProcessName,
    );
    final dmaScanner = DmaScanner();

    // UltimateAntiCheat feature scanners
    final antiDebugScanner = AntiDebugScanner();
    final antiTamperScanner = AntiTamperScanner();
    final handleScanner = HandleScanner();
    final threadScanner = ThreadScanner();
    final manualMappingScanner = ManualMappingScanner();
    final hypervisorScanner = HypervisorScanner();
    final blacklistScanner = BlacklistScanner();
    final registryScanner = RegistryScanner();
    final dllInjectionScanner = DllInjectionScanner();
    final adapterDetector = AdapterDetector();
    final processCloningScanner = ProcessCloningScanner(
      excludePid: excludePid,
      excludeProcessName: excludeProcessName,
    );

    try {
      final scanInterval = Duration(seconds: scanIntervalSeconds);

      // Wait a bit more before starting first scan
      await Future.delayed(const Duration(seconds: 2));

      // Wait for the actual game window to appear before starting scans
      // The launcher opens first, then bootstrapper, then the game window
      logger.d('Waiting for Plutonium game window to appear...');
      bool gameWindowFound = false;
      int waitAttempts = 0;
      const maxWaitAttempts = 30; // Wait up to 30 seconds (30 * 1 second)

      while (!gameWindowFound && waitAttempts < maxWaitAttempts) {
        await Future.delayed(const Duration(seconds: 1));
        waitAttempts++;

        // Only check for window every 3 seconds to avoid blocking
        if (waitAttempts % 3 == 0) {
          try {
            final foundWindow = await overlayScanner.findGameWindow();
            if (foundWindow != 0) {
              gameWindowFound = true;
              logger.i('Game window found, starting scans');
              break;
            }
          } catch (e) {
            logger.d('Error checking for game window: $e');
          }
        }

        // Log progress every 5 seconds
        if (waitAttempts % 5 == 0) {
          logger.d(
            'Still waiting for game window... (attempt $waitAttempts/$maxWaitAttempts)',
          );
        }
      }

      if (!gameWindowFound) {
        logger.w(
          'Game window not found after $maxWaitAttempts seconds, starting scans anyway',
        );
      }

      int scanCycle = 0;
      while (true) {
        scanCycle++;
        try {
          final allDetections = <DetectionReport>[];

          // Run all scanners with individual error handling and yields between them
          try {
            final appdataModDetections = await appdataModScanner.scan();
            allDetections.addAll(appdataModDetections);
            // Yield after each scanner to prevent blocking
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in Plutonium appdata DLL/GSC scanner: $e');
          }

          // Run overlay scanner every scan to catch ESP overlays quickly
          // Overlay scanning is now optimized with async enumeration
          try {
            final overlayDetections = await overlayScanner.scan();
            allDetections.addAll(overlayDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in overlay scanner: $e');
          }

          try {
            final processDetections = await processScanner.scan();
            allDetections.addAll(processDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in process scanner: $e');
          }

          try {
            final dmaDetections = await dmaScanner.scan();
            allDetections.addAll(dmaDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in DMA scanner: $e');
          }

          // Run anti-debug scanner (every scan - critical for security)
          try {
            final antiDebugDetections = await antiDebugScanner.scan();
            allDetections.addAll(antiDebugDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in anti-debug scanner: $e');
          }

          // Run anti-tamper scanner (every scan - critical for security)
          try {
            final antiTamperDetections = await antiTamperScanner.scan();
            allDetections.addAll(antiTamperDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in anti-tamper scanner: $e');
          }

          // Run handle scanner (every scan)
          try {
            final handleDetections = await handleScanner.scan();
            allDetections.addAll(handleDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in handle scanner: $e');
          }

          // Run thread scanner (every scan)
          try {
            final threadDetections = await threadScanner.scan();
            allDetections.addAll(threadDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in thread scanner: $e');
          }

          // Run manual mapping scanner (less frequently - expensive)
          // Run every 5th scan cycle
          if (scanCycle % 5 == 0) {
            try {
              final manualMappingDetections = await manualMappingScanner.scan();
              allDetections.addAll(manualMappingDetections);
              await Future.delayed(const Duration(milliseconds: 50));
            } catch (e) {
              logger.e('Error in manual mapping scanner: $e');
            }
          }

          // Run hypervisor scanner (less frequently)
          // Run every 10th scan cycle
          if (scanCycle % 10 == 0) {
            try {
              final hypervisorDetections = await hypervisorScanner.scan();
              allDetections.addAll(hypervisorDetections);
              await Future.delayed(const Duration(milliseconds: 50));
            } catch (e) {
              logger.e('Error in hypervisor scanner: $e');
            }
          }

          // Run blacklist scanner (every scan)
          try {
            final blacklistDetections = await blacklistScanner.scan();
            allDetections.addAll(blacklistDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in blacklist scanner: $e');
          }

          // Run registry scanner (less frequently - requires native code)
          // Run every 10th scan cycle
          if (scanCycle % 10 == 0) {
            try {
              final registryDetections = await registryScanner.scan();
              allDetections.addAll(registryDetections);
              await Future.delayed(const Duration(milliseconds: 50));
            } catch (e) {
              logger.e('Error in registry scanner: $e');
            }
          }

          // Run DLL injection scanner (every scan - critical for security)
          try {
            final dllInjectionDetections = await dllInjectionScanner.scan();
            allDetections.addAll(dllInjectionDetections);
            await Future.delayed(const Duration(milliseconds: 50));
          } catch (e) {
            logger.e('Error in DLL injection scanner: $e');
          }

          // Run adapter detector (every 10th scan cycle - less frequent due to overhead)
          if (scanCycle % 1 == 0) {
            try {
              logger.i(
                'Running game adapter detector (scan cycle $scanCycle)...',
              );
              final adapterDetections = await adapterDetector.scan();
              allDetections.addAll(adapterDetections);
              if (adapterDetections.isNotEmpty) {
                logger.w(
                  'Game adapter detector found ${adapterDetections.length} detection(s)',
                );
              }
              await Future.delayed(const Duration(milliseconds: 50));
            } catch (e, stackTrace) {
              logger.e('Error in adapter detector: $e');
              logger.e('Stack trace: $stackTrace');
            }
          }

          // Run process cloning scanner (every 5th scan cycle - expensive)
          if (scanCycle % 5 == 0) {
            try {
              final cloningDetections = await processCloningScanner.scan();
              allDetections.addAll(cloningDetections);
              await Future.delayed(const Duration(milliseconds: 50));
            } catch (e) {
              logger.e('Error in process cloning scanner: $e');
            }
          }

          if (allDetections.isNotEmpty) {
            logger.w('Found ${allDetections.length} detections');
            sendPort.send(allDetections);
          }

          await Future.delayed(scanInterval);
        } catch (e) {
          logger.e('Error in scan loop: $e');
          await Future.delayed(const Duration(seconds: 5));
        }
      }
    } catch (e) {
      logger.e('Fatal error in scan loop: $e');
    }
  }

  /// Report detections from outside the isolate (e.g., memory tampering detection)
  /// This ensures they get reported to Discord and handled properly
  Future<void> reportDetections(List<DetectionReport> detections) async {
    if (detections.isEmpty) return;
    
    _logger.i(
      '[Detection Engine] Reporting ${detections.length} detection(s) from external source',
    );
    
    // Broadcast to stream listeners
    _detectionStreamController.add(detections);
    
    // Handle detections (report to Discord, kill process, etc.)
    await _handleDetections(detections);
  }

  /// Handle detected cheats
  Future<void> _handleDetections(List<DetectionReport> detections) async {
    _logger.w('Handling ${detections.length} detections');

    for (final detection in detections) {
      try {
        // Generate unique key for this detection
        final detectionKey = _generateDetectionKey(detection);

        // Skip if we've already reported this detection
        if (_reportedDetections.contains(detectionKey)) {
          _logger.d(
            'Skipping duplicate detection: ${detection.type} - ${detection.processName}',
          );
          continue;
        }

        // Mark as reported
        _reportedDetections.add(detectionKey);

        // Report to Discord (only once)
        _logger.i(
          '[Detection Engine] Reporting detection to Discord: ${detection.type} - ${detection.processName}',
        );
        await _discordReporter.reportDetection(detection);

        // Kill Plutonium process
        if (_launcher.isRunning()) {
          await _launcher.kill();
          _logger.w('Killed Plutonium process due to detection');
        }

        // Log detection
        _logger.w('Detection: ${detection.type} - ${detection.processName}');

        // Persist detection to file (only in debug mode)
        if (kDebugMode) {
          _persistDetection(detection);
        }
      } catch (e) {
        _logger.e('Error handling detection: $e');
      }
    }
  }

  /// Persist a detection to the logs file (debug mode only)
  Future<void> _persistDetection(DetectionReport detection) async {
    const logsFileName = 'detection_logs.json';
    try {
      final appDir = await getApplicationSupportDirectory();
      final logsFile = File('${appDir.path}/$logsFileName');

      List<DetectionReport> existingLogs = [];
      if (await logsFile.exists()) {
        try {
          final content = await logsFile.readAsString();
          final List<dynamic> jsonList = jsonDecode(content);
          existingLogs = jsonList
              .map((json) => DetectionReport.fromJson(json))
              .toList();
        } catch (e) {
          _logger.w('Error reading existing logs, starting fresh: $e');
        }
      }

      // Add new detection
      existingLogs.add(detection);

      // Limit to last 1000 logs to prevent file from growing too large
      if (existingLogs.length > 1000) {
        existingLogs.sort((a, b) => b.timestamp.compareTo(a.timestamp));
        existingLogs = existingLogs.take(1000).toList();
      }

      // Save to file
      final jsonList = existingLogs.map((log) => log.toJson()).toList();
      await logsFile.writeAsString(jsonEncode(jsonList));
    } catch (e) {
      _logger.e('Error persisting detection: $e');
    }
  }

  /// Generate a unique key for a detection to prevent duplicate reports
  /// Uses cheat type + process name + key evidence (file path, window title, etc.)
  String _generateDetectionKey(DetectionReport detection) {
    final parts = <String>[
      detection.type.name,
      detection.processName ?? 'unknown',
    ];

    // Add key evidence that uniquely identifies this detection
    final evidence = detection.evidence;

    // For file-based detections (host menu, GSC files)
    if (evidence.containsKey('filePath')) {
      parts.add(evidence['filePath'].toString());
    }

    // For overlay detections (window title)
    if (evidence.containsKey('windowTitle')) {
      parts.add(evidence['windowTitle'].toString());
    }

    // For process-based detections (process ID)
    if (evidence.containsKey('processId')) {
      parts.add(evidence['processId'].toString());
    }

    // For DMA device detections (device ID)
    if (evidence.containsKey('deviceId')) {
      parts.add(evidence['deviceId'].toString());
    }

    // For DLL injection detections (module path)
    if (evidence.containsKey('modulePath')) {
      parts.add(evidence['modulePath'].toString());
    }

    // For unsigned module detections (module path)
    if (evidence.containsKey('modulePath')) {
      parts.add(evidence['modulePath'].toString());
    }

    // For adapter detections (hardware ID or adapter type)
    if (evidence.containsKey('hardwareId')) {
      parts.add(evidence['hardwareId'].toString());
    }
    if (evidence.containsKey('adapterType')) {
      parts.add(evidence['adapterType'].toString());
    }

    return parts.join('|');
  }

  /// Check if scanning is active
  bool get isScanning => _isScanning;
}
