#include "detection.h"
#include <windows.h>
#include <psapi.h>
#include <tlhelp32.h>
#include <vector>
#include <string>
#include <algorithm>

#define BUILDING_DLL

// Based on techniques from UltimateAntiCheat and thetuh/anti-cheat

// Simplified PEB structure
typedef struct _LIST_ENTRY {
    struct _LIST_ENTRY* Flink;
    struct _LIST_ENTRY* Blink;
} LIST_ENTRY, *PLIST_ENTRY;

typedef struct _LDR_DATA_TABLE_ENTRY {
    LIST_ENTRY InMemoryOrderLinks;
    PVOID Reserved1[2];
    PVOID DllBase;
} LDR_DATA_TABLE_ENTRY, *PLDR_DATA_TABLE_ENTRY;

typedef struct _PEB_LDR_DATA {
    BYTE Reserved1[8];
    PVOID Reserved2[3];
    LIST_ENTRY InMemoryOrderModuleList;
} PEB_LDR_DATA, *PPEB_LDR_DATA;

typedef struct _PEB {
    BYTE Reserved1[2];
    BYTE BeingDebugged;
    BYTE Reserved2[1];
    PVOID Reserved3[2];
    PPEB_LDR_DATA Ldr;
} PEB, *PPEB;

/// Check if a module is manually mapped (simplified check)
bool IsManuallyMapped(HMODULE hModule) {
    // Simplified: Check if module handle is valid and accessible
    MEMORY_BASIC_INFORMATION mbi;
    if (VirtualQuery(hModule, &mbi, sizeof(mbi)) == 0) {
        return false;
    }
    
    // In a full implementation, we would check PEB module list
    // For now, return false (not detected as manually mapped)
    return false;
}

/// Detect DLL injection
extern "C" DLL_EXPORT int DetectInjection() {
    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, GetCurrentProcessId());
    if (hSnapshot == INVALID_HANDLE_VALUE) {
        return 0;
    }

    MODULEENTRY32 me32;
    me32.dwSize = sizeof(MODULEENTRY32);

    if (!Module32First(hSnapshot, &me32)) {
        CloseHandle(hSnapshot);
        return 0;
    }

    do {
        // Check for suspicious module names
        std::wstring moduleName(me32.szModule);
        std::transform(moduleName.begin(), moduleName.end(), moduleName.begin(), ::towlower);

        // Check if module is manually mapped
        if (IsManuallyMapped(me32.hModule)) {
            CloseHandle(hSnapshot);
            return 1; // Injection detected
        }

        // Check for unsigned modules (simplified check)
        // In production, verify digital signatures

    } while (Module32Next(hSnapshot, &me32));

    CloseHandle(hSnapshot);
    return 0;
}

/// Scan memory for suspicious patterns
extern "C" DLL_EXPORT int ScanMemory() {
    MEMORY_BASIC_INFORMATION mbi;
    LPVOID address = nullptr;

    while (VirtualQuery(address, &mbi, sizeof(mbi))) {
        // Check for executable memory that shouldn't be
        if (mbi.State == MEM_COMMIT && 
            (mbi.Protect & PAGE_EXECUTE_READWRITE) || 
            (mbi.Protect & PAGE_EXECUTE_WRITECOPY)) {
            
            // Suspicious: executable + writable memory
            return 1;
        }

        address = (LPBYTE)mbi.BaseAddress + mbi.RegionSize;
    }

    return 0;
}

/// Check for open handles to the process
extern "C" DLL_EXPORT int CheckOpenHandles() {
    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnapshot == INVALID_HANDLE_VALUE) {
        return 0;
    }

    PROCESSENTRY32 pe32;
    pe32.dwSize = sizeof(PROCESSENTRY32);

    DWORD currentPid = GetCurrentProcessId();

    if (!Process32First(hSnapshot, &pe32)) {
        CloseHandle(hSnapshot);
        return 0;
    }

    do {
        if (pe32.th32ProcessID == currentPid) {
            continue;
        }

        HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pe32.th32ProcessID);
        if (hProcess != NULL) {
            // Check if process has suspicious name
            std::wstring processName(pe32.szExeFile);
            std::transform(processName.begin(), processName.end(), processName.begin(), ::towlower);

            // Common cheat tool names
            if (processName.find(L"cheat") != std::wstring::npos ||
                processName.find(L"hack") != std::wstring::npos ||
                processName.find(L"inject") != std::wstring::npos) {
                CloseHandle(hProcess);
                CloseHandle(hSnapshot);
                return 1; // Suspicious handle found
            }

            CloseHandle(hProcess);
        }
    } while (Process32Next(hSnapshot, &pe32));

    CloseHandle(hSnapshot);
    return 0;
}

/// Detect manual mapping
extern "C" DLL_EXPORT int DetectManualMapping() {
    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, GetCurrentProcessId());
    if (hSnapshot == INVALID_HANDLE_VALUE) {
        return 0;
    }

    MODULEENTRY32 me32;
    me32.dwSize = sizeof(MODULEENTRY32);

    if (!Module32First(hSnapshot, &me32)) {
        CloseHandle(hSnapshot);
        return 0;
    }

    do {
        if (IsManuallyMapped(me32.hModule)) {
            CloseHandle(hSnapshot);
            return 1; // Manual mapping detected
        }
    } while (Module32Next(hSnapshot, &me32));

    CloseHandle(hSnapshot);
    return 0;
}

// PEB structure (simplified)
typedef struct _PEB {
    BYTE Reserved1[2];
    BYTE BeingDebugged;
    BYTE Reserved2[1];
    PVOID Reserved3[2];
    PPEB_LDR_DATA Ldr;
    // ... other fields
} PEB, *PPEB;

typedef struct _PEB_LDR_DATA {
    BYTE Reserved1[8];
    PVOID Reserved2[3];
    LIST_ENTRY InMemoryOrderModuleList;
} PEB_LDR_DATA, *PPEB_LDR_DATA;

typedef struct _LDR_DATA_TABLE_ENTRY {
    LIST_ENTRY InMemoryOrderLinks;
    PVOID Reserved1[2];
    PVOID DllBase;
    // ... other fields
} LDR_DATA_TABLE_ENTRY, *PLDR_DATA_TABLE_ENTRY;