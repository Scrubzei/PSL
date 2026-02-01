import 'dart:ffi';
import 'dart:io';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
import 'package:logger/logger.dart';

/// Module information structure
class ModuleInfo {
  final String fullPath;
  final String baseName;
  final int baseAddress;
  final int sizeOfImage;

  ModuleInfo({
    required this.fullPath,
    required this.baseName,
    required this.baseAddress,
    required this.sizeOfImage,
  });
}

/// Memory region information
class MemoryRegionInfo {
  final int baseAddress;
  final int regionSize;
  final int protect;
  final int state;
  final int type;

  MemoryRegionInfo({
    required this.baseAddress,
    required this.regionSize,
    required this.protect,
    required this.state,
    required this.type,
  });
}

/// Checksum region information
class ChecksumRegion {
  final int start;
  final int checksum;
  final int size;
  final String name;

  ChecksumRegion({
    required this.start,
    required this.checksum,
    required this.size,
    required this.name,
  });
}

/// FFI bindings for anti-cheat native functions
class AntiCheatFFI {
  final Logger _logger = Logger();
  // ignore: unused_field - reserved for future use with custom native DLL
  DynamicLibrary? _nativeDll;

  /// Initialize FFI and load native DLL
  Future<void> initialize() async {
    try {
      // Try to load custom DLL if available
      try {
        _nativeDll = DynamicLibrary.open('anti_cheat.dll');
        _logger.i('Loaded anti_cheat.dll');
      } catch (e) {
        _logger.w(
          'Could not load anti_cheat.dll: $e. Using win32 APIs directly.',
        );
        _nativeDll = null;
      }
    } catch (e) {
      _logger.e('Error initializing FFI: $e');
    }
  }

  /// Protect a memory region using VirtualProtect
  /// Returns true if successful
  bool protectMemoryRegion(int address, int size) {
    try {
      final oldProtect = calloc<DWORD>();
      final result = VirtualProtect(
        address.toAddress(),
        size,
        PAGE_READONLY,
        oldProtect,
      );

      final success = result != 0;
      if (success) {
        _logger.d('Protected memory region at 0x${address.toRadixString(16)}');
      } else {
        _logger.w('Failed to protect memory region: ${GetLastError()}');
      }

      calloc.free(oldProtect);
      return success;
    } catch (e) {
      _logger.e('Error protecting memory region: $e');
      return false;
    }
  }

  /// Check if a function appears to be hooked
  /// This checks for jumps or calls as the first byte
  bool doesFunctionAppearHooked(String moduleName, String functionName) {
    try {
      // Load the module
      final moduleNamePtr = moduleName.toNativeUtf16();
      final hModule = GetModuleHandle(moduleNamePtr);
      free(moduleNamePtr);

      if (hModule == 0) {
        return false;
      }

      // Get function address
      final funcNamePtr = functionName.toANSI();
      final funcAddress = GetProcAddress(hModule, funcNamePtr);
      free(funcNamePtr);

      if (funcAddress == nullptr) {
        return false;
      }

      // Read first byte
      final firstByte = funcAddress.cast<Uint8>().value;

      // Check for common hook patterns: JMP (0xE9), CALL (0xE8), JMP SHORT (0xEB)
      return firstByte == 0xE9 || firstByte == 0xE8 || firstByte == 0xEB;
    } catch (e) {
      _logger.e('Error checking function hook: $e');
      return false;
    }
  }

  /// Enumerate all loaded modules in a process using EnumProcessModules
  /// Returns list of module information
  List<ModuleInfo> enumerateModules(int processId) {
    final modules = <ModuleInfo>[];
    try {
      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        0,
        processId,
      );

      if (hProcess == 0) {
        return modules;
      }

      // Get module handles
      final moduleHandles = calloc<HMODULE>(1024);
      final needed = calloc<DWORD>();

      if (EnumProcessModules(
            hProcess,
            moduleHandles,
            1024 * sizeOf<HMODULE>(),
            needed,
          ) ==
          0) {
        calloc.free(moduleHandles);
        calloc.free(needed);
        CloseHandle(hProcess);
        return modules;
      }

      final moduleCount = needed.value ~/ sizeOf<HMODULE>();
      final moduleName = wsalloc(MAX_PATH);
      final size = calloc<DWORD>()..value = MAX_PATH;

      for (var i = 0; i < moduleCount && i < 1024; i++) {
        if (GetModuleFileNameEx(
              hProcess,
              moduleHandles[i],
              moduleName,
              size.value,
            ) !=
            0) {
          final fullPath = moduleName.toDartString();
          final baseName = fullPath.split('\\').last;

          // Get module info
          final modInfo = calloc<MODULEINFO>();
          if (GetModuleInformation(
                hProcess,
                moduleHandles[i],
                modInfo,
                sizeOf<MODULEINFO>(),
              ) !=
              0) {
            final baseAddress = modInfo.ref.lpBaseOfDll.address;
            modules.add(
              ModuleInfo(
                fullPath: fullPath,
                baseName: baseName,
                baseAddress: baseAddress,
                sizeOfImage: modInfo.ref.SizeOfImage,
              ),
            );
          }
          calloc.free(modInfo);
        }
      }

      free(moduleName);
      calloc.free(size);
      calloc.free(moduleHandles);
      calloc.free(needed);
      CloseHandle(hProcess);
    } catch (e) {
      _logger.e('Error enumerating modules: $e');
    }

