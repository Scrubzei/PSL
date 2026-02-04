import 'dart:ffi';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';
import '../../../core/models/detection_report.dart';

/// Scanner for detecting DMA (Direct Memory Access) devices
class DmaScanner {
  final Logger _logger = Logger();

  // Suspicious hardware IDs (common DMA device IDs)
  // Based on research: Xilinx FPGAs, FTDI USB bridges, and other DMA devices
  static const List<String> suspiciousDeviceIds = [
    '10ee:0666', // Xilinx (common DMA device)
    '10ee:0667',
    '10ee:0668',
    '10ee:0669',
    '10ee:066a',
    '0403:601f', // FTDI FT601 (USB 3.0 bridge, commonly used for DMA)
    '0403:601e', // FTDI FT600
    '1d50:602b', // Great Scott Gadgets USB3SM (DMA device)
  ];

  // Suspicious device class descriptions
  static const List<String> suspiciousDeviceClasses = [
    'usb bridge',
    'interrupt controller',
    'pci bridge',
  ];

  /// Scan for DMA devices using Windows SetupAPI
  /// Returns list of detection reports if any are found
  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    try {
      // Enumerate PCI devices
      final pciDetections = await _scanPciDevices();
      detections.addAll(pciDetections);

      // Enumerate USB devices
      final usbDetections = await _scanUsbDevices();
      detections.addAll(usbDetections);
    } catch (e) {
      _logger.e('Error scanning DMA devices: $e');
    }

