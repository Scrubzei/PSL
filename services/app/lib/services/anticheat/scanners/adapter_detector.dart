import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../core/models/detection_report.dart';

// FFI typedefs for HID API
typedef HidDGetSerialNumberStringNative =
    Int32 Function(IntPtr, Pointer<Uint16>, Uint32);
typedef HidDGetSerialNumberStringDart = int Function(int, Pointer<Uint16>, int);
typedef HidDGetManufacturerStringNative =
    Int32 Function(IntPtr, Pointer<Uint16>, Uint32);
typedef HidDGetManufacturerStringDart = int Function(int, Pointer<Uint16>, int);
typedef HidDGetProductStringNative =
    Int32 Function(IntPtr, Pointer<Uint16>, Uint32);
typedef HidDGetProductStringDart = int Function(int, Pointer<Uint16>, int);

// FFI typedefs for DirectInput (winmm.dll)
typedef JoyGetNumDevsNative = Uint32 Function();
typedef JoyGetNumDevsDart = int Function();
typedef JoyGetDevCapsNative = Uint32 Function(Uint32, Pointer<Void>, Uint32);
typedef JoyGetDevCapsDart = int Function(int, Pointer<Void>, int);

// FFI typedefs for Raw Input (user32.dll)
typedef GetRawInputDeviceListNative =
    Uint32 Function(Pointer<Void>, Pointer<Uint32>, Uint32);
typedef GetRawInputDeviceListDart =
    int Function(Pointer<Void>, Pointer<Uint32>, int);

/// Scanner for detecting game adapter devices (Titan, Cronus, XIM, etc.)
/// Based on GAME_ADAPTER_DETECTION.md specification
class AdapterDetector {
  final Logger _logger = Logger();

  // FFI bindings for XInput API
  DynamicLibrary? _xinputLib;
  Pointer<
    NativeFunction<Int32 Function(Uint32, Uint32, Pointer<XINPUT_CAPABILITIES>)>
  >?
  _xinputGetCapabilitiesPtr;

  // FFI bindings for HID API
  DynamicLibrary? _hidLib;
  HidDGetSerialNumberStringDart? _hidDGetSerialNumberString;
  HidDGetManufacturerStringDart? _hidDGetManufacturerString;
  HidDGetProductStringDart? _hidDGetProductString;

  // FFI bindings for DirectInput (winmm.dll)
  DynamicLibrary? _winmmLib;
  JoyGetNumDevsDart? _joyGetNumDevs;
  JoyGetDevCapsDart? _joyGetDevCaps;

  // FFI bindings for Raw Input (user32.dll)
  DynamicLibrary? _user32Lib;
  GetRawInputDeviceListDart? _getRawInputDeviceList;

  /// Initialize FFI bindings for XInput and HID APIs
  void _initializeFFI() {
    try {
      // Load XInput library
      try {
        _xinputLib = DynamicLibrary.open('xinput1_4.dll');
        _xinputGetCapabilitiesPtr = _xinputLib!
            .lookup<
              NativeFunction<
                Int32 Function(Uint32, Uint32, Pointer<XINPUT_CAPABILITIES>)
              >
            >('XInputGetCapabilities');
        _logger.d('Loaded xinput1_4.dll');
      } catch (e) {
        // Try xinput1_3.dll as fallback
        try {
          _xinputLib = DynamicLibrary.open('xinput1_3.dll');
          _xinputGetCapabilitiesPtr = _xinputLib!
              .lookup<
                NativeFunction<
                  Int32 Function(Uint32, Uint32, Pointer<XINPUT_CAPABILITIES>)
                >
              >('XInputGetCapabilities');
          _logger.d('Loaded xinput1_3.dll');
        } catch (e2) {
          _logger.w('Could not load XInput library: $e, $e2');
        }
      }

      // Load HID library
      try {
        _hidLib = DynamicLibrary.open('hid.dll');
        final hidDGetSerialPtr = _hidLib!
            .lookup<NativeFunction<HidDGetSerialNumberStringNative>>(
              'HidD_GetSerialNumberString',
            );
        _hidDGetSerialNumberString = hidDGetSerialPtr
            .asFunction<HidDGetSerialNumberStringDart>();

        final hidDGetManufacturerPtr = _hidLib!
            .lookup<NativeFunction<HidDGetManufacturerStringNative>>(
              'HidD_GetManufacturerString',
            );
        _hidDGetManufacturerString = hidDGetManufacturerPtr
            .asFunction<HidDGetManufacturerStringDart>();

        final hidDGetProductPtr = _hidLib!
            .lookup<NativeFunction<HidDGetProductStringNative>>(
              'HidD_GetProductString',
            );
        _hidDGetProductString = hidDGetProductPtr
            .asFunction<HidDGetProductStringDart>();

        _logger.d('Loaded hid.dll');
      } catch (e) {
        _logger.w('Could not load hid.dll: $e');
      }

      // Load winmm.dll for DirectInput
      try {
        _winmmLib = DynamicLibrary.open('winmm.dll');
        final joyGetNumDevsPtr = _winmmLib!
            .lookup<NativeFunction<JoyGetNumDevsNative>>('joyGetNumDevs');
        _joyGetNumDevs = joyGetNumDevsPtr.asFunction<JoyGetNumDevsDart>();

        final joyGetDevCapsPtr = _winmmLib!
            .lookup<NativeFunction<JoyGetDevCapsNative>>('joyGetDevCapsW');
        _joyGetDevCaps = joyGetDevCapsPtr.asFunction<JoyGetDevCapsDart>();

        _logger.d('Loaded winmm.dll');
      } catch (e) {
        _logger.w('Could not load winmm.dll: $e');
      }

      // Load user32.dll for Raw Input
      try {
        _user32Lib = DynamicLibrary.open('user32.dll');
        final getRawInputDeviceListPtr = _user32Lib!
            .lookup<NativeFunction<GetRawInputDeviceListNative>>(
              'GetRawInputDeviceList',
            );
        _getRawInputDeviceList = getRawInputDeviceListPtr
            .asFunction<GetRawInputDeviceListDart>();

        _logger.d('Loaded user32.dll for raw input');
      } catch (e) {
        _logger.w('Could not load user32.dll: $e');
      }
    } catch (e) {
      _logger.e('Error initializing FFI: $e');
    }
  }

  // Known adapter signatures
  static const Map<String, Map<String, dynamic>> _adapterSignatures = {
    'titan': {
      'vid': '2508',
      'pids': ['0003', '0032', '8003'],
      'keywords': ['titan', 'consoletuner', 'gtuner'],
      'processes': ['gtuneriv.exe', 'gtuner4.exe', 'gtuner.exe'],
      'software': ['Gtuner IV', 'Gtuner4', 'ConsoleTuner'],
      'paths': [r'C:\Program Files\Gtuner IV'],
    },
    'cronus': {
      'vid': null, // Spoofed, rely on name/software
      'pids': null,
      'keywords': ['cronus', 'zen', 'collectiveminds', 'zen studio'],
      'processes': ['zenstudio.exe', 'cronusmax.exe'],
      'software': ['Zen Studio', 'CronusMAX', 'Cronus Zen'],
      'paths': [r'C:\Program Files\Zen Studio'],
    },
    'xim': {
      'vid': null, // Varies
      'pids': null,
      'keywords': ['xim', 'wingman', 'reality', 'bmg'],
      'processes': ['xim manager.exe', 'rewasd.exe'],
      'software': ['XIM Manager', 'ReWASD'],
      'paths': [],
    },
    'generic': {
      'vid': null,
      'pids': null,
      'keywords': ['strike pack', 'modded controller'],
      'processes': [],
      'software': [],
      'paths': [],
    },
    'ds4windows': {
      'vid': null, // Uses ViGEmBus to create virtual controllers
      'pids': null,
      'keywords': ['ds4windows', 'vigembus', 'virtual gamepad'],
      'processes': ['ds4windows.exe'],
      'software': ['DS4Windows'],
      'paths': [],
    },
  };

