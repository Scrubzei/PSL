import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../core/models/detection_report.dart';

/// Scanner for detecting overlay menu cheats
class OverlayScanner {
  final Logger _logger = Logger();
  final List<int> _checkedWindows = [];
  final int? excludePid;
  final String? excludeProcessName;

  // Cache the game window handle to avoid re-enumerating every scan
  int? _cachedGameWindow;
  DateTime? _lastWindowCheck;

  OverlayScanner({this.excludePid, this.excludeProcessName});

  /// Check if the Plutonium game window exists (public method for detection engine)
  Future<int> findGameWindow() async {
    return await _findPlutoniumWindow();
  }

  /// Scan for overlay windows
  /// Returns list of detection reports if any are found
  /// Only scans if the actual game window (not launcher/bootstrapper) is found
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];
    _checkedWindows.clear();

    try {
      // Find Plutonium game window first (actual game, not launcher/bootstrapper)
      // Use cached window if available and recent (checked within last 30 seconds)
      final now = DateTime.now();
      int gameWindow = 0;

      if (_cachedGameWindow != null &&
          _lastWindowCheck != null &&
          now.difference(_lastWindowCheck!).inSeconds < 300) {
        // Use cached window - trust it's still valid for 5 minutes
        // Skip expensive IsWindow check to prevent blocking
        gameWindow = _cachedGameWindow!;
      }

      // If no cached window, find it (but only search once every 5 minutes to prevent blocking)
      // Window enumeration is expensive and causes freezes
      final shouldSearch =
          _cachedGameWindow == null ||
          _lastWindowCheck == null ||
          now.difference(_lastWindowCheck!).inSeconds > 300; // 5 minutes

      if (gameWindow == 0 && shouldSearch) {
        // Only search if we really need to - this is expensive
        gameWindow = await _findPlutoniumWindow();
        if (gameWindow != 0) {
          _cachedGameWindow = gameWindow;
          _lastWindowCheck = now;
          // Skip overlay scanning immediately after finding window to prevent blocking
          return detections;
        }
      }

      // If still no window, skip overlay scanning entirely
      if (gameWindow == 0) {
        return detections;
      }

      if (gameWindow == 0) {
        // Game window not found yet - this is normal during launch
        // Don't log as error, just return empty detections
        return detections;
      }

      final gameRect = calloc<RECT>();
      GetWindowRect(gameWindow, gameRect);

      // Enumerate all windows - async to prevent blocking
      await _enumerateWindowsManually(detections, gameRect);

      calloc.free(gameRect);
    } catch (e) {
      _logger.e('Error scanning for overlays: $e');
    }

    return detections;
  }

  /// Manually enumerate windows (simplified)
  /// Checks all top-level windows for overlay characteristics
  Future<void> _enumerateWindowsManually(
    List<DetectionReport> detections,
    Pointer<RECT> gameRect,
  ) async {
    try {
      int windowCount = 0;
      const maxWindowsToCheck = 200; // Check more windows to find overlays

      // Enumerate all top-level windows
      int currentWindow = GetTopWindow(0);
      while (currentWindow != 0 && windowCount < maxWindowsToCheck) {
        windowCount++;

        // Yield every 20 windows to prevent blocking
        if (windowCount % 20 == 0) {
          await Future.delayed(const Duration(milliseconds: 5));
        }

        try {
          // Skip invalid windows
          if (IsWindow(currentWindow) == 0) {
            currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
            continue;
          }

          // Check this window for overlay characteristics
          _checkWindow(currentWindow, detections, gameRect);
        } catch (e) {
          // Skip windows that cause errors
        }

        currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
      }

      _logger.d('Checked $windowCount windows for overlays');
    } catch (e) {
      _logger.e('Error in manual window enumeration: $e');
    }
  }

  /// Check a single window for overlay characteristics
  /// ESP overlays typically have:
  /// - WS_EX_LAYERED (transparent/layered window)
  /// - WS_EX_TRANSPARENT (click-through)
  /// - WS_EX_TOPMOST (always on top)
  /// - Overlap with game window
  /// - Different process than game
  void _checkWindow(
    int hwnd,
    List<DetectionReport> detections,
    Pointer<RECT> gameRect,
  ) {
    try {
      // Must be visible
      if (IsWindowVisible(hwnd) == 0) return;

      final exStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE);

      // Check for overlay window styles
      final isLayered = (exStyle & WS_EX_LAYERED) != 0;
      final isTransparent = (exStyle & WS_EX_TRANSPARENT) != 0;
      final isTopmost = (exStyle & WS_EX_TOPMOST) != 0;

      // ESP overlays typically have at least one of these styles
      if (!isLayered && !isTransparent && !isTopmost) {
        return;
      }

      final title = wsalloc(256);
      GetWindowText(hwnd, title, 256);
      final titleStr = title.toDartString();

      // Skip system windows
      if (titleStr.startsWith('MSCTFIME') ||
          titleStr.startsWith('DWM') ||
          titleStr.isEmpty && !isLayered) {
        free(title);
        return;
      }

      final rect = calloc<RECT>();
      GetWindowRect(hwnd, rect);

      final width = rect.ref.right - rect.ref.left;
      final height = rect.ref.bottom - rect.ref.top;

      // Skip very small or very large windows (likely not overlays)
      if (width < 50 || height < 50 || width > 5000 || height > 5000) {
        free(title);
        calloc.free(rect);
        return;
      }

      // Check if window overlaps with game window
      final overlapsGame =
          !(rect.ref.right < gameRect.ref.left ||
              rect.ref.left > gameRect.ref.right ||
              rect.ref.bottom < gameRect.ref.top ||
              rect.ref.top > gameRect.ref.bottom);

      final processName = _getProcessName(hwnd);

      // Skip if this is the anti-cheat's own process
      if (processName == 'Excluded') {
        free(title);
        calloc.free(rect);
        return;
      }

      // Skip the game window itself
      if (_cachedGameWindow != null && hwnd == _cachedGameWindow) {
        free(title);
        calloc.free(rect);
        return;
      }

      // Detection criteria for ESP overlays:
      // 1. Has overlay styles (layered/transparent/topmost)
      // 2. Overlaps with game window OR is topmost
      // 3. Reasonable size (not too small, not full screen)
      // 4. Different process than game
      final isSuspicious =
          (isLayered || isTransparent || isTopmost) &&
          (overlapsGame || isTopmost) &&
          width >= 50 &&
          width <= 5000 &&
          height >= 50 &&
          height <= 5000;

      if (isSuspicious) {
        _logger.w(
          'Detected suspicious overlay window: "$titleStr" (${width}x$height) from $processName',
        );
        detections.add(
          DetectionReport(
            type: CheatType.overlayMenu,
            evidence: {
              'windowTitle': titleStr.isEmpty ? '(no title)' : titleStr,
              'width': width,
              'height': height,
              'exStyle': exStyle,
              'isLayered': isLayered,
              'isTransparent': isTransparent,
              'isTopmost': isTopmost,
              'overlapsGame': overlapsGame,
            },
            processName: processName,
          ),
        );
      }

      free(title);
      calloc.free(rect);
    } catch (e) {
      // Continue on error
    }
  }

  /// Find Plutonium game window (not launcher or bootstrapper)
  /// Looks for window title pattern: "Plutonium [IW5|T6|T5|T4] Multiplayer (r####)"
  /// This is async to allow yielding during enumeration to prevent blocking
  Future<int> _findPlutoniumWindow() async {
    int foundWindow = 0;
    int windowCount = 0;
    const maxWindowsToCheck = 100; // Increased to find window more reliably

    // Use a simple approach - get all top-level windows
    int currentWindow = GetTopWindow(0);
    while (currentWindow != 0 && windowCount < maxWindowsToCheck) {
      // Yield every 3 windows to prevent blocking (very frequent yields)
      if (windowCount % 3 == 0 && windowCount > 0) {
        await Future.delayed(const Duration(milliseconds: 10));
      }

      windowCount++;

      try {
        // Check if window is valid before accessing
        if (IsWindow(currentWindow) == 0) {
          currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
          continue;
        }

        final title = wsalloc(512);
        GetWindowText(currentWindow, title, 512);
        final titleStr = title.toDartString();
        free(title);

        // Log first few windows for debugging
        if (windowCount <= 5 && titleStr.isNotEmpty) {
          _logger.d('Checking window $windowCount: "$titleStr"');
        }

        // Match pattern: "Plutonium <IW5|T6|T5|T4> Multiplayer (r####)"
        // Example: "Plutonium T6 Multiplayer (r1234)" or "Plutonium IW5 Multiplayer (r5678)"
        final lowerTitle = titleStr.toLowerCase();

        // Check if it matches the game window pattern
        // Must contain "plutonium", one of the game codenames, "multiplayer", and version pattern
        final hasPlutonium = lowerTitle.contains('plutonium');
        final hasGameCode =
            lowerTitle.contains('iw5') ||
            lowerTitle.contains('t6') ||
            lowerTitle.contains('t5') ||
            lowerTitle.contains('t4');
        final hasMultiplayer = lowerTitle.contains('multiplayer');
        final hasVersion = RegExp(r'\(r\d{1,4}\)').hasMatch(titleStr);

        // Exclude launcher and bootstrapper windows
        final isLauncher = lowerTitle.contains('launcher') && !hasMultiplayer;
        final isBootstrapper = lowerTitle.contains('bootstrapper');

        // More lenient matching: require plutonium + game code + multiplayer
        // Version pattern is optional (some windows might not have it immediately)
        if (hasPlutonium &&
            hasGameCode &&
            hasMultiplayer &&
            !isLauncher &&
            !isBootstrapper) {
          // Prefer windows with version pattern, but accept without it
          if (hasVersion || foundWindow == 0) {
            foundWindow = currentWindow;
            _logger.i('Found Plutonium game window: "$titleStr"');
            // If we found one with version, use it; otherwise keep searching
            if (hasVersion) {
              break;
            }
          }
        }
      } catch (e) {
        // Skip windows that cause errors
        _logger.d('Error checking window: $e');
      }

      currentWindow = GetWindow(currentWindow, GW_HWNDNEXT);
    }

    if (foundWindow == 0) {
      _logger.w(
        'Plutonium game window not found after checking $windowCount windows',
      );
    }

    return foundWindow;
  }

  /// Get process name from window handle
  String _getProcessName(int hwnd) {
    try {
      final processId = calloc<DWORD>();
      GetWindowThreadProcessId(hwnd, processId);
      final pid = processId.value;

      // Skip the anti-cheat's own process
      if (excludePid != null && pid == excludePid) {
        calloc.free(processId);
        return 'Excluded';
      }

      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        0,
        processId.value,
      );

      if (hProcess != 0) {
        final moduleName = wsalloc(MAX_PATH);
        final size = calloc<DWORD>()..value = MAX_PATH;

        if (QueryFullProcessImageName(hProcess, 0, moduleName, size) != 0) {
          final name = moduleName.toDartString();
          final fileName = name.split('\\').last;
          free(moduleName);
          calloc.free(size);
          calloc.free(processId);
          CloseHandle(hProcess);
          return fileName;
        }

        free(moduleName);
        calloc.free(size);
        CloseHandle(hProcess);
      }

      calloc.free(processId);
    } catch (e) {
      // Return unknown on error
    }

    return 'Unknown';
  }
}