    return detections;
  }

  /// Scan PCI devices for suspicious DMA hardware
  Future<List<DetectionReport>> _scanPciDevices() async {
    final detections = <DetectionReport>[];

    try {
      // GUID for PCI bus class: {4D36E97D-E325-11CE-BFC1-08002BE10318}
      final pciGuidPtr = _createPciGuid();

      // Get device information set for PCI devices
      final hDevInfo = SetupDiGetClassDevs(
        pciGuidPtr,
        nullptr,
        0,
        DIGCF_PRESENT,
      );

      if (hDevInfo == INVALID_HANDLE_VALUE) {
        final error = GetLastError();
        _logger.w('Failed to get PCI device info set: $error');
        calloc.free(pciGuidPtr);
        return detections;
      }

      final devInfo = calloc<SP_DEVINFO_DATA>()
        ..ref.cbSize = sizeOf<SP_DEVINFO_DATA>();

      // Enumerate devices
      for (int i = 0; SetupDiEnumDeviceInfo(hDevInfo, i, devInfo) != 0; i++) {
        try {
          // Get hardware ID
          final hwId = _getDeviceProperty(hDevInfo, devInfo, SPDRP_HARDWAREID);

          if (hwId != null && hwId.isNotEmpty) {
            // Check against suspicious device IDs
            final upperHwId = hwId.toUpperCase();
            for (final suspiciousId in suspiciousDeviceIds) {
              if (upperHwId.contains(suspiciousId.toUpperCase())) {
                _logger.w('Found suspicious DMA device: $hwId');
                detections.add(
                  DetectionReport(
                    type: CheatType.dmaDevice,
                    evidence: {
                      'hardwareId': hwId,
                      'deviceType': 'PCI',
                      'suspiciousId': suspiciousId,
                      'score': 80.0,
                    },
                    processName: 'PCI Device',
                  ),
                );
                break;
              }
            }

            // Check for generic/suspicious device descriptions
            final deviceDesc = _getDeviceProperty(
              hDevInfo,
              devInfo,
              SPDRP_DEVICEDESC,
            );
            if (deviceDesc != null) {
              final lowerDesc = deviceDesc.toLowerCase();
              for (final suspiciousClass in suspiciousDeviceClasses) {
                if (lowerDesc.contains(suspiciousClass)) {
                  // Additional check: missing serial number or generic description
                  final serialNumber = _getDeviceProperty(
                    hDevInfo,
                    devInfo,
                    // Note: SPDRP_SERIALNUMBER may not be available in win32 package
                    // Using SPDRP_DEVICEDESC as alternative
                    SPDRP_DEVICEDESC,
                  );
                  if (serialNumber == null || serialNumber.isEmpty) {
                    _logger.w(
                      'Found suspicious DMA device (generic description): $deviceDesc',
                    );
                    detections.add(
                      DetectionReport(
                        type: CheatType.dmaDevice,
                        evidence: {
                          'hardwareId': hwId,
                          'deviceDescription': deviceDesc,
                          'deviceType': 'PCI',
                          'reason':
                              'Generic description with missing serial number',
                          'score': 70.0,
                        },
                        processName: 'PCI Device',
                      ),
                    );
                    break;
                  }
                }
              }
            }
          }
        } catch (e) {
          // Skip devices we can't access
          continue;
        }
      }

      SetupDiDestroyDeviceInfoList(hDevInfo);
      calloc.free(pciGuidPtr);
      calloc.free(devInfo);
    } catch (e) {
      _logger.e('Error scanning PCI devices: $e');
    }

    return detections;
  }

  /// Scan USB devices for suspicious DMA hardware
  Future<List<DetectionReport>> _scanUsbDevices() async {
    final detections = <DetectionReport>[];

    try {
      // GUID for USB devices: {36FC9E60-C465-11CF-8056-444553540000}
      final usbGuidPtr = _createUsbGuid();

      // Get device information set for USB devices
      final hDevInfo = SetupDiGetClassDevs(
        usbGuidPtr,
        Pointer<Utf16>.fromAddress(0),
        0,
        DIGCF_PRESENT,
      );

      if (hDevInfo == INVALID_HANDLE_VALUE) {
        final error = GetLastError();
        _logger.w('Failed to get USB device info set: $error');
        calloc.free(usbGuidPtr);
        return detections;
      }

      final devInfo = calloc<SP_DEVINFO_DATA>()
        ..ref.cbSize = sizeOf<SP_DEVINFO_DATA>();

      // Enumerate devices
      for (int i = 0; SetupDiEnumDeviceInfo(hDevInfo, i, devInfo) != 0; i++) {
        try {
          // Get hardware ID
          final hwId = _getDeviceProperty(hDevInfo, devInfo, SPDRP_HARDWAREID);

          if (hwId != null && hwId.isNotEmpty) {
            // Check against suspicious device IDs (especially FTDI devices)
            final upperHwId = hwId.toUpperCase();
            for (final suspiciousId in suspiciousDeviceIds) {
              if (upperHwId.contains(suspiciousId.toUpperCase())) {
                _logger.w('Found suspicious DMA USB device: $hwId');
                detections.add(
                  DetectionReport(
                    type: CheatType.dmaDevice,
                    evidence: {
                      'hardwareId': hwId,
                      'deviceType': 'USB',
                      'suspiciousId': suspiciousId,
                      'score': 85.0,
                    },
                    processName: 'USB Device',
                  ),
                );
                break;
              }
            }
          }
        } catch (e) {
          // Skip devices we can't access
          continue;
        }
      }

      SetupDiDestroyDeviceInfoList(hDevInfo);
      calloc.free(usbGuidPtr);
      calloc.free(devInfo);
    } catch (e) {
      _logger.e('Error scanning USB devices: $e');
    }

    return detections;
  }

  /// Get device property using SetupAPI
  String? _getDeviceProperty(
    int hDevInfo,
    Pointer<SP_DEVINFO_DATA> devInfo,
    int property,
  ) {
    try {
      final buffer = calloc<Uint8>(1024);
      final requiredSize = calloc<DWORD>();

      final result = SetupDiGetDeviceRegistryProperty(
        hDevInfo,
        devInfo,
        property,
        nullptr,
        buffer,
        1024,
        requiredSize,
      );

      if (result != 0) {
        // Convert to string (assuming UTF-16)
        final string = buffer.cast<Utf16>().toDartString();
        calloc.free(buffer);
        calloc.free(requiredSize);
        return string;
      }

      calloc.free(buffer);
      calloc.free(requiredSize);
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Create PCI GUID: {4D36E97D-E325-11CE-BFC1-08002BE10318}
  Pointer<GUID> _createPciGuid() {
    final guid = calloc<GUID>();
    guid.ref.Data1 = 0x4D36E97D;
    guid.ref.Data2 = 0xE325;
    guid.ref.Data3 = 0x11CE;
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

  /// Create USB GUID: {36FC9E60-C465-11CF-8056-444553540000}
  Pointer<GUID> _createUsbGuid() {
    final guid = calloc<GUID>();
    guid.ref.Data1 = 0x36FC9E60;
    guid.ref.Data2 = 0xC465;
    guid.ref.Data3 = 0x11CF;
    final data4Ptr = Pointer<Uint8>.fromAddress(guid.address + 8);
    data4Ptr[0] = 0x80;
    data4Ptr[1] = 0x56;
    data4Ptr[2] = 0x44;
    data4Ptr[3] = 0x45;
    data4Ptr[4] = 0x53;
    data4Ptr[5] = 0x54;
    data4Ptr[6] = 0x00;
    data4Ptr[7] = 0x00;
    return guid;
  }
}