    return modules;
  }

  /// Query memory regions in a process
  /// Returns list of memory region information
  List<MemoryRegionInfo> queryMemoryRegions(int processId) {
    final regions = <MemoryRegionInfo>[];
    try {
      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        0,
        processId,
      );

      if (hProcess == 0) {
        return regions;
      }

      var currentAddress = 0;
      final mbi = calloc<MEMORY_BASIC_INFORMATION>();

      while (VirtualQueryEx(
            hProcess,
            currentAddress.toAddress(),
            mbi,
            sizeOf<MEMORY_BASIC_INFORMATION>(),
          ) !=
          0) {
        final baseAddr = mbi.ref.BaseAddress.address;
        regions.add(
          MemoryRegionInfo(
            baseAddress: baseAddr,
            regionSize: mbi.ref.RegionSize,
            protect: mbi.ref.Protect,
            state: mbi.ref.State,
            type: mbi.ref.Type,
          ),
        );

        currentAddress = baseAddr + mbi.ref.RegionSize;
      }

      calloc.free(mbi);
      CloseHandle(hProcess);
    } catch (e) {
      _logger.e('Error querying memory regions: $e');
    }

    return regions;
  }

  /// Dump memory region to file
  /// Returns true if successful
  bool dumpMemoryRegion(
    int processId,
    int baseAddress,
    int size,
    String filePath,
  ) {
    try {
      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        0,
        processId,
      );

      if (hProcess == 0) {
        _logger.w('Failed to open process $processId for memory dump');
        return false;
      }

      // Limit dump size to prevent excessive memory allocation
      const maxDumpSize = 10 * 1024 * 1024; // 10MB max
      final safeSize = size > maxDumpSize ? maxDumpSize : size;

      if (safeSize <= 0) {
        _logger.w('Invalid dump size: $size');
        CloseHandle(hProcess);
        return false;
      }

      final buffer = calloc<Uint8>(safeSize);
      final bytesRead = calloc<SIZE_T>();

      if (ReadProcessMemory(
            hProcess,
            baseAddress.toAddress(),
            buffer,
            safeSize,
            bytesRead,
          ) ==
          0) {
        _logger.w('Failed to read process memory: ${GetLastError()}');
        calloc.free(buffer);
        calloc.free(bytesRead);
        CloseHandle(hProcess);
        return false;
      }

      final file = File(filePath);
      final readSize = bytesRead.value < safeSize ? bytesRead.value : safeSize;
      final bytes = buffer.asTypedList(readSize);
      file.writeAsBytesSync(bytes);

      calloc.free(buffer);
      calloc.free(bytesRead);
      CloseHandle(hProcess);

      _logger.i(
        'Dumped memory region 0x${baseAddress.toRadixString(16)} to $filePath',
      );
      return true;
    } catch (e) {
      _logger.e('Error dumping memory region: $e');
      return false;
    }
  }

  /// Validate module signature using WinVerifyTrust
  /// Returns true if module is signed and trusted
  /// Note: This is a simplified check - for full validation, use a native DLL
  /// AGGRESSIVE MODE: Returns false for all non-system modules to catch unsigned DLLs
  bool validateModuleSignature(String filePath) {
    try {
      final file = File(filePath);
      if (!file.existsSync()) {
        // File doesn't exist - likely manually mapped or suspicious
        _logger.d('Module file does not exist: $filePath');
        return false;
      }

      final ext = filePath.toLowerCase();
      if (!ext.endsWith('.dll') && !ext.endsWith('.exe')) {
        return false;
      }

      // System modules are typically signed - trust them
      final lowerPath = filePath.toLowerCase();
      if (lowerPath.contains('\\windows\\') ||
          lowerPath.contains('\\system32\\') ||
          lowerPath.contains('\\syswow64\\') ||
          lowerPath.contains('\\winsxs\\')) {
        // System modules are typically signed
        return true;
      }

      // AGGRESSIVE: For all other modules, assume unsigned unless proven otherwise
      // This will catch injected DLLs that aren't properly signed
      // In a full implementation, this would call WinVerifyTrust API
      // For now, we err on the side of caution - mark as unsigned
      _logger.d('Non-system module assumed unsigned: $filePath');
      return false;
    } catch (e) {
      _logger.e('Error validating module signature: $e');
      // On error, assume unsigned to be safe
      return false;
    }
  }

  /// Copy file to destination
  /// Returns true if successful
  bool copyFile(String sourcePath, String destPath) {
    try {
      final sourceFile = File(sourcePath);
      if (!sourceFile.existsSync()) {
        _logger.w('Source file does not exist: $sourcePath');
        return false;
      }

      // Ensure destination directory exists
      final destFile = File(destPath);
      destFile.parent.createSync(recursive: true);

      sourceFile.copySync(destPath);
      _logger.i('Copied file from $sourcePath to $destPath');
      return true;
    } catch (e) {
      _logger.e('Error copying file: $e');
      return false;
    }
  }

  /// Compute checksum for a memory region
  /// Returns checksum value
  int computeChecksum(int processId, int address, int size) {
    try {
      // Limit size to prevent excessive memory allocation
      const maxChecksumSize = 10 * 1024 * 1024; // 10MB max
      final safeSize = size > maxChecksumSize ? maxChecksumSize : size;

      if (safeSize <= 0) {
        return 0;
      }

      final hProcess = OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
        0,
        processId,
      );

      if (hProcess == 0) {
        return 0;
      }

      final buffer = calloc<Uint8>(safeSize);
      final bytesRead = calloc<SIZE_T>();

      if (ReadProcessMemory(
            hProcess,
            address.toAddress(),
            buffer,
            safeSize,
            bytesRead,
          ) ==
          0) {
        calloc.free(buffer);
        calloc.free(bytesRead);
        CloseHandle(hProcess);
        return 0;
      }

      int checksum = 0;
      final readSize = bytesRead.value < safeSize ? bytesRead.value : safeSize;
      for (var i = 0; i < readSize; i++) {
        checksum += buffer[i];
      }

      calloc.free(buffer);
      calloc.free(bytesRead);
      CloseHandle(hProcess);

      return checksum;
    } catch (e) {
      _logger.e('Error computing checksum: $e');
      return 0;
    }
  }

  /// Read PE file and compute checksums for .text section
  /// Returns list of checksum regions
  List<ChecksumRegion> computeFileChecksums(String filePath, int imageBase) {
    final checksums = <ChecksumRegion>[];
    try {
      final file = File(filePath);
      if (!file.existsSync()) {
        _logger.w('File does not exist: $filePath');
        return checksums;
      }

      final bytes = file.readAsBytesSync();
      if (bytes.length < 64) {
        return checksums;
      }

      // Check DOS signature
      if (bytes[0] != 0x4D || bytes[1] != 0x5A) {
        _logger.w('Invalid DOS signature in file: $filePath');
        return checksums;
      }

      // Get e_lfanew (offset to PE header)
      final eLfanew =
          (bytes[60] |
          (bytes[61] << 8) |
          (bytes[62] << 16) |
          (bytes[63] << 24));
      if (eLfanew >= bytes.length) {
        return checksums;
      }

      // Check PE signature
      if (eLfanew + 4 > bytes.length ||
          bytes[eLfanew] != 0x50 ||
          bytes[eLfanew + 1] != 0x45 ||
          bytes[eLfanew + 2] != 0x00 ||
          bytes[eLfanew + 3] != 0x00) {
        _logger.w('Invalid PE signature in file: $filePath');
        return checksums;
      }

      // Read FileHeader to get architecture and SizeOfOptionalHeader
      final fileHeaderOffset = eLfanew + 4;
      if (fileHeaderOffset + 20 > bytes.length) {
        return checksums;
      }

      // Read Machine (offset 0 in FileHeader, e_lfanew + 4)
      // Machine type: 0x8664 = x64, 0x014C = x86
      // Note: Machine type checked but not currently used
      // final machine = bytes[fileHeaderOffset] | (bytes[fileHeaderOffset + 1] << 8);
      // final isX64 = machine == 0x8664;

      // Read SizeOfOptionalHeader (offset 20 in FileHeader, e_lfanew + 24)
      final sizeOfOptionalHeaderOffset = eLfanew + 24;
      if (sizeOfOptionalHeaderOffset + 2 > bytes.length) {
        return checksums;
      }

      final sizeOfOptionalHeader =
          bytes[sizeOfOptionalHeaderOffset] |
          (bytes[sizeOfOptionalHeaderOffset + 1] << 8);

      // Read SizeOfHeaders from OptionalHeader
      final optionalHeaderOffset = eLfanew + 24;
      final sizeOfHeadersOffset = optionalHeaderOffset + 60;
      if (sizeOfHeadersOffset + 4 > bytes.length) {
        return checksums;
      }

      final sizeOfHeaders =
          (bytes[sizeOfHeadersOffset] |
          (bytes[sizeOfHeadersOffset + 1] << 8) |
          (bytes[sizeOfHeadersOffset + 2] << 16) |
          (bytes[sizeOfHeadersOffset + 3] << 24));

      // Compute header checksum
      int headerChecksum = 0;
      final headerSize = sizeOfHeaders < bytes.length
          ? sizeOfHeaders
          : bytes.length;
      for (var i = 0; i < headerSize; i++) {
        headerChecksum += bytes[i];
      }

      checksums.add(
        ChecksumRegion(
          start: imageBase,
          checksum: headerChecksum,
          size: headerSize,
          name: 'header',
        ),
      );

      // Read NumberOfSections
      final numberOfSectionsOffset = eLfanew + 6;
      if (numberOfSectionsOffset + 2 > bytes.length) {
        return checksums;
      }

      final numberOfSections =
          bytes[numberOfSectionsOffset] |
          (bytes[numberOfSectionsOffset + 1] << 8);

      // Calculate section headers start based on actual SizeOfOptionalHeader
      final sectionHeadersStart = eLfanew + 24 + sizeOfOptionalHeader;

      for (
        var i = 0;
        i < numberOfSections &&
            sectionHeadersStart + (i * 40) + 40 <= bytes.length;
        i++
      ) {
        final sectionOffset = sectionHeadersStart + (i * 40);
        final nameBytes = bytes.sublist(sectionOffset, sectionOffset + 8);
        final name = String.fromCharCodes(nameBytes.where((b) => b != 0));

        // Check if it's .text section
        if (name == '.text' || name.startsWith('.text')) {
          final virtualAddressOffset = sectionOffset + 12;
          final sizeOfRawDataOffset = sectionOffset + 16;
          final pointerToRawDataOffset = sectionOffset + 20;

          if (virtualAddressOffset + 4 > bytes.length ||
              sizeOfRawDataOffset + 4 > bytes.length ||
              pointerToRawDataOffset + 4 > bytes.length) {
            continue;
          }

          final virtualAddress =
              (bytes[virtualAddressOffset] |
              (bytes[virtualAddressOffset + 1] << 8) |
              (bytes[virtualAddressOffset + 2] << 16) |
              (bytes[virtualAddressOffset + 3] << 24));

          final sizeOfRawData =
              (bytes[sizeOfRawDataOffset] |
              (bytes[sizeOfRawDataOffset + 1] << 8) |
              (bytes[sizeOfRawDataOffset + 2] << 16) |
              (bytes[sizeOfRawDataOffset + 3] << 24));

          final pointerToRawData =
              (bytes[pointerToRawDataOffset] |
              (bytes[pointerToRawDataOffset + 1] << 8) |
              (bytes[pointerToRawDataOffset + 2] << 16) |
              (bytes[pointerToRawDataOffset + 3] << 24));

          if (pointerToRawData + sizeOfRawData > bytes.length) {
            continue;
          }

          // Compute checksum for .text section
          int sectionChecksum = 0;
          for (var j = 0; j < sizeOfRawData; j++) {
            sectionChecksum += bytes[pointerToRawData + j];
          }

          checksums.add(
            ChecksumRegion(
              start: imageBase + virtualAddress,
              checksum: sectionChecksum,
              size: sizeOfRawData,
              name: name,
            ),
          );
        }
      }
    } catch (e) {
      _logger.e('Error computing file checksums: $e');
    }

    return checksums;
  }

  /// Cleanup resources
  void dispose() {
    // Cleanup if needed
  }
}

extension IntToAddress on int {
  Pointer<Void> toAddress() => Pointer<Void>.fromAddress(this);
}
