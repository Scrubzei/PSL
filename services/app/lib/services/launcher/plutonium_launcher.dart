import 'dart:io';
import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../core/config/config_service.dart';
import '../anticheat/scanners/overlay_scanner.dart';

/// Service for launching and managing the Plutonium client
class PlutoniumLauncher {
  final Logger _logger = Logger();
  final ConfigService _configService = ConfigService();
  int? _processId;
  int? _hProcess; // Windows process handle for memory protection
  Process?
  _detachedProcess; // Store detached process to prevent garbage collection

  /// Launch Plutonium with specified game type
  /// Game types: 't6mp' (BO2 Multiplayer), 't6zm' (BO2 Zombies), 'iw5mp' (MW3)
  ///
  /// Launches Plutonium independently (detached mode), then attaches to it via polling
  /// for memory tampering protection.
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

      // Launch independently (detached), then attach via polling
      await launchIndependent(executablePath, [gameType]);
    } catch (e) {
      _logger.e('Error launching Plutonium: $e');
      rethrow;
    }
  }

  /// Launch Plutonium independently (detached mode) and attach via polling
  /// This allows the bootstrapper to run standalone, then we attach to it
  Future<void> launchIndependent(
    String executablePath,
    List<String> arguments,
  ) async {
    try {
      _logger.i('[Independent Launch] Starting Plutonium in detached mode...');

      // Launch in detached mode (non-blocking, independent process)
      // Store the process to prevent garbage collection
      _detachedProcess = await Process.start(
        executablePath,
        arguments,
        mode: ProcessStartMode.detached,
      );

      _logger.i(
        '[Independent Launch] Process started (PID: ${_detachedProcess?.pid}), waiting 1 second before attachment polling...',
      );

      // Wait a moment for the process to fully start before beginning attachment polling
      // This gives the updater time to initialize
      await Future.delayed(const Duration(seconds: 1));

      _logger.i(
        '[Independent Launch] Waiting for game window to appear before attaching...',
      );

      // Wait for game window to appear, then attach to game process
      await attachToGameProcess();
    } catch (e) {
      _logger.e('[Independent Launch] Error launching independently: $e');
      _detachedProcess = null; // Clear on error
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
    try {
      if (_processId != null) {
        // Use TerminateProcess for more reliable termination
        if (_hProcess != null &&
            _hProcess != 0 &&
            _hProcess != INVALID_HANDLE_VALUE) {
          final success = TerminateProcess(_hProcess!, 1);
          if (success != 0) {
            _logger.i('Plutonium process terminated');
          } else {
            final error = GetLastError();
            _logger.w('Failed to terminate process: $error');
            // Fallback to Process.killPid
            Process.killPid(_processId!);
          }
        } else {
          // Fallback if handle is not available
          final success = Process.killPid(_processId!);
          if (success) {
            _logger.i('Plutonium process kill signal sent');
          } else {
            _logger.w('Failed to kill Plutonium process (pid: $_processId)');
          }
        }
      }
    } catch (e) {
      _logger.e('Error killing Plutonium process: $e');
    } finally {
      _cleanup();
    }
  }

  /// Get the Windows process handle for memory protection operations
  /// Returns null if handle is not available
  int? get processHandle => _hProcess;

  /// Monitor process exit in background
  void _monitorProcessExit() {
    // Use a separate isolate or timer to monitor process exit
    // Since we have the process handle, we can use WaitForSingleObject
    Future(() async {
      if (_hProcess == null ||
          _hProcess == 0 ||
          _hProcess == INVALID_HANDLE_VALUE) {
        return;
      }

      // Wait for process to exit (with timeout check every second)
      while (true) {
        await Future.delayed(const Duration(seconds: 1));

        if (_hProcess == null) break;

        final waitResult = WaitForSingleObject(_hProcess!, 0);
        if (waitResult == WAIT_OBJECT_0) {
          // Process has exited
          final exitCode = calloc<DWORD>();
          GetExitCodeProcess(_hProcess!, exitCode);
          _logger.i('Plutonium process exited with code: ${exitCode.value}');
          calloc.free(exitCode);
          _cleanup();
          break;
        } else if (waitResult == WAIT_FAILED) {
          // Process handle is invalid (process already exited)
          _logger.d('Process handle invalid, assuming process exited');
          _cleanup();
          break;
        }
        // WAIT_TIMEOUT means process is still running, continue waiting
      }
    });
  }

  /// Monitor for child process windows and ensure they are visible
  void _monitorChildProcessWindows() {
    if (_processId == null) return;

    Future(() async {
      final knownProcessIds = <int>{_processId!};
      final shownWindows = <int>{}; // Track windows we've already shown
      int checkCount = 0;
      bool updaterClosed = false;

      // Monitor for up to 2 minutes (enough time for updater -> launcher -> game)
      final endTime = DateTime.now().add(const Duration(minutes: 2));

      while (DateTime.now().isBefore(endTime)) {
        if (_processId == null) break;

        checkCount++;

        // Check if updater has closed (process handle becomes invalid)
        if (!updaterClosed && _hProcess != null) {
          final waitResult = WaitForSingleObject(_hProcess!, 0);
          if (waitResult == WAIT_OBJECT_0 || waitResult == WAIT_FAILED) {
            updaterClosed = true;
            _logger.i(
              '✓ Updater process closed, waiting for launcher to appear...',
            );
            // Clear tracked processes to force rediscovery of new launcher process
            // Keep the original process ID for reference, but clear others
            final originalProcessId = _processId;
            knownProcessIds.clear();
            // Don't add the original process ID back - the launcher is a NEW process
            _logger.d(
              'Cleared tracked processes (original PID: $originalProcessId) - will rediscover launcher',
            );
            // Wait longer after updater closes to give launcher time to spawn and initialize
            // The launcher window might take a moment to appear
            _logger.d('Waiting 3 seconds for launcher process to spawn...');
            await Future.delayed(const Duration(milliseconds: 3000));
            _logger.d('Resuming window monitoring for launcher...');
          }
        }

        // Check more frequently in the first 10 seconds (when launcher is likely to appear)
        // Also check more frequently right after updater closes (for up to 12 seconds)
        // This gives us 60 checks at 200ms = 12 seconds of aggressive checking after updater closes
        final delay = (checkCount < 20 || (updaterClosed && checkCount < 80))
            ? const Duration(milliseconds: 200)
            : const Duration(milliseconds: 500);
        await Future.delayed(delay);

        try {
          // After updater closes, aggressively rediscover ALL plutonium.exe processes
          // The launcher is a new plutonium.exe process spawned after updater closes
          if (updaterClosed) {
            _logger.d(
              'Updater closed - rediscovering all Plutonium processes...',
            );
            final allPlutoniumProcesses = _discoverAllPlutoniumProcesses();
            for (final pid in allPlutoniumProcesses) {
              final processName = _getProcessName(pid);
              final lowerName = processName.toLowerCase();

              // Track all plutonium.exe processes (updater and launcher)
              if (lowerName == 'plutonium.exe' ||
                  lowerName.contains('plutonium') ||
                  lowerName == 't6mp.exe' ||
                  lowerName == 't6zm.exe' ||
                  lowerName == 'iw5mp.exe' ||
                  lowerName.contains('plutonium-bootstrapper') ||
                  lowerName == 'bootstrapper.exe') {
                if (!knownProcessIds.contains(pid)) {
                  knownProcessIds.add(pid);
                  _logger.i(
                    'Found Plutonium process: $processName (PID: $pid)',
                  );
                }
              }
            }
          } else {
            // Before updater closes, discover child processes normally
            final childProcessIds = _discoverChildProcesses(knownProcessIds);
            knownProcessIds.addAll(childProcessIds);

            if (childProcessIds.isNotEmpty) {
              _logger.i(
                'Discovered ${childProcessIds.length} child process(es): $childProcessIds',
              );
            }

            // Also discover ANY Plutonium-related processes (not just direct children)
            final allPlutoniumProcesses = _discoverAllPlutoniumProcesses();
            for (final pid in allPlutoniumProcesses) {
              if (!knownProcessIds.contains(pid)) {
                final processName = _getProcessName(pid);
                final lowerName = processName.toLowerCase();

                if (lowerName.contains('plutonium') ||
                    lowerName == 't6mp.exe' ||
                    lowerName == 't6zm.exe' ||
                    lowerName == 'iw5mp.exe' ||
                    lowerName.contains('plutonium-bootstrapper') ||
                    lowerName == 'bootstrapper.exe') {
                  knownProcessIds.add(pid);
                  _logger.i(
                    'Found Plutonium process: $processName (PID: $pid)',
                  );
                }
              }
            }
          }

          // Log all tracked processes for debugging
          if (checkCount % 20 == 0 && knownProcessIds.isNotEmpty) {
            final processNames = knownProcessIds
                .map((pid) => '${_getProcessName(pid)} ($pid)')
                .join(', ');
            _logger.d('Tracked processes: $processNames');
          }

          // Enumerate windows for tracked processes
          final windows = _enumerateProcessWindows(
            knownProcessIds,
            includeHidden: true,
          );

          // Also check ALL windows for "Plutonium Launcher" specifically
          // This ensures we find it even if the process isn't tracked yet
          final allWindowsCheck = _enumerateAllWindows();
          _logger.d(
            'Checking ${allWindowsCheck.length} windows for "Plutonium Launcher"',
          );

          // Log all windows from plutonium.exe to see what we're finding
          final plutoniumWindows = allWindowsCheck
              .where((w) => w.processName.toLowerCase() == 'plutonium.exe')
              .toList();
          if (plutoniumWindows.isNotEmpty) {
            _logger.i(
              '✓ Found ${plutoniumWindows.length} window(s) from plutonium.exe:',
            );
            for (final w in plutoniumWindows) {
              _logger.i(
                '  plutonium.exe window: "${w.windowTitle}" (PID: ${w.processId}, HWND: ${w.hwnd})',
              );
            }
          } else {
            // Log if we're not finding any plutonium.exe windows
            if (checkCount % 10 == 0 || updaterClosed) {
              _logger.w(
                '⚠ No windows from plutonium.exe found in ${allWindowsCheck.length} total windows',
              );
              // Log what processes we ARE tracking
              if (knownProcessIds.isNotEmpty) {
                final trackedProcessNames = knownProcessIds
                    .map((pid) => '${_getProcessName(pid)} ($pid)')
                    .join(', ');
                _logger.d('Currently tracking processes: $trackedProcessNames');
              }
            }
          }

          for (final windowInfo in allWindowsCheck) {
            final lowerTitle = windowInfo.windowTitle.toLowerCase();
            final lowerProcessName = windowInfo.processName.toLowerCase();

            // Check for exact match
            if (lowerTitle == 'plutonium launcher') {
              _logger.i(
                'FOUND "Plutonium Launcher" window during ALL windows check: "${windowInfo.windowTitle}" (${windowInfo.processName}, PID: ${windowInfo.processId}, HWND: ${windowInfo.hwnd})',
              );

              // Found the launcher! Add it to windows list if not already there
              if (!windows.any((w) => w.hwnd == windowInfo.hwnd)) {
                windows.add(windowInfo);
                _logger.i(
                  'Added "Plutonium Launcher" window to windows list (was not already there)',
                );
                if (!knownProcessIds.contains(windowInfo.processId)) {
                  knownProcessIds.add(windowInfo.processId);
                  _logger.i(
                    'Added process ${windowInfo.processName} (PID: ${windowInfo.processId}) to tracking',
                  );
                }
              } else {
                _logger.d(
                  '"Plutonium Launcher" window already in windows list',
                );
              }
            }

            // Also check for windows from plutonium.exe that might be the launcher
            // even if title doesn't match exactly (case sensitivity, extra spaces, etc.)
            if (lowerProcessName == 'plutonium.exe' &&
                lowerTitle.isNotEmpty &&
                (lowerTitle.contains('launcher') ||
                    lowerTitle.contains('plutonium'))) {
              _logger.d(
                'Found plutonium.exe window with launcher-related title: "${windowInfo.windowTitle}" (PID: ${windowInfo.processId})',
              );
              // Add it to windows list if not already there
              if (!windows.any((w) => w.hwnd == windowInfo.hwnd)) {
                windows.add(windowInfo);
                _logger.d(
                  'Added plutonium.exe window with launcher-related title to windows list',
                );
              }
            }
          }

          // Log if we found the launcher in the windows list
          final launcherInWindows = windows
              .where((w) => w.windowTitle.toLowerCase() == 'plutonium launcher')
              .toList();
          if (launcherInWindows.isNotEmpty) {
            _logger.i(
              '✓ "Plutonium Launcher" window IS in windows list before filtering: ${launcherInWindows.length} window(s)',
            );
          } else {
            _logger.w(
              '✗ "Plutonium Launcher" window NOT in windows list before filtering (checked ${windows.length} windows)',
            );
          }

          // Log all windows found for debugging
          if (checkCount % 10 == 0 || updaterClosed) {
            _logger.d(
              'Enumerated ${windows.length} window(s) from ${knownProcessIds.length} tracked process(es)',
            );
            for (final window in windows) {
              final isLauncher =
                  window.windowTitle.toLowerCase() == 'plutonium launcher';
              _logger.d(
                '  Window: "${window.windowTitle}" (${window.processName}, PID: ${window.processId})${isLauncher ? " [LAUNCHER]" : ""}',
              );
            }
          }

          // Also enumerate ALL windows and check if they belong to child processes
          // This catches windows even if process discovery missed them
          final allWindows = _enumerateAllWindows();
          for (final windowInfo in allWindows) {
            // Skip if already in our list
            if (windows.any((w) => w.hwnd == windowInfo.hwnd)) {
              continue;
            }

            // Skip only obviously suspicious windows
            final windowTitle = windowInfo.windowTitle.toLowerCase();
            final processName = windowInfo.processName.toLowerCase();

            if (windowTitle == 'hidden window') {
              continue;
            }

            // Skip windows with no title AND unknown process (likely system windows)
            if (windowTitle.isEmpty && processName == 'unknown') {
              continue;
            }

            // Only include windows from tracked processes if they have a meaningful title
            // This prevents showing system windows or windows with no title
            if (knownProcessIds.contains(windowInfo.processId)) {
              // After updater closes, include empty title windows from plutonium.exe
              // The launcher might start with an empty title
              final shouldInclude =
                  windowTitle.isNotEmpty ||
                  (updaterClosed &&
                      processName.toLowerCase() == 'plutonium.exe');

              if (shouldInclude) {
                windows.add(windowInfo);
                _logger.i(
                  'Found window from tracked process: ${windowInfo.processName} (PID: ${windowInfo.processId}, Title: "${windowTitle.isEmpty ? "[EMPTY]" : windowInfo.windowTitle}")',
                );
              }
              continue;
            }

            // Check if it's a Plutonium-related process
            if (processName.contains('plutonium') ||
                processName.contains('t6mp') ||
                processName.contains('t6zm') ||
                processName.contains('iw5mp') ||
                processName.contains('bootstrapper')) {
              // After updater closes, include empty title windows from plutonium.exe
              // The launcher might start with an empty title
              final shouldInclude =
                  windowTitle.isNotEmpty ||
                  processName.contains('launcher') ||
                  processName.contains('bootstrapper') ||
                  (updaterClosed &&
                      processName.toLowerCase() == 'plutonium.exe');

              if (shouldInclude) {
                // Add to known processes and windows
                if (!knownProcessIds.contains(windowInfo.processId)) {
                  knownProcessIds.add(windowInfo.processId);
                  _logger.i(
                    'Found Plutonium window by enumeration: ${windowInfo.processName} (PID: ${windowInfo.processId}, Title: "${windowTitle.isEmpty ? "[EMPTY]" : windowTitle}")',
                  );
                }
                windows.add(windowInfo);
              }
            }
          }

          // Filter out suspicious windows, system windows, and non-Plutonium applications
          var filteredWindows = windows.where((windowInfo) {
            final lowerTitle = windowInfo.windowTitle.toLowerCase();
            final lowerProcessName = windowInfo.processName.toLowerCase();

            // FIRST: Check for "Plutonium Launcher" - ALWAYS include this!
            // This must be checked FIRST before any other filtering
            if (lowerTitle == 'plutonium launcher') {
              _logger.i(
                '✓ FILTER: "Plutonium Launcher" window found - INCLUDING immediately: ${windowInfo.processName} (PID: ${windowInfo.processId})',
              );
              return true;
            }

            // Exclude obviously suspicious windows
            if (lowerTitle == 'hidden window') {
              _logger.d(
                'Excluding suspicious window: ${windowInfo.windowTitle} (${windowInfo.processName})',
              );
              return false;
            }

            // Exclude system processes
            final systemProcesses = [
              'explorer.exe',
              'dwm.exe',
              'winlogon.exe',
              'csrss.exe',
              'svchost.exe',
              'services.exe',
              'lsass.exe',
              'smss.exe',
            ];
            for (final sysProc in systemProcesses) {
              if (lowerProcessName == sysProc) {
                return false;
              }
            }

            // Exclude common IDE/editor processes
            final ideProcesses = [
              'cursor.exe',
              'code.exe',
              'devenv.exe',
              'idea.exe',
              'studio64.exe',
              'notepad++.exe',
              'sublime_text.exe',
            ];
            for (final ideProc in ideProcesses) {
              if (lowerProcessName.contains(ideProc.replaceAll('.exe', ''))) {
                _logger.d(
                  'Excluding IDE window: ${windowInfo.windowTitle} (${windowInfo.processName})',
                );
                return false;
              }
            }

            // CRITICAL: Only include windows from processes we're CERTAIN are Plutonium
            // Must have Plutonium-related process name AND meaningful title
            final isPlutoniumProcess =
                lowerProcessName.contains('plutonium') ||
                lowerProcessName == 't6mp.exe' ||
                lowerProcessName == 't6zm.exe' ||
                lowerProcessName == 'iw5mp.exe' ||
                lowerProcessName.contains('plutonium-bootstrapper') ||
                lowerProcessName == 'bootstrapper.exe';

            if (!isPlutoniumProcess) {
              _logger.d(
                'Excluding non-Plutonium window: ${windowInfo.windowTitle} (${windowInfo.processName})',
              );
              return false;
            }

            // Exclude system/IME windows even if they're from Plutonium process
            final systemWindowTitles = [
              'msctfime ui',
              'default ime',
              'cicerouiwndframe',
              'mediacontextnotificationwindow',
              'systemresourcenotifywindow',
            ];
            for (final sysTitle in systemWindowTitles) {
              if (lowerTitle.contains(sysTitle)) {
                _logger.d(
                  'Excluding system window: "${windowInfo.windowTitle}" (${windowInfo.processName})',
                );
                return false;
              }
            }

            // For plutonium.exe processes, be more lenient - show windows even without keywords
            // as long as they're not system windows and have a title
            if (lowerProcessName == 'plutonium.exe') {
              // Check for "Plutonium Launcher" specifically - ALWAYS include this!
              if (lowerTitle == 'plutonium launcher') {
                _logger.i(
                  '✓ FILTER: Found "Plutonium Launcher" window from plutonium.exe - INCLUDING: "${windowInfo.windowTitle}"',
                );
                return true;
              }

              // After updater closes, include empty title windows - the launcher might start with empty title
              if (updaterClosed && lowerTitle.isEmpty) {
                _logger.i(
                  '✓ FILTER: Including empty title window from plutonium.exe after updater closed (might be launcher): PID: ${windowInfo.processId}, HWND: ${windowInfo.hwnd}',
                );
                return true;
              }

              // Show if it has a title (even if it doesn't contain keywords)
              // This catches the launcher which might have a generic title
              if (lowerTitle.isNotEmpty) {
                _logger.d(
                  'Including plutonium.exe window: "${windowInfo.windowTitle}"',
                );
                return true;
              }
            }

            // For other Plutonium processes, require keywords in title
            // Exclude windows with no title
            if (lowerTitle.isEmpty) {
              _logger.d(
                'Excluding window with empty title: ${windowInfo.processName}',
              );
              return false;
            }

            // Check for "Plutonium Launcher" specifically (exact match)
            // ALWAYS include this window - it's the launcher we're looking for!
            if (lowerTitle == 'plutonium launcher') {
              _logger.i(
                '✓ FILTER: Found "Plutonium Launcher" window - INCLUDING: ${windowInfo.processName} (PID: ${windowInfo.processId})',
              );
              return true;
            }

            // Only include if title contains Plutonium-related keywords
            final plutoniumTitleKeywords = [
              'plutonium launcher', // Check for exact phrase first
              'plutonium',
              'launcher',
              'bootstrapper',
              'updater',
              't6mp',
              't6zm',
              'iw5mp',
            ];
            bool hasPlutoniumKeyword = false;
            for (final keyword in plutoniumTitleKeywords) {
              if (lowerTitle.contains(keyword)) {
                hasPlutoniumKeyword = true;
                break;
              }
            }

            if (!hasPlutoniumKeyword) {
              _logger.d(
                'Excluding window without Plutonium keywords in title: "${windowInfo.windowTitle}" (${windowInfo.processName})',
              );
              return false;
            }

            return true;
          }).toList();

          // Also check ALL windows for Plutonium-related titles (fallback detection)
          // This catches launcher windows even if process name doesn't match
          // Run this proactively, especially after updater closes
          if (updaterClosed || filteredWindows.isEmpty) {
            if (filteredWindows.isEmpty || updaterClosed) {
              _logger.d(
                'Checking all windows by title (updaterClosed: $updaterClosed, windowsFound: ${filteredWindows.length})...',
              );
            }
            final allWindowsForTitle = _enumerateAllWindows();
            _logger.d(
              'Enumerated ${allWindowsForTitle.length} windows for title-based search',
            );

            for (final windowInfo in allWindowsForTitle) {
              final lowerTitle = windowInfo.windowTitle.toLowerCase();
              final lowerProcessName = windowInfo.processName.toLowerCase();

              // Log windows with "plutonium" or "launcher" in title for debugging
              if (lowerTitle.contains('plutonium') ||
                  lowerTitle.contains('launcher')) {
                _logger.d(
                  'Found window with Plutonium/Launcher in title: "${windowInfo.windowTitle}" (${windowInfo.processName}, PID: ${windowInfo.processId})',
                );
              }

              // Skip only obviously suspicious windows
              if (lowerTitle == 'hidden window') {
                continue;
              }

              // FIRST: Check if title is exactly "Plutonium Launcher" - this is the launcher!
              // If we find it, include it regardless of process name (but verify it's not a system process)
              if (lowerTitle == 'plutonium launcher') {
                _logger.i(
                  'FOUND "Plutonium Launcher" window! Title: "${windowInfo.windowTitle}", Process: ${windowInfo.processName}, PID: ${windowInfo.processId}',
                );
                // Exclude system processes
                final excludedProcesses = [
                  'explorer.exe',
                  'dwm.exe',
                  'winlogon.exe',
                  'csrss.exe',
                ];
                bool isExcluded = false;
                for (final excluded in excludedProcesses) {
                  if (lowerProcessName == excluded) {
                    isExcluded = true;
                    break;
                  }
                }

                if (!isExcluded) {
                  // Found the launcher! Add process to tracking and window to list
                  if (!knownProcessIds.contains(windowInfo.processId)) {
                    knownProcessIds.add(windowInfo.processId);
                    _logger.i(
                      'Found "Plutonium Launcher" window - added process to tracking: ${windowInfo.processName} (PID: ${windowInfo.processId})',
                    );
                  }
                  if (!filteredWindows.any((w) => w.hwnd == windowInfo.hwnd)) {
                    filteredWindows.add(windowInfo);
                    _logger.i(
                      'Found "Plutonium Launcher" window by title: "${windowInfo.windowTitle}" (${windowInfo.processName}, PID: ${windowInfo.processId})',
                    );
                  }
                  continue; // Skip to next window
                }
              }

              // CRITICAL: Only check windows from processes we're CERTAIN are Plutonium
              final isPlutoniumProcess =
                  lowerProcessName.contains('plutonium') ||
                  lowerProcessName == 't6mp.exe' ||
                  lowerProcessName == 't6zm.exe' ||
                  lowerProcessName == 'iw5mp.exe' ||
                  lowerProcessName.contains('plutonium-bootstrapper') ||
                  lowerProcessName == 'bootstrapper.exe';

              if (!isPlutoniumProcess) {
                continue; // Skip non-Plutonium processes entirely
              }

              // Exclude IDE/editor processes explicitly
              final ideProcesses = [
                'cursor',
                'code',
                'devenv',
                'idea',
                'studio64',
                'notepad++',
                'sublime_text',
              ];
              bool isIdeProcess = false;
              for (final ideProc in ideProcesses) {
                if (lowerProcessName.contains(ideProc)) {
                  isIdeProcess = true;
                  break;
                }
              }
              if (isIdeProcess) {
                continue;
              }

              // Check for Plutonium-related window titles
              // Specifically look for "Plutonium Launcher" title
              final plutoniumTitlePatterns = [
                'plutonium launcher', // Exact match for launcher
                'plutonium',
                'launcher',
                'bootstrapper',
                'updater',
                't6mp',
                't6zm',
                'iw5mp',
              ];

              bool matchesTitle = false;
              for (final pattern in plutoniumTitlePatterns) {
                if (lowerTitle.contains(pattern)) {
                  matchesTitle = true;
                  break;
                }
              }

              // Also check if title is exactly "Plutonium Launcher" (case insensitive)
              if (lowerTitle == 'plutonium launcher') {
                matchesTitle = true;
                _logger.i(
                  'Found exact match for "Plutonium Launcher" window: ${windowInfo.processName} (PID: ${windowInfo.processId})',
                );
              }

              // Only include if title matches Plutonium patterns
              if (matchesTitle && lowerTitle.isNotEmpty) {
                // Exclude common system processes
                final excludedProcesses = [
                  'explorer.exe',
                  'dwm.exe',
                  'winlogon.exe',
                  'csrss.exe',
                ];
                bool isExcluded = false;
                for (final excluded in excludedProcesses) {
                  if (lowerProcessName == excluded) {
                    isExcluded = true;
                    break;
                  }
                }

                if (!isExcluded) {
                  if (!knownProcessIds.contains(windowInfo.processId)) {
                    knownProcessIds.add(windowInfo.processId);
                    _logger.i(
                      'Added Plutonium process to tracking: ${windowInfo.processName} (PID: ${windowInfo.processId})',
                    );
                  }
                  if (!filteredWindows.any((w) => w.hwnd == windowInfo.hwnd)) {
                    filteredWindows.add(windowInfo);
                    _logger.i(
                      'Found Plutonium window by title: "${windowInfo.windowTitle}" (${windowInfo.processName}, PID: ${windowInfo.processId})',
                    );
                  }
                }
              }
            }
          }

          // Log all found windows for debugging
          if (checkCount % 10 == 0 || updaterClosed) {
            if (filteredWindows.isNotEmpty) {
              _logger.i(
                'Found ${filteredWindows.length} Plutonium window(s): ${filteredWindows.map((w) => '${w.processName} (${w.processId}) - "${w.windowTitle}"').join(', ')}',
              );

              // Check if "Plutonium Launcher" is in the list
              final launcherWindows = filteredWindows
                  .where(
                    (w) => w.windowTitle.toLowerCase() == 'plutonium launcher',
                  )
                  .toList();
              if (launcherWindows.isNotEmpty) {
                _logger.i(
                  '✓ "Plutonium Launcher" window found in filtered list: ${launcherWindows.map((w) => '${w.processName} (${w.processId})').join(', ')}',
                );
              } else {
                _logger.w(
                  '✗ "Plutonium Launcher" window NOT found in filtered list of ${filteredWindows.length} window(s)',
                );
                // Log what windows ARE in the filtered list
                for (final w in filteredWindows) {
                  _logger.w(
                    '  Window in filtered list: "${w.windowTitle}" (${w.processName}, PID: ${w.processId})',
                  );
                }

                // Also check if "Plutonium Launcher" exists in the unfiltered windows list
                final launcherInUnfiltered = windows
                    .where(
                      (w) =>
                          w.windowTitle.toLowerCase() == 'plutonium launcher',
                    )
                    .toList();
                if (launcherInUnfiltered.isNotEmpty) {
                  _logger.e(
                    'ERROR: "Plutonium Launcher" window EXISTS in unfiltered list but was FILTERED OUT!',
                  );
                  for (final w in launcherInUnfiltered) {
                    _logger.e(
                      '  Unfiltered launcher window: "${w.windowTitle}" (${w.processName}, PID: ${w.processId})',
                    );
                  }
                }
              }
            } else {
              _logger.d(
                'No Plutonium windows found. Tracked ${knownProcessIds.length} process(es), checked ${windows.length} window(s), filtered: ${filteredWindows.length}',
              );
            }
          }

          for (final windowInfo in filteredWindows) {
            // Skip if we've already shown this window
            if (shownWindows.contains(windowInfo.hwnd)) {
              continue;
            }

            // Show and bring window to foreground
            if (windowInfo.hwnd != 0) {
              // CRITICAL SAFETY CHECK: Verify this window actually belongs to a Plutonium process
              // Re-check process name to ensure we're not manipulating the wrong window
              final currentProcessName = _getProcessName(windowInfo.processId);
              final lowerProcessName = currentProcessName.toLowerCase();

              final isPlutoniumProcess =
                  lowerProcessName.contains('plutonium') ||
                  lowerProcessName == 't6mp.exe' ||
                  lowerProcessName == 't6zm.exe' ||
                  lowerProcessName == 'iw5mp.exe' ||
                  lowerProcessName.contains('plutonium-bootstrapper') ||
                  lowerProcessName == 'bootstrapper.exe';

              // Exclude IDE/editor processes explicitly
              final ideProcesses = [
                'cursor',
                'code',
                'devenv',
                'idea',
                'studio64',
                'notepad++',
                'sublime_text',
              ];
              bool isIdeProcess = false;
              for (final ideProc in ideProcesses) {
                if (lowerProcessName.contains(ideProc)) {
                  isIdeProcess = true;
                  break;
                }
              }

              if (!isPlutoniumProcess || isIdeProcess) {
                _logger.w(
                  'SAFETY CHECK FAILED: Skipping window manipulation for non-Plutonium process: $currentProcessName (PID: ${windowInfo.processId}, Title: "${windowInfo.windowTitle}")',
                );
                continue;
              }

              // Log that we're showing this window
              _logger.i(
                'Showing Plutonium window: ${windowInfo.processName} (PID: ${windowInfo.processId}, HWND: ${windowInfo.hwnd}, Title: "${windowInfo.windowTitle}")',
              );

              // Get current window state
              final placement = calloc<WINDOWPLACEMENT>()
                ..ref.length = sizeOf<WINDOWPLACEMENT>();
              GetWindowPlacement(windowInfo.hwnd, placement);

              // Show the window (multiple methods for reliability)
              ShowWindow(windowInfo.hwnd, SW_SHOW);
              ShowWindow(windowInfo.hwnd, SW_RESTORE);
              ShowWindow(windowInfo.hwnd, SW_SHOWNORMAL);

              // If window was minimized, restore it
              if (placement.ref.showCmd == SW_SHOWMINIMIZED ||
                  placement.ref.showCmd == SW_MINIMIZE) {
                ShowWindow(windowInfo.hwnd, SW_RESTORE);
              }

              // Bring to foreground
              SetForegroundWindow(windowInfo.hwnd);
              BringWindowToTop(windowInfo.hwnd);

              // Also try SetWindowPos to ensure it's visible
              SetWindowPos(
                windowInfo.hwnd,
                HWND_TOP,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW,
              );

              // Force window to be active
              AllowSetForegroundWindow(windowInfo.processId);

              // Try to activate the window
              SetActiveWindow(windowInfo.hwnd);

              calloc.free(placement);

              shownWindows.add(windowInfo.hwnd);
              _logger.i(
                'Brought child process window to foreground: ${windowInfo.processName} (PID: ${windowInfo.processId}, HWND: ${windowInfo.hwnd})',
              );

              // Add this process ID to known processes so we monitor its children too
              knownProcessIds.add(windowInfo.processId);
            }
          }
        } catch (e) {
          _logger.d('Error monitoring child process windows: $e');
        }
      }
    });
  }

  /// Discover child processes by enumerating all processes and checking parent relationships
  Set<int> _discoverChildProcesses(Set<int> parentProcessIds) {
    final childProcessIds = <int>{};

    try {
      // Enumerate all processes
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        calloc.free(processIds);
        calloc.free(bytesReturned);
        return childProcessIds;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();
      final maxProcessesToCheck = processCount > 256 ? 256 : processCount;

      for (var i = 0; i < maxProcessesToCheck; i++) {
        final pid = processIds[i];
        if (pid == 0) continue;

        // Skip if already known
        if (parentProcessIds.contains(pid)) {
          continue;
        }

        try {
          // Get process name to check if it's Plutonium-related
          final processName = _getProcessName(pid);
          if (processName.isEmpty || processName == 'Unknown') {
            continue;
          }

          final lowerName = processName.toLowerCase();

          // Check if it's a Plutonium-related process
          // The updater might launch processes with different names
          if (lowerName.contains('plutonium') ||
              lowerName.contains('t6mp') ||
              lowerName.contains('t6zm') ||
              lowerName.contains('iw5mp')) {
            // This is likely a child process
            childProcessIds.add(pid);
            _logger.d(
              'Found potential child process: $processName (PID: $pid)',
            );
          }
        } catch (e) {
          // Skip processes we can't access
          continue;
        }
      }

      calloc.free(processIds);
      calloc.free(bytesReturned);
    } catch (e) {
      _logger.d('Error discovering child processes: $e');
    }

    return childProcessIds;
  }

  /// Discover ALL Plutonium-related processes (not just children of tracked processes)
  Set<int> _discoverAllPlutoniumProcesses() {
    final plutoniumProcessIds = <int>{};

    try {
      // Enumerate all processes
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        calloc.free(processIds);
        calloc.free(bytesReturned);
        return plutoniumProcessIds;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();
      final maxProcessesToCheck = processCount > 256 ? 256 : processCount;

      for (var i = 0; i < maxProcessesToCheck; i++) {
        final pid = processIds[i];
        if (pid == 0) continue;

        try {
          // Get process name
          final processName = _getProcessName(pid);
          if (processName.isEmpty || processName == 'Unknown') {
            continue;
          }

          final lowerName = processName.toLowerCase();

          // Check if it's a Plutonium-related process
          // Match Plutonium process names including bootstrapper
          if (lowerName.contains('plutonium') ||
              lowerName.contains('t6mp') ||
              lowerName.contains('t6zm') ||
              lowerName.contains('iw5mp') ||
              lowerName.contains('bootstrapper')) {
            plutoniumProcessIds.add(pid);
          }
        } catch (e) {
          // Skip processes we can't access
          continue;
        }
      }

      calloc.free(processIds);
      calloc.free(bytesReturned);
    } catch (e) {
      _logger.d('Error discovering all Plutonium processes: $e');
    }

    return plutoniumProcessIds;
  }

  /// Enumerate ALL windows (for debugging and discovery)
  List<_WindowInfo> _enumerateAllWindows() {
    final windows = <_WindowInfo>[];
    final processIdPtr = calloc<DWORD>();
    int plutoniumLauncherCount = 0;

    try {
      int currentWindow = GetTopWindow(0);
      int windowCount = 0;
      const maxWindowsToCheck = 500;

      while (currentWindow != 0 && windowCount < maxWindowsToCheck) {
        windowCount++;

        try {
          if (IsWindow(currentWindow) == 0) {
            currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
            continue;
          }

          // Get process ID for this window
          GetWindowThreadProcessId(currentWindow, processIdPtr);
          final windowPid = processIdPtr.value;

          // Get window title and process name
          final windowTitle = _getWindowTitle(currentWindow);
          final processName = _getProcessName(windowPid);
          final lowerProcessName = processName.toLowerCase();

          // Log windows from plutonium.exe (even with empty titles) to help debug
          if (lowerProcessName == 'plutonium.exe') {
            _logger.d(
              'Found plutonium.exe window during enumeration: Title: "${windowTitle.isEmpty ? "[EMPTY]" : windowTitle}", PID: $windowPid, HWND: $currentWindow',
            );
          }

          // Check if this is the "Plutonium Launcher" window
          if (windowTitle.toLowerCase() == 'plutonium launcher') {
            plutoniumLauncherCount++;
            _logger.i(
              'ENUMERATED "Plutonium Launcher" window: Title: "$windowTitle", Process: $processName, PID: $windowPid, HWND: $currentWindow',
            );
          }

          // Don't skip windows from plutonium.exe even if title is empty
          // The launcher might have an empty title initially
          if (windowTitle.isEmpty && processName == 'Unknown') {
            currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
            continue;
          }

          // Include windows from plutonium.exe even if title is empty
          if (windowTitle.isEmpty && lowerProcessName == 'plutonium.exe') {
            _logger.d(
              'Including plutonium.exe window with empty title (might be launcher): PID: $windowPid, HWND: $currentWindow',
            );
          }

          windows.add(
            _WindowInfo(
              hwnd: currentWindow,
              processId: windowPid,
              processName: processName,
              windowTitle: windowTitle,
            ),
          );
        } catch (e) {
          // Skip windows that cause errors
        }

        currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
      }

      if (plutoniumLauncherCount > 0) {
        _logger.i(
          'Found $plutoniumLauncherCount "Plutonium Launcher" window(s) during enumeration',
        );
      }
    } catch (e) {
      _logger.d('Error enumerating all windows: $e');
    } finally {
      calloc.free(processIdPtr);
    }

    return windows;
  }

  /// Enumerate windows belonging to specified process IDs
  List<_WindowInfo> _enumerateProcessWindows(
    Set<int> processIds, {
    bool includeHidden = false,
  }) {
    final windows = <_WindowInfo>[];
    final processIdPtr = calloc<DWORD>();

    try {
      // Enumerate all top-level windows manually (simpler than EnumWindows callback)
      int currentWindow = GetTopWindow(0);
      int windowCount = 0;
      const maxWindowsToCheck = 500; // Check enough windows

      while (currentWindow != 0 && windowCount < maxWindowsToCheck) {
        windowCount++;

        try {
          // Skip invalid windows
          if (IsWindow(currentWindow) == 0) {
            currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
            continue;
          }

          // Get process ID for this window
          GetWindowThreadProcessId(currentWindow, processIdPtr);
          final windowPid = processIdPtr.value;

          // Check if this window belongs to one of our tracked processes
          if (processIds.contains(windowPid)) {
            // Check window visibility - include hidden windows if requested
            final isVisible = IsWindowVisible(currentWindow) != 0;
            if (isVisible || includeHidden) {
              // Get window title to identify the process
              final windowTitle = _getWindowTitle(currentWindow);
              final processName = _getProcessName(windowPid);

              // Skip windows with no title and no process name (likely system windows)
              if (windowTitle.isEmpty && processName == 'Unknown') {
                currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
                continue;
              }

              // Verify process name is actually Plutonium-related
              final lowerProcessName = processName.toLowerCase();
              final isPlutoniumProcess =
                  lowerProcessName.contains('plutonium') ||
                  lowerProcessName.contains('t6mp') ||
                  lowerProcessName.contains('t6zm') ||
                  lowerProcessName.contains('iw5mp') ||
                  lowerProcessName.contains('bootstrapper');

              // Only add windows from verified Plutonium processes
              if (isPlutoniumProcess) {
                windows.add(
                  _WindowInfo(
                    hwnd: currentWindow,
                    processId: windowPid,
                    processName: processName,
                    windowTitle: windowTitle,
                  ),
                );
              }
            }
          }
        } catch (e) {
          // Skip windows that cause errors
        }

        currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
      }
    } catch (e) {
      _logger.d('Error enumerating windows: $e');
    } finally {
      calloc.free(processIdPtr);
    }

    return windows;
  }

  /// Get window title
  String _getWindowTitle(int hwnd) {
    try {
      final titleBuffer = wsalloc(256);
      final length = GetWindowText(hwnd, titleBuffer, 256);
      if (length > 0) {
        final title = titleBuffer.toDartString();
        free(titleBuffer);
        return title;
      }
      free(titleBuffer);
    } catch (e) {
      // Ignore errors
    }
    return '';
  }

  /// Get process name from process ID using QueryFullProcessImageName
  String _getProcessName(int processId) {
    try {
      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        FALSE,
        processId,
      );

      if (hProcess == 0) {
        return 'Unknown';
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

      return processName ?? 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  }

  /// Get process name from process ID using GetModuleBaseName (for attachment)
  /// This is used when we need to identify processes by their module name
  String? _getProcessNameByModule(int processId) {
    try {
      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        FALSE,
        processId,
      );

      if (hProcess == 0 || hProcess == INVALID_HANDLE_VALUE) {
        return null;
      }

      final moduleName = wsalloc(MAX_PATH);
      // Use 0 (NULL) for hModule to get the main executable name
      final length = GetModuleBaseName(hProcess, 0, moduleName, MAX_PATH);

      String? processName;
      if (length > 0) {
        processName = moduleName.toDartString();
      }

      free(moduleName);
      CloseHandle(hProcess);

      return processName;
    } catch (e) {
      _logger.d('Error getting process name by module for PID $processId: $e');
      return null;
    }
  }

  /// Find bootstrapper PID by enumerating processes and matching by name
  /// Returns PID if found, -1 if not found
  Future<int> findBootstrapperPid() async {
    try {
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        _logger.e('[Attachment] EnumProcesses failed');
        calloc.free(processIds);
        calloc.free(bytesReturned);
        return -1;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();
      _logger.d(
        '[Attachment] Enumerated $processCount processes, searching for bootstrapper...',
      );

      for (var i = 0; i < processCount && i < 1024; i++) {
        final pid = processIds[i];
        if (pid == 0) continue;

        // Yield periodically to prevent blocking
        if (i % 50 == 0) {
          await Future.delayed(const Duration(milliseconds: 1));
        }

        try {
          final processName = _getProcessNameByModule(pid);
          if (processName == null) continue;

          final lowerName = processName.toLowerCase();

          // Check for bootstrapper or main plutonium.exe
          if (lowerName.contains('plutonium-bootstrapper') ||
              lowerName == 'plutonium.exe') {
            _logger.i(
              '[Attachment] Found bootstrapper process: $processName (PID: $pid)',
            );
            calloc.free(processIds);
            calloc.free(bytesReturned);
            return pid;
          }
        } catch (e) {
          // Skip processes we can't access
          continue;
        }
      }

      calloc.free(processIds);
      calloc.free(bytesReturned);
      return -1; // Not found
    } catch (e) {
      _logger.e('[Attachment] Error finding bootstrapper PID: $e');
      return -1;
    }
  }

  /// Attach to game process by waiting for game window to appear, then opening process handle
  /// Polls every 2 seconds for up to 60 seconds (30 attempts) to find the game window
  Future<void> attachToGameProcess() async {
    final overlayScanner = OverlayScanner();
    int attempts = 0;
    const maxAttempts = 30; // 60 seconds timeout (30 * 2 seconds)
    const pollInterval = Duration(seconds: 2);

    _logger.i(
      '[Game Attachment] Waiting for game window to appear (max ${maxAttempts} attempts, ${pollInterval.inSeconds}s interval)...',
    );

    while (attempts < maxAttempts) {
      try {
        // Find the game window (not launcher/bootstrapper)
        final gameWindow = await overlayScanner.findGameWindow();

        if (gameWindow != 0) {
          _logger.i(
            '[Game Attachment] Game window found (HWND: $gameWindow), getting process ID...',
          );

          // Get process ID from window handle
          final processIdPtr = calloc<DWORD>();
          GetWindowThreadProcessId(gameWindow, processIdPtr);
          final pid = processIdPtr.value;
          calloc.free(processIdPtr);

          if (pid == 0) {
            _logger.w(
              '[Game Attachment] Failed to get process ID from game window',
            );
            attempts++;
            await Future.delayed(pollInterval);
            continue;
          }

          _logger.i(
            '[Game Attachment] Game process found at PID: $pid, opening process handle...',
          );

          // Open process with PROCESS_ALL_ACCESS for memory protection operations
          final hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);

          if (hProcess == 0 || hProcess == INVALID_HANDLE_VALUE) {
            final error = GetLastError();
            _logger.e(
              '[Game Attachment] OpenProcess failed for PID $pid: Windows error $error',
            );
            throw Exception('OpenProcess failed: $error');
          }

          // Store process information
          _processId = pid;
          _hProcess = hProcess;

          _logger.i(
            '[Game Attachment] Successfully attached to game process PID: $pid, handle: $hProcess',
          );

          // Monitor process exit in background
          _monitorProcessExit();

          // Monitor for child processes and ensure their windows are visible
          _monitorChildProcessWindows();

          return;
        }
      } catch (e) {
        _logger.w(
          '[Game Attachment] Error checking for game window (attempt $attempts/$maxAttempts): $e',
        );
      }

      attempts++;
      if (attempts < maxAttempts) {
        _logger.d(
          '[Game Attachment] Game window not found yet (attempt $attempts/$maxAttempts), waiting ${pollInterval.inSeconds}s...',
        );
        await Future.delayed(pollInterval);
      }
    }

    _logger.e(
      '[Game Attachment] Game window not found after $maxAttempts attempts (${maxAttempts * pollInterval.inSeconds}s timeout)',
    );
    throw Exception('Game window not found after polling timeout');
  }

  /// Cleanup resources
  void _cleanup() {
    if (_hProcess != null &&
        _hProcess != 0 &&
        _hProcess != INVALID_HANDLE_VALUE) {
      CloseHandle(_hProcess!);
      _hProcess = null;
    }
    _processId = null;
    // Don't kill the detached process - let it run independently
    // Just clear the reference
    _detachedProcess = null;
  }
}

/// Window information structure
class _WindowInfo {
  final int hwnd;
  final int processId;
  final String processName;
  final String windowTitle;

  _WindowInfo({
    required this.hwnd,
    required this.processId,
    required this.processName,
    required this.windowTitle,
  });
}