  // Whitelist of legitimate devices (to reduce false positives)
  static const List<String> _whitelistedDevices = [
    'xbox',
    'xbox controller',
    'xbox wireless controller',
    'xbox 360 controller',
    'xbox one controller',
    'playstation',
    'ps4',
    'ps5',
    'dualshock',
    'dualsense',
  ];

  /// Full scan for adapter devices
  /// Returns list of detection reports if any are found
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    _logger.i('🔍 Starting game adapter detection scan...');

    // Initialize FFI bindings if not already done
    if (_xinputLib == null ||
        _hidLib == null ||
        _winmmLib == null ||
        _user32Lib == null) {
      _initializeFFI();
    }

    try {
      // Scan devices (programming mode detection)
      _logger.i('Scanning USB/HID/Game Controller devices...');
      final deviceDetections = await _scanDevices();
      detections.addAll(deviceDetections);
      _logger.i(
        'Device scan complete. Found ${deviceDetections.length} device detections',
      );

      // Scan input mode (spoofed controllers)
      _logger.i('Scanning for adapters in input mode...');
      final inputModeDetections = await _scanInputMode();
      detections.addAll(inputModeDetections);
      _logger.i(
        'Input mode scan complete. Found ${inputModeDetections.length} input mode detections',
      );

      // Scan processes
      _logger.i('Scanning running processes for adapter software...');
      final processDetections = await _scanProcesses();
      detections.addAll(processDetections);
      _logger.i(
        'Process scan complete. Found ${processDetections.length} process detections',
      );

      // Scan registry for installed software
      _logger.i('Scanning registry for installed adapter software...');
      final registryDetections = await _scanRegistry();
      detections.addAll(registryDetections);
      _logger.i(
        'Registry scan complete. Found ${registryDetections.length} registry detections',
      );

      if (detections.isNotEmpty) {
        _logger.w(
          '🚨 GAME ADAPTER DETECTED: Found ${detections.length} adapter detection(s)',
        );
        for (var i = 0; i < detections.length; i++) {
          final det = detections[i];
          _logger.w(
            '  Detection ${i + 1}: ${det.evidence['adapterType']} - ${det.processName} (Score: ${det.evidence['score']})',
          );
        }
      } else {
        _logger.i('✅ No game adapters detected. System is clean.');
      }
    } catch (e, stackTrace) {
      _logger.e('Error scanning for adapters: $e');
      _logger.e('Stack trace: $stackTrace');
    }

