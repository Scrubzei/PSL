import 'dart:io';
import 'dart:isolate';
import 'package:logger/logger.dart';
import '../../core/config/config_service.dart';

/// Service for launching and managing the Plutonium client
class PlutoniumLauncher {
  final Logger _logger = Logger();
  final ConfigService _configService = ConfigService();
  int? _processId;

  /// Launch Plutonium with specified game type
  /// Game types: 't6mp' (BO2 Multiplayer), 't6zm' (BO2 Zombies), 'iw5mp' (MW3)
  Future<void> launchPlutonium(String gameType) async {
    try {
      final config = await _configService.loadConfig();
      final plutoniumPath = config.plutoniumPath;

      if (plutoniumPath == null || plutoniumPath.isEmpty) {
        throw Exception('Plutonium path not configured');
      }

      // Find the Plutonium executable
      final executablePath = _findExecutable(plutoniumPath);
      if (executablePath == null) {
        throw Exception(
          'Plutonium executable not found. Expected plutonium.exe in: $plutoniumPath',
        );
      }

      // Launch the process in detached mode (runs independently)
      // Note: plutonium.exe may accept game type as a command-line argument
      // Adjust arguments based on actual Plutonium launcher requirements
      _processId = await _spawnDetachedProcess(executablePath, [gameType]);
      _logger.i('Plutonium launched with PID: $_processId');

      // Note: Detached processes don't have stdio streams connected,
      // so we can't monitor stdout/stderr or exitCode.
      // The process runs independently and we only track the PID.
    } catch (e) {
      _logger.e('Error launching Plutonium: $e');
      rethrow;
    }
  }

  /// Find the Plutonium executable
  String? _findExecutable(String plutoniumPath) {
    // First try plutonium.exe in the root directory
    final executable = File('$plutoniumPath/plutonium.exe');
    if (executable.existsSync()) {
      return executable.path;
    }

    // Try in bin subdirectory
    final binExecutable = File('$plutoniumPath/bin/plutonium.exe');
    if (binExecutable.existsSync()) {
      return binExecutable.path;
    }

    // Fallback: try bootstrapper name (for older installations)
    final bootstrapper = File(
      '$plutoniumPath/plutonium-bootstrapper-win32.exe',
    );
    if (bootstrapper.existsSync()) {
      return bootstrapper.path;
    }

    // Try bootstrapper in bin subdirectory
    final altBootstrapper = File(
      '$plutoniumPath/bin/plutonium-bootstrapper-win32.exe',
    );
    if (altBootstrapper.existsSync()) {
      return altBootstrapper.path;
    }

    return null;
  }

  /// Check if Plutonium is currently running
  bool isRunning() {
    return _processId != null;
  }

  /// Get the current process ID
  int? get processId => _processId;

  /// Kill the Plutonium process
  Future<void> kill() async {
    if (_processId == null) return;
    try {
      final success = Process.killPid(_processId!);
      if (success) {
        _logger.i('Plutonium process kill signal sent');
      } else {
        _logger.w('Failed to kill Plutonium process (pid: $_processId)');
      }
    } catch (e) {
      _logger.e('Error killing Plutonium process: $e');
    } finally {
      _processId = null;
    }
  }

  Future<int> _spawnDetachedProcess(
    String executablePath,
    List<String> arguments,
  ) async {
    final receivePort = ReceivePort();
    await Isolate.spawn(_launchIsolateEntry, {
      'sendPort': receivePort.sendPort,
      'executablePath': executablePath,
      'arguments': arguments,
    });

    final result = await receivePort.first;
    receivePort.close();

    if (result is int) {
      return result;
    }
    if (result is String) {
      throw Exception(result);
    }
    throw Exception('Failed to launch Plutonium');
  }

  static Future<void> _launchIsolateEntry(Map<String, dynamic> message) async {
    final sendPort = message['sendPort'] as SendPort;
    final executablePath = message['executablePath'] as String;
    final arguments = (message['arguments'] as List).cast<String>();

    try {
      final process = await Process.start(
        executablePath,
        arguments,
        mode: ProcessStartMode.detached,
      );
      sendPort.send(process.pid);
    } catch (e) {
      sendPort.send('Error launching Plutonium: $e');
    }
  }
}
