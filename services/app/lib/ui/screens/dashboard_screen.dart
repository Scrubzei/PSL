import 'package:shadcn_flutter/shadcn_flutter.dart';
import '../../core/config/config_service.dart';
import '../../services/launcher/plutonium_launcher.dart';
import '../../services/anticheat/detection_engine.dart';
import '../../services/anticheat/scanners/overlay_scanner.dart';
import '../../services/anticheat/scanners/adapter_detector.dart';
import '../../services/auth/auth_service.dart';
import '../../core/models/detection_report.dart';
import 'package:logger/logger.dart' as logger_pkg;
import 'settings_screen.dart';
import 'queue_screen.dart';
import 'logs_screen.dart';
import 'login_screen.dart';
import 'dart:async';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ConfigService _configService = ConfigService();
  final PlutoniumLauncher _launcher = PlutoniumLauncher();
  final DetectionEngine _detectionEngine = DetectionEngine();
  final AuthService _authService = AuthService();
  final logger_pkg.Logger _logger = logger_pkg.Logger();

  bool _isAntiCheatActive = false;
  bool _isPlutoniumRunning = false;
  final String _queueStatus = 'Not in queue';
  Timer? _windowCheckTimer;
  OverlayScanner? _overlayScanner;
  String _adapterStatus = 'Clean';
  bool _hasAdapterDetections = false;
  Timer? _adapterScanTimer;
  StreamSubscription<List<DetectionReport>>? _detectionSubscription;

  @override
  void initState() {
    super.initState();
    _loadConfig();
    _startWindowMonitoring();
    _startAdapterMonitoring();
    _listenToDetections();
  }

  @override
  void dispose() {
    _detectionEngine.stopScanning();
    _windowCheckTimer?.cancel();
    _adapterScanTimer?.cancel();
    _detectionSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadConfig() async {
    final config = await _configService.loadConfig();
    setState(() {
      _isAntiCheatActive = config.antiCheatEnabled;
    });
  }

  /// Start monitoring for the Plutonium game window from app launch
  void _startWindowMonitoring() {
    // Initialize overlay scanner for window detection
    _overlayScanner = OverlayScanner();

    // Check immediately
    _checkForGameWindow();

    // Then check every 2 seconds
    _windowCheckTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      _checkForGameWindow();
    });
  }

  /// Check if the Plutonium game window is running
  Future<void> _checkForGameWindow() async {
    try {
      if (_overlayScanner == null) return;

      final gameWindow = await _overlayScanner!.findGameWindow();

      if (gameWindow != 0 && !_isPlutoniumRunning) {
        // Game window found but UI state says it's not running
        if (mounted) {
          setState(() {
            _isPlutoniumRunning = true;
          });
          _logger.i('Detected Plutonium game window on launch');

          // If anti-cheat is enabled, start scanning
          // Note: startScanning() checks if already scanning, so safe to call multiple times
          if (_isAntiCheatActive && !_detectionEngine.isScanning) {
            _detectionEngine.startScanning().catchError((e) {
              _logger.e('Error starting detection engine: $e');
            });
          }
        }
      } else if (gameWindow == 0 && _isPlutoniumRunning) {
        // Game window not found but UI state says it's running
        // Check if launcher process is still running
        if (!_launcher.isRunning()) {
          if (mounted) {
            setState(() {
              _isPlutoniumRunning = false;
            });
            _logger.d('Plutonium game window closed');
          }
        }
      }
    } catch (e) {
      _logger.d('Error checking for game window: $e');
    }
  }

  Future<void> _launchPlutonium() async {
    try {
      // Check if user is authenticated
      if (!await _authService.isAuthenticated()) {
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const LoginScreen()),
          );
        }
        return;
      }

      final config = await _configService.loadConfig();
      if (config.plutoniumPath == null || config.plutoniumPath!.isEmpty) {
        if (mounted) {
          _showError(
            'Plutonium path not configured. Please set it in settings.',
          );
        }
        return;
      }

      setState(() {
        _isPlutoniumRunning = true;
      });

      await _launcher.launchPlutonium('t6mp'); // Black Ops 2 Multiplayer

      if (mounted) {
        setState(() {
          _isPlutoniumRunning = true;
        });

        // Start anti-cheat scanning if enabled (fire-and-forget to avoid blocking UI)
        // Note: startScanning() checks if already scanning, so safe to call multiple times
        if (_isAntiCheatActive && !_detectionEngine.isScanning) {
          _detectionEngine.startScanning().catchError((e) {
            _logger.e('Error starting detection engine: $e');
          });
        }
      }
    } catch (e) {
      _logger.e('Error launching Plutonium: $e');
      if (mounted) {
        _showError('Failed to launch Plutonium: $e');
        setState(() {
          _isPlutoniumRunning = false;
        });
      }
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          PrimaryButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  /// Listen to detections from the detection engine
  void _listenToDetections() {
    _detectionSubscription = _detectionEngine.detectionStream.listen((
      detections,
    ) {
      // Filter for game adapter detections
      final adapterDetections = detections
          .where((d) => d.type == CheatType.gameAdapter)
          .toList();

      if (mounted) {
        setState(() {
          if (adapterDetections.isNotEmpty) {
            _hasAdapterDetections = true;
            // Get the first detection's adapter type
            final firstDetection = adapterDetections.first;
            final adapterType =
                firstDetection.evidence['adapterType'] ?? 'Unknown';
            _adapterStatus = 'Suspicious: ${adapterType.toUpperCase()}';
            _logger.w('Adapter status updated: $_adapterStatus');
          } else {
            // Only update to clean if we had detections before
            // This prevents overwriting the status when other detections come through
            if (_hasAdapterDetections) {
              _hasAdapterDetections = false;
              _adapterStatus = 'Clean';
              _logger.i('Adapter status updated: Clean (no more detections)');
            }
          }
        });
      }
    });
  }

  /// Start monitoring for adapter devices
  /// This performs periodic scans to update status even when no detections occur
  void _startAdapterMonitoring() {
    // Perform initial scan
    _scanAdapters();

    // Scan every 30 seconds to update status (less frequent since detection engine also scans)
    _adapterScanTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      _scanAdapters();
    });
  }

  /// Scan for adapter devices and update status
  Future<void> _scanAdapters() async {
    try {
      final adapterDetector = AdapterDetector();
      final detections = await adapterDetector.scan();

      if (mounted) {
        setState(() {
          if (detections.isNotEmpty) {
            _hasAdapterDetections = true;
            // Get the first detection's adapter type
            final firstDetection = detections.first;
            final adapterType =
                firstDetection.evidence['adapterType'] ?? 'Unknown';
            _adapterStatus = 'Suspicious: ${adapterType.toUpperCase()}';
            _logger.i('Adapter scan found: $_adapterStatus');
          } else {
            // Only update to clean if we're not already showing a detection
            // This prevents overwriting real-time detection updates
            if (!_hasAdapterDetections) {
              _adapterStatus = 'Clean';
            }
          }
        });
      }
    } catch (e) {
      _logger.e('Error scanning adapters: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      headers: [
        AppBar(
          title: const Text('1v1LB Anti-Cheat'),
          trailing: [
            Button(
              style: const ButtonStyle.ghost(),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              ),
              child: const Icon(Icons.settings),
            ),
          ],
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Cards
            Row(
              children: [
                Expanded(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                _isAntiCheatActive
                                    ? Icons.shield
                                    : Icons.shield_outlined,
                                color: _isAntiCheatActive
                                    ? Colors.green
                                    : const Color(0xFF9E9E9E),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Anti-Cheat',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isAntiCheatActive ? 'Active' : 'Inactive',
                            style: TextStyle(
                              color: _isAntiCheatActive
                                  ? const Color(0xFF4CAF50)
                                  : const Color(0xFF9E9E9E),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                _isPlutoniumRunning
                                    ? Icons.play_circle
                                    : Icons.play_circle_outline,
                                color: _isPlutoniumRunning
                                    ? Colors.green
                                    : const Color(0xFF9E9E9E),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Plutonium',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isPlutoniumRunning ? 'Running' : 'Stopped',
                            style: TextStyle(
                              color: _isPlutoniumRunning
                                  ? const Color(0xFF4CAF50)
                                  : const Color(0xFF9E9E9E),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Adapter Status Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _hasAdapterDetections
                              ? Icons.warning
                              : Icons.check_circle,
                          color: _hasAdapterDetections
                              ? Colors.orange
                              : const Color(0xFF4CAF50),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Game Adapters',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _adapterStatus,
                      style: TextStyle(
                        color: _hasAdapterDetections
                            ? Colors.orange
                            : const Color(0xFF4CAF50),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Queue Status Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.queue),
                        const SizedBox(width: 8),
                        const Text(
                          'Queue Status',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(_queueStatus),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Launch Button
            PrimaryButton(
              onPressed: _isPlutoniumRunning ? null : _launchPlutonium,
              child: const Text('Launch Plutonium'),
            ),
            const SizedBox(height: 16),
            // Queue Button
            PrimaryButton(
              onPressed: () async {
                // Check if user is authenticated
                if (!await _authService.isAuthenticated()) {
                  if (mounted) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const LoginScreen(),
                      ),
                    );
                  }
                  return;
                }
                if (mounted) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const QueueScreen(),
                    ),
                  );
                }
              },
              child: const Text('Join Queue'),
            ),
            const SizedBox(height: 16),
            // Logs Button
            OutlineButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const LogsScreen()),
              ),
              child: const Text('View Logs'),
            ),
          ],
        ),
      ),
    );
  }
}