    return detections;
  }

  /// Scan USB/HID/Game Controller devices using SetupAPI
  Future<List<DetectionReport>> _scanDevices() async {
    final detections = <DetectionReport>[];
    final deviceCounts = <String, int>{}; // Track duplicate HWIDs

    try {
      // Scan multiple device classes: USB, HID, and Game Controllers
      // Use class name string approach (like reference code) for USB/HID
      // Use GUID for Game Controllers
      final gameControllerGuid = _createGameControllerGuid();

      final deviceClasses = [
        {'name': 'USB', 'useGuid': false, 'className': 'USB'},
        {'name': 'HID', 'useGuid': false, 'className': 'HID'},
        {
          'name': 'Game Controller',
          'useGuid': true,
          'guid': gameControllerGuid,
        },
      ];

      int totalDevicesScanned = 0;

      try {
        for (final deviceClass in deviceClasses) {
          final className = deviceClass['name'] as String;
          try {
            _logger.i('Scanning $className devices...');

            final hDevInfo = deviceClass['useGuid'] == true
                ? SetupDiGetClassDevs(
                    deviceClass['guid'] as Pointer<GUID>,
                    nullptr,
                    0,
                    DIGCF_PRESENT,
                  )
                : SetupDiGetClassDevs(
                    Pointer<GUID>.fromAddress(0),
                    TEXT(deviceClass['className'] as String),
                    0,
                    DIGCF_PRESENT | DIGCF_ALLCLASSES,
                  );

            if (hDevInfo == INVALID_HANDLE_VALUE) {
              final error = GetLastError();
              _logger.w(
                'Failed to get $className device information set. Error: $error',
              );
              continue;
            }

            _logger.d('Successfully opened $className device information set');

            final devInfo = calloc<SP_DEVINFO_DATA>();
            devInfo.ref.cbSize = sizeOf<SP_DEVINFO_DATA>();

            int deviceIndex = 0;
            int classDeviceCount = 0;

            while (SetupDiEnumDeviceInfo(hDevInfo, deviceIndex, devInfo) != 0) {
              deviceIndex++;
              classDeviceCount++;
              totalDevicesScanned++;

              try {
                // Get Friendly Name - buffer size in bytes (512 chars * 2 bytes per char)
                final friendlyNameBuffer = wsalloc(512);
                final friendlyNameSize = calloc<DWORD>()..value = 512 * 2;
                var friendlyName = '';

                if (SetupDiGetDeviceRegistryProperty(
                      hDevInfo,
                      devInfo,
                      SPDRP_FRIENDLYNAME,
                      nullptr,
                      friendlyNameBuffer.cast(),
                      friendlyNameSize.value,
                      friendlyNameSize,
                    ) !=
                    0) {
                  friendlyName = friendlyNameBuffer.toDartString();
                }

                // Get Hardware ID
                final hwIdBuffer = wsalloc(512);
                final hwIdSize = calloc<DWORD>()..value = 512 * 2;
                var hwId = '';

                if (SetupDiGetDeviceRegistryProperty(
                      hDevInfo,
                      devInfo,
                      SPDRP_HARDWAREID,
                      nullptr,
                      hwIdBuffer.cast(),
                      hwIdSize.value,
                      hwIdSize,
                    ) !=
                    0) {
                  hwId = hwIdBuffer.toDartString();
                }

                // Get Device Description
                final descBuffer = wsalloc(512);
                final descSize = calloc<DWORD>()..value = 512 * 2;
                var description = '';

                if (SetupDiGetDeviceRegistryProperty(
                      hDevInfo,
                      devInfo,
                      SPDRP_DEVICEDESC,
                      nullptr,
                      descBuffer.cast(),
                      descSize.value,
                      descSize,
                    ) !=
                    0) {
                  description = descBuffer.toDartString();
                }

                // Log all devices for debugging (use info level so it's visible)
                if (friendlyName.isNotEmpty ||
                    description.isNotEmpty ||
                    hwId.isNotEmpty) {
                  _logger.i(
                    'Device [$className]: Name="$friendlyName" Desc="$description" HWID="$hwId"',
                  );
                }

                free(friendlyNameBuffer);
                free(hwIdBuffer);
                free(descBuffer);
                calloc.free(friendlyNameSize);
                calloc.free(hwIdSize);
                calloc.free(descSize);

                // Parse VID/PID
                final vidPid = _parseVidPid(hwId);

                // Check if whitelisted (skip legitimate controllers)
                final lowerName = friendlyName.toLowerCase();
                final lowerDesc = description.toLowerCase();
                bool isWhitelisted = false;
                for (final whitelisted in _whitelistedDevices) {
                  if (lowerName.contains(whitelisted) ||
                      lowerDesc.contains(whitelisted)) {
                    isWhitelisted = true;
                    break;
                  }
                }

                if (isWhitelisted) {
                  _logger.d('Skipping whitelisted device: $friendlyName');
                  continue;
                }

                // Match against signatures
                final matchResult = _matchSignatures(
                  friendlyName,
                  description,
                  vidPid,
                );

                final score = matchResult['score'] as double;
                if (score > 0) {
                  _logger.d(
                    'Device matched signature: $friendlyName - Score: $score, Type: ${matchResult['type']}',
                  );
                }

                if (score > 50.0) {
                  // Track duplicate HWIDs (multiple identical devices = suspicious)
                  if (hwId.isNotEmpty) {
                    deviceCounts[hwId] = (deviceCounts[hwId] ?? 0) + 1;
                  }

                  final adapterType = matchResult['type'] as String;

                  // Increase score if duplicate HWID found
                  double finalScore = score;
                  if (hwId.isNotEmpty && deviceCounts[hwId]! > 2) {
                    finalScore += 50.0;
                    _logger.w(
                      'Found duplicate HWID: $hwId (count: ${deviceCounts[hwId]})',
                    );
                  }

                  if (finalScore > 50.0) {
                    _logger.w(
                      'ADAPTER DETECTED: $adapterType - $friendlyName (Score: $finalScore)',
                    );
                    detections.add(
                      DetectionReport(
                        type: CheatType.gameAdapter,
                        evidence: {
                          'adapterType': adapterType,
                          'friendlyName': friendlyName,
                          'description': description,
                          'hardwareId': hwId,
                          'vid': vidPid?['vid'] ?? 'unknown',
                          'pid': vidPid?['pid'] ?? 'unknown',
                          'score': finalScore,
                          'duplicateHwid': deviceCounts[hwId] ?? 1,
                          'deviceClass': className,
                        },
                        processName: friendlyName.isNotEmpty
                            ? friendlyName
                            : description,
                      ),
                    );
                  }
                }
              } catch (e) {
                _logger.d('Error processing device: $e');
                // Continue with next device on error
                continue;
              }
            }

            _logger.i('Scanned $classDeviceCount $className devices');
            free(devInfo);
            SetupDiDestroyDeviceInfoList(hDevInfo);
          } catch (e, stackTrace) {
            final className = deviceClass['name'] as String;
            _logger.e('Error scanning $className devices: $e');
            _logger.e('Stack trace: $stackTrace');
            // Continue with next device class
            continue;
          }
        }

        _logger.i(
          'Total devices scanned across all classes: $totalDevicesScanned',
        );
      } finally {
        // Free the Game Controller GUID we allocated
        calloc.free(gameControllerGuid);
      }
    } catch (e, stackTrace) {
      _logger.e('Error scanning devices: $e');
      _logger.e('Stack trace: $stackTrace');
      // Make sure to free GUID even on error
      try {
        final gameControllerGuid = _createGameControllerGuid();
        calloc.free(gameControllerGuid);
      } catch (_) {
        // Ignore errors during cleanup
      }
    }

    return detections;
  }

  /// Scan running processes for adapter software
  Future<List<DetectionReport>> _scanProcesses() async {
    final detections = <DetectionReport>[];

    try {
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        malloc.free(processIds);
        malloc.free(bytesReturned);
        return detections;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();
      final maxProcessesToCheck = processCount > 256 ? 256 : processCount;

      for (var i = 0; i < maxProcessesToCheck; i++) {
        final processId = processIds[i];
        if (processId == 0) continue;

        // Yield periodically
        if (i % 20 == 0) {
          await Future.delayed(const Duration(milliseconds: 1));
        }

        try {
          final processName = _getProcessName(processId);
          if (processName == null) continue;

          final lowerName = processName.toLowerCase();

          // Check against adapter software processes
          for (final adapterEntry in _adapterSignatures.entries) {
            final adapterType = adapterEntry.key;
            final signatures = adapterEntry.value;
            final processes = signatures['processes'] as List<String>;

            for (final proc in processes) {
              if (lowerName.contains(proc.toLowerCase())) {
                _logger.w('Found adapter software process: $processName');

                detections.add(
                  DetectionReport(
                    type: CheatType.gameAdapter,
                    evidence: {
                      'adapterType': adapterType,
                      'processName': processName,
                      'processId': processId,
                      'detectionMethod': 'process',
                    },
                    processName: processName,
                  ),
                );
                break;
              }
            }
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

  /// Scan registry for installed adapter software
  Future<List<DetectionReport>> _scanRegistry() async {
    final detections = <DetectionReport>[];

    try {
      final hKey = RegOpenKeyEx(
        HKEY_LOCAL_MACHINE,
        TEXT(r'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'),
        0,
        KEY_READ,
        nullptr,
      );

      if (hKey == 0) {
        return detections;
      }

      int index = 0;
      final subKeyName = wsalloc(256);
      final subKeyNameSize = calloc<DWORD>()..value = 256;

      while (RegEnumKeyEx(
            hKey,
            index,
            subKeyName,
            subKeyNameSize,
            nullptr,
            nullptr,
            nullptr,
            nullptr,
          ) ==
          ERROR_SUCCESS) {
        index++;

        try {
          final subKeyPath =
              r'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\\' +
              subKeyName.toDartString();

          final hSubKey = RegOpenKeyEx(
            HKEY_LOCAL_MACHINE,
            TEXT(subKeyPath),
            0,
            KEY_READ,
            nullptr,
          );

          if (hSubKey != 0) {
            // Get DisplayName
            final displayNameBuffer = wsalloc(512);
            final displayNameSize = calloc<DWORD>()..value = 512;

            if (RegQueryValueEx(
                  hSubKey,
                  TEXT('DisplayName'),
                  nullptr,
                  nullptr,
                  displayNameBuffer.cast(),
                  displayNameSize,
                ) ==
                ERROR_SUCCESS) {
              final displayName = displayNameBuffer.toDartString();
              final lowerName = displayName.toLowerCase();

              // Check against adapter software names
              for (final adapterEntry in _adapterSignatures.entries) {
                final adapterType = adapterEntry.key;
                final signatures = adapterEntry.value;
                final software = signatures['software'] as List<String>;

                for (final sw in software) {
                  if (lowerName.contains(sw.toLowerCase())) {
                    _logger.w('Found adapter software: $displayName');

                    detections.add(
                      DetectionReport(
                        type: CheatType.gameAdapter,
                        evidence: {
                          'adapterType': adapterType,
                          'softwareName': displayName,
                          'detectionMethod': 'registry',
                        },
                        processName: displayName,
                      ),
                    );
                    break;
                  }
                }
              }
            }

            free(displayNameBuffer);
            calloc.free(displayNameSize);
            RegCloseKey(hSubKey);
          }
        } catch (e) {
          // Continue with next key
          continue;
        }
      }

      free(subKeyName);
      calloc.free(subKeyNameSize);
      RegCloseKey(hKey);
    } catch (e) {
      _logger.e('Error scanning registry: $e');
    }

    return detections;
  }

  /// Parse VID/PID from hardware ID string
  /// Example: "USB\\VID_2508&PID_0003" -> {"vid": "2508", "pid": "0003"}
  Map<String, String>? _parseVidPid(String hwId) {
    if (hwId.isEmpty) return null;

    final regex = RegExp(
      r'VID_([0-9A-F]{4})&PID_([0-9A-F]{4})',
      caseSensitive: false,
    );
    final match = regex.firstMatch(hwId);
    if (match != null) {
      return {
        'vid': match.group(1)!.toUpperCase(),
        'pid': match.group(2)!.toUpperCase(),
      };
    }
    return null;
  }

  /// Match device against known adapter signatures
  /// Returns map with 'type' and 'score' (0-100+)
  Map<String, dynamic> _matchSignatures(
    String friendlyName,
    String description,
    Map<String, String>? vidPid,
  ) {
    double score = 0.0;
    String? detectedType;

    final lowerName = friendlyName.toLowerCase();
    final lowerDesc = description.toLowerCase();
    final combined = '$lowerName $lowerDesc';

    // Check each adapter signature
    for (final adapterEntry in _adapterSignatures.entries) {
      final adapterType = adapterEntry.key;
      final signatures = adapterEntry.value;
      final keywords = signatures['keywords'] as List<String>;
      final vid = signatures['vid'] as String?;
      final pids = signatures['pids'] as List<String>?;

      double typeScore = 0.0;

      // Check keywords in name/description
      for (final keyword in keywords) {
        if (combined.contains(keyword.toLowerCase())) {
          typeScore += 100.0;
          detectedType = adapterType;
          break;
        }
      }

      // Check VID/PID match
      if (vid != null && vidPid != null && vidPid['vid'] == vid) {
        typeScore += 80.0;
        if (detectedType == null) detectedType = adapterType;

        // Check PID if available
        if (pids != null &&
            vidPid['pid'] != null &&
            pids.contains(vidPid['pid']!)) {
          typeScore += 20.0;
        }
      }

      // Use the highest scoring type
      if (typeScore > score) {
        score = typeScore;
        if (detectedType == null) detectedType = adapterType;
      }
    }

    return {'type': detectedType ?? 'unknown', 'score': score};
  }

  /// Create Game Controller GUID
  /// {4D36E96F-E325-11CE-BFC1-08002BE10318}
  Pointer<GUID> _createGameControllerGuid() {
    final guid = calloc<GUID>();
    // GUID structure: Data1, Data2, Data3, Data4[8]
    // {4D36E96F-E325-11CE-BFC1-08002BE10318}
    guid.ref.Data1 = 0x4D36E96F;
    guid.ref.Data2 = 0xE325;
    guid.ref.Data3 = 0x11CE;
    // Data4 is accessed via pointer arithmetic (offset 8 bytes for Data1+Data2+Data3)
    final data4Ptr = Pointer<Uint8>.fromAddress(guid.address + 8);
    data4Ptr[0] = 0xBF;
    data4Ptr[1] = 0xC1;
    data4Ptr[2] = 0x08;
    data4Ptr[3] = 0x00;
    data4Ptr[4] = 0x2B;
    data4Ptr[5] = 0xE1;
    data4Ptr[6] = 0x03;
    data4Ptr[7] = 0x18;
    return guid;
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

  /// Scan for adapters in input mode (spoofed controllers)
  /// Based on GAME_ADAPTER_INPUT_MODE_DETECTION.md and GAME_ADAPTER_MULTI_INPUT_DEVICE_SUPPORT.md specifications
  Future<List<DetectionReport>> _scanInputMode() async {
    final detections = <DetectionReport>[];

    try {
      _logger.d('Starting comprehensive input mode emulation detection...');

      // 1. Scan XInput emulation
      final xinputDetections = await _scanXInputEmulation();
      detections.addAll(xinputDetections);

      // 2. Scan HID gamepad emulation (PlayStation, Nintendo)
      final hidDetections = await _scanHIDGamepadEmulation();
      detections.addAll(hidDetections);

      // 3. Scan DirectInput emulation
      final directInputDetections = await _scanDirectInputEmulation();
      detections.addAll(directInputDetections);

      // 4. Scan MnK-as-controller emulation
      final mnkDetections = await _scanMnKAsController();
      detections.addAll(mnkDetections);

      // 5. Scan for DS4Windows + adapter combinations (Titan Two + DS4Windows scenario)
      final ds4WindowsDetections = await _scanDS4WindowsCombinations();
      detections.addAll(ds4WindowsDetections);

      if (detections.isNotEmpty) {
        _logger.w(
          '🚨 Found ${detections.length} emulation detection(s) in input mode',
        );
      }
    } catch (e, stackTrace) {
      _logger.e('Error scanning input mode: $e');
      _logger.e('Stack trace: $stackTrace');
    }

    return detections;
  }

  /// Scan for XInput emulation (Xbox controllers)
  Future<List<DetectionReport>> _scanXInputEmulation() async {
    final detections = <DetectionReport>[];

    try {
      if (_xinputGetCapabilitiesPtr == null) {
        return detections;
      }

      // Count XInput controllers
      final controllerCount = _countXInputControllers();
      _logger.d('Found $controllerCount XInput controller(s)');

      // Get HID serial numbers and manufacturer/product strings for Xbox controllers
      final deviceInfo = await _getXInputDeviceInfo();
      final serials = deviceInfo.map((d) => d['serial'] as String).toList();
      final manufacturers = deviceInfo
          .map((d) => d['manufacturer'] as String)
          .toList();

      // Analyze for anomalies
      final duplicates = _countDuplicates(serials);
      final invalids = serials
          .where(
            (s) =>
                s.isEmpty ||
                s == 'MISSING' ||
                s == 'UNKNOWN' ||
                s.startsWith('0000') ||
                s.toLowerCase() == 'no serial' ||
                s.toLowerCase() == 'n/a',
          )
          .length;

      // Check manufacturer mismatches
      final manufacturerMismatches = manufacturers
          .where(
            (m) =>
                m.isNotEmpty &&
                !m.toLowerCase().contains('microsoft') &&
                !m.toLowerCase().contains('xbox'),
          )
          .length;

      // Calculate score
      double score = 0.0;
      final evidenceParts = <String>[];

      if (controllerCount >= 2) {
        score += 40.0;
        evidenceParts.add('XInput controllers: $controllerCount');
      }

      if (invalids > 0) {
        score += invalids * 30.0;
        evidenceParts.add('Invalid serials: $invalids');
      }

      if (duplicates > 0) {
        score += duplicates * 20.0;
        evidenceParts.add('Duplicate serials: $duplicates');
      }

      if (manufacturerMismatches > 0) {
        score += manufacturerMismatches * 30.0;
        evidenceParts.add('Manufacturer mismatches: $manufacturerMismatches');
      }

      // Lower threshold for Xbox controllers since serial querying may not work reliably
      // Also detect based on multiple controllers or suspicious properties
      // With UNKNOWN serials, we rely more on controller count and manufacturer mismatches
      final threshold =
          40.0; // Lowered from 70.0 to account for serial query limitations
      if (score > threshold) {
        final evidence = evidenceParts.join(', ');
        detections.add(
          DetectionReport(
            type: CheatType.gameAdapter,
            evidence: {
              'adapterType': 'XInput Emulation',
              'emulationType': 'XInput',
              'detectionMethod': 'input_mode',
              'xinputCount': controllerCount,
              'invalidSerials': invalids,
              'duplicateSerials': duplicates,
              'manufacturerMismatches': manufacturerMismatches,
              'score': score,
              'evidence': evidence,
            },
            processName: 'XInput Emulation Detection',
          ),
        );
      }
    } catch (e, stackTrace) {
      _logger.e('Error scanning XInput emulation: $e');
      _logger.e('Stack trace: $stackTrace');
    }

    return detections;
  }

  /// Scan for HID gamepad emulation (PlayStation, Nintendo)
  Future<List<DetectionReport>> _scanHIDGamepadEmulation() async {
    final detections = <DetectionReport>[];

    try {
      if (_hidDGetSerialNumberString == null) {
        return detections;
      }

      // Scan for PlayStation (VID_054C) and Nintendo (VID_057E) controllers
      // Note: DS4Windows detection is handled separately in _scanDS4WindowsCombinations()
      final psDevices = await _getHIDDeviceInfo('054C'); // Sony PlayStation
      final nintendoDevices = await _getHIDDeviceInfo('057E'); // Nintendo

      final allDevices = <Map<String, String>>[];
      allDevices.addAll(psDevices);
      allDevices.addAll(nintendoDevices);

      if (allDevices.isEmpty) {
        return detections;
      }

      final serials = allDevices.map((d) => d['serial'] ?? '').toList();
      final products = allDevices.map((d) => d['product'] ?? '').toList();

      // Analyze for anomalies
      final duplicates = _countDuplicates(serials);

      // Check for generic/emulated strings
      final genericProducts = products
          .where(
            (p) =>
                p.toLowerCase().contains('generic') ||
                p.toLowerCase().contains('emulated') ||
                p.toLowerCase().contains('spoofed') ||
                p.isEmpty,
          )
          .length;

      // Check manufacturer mismatches
      final psManufacturerMismatches = psDevices.where((d) {
        final mfr = (d['manufacturer'] ?? '').toLowerCase();
        return mfr.isNotEmpty &&
            !mfr.contains('sony') &&
            !mfr.contains('playstation');
      }).length;

      final nintendoManufacturerMismatches = nintendoDevices.where((d) {
        final mfr = (d['manufacturer'] ?? '').toLowerCase();
        return mfr.isNotEmpty && !mfr.contains('nintendo');
      }).length;

      // Calculate score
      double score = 0.0;
      final evidenceParts = <String>[];

      // IMPORTANT: DS4Windows is a legitimate tool for using PlayStation controllers on Windows.
      // Do NOT flag legitimate PS controllers when DS4Windows is running.
      // Only flag if there are actual anomalies suggesting an adapter (duplicates, manufacturer mismatches, generic products).
      // Note: "UNKNOWN" serials are common and not suspicious by themselves.

      // Only count invalid serials if they're actually MISSING (not just UNKNOWN)
      // UNKNOWN is expected when we can't query serials, MISSING suggests adapter spoofing
      final missingSerials = serials
          .where(
            (s) =>
                s == 'MISSING' ||
                s.startsWith('0000') ||
                s.toLowerCase() == 'no serial' ||
                s.toLowerCase() == 'n/a',
          )
          .length;

      if (missingSerials > 0) {
        score += missingSerials * 30.0;
        evidenceParts.add('Missing serials: $missingSerials');
      }

      if (duplicates > 0) {
        score += duplicates * 20.0;
        evidenceParts.add('Duplicate serials: $duplicates');
      }

      if (genericProducts > 0) {
        score += genericProducts * 40.0;
        evidenceParts.add('Generic/emulated products: $genericProducts');
      }

      if (psManufacturerMismatches > 0 || nintendoManufacturerMismatches > 0) {
        score +=
            (psManufacturerMismatches + nintendoManufacturerMismatches) * 30.0;
        evidenceParts.add(
          'Manufacturer mismatches: ${psManufacturerMismatches + nintendoManufacturerMismatches}',
        );
      }

      // Use standard threshold - DS4Windows alone is NOT suspicious
      // Only flag if there are clear anomalies suggesting an adapter
      final threshold = 70.0;

      if (score > threshold) {
        final deviceTypes = <String>[];
        if (psDevices.isNotEmpty) deviceTypes.add('PlayStation');
        if (nintendoDevices.isNotEmpty) deviceTypes.add('Nintendo');

        final evidence = evidenceParts.join(', ');
        detections.add(
          DetectionReport(
            type: CheatType.gameAdapter,
            evidence: {
              'adapterType': 'HID Gamepad Emulation',
              'emulationType': deviceTypes.join('/'),
              'detectionMethod': 'input_mode',
              'deviceCount': allDevices.length,
              'missingSerials': missingSerials,
              'duplicateSerials': duplicates,
              'genericProducts': genericProducts,
              'score': score,
              'evidence': evidence,
            },
            processName: 'HID Gamepad Emulation Detection',
          ),
        );
      }
    } catch (e, stackTrace) {
      _logger.e('Error scanning HID gamepad emulation: $e');
      _logger.e('Stack trace: $stackTrace');
    }

    return detections;
  }

  /// Scan for DirectInput emulation (joysticks, wheels, fight sticks)
  Future<List<DetectionReport>> _scanDirectInputEmulation() async {
    final detections = <DetectionReport>[];

    try {
      if (_joyGetNumDevs == null || _joyGetDevCaps == null) {
        return detections;
      }

      final deviceCount = _joyGetNumDevs!();
      if (deviceCount == 0) {
        return detections;
      }

      _logger.d('Found $deviceCount DirectInput device(s)');

      final suspiciousDevices = <Map<String, dynamic>>[];

      // Check each device for anomalies
      for (int i = 0; i < deviceCount; i++) {
        try {
          // JOYCAPS structure size is typically 728 bytes
          final capsBuffer = calloc<Uint8>(728);
          final result = _joyGetDevCaps!(i, capsBuffer.cast<Void>(), 728);

          if (result == 0) {
            // Extract device name (szPname is at offset 4, max 32 chars)
            // JOYCAPS.szPname is a fixed array of 32 WCHARs
            final namePtr = Pointer<Uint16>.fromAddress(capsBuffer.address + 4);
            // Read as null-terminated wide string
            final nameBuffer = <int>[];
            for (int i = 0; i < 32; i++) {
              final char = namePtr[i];
              if (char == 0) break;
              nameBuffer.add(char);
            }
            final deviceName = String.fromCharCodes(nameBuffer);

            // Extract button count (wNumButtons is at offset 36)
            final numButtonsPtr = Pointer<Uint16>.fromAddress(
              capsBuffer.address + 36,
            );
            final numButtons = numButtonsPtr.value;

            // Check for anomalies
            bool isSuspicious = false;
            final anomalies = <String>[];

            if (deviceName.toLowerCase().contains('generic') ||
                deviceName.isEmpty) {
              isSuspicious = true;
              anomalies.add('Generic/empty name');
            }

            if (numButtons == 0) {
              isSuspicious = true;
              anomalies.add('Zero buttons');
            }

            if (isSuspicious) {
              suspiciousDevices.add({
                'name': deviceName,
                'index': i,
                'anomalies': anomalies,
              });
            }
          }

          calloc.free(capsBuffer);
        } catch (e) {
          _logger.d('Error checking DirectInput device $i: $e');
        }
      }

      if (suspiciousDevices.length > 0) {
        final score = suspiciousDevices.length * 50.0;
        final evidence = suspiciousDevices
            .map((d) => '${d['name']}: ${(d['anomalies'] as List).join(', ')}')
            .join('; ');

        detections.add(
          DetectionReport(
            type: CheatType.gameAdapter,
            evidence: {
              'adapterType': 'DirectInput Emulation',
              'emulationType': 'DirectInput',
              'detectionMethod': 'input_mode',
              'suspiciousDeviceCount': suspiciousDevices.length,
              'totalDeviceCount': deviceCount,
              'score': score,
              'evidence': evidence,
            },
            processName: 'DirectInput Emulation Detection',
          ),
        );
      }
    } catch (e, stackTrace) {
      _logger.e('Error scanning DirectInput emulation: $e');
      _logger.e('Stack trace: $stackTrace');
    }

    return detections;
  }

  /// Scan for MnK-as-controller emulation
  Future<List<DetectionReport>> _scanMnKAsController() async {
    final detections = <DetectionReport>[];

    try {
      if (_getRawInputDeviceList == null) {
        return detections;
      }

      // Get raw input device count
      final deviceCountPtr = calloc<Uint32>();
      final result = _getRawInputDeviceList!(nullptr, deviceCountPtr, 0);

      if (result == 0 || deviceCountPtr.value == 0) {
        calloc.free(deviceCountPtr);
        return detections;
      }

      final deviceCount = deviceCountPtr.value;
      _logger.d('Found $deviceCount raw input device(s)');

      // Check if we have controllers AND high mouse/keyboard activity
      // This is a heuristic - if controllers are present but we also see
      // many mouse/keyboard devices, it could indicate MnK-as-controller
      final xinputCount = _countXInputControllers();
      final hidGamepadCount = await _countHIDGamepads();

      // Count mouse/keyboard devices from raw input
      // Note: This is simplified - full implementation would enumerate devices
      // and check their types (RIM_TYPEMOUSE, RIM_TYPEKEYBOARD, RIM_TYPEHID)

      // Heuristic: If we have controllers but also detect potential MnK conversion
      if (xinputCount > 0 || hidGamepadCount > 0) {
        // This is a basic check - in a full implementation, we'd monitor
        // input patterns to detect MnK-to-controller conversion
        // For now, we'll flag if we detect suspicious combinations

        // This detection is less reliable without input monitoring,
        // so we use a lower threshold
        final score = 50.0; // Lower score for heuristic detection

        detections.add(
          DetectionReport(
            type: CheatType.gameAdapter,
            evidence: {
              'adapterType': 'MnK-as-Controller Emulation',
              'emulationType': 'MnK-to-Controller',
              'detectionMethod': 'input_mode',
              'xinputCount': xinputCount,
              'hidGamepadCount': hidGamepadCount,
              'rawInputDeviceCount': deviceCount,
              'score': score,
              'evidence':
                  'Controllers detected with raw input devices (heuristic - may indicate MnK conversion)',
            },
            processName: 'MnK-as-Controller Detection',
          ),
        );
      }

      calloc.free(deviceCountPtr);
    } catch (e, stackTrace) {
      _logger.e('Error scanning MnK-as-controller emulation: $e');
      _logger.e('Stack trace: $stackTrace');
    }

    return detections;
  }

  /// Count active XInput controllers (slots 0-3)
  /// Returns number of active controllers
  int _countXInputControllers() {
    int count = 0;

    try {
      if (_xinputGetCapabilitiesPtr == null) {
        return 0;
      }

      final xinputGetCapabilities = _xinputGetCapabilitiesPtr!
          .asFunction<int Function(int, int, Pointer<XINPUT_CAPABILITIES>)>();

      final caps = calloc<XINPUT_CAPABILITIES>();

      // Check slots 0-3
      for (int slot = 0; slot < 4; slot++) {
        try {
          final result = xinputGetCapabilities(slot, 0, caps);

          // ERROR_SUCCESS = 0, ERROR_DEVICE_NOT_CONNECTED = 1167
          if (result == ERROR_SUCCESS) {
            final type = caps.ref.Type;
            // XINPUT_DEVTYPE_GAMEPAD = 1, XINPUT_DEVTYPE_UNKNOWN = 0
            // Type 1 = Xbox360, Type 3 = Unknown (both suspicious when >= 2)
            if (type == 1 || type == 3) {
              count++;
              _logger.d('Found XInput controller at slot $slot, type: $type');
            }
          }
        } catch (e) {
          _logger.d('Error checking XInput slot $slot: $e');
          // Continue with next slot
        }
      }

      calloc.free(caps);
    } catch (e) {
      _logger.e('Error counting XInput controllers: $e');
    }

    return count;
  }

  /// Get detailed information about XInput devices
  Future<List<Map<String, String>>> _getXInputDeviceInfo() async {
    final devices = <Map<String, String>>[];

    try {
      final hDevInfo = SetupDiGetClassDevs(
        Pointer<GUID>.fromAddress(0),
        TEXT('HID'),
        0,
        DIGCF_PRESENT | DIGCF_ALLCLASSES,
      );

      if (hDevInfo == INVALID_HANDLE_VALUE) {
        return devices;
      }

      final devInfo = calloc<SP_DEVINFO_DATA>()
        ..ref.cbSize = sizeOf<SP_DEVINFO_DATA>();

      int deviceIndex = 0;
      while (SetupDiEnumDeviceInfo(hDevInfo, deviceIndex, devInfo) != 0) {
        deviceIndex++;

        try {
          final hwIdBuffer = wsalloc(512);
          final hwIdSize = calloc<DWORD>()..value = 512 * 2;
          var hwId = '';

          if (SetupDiGetDeviceRegistryProperty(
                hDevInfo,
                devInfo,
                SPDRP_HARDWAREID,
                nullptr,
                hwIdBuffer.cast(),
                hwIdSize.value,
                hwIdSize,
              ) !=
              0) {
            hwId = hwIdBuffer.toDartString();
          }

          free(hwIdBuffer);
          calloc.free(hwIdSize);

          final vidPid = _parseVidPid(hwId);
          if (vidPid != null && vidPid['vid'] == '045E') {
            final friendlyNameBuffer = wsalloc(512);
            final friendlyNameSize = calloc<DWORD>()..value = 512 * 2;
            var friendlyName = '';

            if (SetupDiGetDeviceRegistryProperty(
                  hDevInfo,
                  devInfo,
                  SPDRP_FRIENDLYNAME,
                  nullptr,
                  friendlyNameBuffer.cast(),
                  friendlyNameSize.value,
                  friendlyNameSize,
                ) !=
                0) {
              friendlyName = friendlyNameBuffer.toDartString();
            }

            free(friendlyNameBuffer);
            calloc.free(friendlyNameSize);

            devices.add({
              'serial': 'UNKNOWN', // Cannot query without device path
              'manufacturer': friendlyName.contains('Microsoft')
                  ? 'Microsoft'
                  : 'Unknown',
              'product': friendlyName,
              'hwid': hwId,
            });
          }
        } catch (e) {
          // Continue with next device
        }
      }

      calloc.free(devInfo);
      SetupDiDestroyDeviceInfoList(hDevInfo);
    } catch (e) {
      _logger.e('Error getting basic XInput device info: $e');
    }

    return devices;
  }

  /// Get HID device information for a specific VID
  Future<List<Map<String, String>>> _getHIDDeviceInfo(String vid) async {
    final devices = <Map<String, String>>[];

    try {
      if (_hidDGetSerialNumberString == null ||
          _hidDGetManufacturerString == null ||
          _hidDGetProductString == null) {
        return devices;
      }

      final hDevInfo = SetupDiGetClassDevs(
        Pointer<GUID>.fromAddress(0),
        TEXT('HID'),
        0,
        DIGCF_PRESENT | DIGCF_ALLCLASSES,
      );

      if (hDevInfo == INVALID_HANDLE_VALUE) {
        return devices;
      }

      final devInfo = calloc<SP_DEVINFO_DATA>()
        ..ref.cbSize = sizeOf<SP_DEVINFO_DATA>();

      int deviceIndex = 0;
      while (SetupDiEnumDeviceInfo(hDevInfo, deviceIndex, devInfo) != 0) {
        deviceIndex++;

        try {
          final hwIdBuffer = wsalloc(512);
          final hwIdSize = calloc<DWORD>()..value = 512 * 2;
          var hwId = '';

          if (SetupDiGetDeviceRegistryProperty(
                hDevInfo,
                devInfo,
                SPDRP_HARDWAREID,
                nullptr,
                hwIdBuffer.cast(),
                hwIdSize.value,
                hwIdSize,
              ) !=
              0) {
            hwId = hwIdBuffer.toDartString();
          }

          free(hwIdBuffer);
          calloc.free(hwIdSize);

          final vidPid = _parseVidPid(hwId);
          if (vidPid != null && vidPid['vid'] == vid) {
            // Get device info
            final friendlyNameBuffer = wsalloc(512);
            final friendlyNameSize = calloc<DWORD>()..value = 512 * 2;
            var friendlyName = '';

            if (SetupDiGetDeviceRegistryProperty(
                  hDevInfo,
                  devInfo,
                  SPDRP_FRIENDLYNAME,
                  nullptr,
                  friendlyNameBuffer.cast(),
                  friendlyNameSize.value,
                  friendlyNameSize,
                ) !=
                0) {
              friendlyName = friendlyNameBuffer.toDartString();
            }

            free(friendlyNameBuffer);
            calloc.free(friendlyNameSize);

            // Try to get manufacturer/product strings
            // Note: This requires opening the device handle, which is complex
            // For now, we'll use registry properties
            String manufacturer = '';
            String product = friendlyName;

            // Extract manufacturer from friendly name if possible
            if (friendlyName.toLowerCase().contains('sony') ||
                friendlyName.toLowerCase().contains('playstation')) {
              manufacturer = 'Sony';
            } else if (friendlyName.toLowerCase().contains('nintendo')) {
              manufacturer = 'Nintendo';
            }

            devices.add({
              'serial': 'UNKNOWN', // Would need device handle to query
              'manufacturer': manufacturer,
              'product': product,
              'hwid': hwId,
            });
          }
        } catch (e) {
          // Continue with next device
        }
      }

      calloc.free(devInfo);
      SetupDiDestroyDeviceInfoList(hDevInfo);
    } catch (e) {
      _logger.e('Error getting HID device info for VID $vid: $e');
    }

    return devices;
  }

  /// Count HID gamepad devices
  Future<int> _countHIDGamepads() async {
    int count = 0;

    try {
      final psDevices = await _getHIDDeviceInfo('054C');
      final nintendoDevices = await _getHIDDeviceInfo('057E');
      final xboxDevices = await _getHIDDeviceInfo('045E');

      count = psDevices.length + nintendoDevices.length + xboxDevices.length;
    } catch (e) {
      _logger.e('Error counting HID gamepads: $e');
    }

    return count;
  }

  /// Scan for DS4Windows + adapter combinations
  /// Detects Titan Two in PS4 mode with DS4Windows converting it to XInput
  Future<List<DetectionReport>> _scanDS4WindowsCombinations() async {
    final detections = <DetectionReport>[];

    try {
      // Check if DS4Windows is running
      final ds4WindowsRunning = await _isDS4WindowsRunning();
      if (!ds4WindowsRunning) {
        return detections;
      }

      _logger.d('DS4Windows detected, checking for adapter combinations...');

      // Check for ViGEmBus driver (required for DS4Windows)
      final vigemBusDetected = await _isViGEmBusInstalled();
      if (vigemBusDetected) {
        _logger.d('ViGEmBus driver detected');
      }

      // Get controller counts
      final xinputCount = _countXInputControllers();
      final psDevices = await _getHIDDeviceInfo('054C');
      final psControllerCount = psDevices.length;

      _logger.d(
        'DS4Windows scenario: XInput=$xinputCount, PS4 controllers=$psControllerCount',
      );

      // IMPORTANT: DS4Windows is a legitimate tool for using PlayStation controllers on Windows.
      // Only flag when there's clear evidence of an adapter (like Titan Two) being used.
      //
      // Key indicator: PS4 controller + XInput controller simultaneously = adapter being converted
      // This happens when Titan Two is in PS4 mode and DS4Windows converts it to XInput.
      //
      // Legitimate DS4Windows usage: Only XInput controller (PS4 hidden by HidHide) OR only PS4 controller
      // Suspicious: Both PS4 AND XInput controllers present simultaneously

      double score = 0.0;
      final evidenceParts = <String>[];

      // Scenario 1: PS4 controller present + XInput present = DS4Windows converting adapter
      // This is the KEY indicator of Titan Two + DS4Windows combination
      // Legitimate DS4Windows would only show XInput (PS4 hidden) or only PS4 (not converted)
      if (psControllerCount > 0 && xinputCount > 0) {
        score += 60.0;
        evidenceParts.add(
          'PS4 controller ($psControllerCount) + XInput controller ($xinputCount) with DS4Windows (adapter detected)',
        );
        _logger.w(
          '🚨 Suspicious: PS4 controller + XInput controller detected with DS4Windows (possible Titan Two)',
        );
      }

      // Scenario 2: XInput controller with suspicious properties + DS4Windows
      // Only flag if XInput has clear anomalies (not just UNKNOWN serials)
      if (xinputCount > 0 && psControllerCount == 0) {
        // Get XInput device info to check for suspicious properties
        final xinputDevices = await _getXInputDeviceInfo();
        final xinputSerials = xinputDevices
            .map((d) => d['serial'] ?? '')
            .toList();
        // Only count MISSING serials, not UNKNOWN (UNKNOWN is expected)
        final xinputMissing = xinputSerials
            .where(
              (s) =>
                  s == 'MISSING' ||
                  s.startsWith('0000') ||
                  s.toLowerCase() == 'no serial' ||
                  s.toLowerCase() == 'n/a',
            )
            .length;

        // Check manufacturer mismatches
        final xinputManufacturers = xinputDevices
            .map((d) => d['manufacturer'] ?? '')
            .toList();
        final xinputMfrMismatches = xinputManufacturers
            .where(
              (m) =>
                  m.isNotEmpty &&
                  !m.toLowerCase().contains('microsoft') &&
                  !m.toLowerCase().contains('xbox'),
            )
            .length;

        // Only flag if there are clear anomalies (not just UNKNOWN serials)
        if (xinputMissing > 0 || xinputMfrMismatches > 0) {
          score += 50.0;
          evidenceParts.add(
            'XInput controller ($xinputCount) with suspicious properties (missing serials: $xinputMissing, mfr mismatches: $xinputMfrMismatches)',
          );
          _logger.w(
            '🚨 Suspicious: XInput controller with invalid properties detected with DS4Windows (possible adapter)',
          );
        }
        // Otherwise, this is likely legitimate DS4Windows usage (PS4 controller converted to XInput)
      }

      // Scenario 3: Multiple XInput controllers with DS4Windows (could indicate adapter)
      if (xinputCount >= 2 && psControllerCount == 0) {
        score += 40.0;
        evidenceParts.add(
          'Multiple XInput controllers ($xinputCount) with DS4Windows (possible adapter)',
        );
      }

      // Scenario 4: PS4 controller with suspicious properties + DS4Windows
      // Only flag if there are clear anomalies (not just UNKNOWN serials)
      if (psControllerCount > 0 && xinputCount == 0) {
        final psSerials = psDevices.map((d) => d['serial'] ?? '').toList();
        // Only count MISSING serials, not UNKNOWN
        final psMissing = psSerials
            .where(
              (s) =>
                  s == 'MISSING' ||
                  s.startsWith('0000') ||
                  s.toLowerCase() == 'no serial' ||
                  s.toLowerCase() == 'n/a',
            )
            .length;

        if (psMissing > 0) {
          score += psMissing * 30.0;
          evidenceParts.add('PS4 controllers with missing serials: $psMissing');
        }

        // Check for manufacturer mismatches
        final psManufacturerMismatches = psDevices.where((d) {
          final mfr = (d['manufacturer'] ?? '').toLowerCase();
          return mfr.isNotEmpty &&
              !mfr.contains('sony') &&
              !mfr.contains('playstation');
        }).length;

        if (psManufacturerMismatches > 0) {
          score += psManufacturerMismatches * 30.0;
          evidenceParts.add(
            'PS4 manufacturer mismatches: $psManufacturerMismatches',
          );
        }
      }

      // ViGEmBus is required for DS4Windows, so it's not suspicious by itself
      // Only add points if we already have other suspicious indicators
      if (vigemBusDetected && score > 0) {
        score += 10.0;
        evidenceParts.add('ViGEmBus driver present');
      }

      // Only flag if we have clear evidence of an adapter (score > 50)
      // This ensures legitimate DS4Windows usage is not flagged
      if (score > 50.0) {
        final evidence = evidenceParts.join(', ');
        detections.add(
          DetectionReport(
            type: CheatType.gameAdapter,
            evidence: {
              'adapterType': 'DS4Windows + Adapter Combination',
              'emulationType': 'DS4Windows/Titan Two',
              'detectionMethod': 'input_mode',
              'ds4WindowsRunning': true,
              'vigemBusDetected': vigemBusDetected,
              'xinputCount': xinputCount,
              'psControllerCount': psControllerCount,
              'score': score,
              'evidence': evidence,
            },
            processName: 'DS4Windows Combination Detection',
          ),
        );
      }
    } catch (e, stackTrace) {
      _logger.e('Error scanning DS4Windows combinations: $e');
      _logger.e('Stack trace: $stackTrace');
    }

    return detections;
  }

  /// Check if DS4Windows process is running
  Future<bool> _isDS4WindowsRunning() async {
    try {
      final processIds = calloc<DWORD>(1024);
      final bytesReturned = calloc<DWORD>();

      if (EnumProcesses(processIds, 1024 * sizeOf<DWORD>(), bytesReturned) ==
          0) {
        malloc.free(processIds);
        malloc.free(bytesReturned);
        return false;
      }

      final processCount = bytesReturned.value ~/ sizeOf<DWORD>();
      final maxProcessesToCheck = processCount > 256 ? 256 : processCount;

      for (var i = 0; i < maxProcessesToCheck; i++) {
        final processId = processIds[i];
        if (processId == 0) continue;

        try {
          final processName = _getProcessName(processId);
          if (processName != null &&
              processName.toLowerCase() == 'ds4windows.exe') {
            malloc.free(processIds);
            malloc.free(bytesReturned);
            return true;
          }
        } catch (e) {
          // Continue checking other processes
          continue;
        }
      }

      malloc.free(processIds);
      malloc.free(bytesReturned);
    } catch (e) {
      _logger.e('Error checking for DS4Windows: $e');
    }

    return false;
  }

  /// Check if ViGEmBus driver is installed
  Future<bool> _isViGEmBusInstalled() async {
    try {
      // Scan for ViGEmBus driver in device manager
      // ViGEmBus appears as "Nefarius Virtual Gamepad Emulation Bus" or similar
      final hDevInfo = SetupDiGetClassDevs(
        Pointer<GUID>.fromAddress(0),
        TEXT('System'),
        0,
        DIGCF_PRESENT | DIGCF_ALLCLASSES,
      );

      if (hDevInfo == INVALID_HANDLE_VALUE) {
        return false;
      }

      final devInfo = calloc<SP_DEVINFO_DATA>()
        ..ref.cbSize = sizeOf<SP_DEVINFO_DATA>();

      int deviceIndex = 0;
      while (SetupDiEnumDeviceInfo(hDevInfo, deviceIndex, devInfo) != 0) {
        deviceIndex++;

        try {
          final friendlyNameBuffer = wsalloc(512);
          final friendlyNameSize = calloc<DWORD>()..value = 512 * 2;
          var friendlyName = '';

          if (SetupDiGetDeviceRegistryProperty(
                hDevInfo,
                devInfo,
                SPDRP_FRIENDLYNAME,
                nullptr,
                friendlyNameBuffer.cast(),
                friendlyNameSize.value,
                friendlyNameSize,
              ) !=
              0) {
            friendlyName = friendlyNameBuffer.toDartString();
          }

          free(friendlyNameBuffer);
          calloc.free(friendlyNameSize);

          final lowerName = friendlyName.toLowerCase();
          if (lowerName.contains('vigembus') ||
              lowerName.contains('virtual gamepad') ||
              lowerName.contains('nefarius')) {
            calloc.free(devInfo);
            SetupDiDestroyDeviceInfoList(hDevInfo);
            return true;
          }
        } catch (e) {
          // Continue with next device
          continue;
        }
      }

      calloc.free(devInfo);
      SetupDiDestroyDeviceInfoList(hDevInfo);
    } catch (e) {
      _logger.e('Error checking for ViGEmBus: $e');
    }

    return false;
  }

  /// Count duplicate serial numbers
  /// Returns number of duplicates found
  int _countDuplicates(List<String> serials) {
    final counts = <String, int>{};
    int duplicates = 0;

    for (final serial in serials) {
      if (serial.isNotEmpty && serial != 'MISSING') {
        counts[serial] = (counts[serial] ?? 0) + 1;
      }
    }

    for (final count in counts.values) {
      if (count > 1) {
        duplicates += count - 1; // Count extra occurrences
      }
    }

    return duplicates;
  }
}
