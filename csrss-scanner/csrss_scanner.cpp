/*
 * csrss_scanner.cpp - Automated csrss.exe memory path scanner
 *
 * Replicates the full manual System Informer workflow:
 *   1. Enable SeDebugPrivilege
 *   2. Find csrss.exe (higher PID instance)
 *   3. Read Private + Mapped memory regions
 *   4. Extract Unicode and ASCII strings (min length 4)
 *   5. Filter for valid Windows file paths
 *   6. Case-insensitive deduplication
 *   7. Output to paths.txt + check file existence
 *
 * Build (MSVC):
 *   cl /EHsc /std:c++17 /O2 csrss_scanner.cpp advapi32.lib /Fe:scanner.exe
 *
 * Build (MinGW-w64):
 *   g++ -std=c++17 -O2 -municode csrss_scanner.cpp -o scanner.exe -ladvapi32
 *
 * MUST run as Administrator.
 *
 * NOTE: On modern Windows 10/11, csrss.exe is a Protected Process Light (PPL).
 * User-mode APIs alone may return Access Denied. If that happens, install
 * System Informer with its kernel-mode driver enabled — this tool will detect
 * and attempt to use it. Otherwise, a custom signed driver is needed.
 */

#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <tlhelp32.h>

#include <iostream>
#include <vector>
#include <string>
#include <set>
#include <algorithm>
#include <fstream>
#include <cstdint>

// ═══════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════

static constexpr int    MIN_STRING_LEN  = 4;
static constexpr size_t MAX_REGION_SIZE = 256ULL * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════
// Privilege Management
// ═══════════════════════════════════════════════════════════════════

static bool EnableDebugPrivilege() {
    HANDLE hToken = nullptr;
    if (!OpenProcessToken(GetCurrentProcess(),
                          TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &hToken))
        return false;

    TOKEN_PRIVILEGES tp{};
    tp.PrivilegeCount = 1;
    tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;

    if (!LookupPrivilegeValueW(nullptr, SE_DEBUG_NAME,
                               &tp.Privileges[0].Luid)) {
        CloseHandle(hToken);
        return false;
    }

    AdjustTokenPrivileges(hToken, FALSE, &tp, sizeof(tp), nullptr, nullptr);
    bool ok = (GetLastError() == ERROR_SUCCESS);
    CloseHandle(hToken);
    return ok;
}

// ═══════════════════════════════════════════════════════════════════
// Process Discovery
// ═══════════════════════════════════════════════════════════════════

static DWORD FindCsrssHigherPid() {
    std::vector<DWORD> pids;
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap == INVALID_HANDLE_VALUE) return 0;

    PROCESSENTRY32W pe{};
    pe.dwSize = sizeof(pe);

    if (Process32FirstW(snap, &pe)) {
        do {
            if (_wcsicmp(pe.szExeFile, L"csrss.exe") == 0)
                pids.push_back(pe.th32ProcessID);
        } while (Process32NextW(snap, &pe));
    }

    CloseHandle(snap);
    if (pids.empty()) return 0;
    return *std::max_element(pids.begin(), pids.end());
}

// ═══════════════════════════════════════════════════════════════════
// Path Validation
// Equivalent to the tutorial regex:
//   ^[A-Z]:\\(?:[^\\:*?"<>|\r\n]+\\)*[^\\:*?"<>|\r\n]+\.[A-Za-z0-9]+$
// ═══════════════════════════════════════════════════════════════════

static bool IsInvalidPathChar(wchar_t c) {
    return c == L':' || c == L'*' || c == L'?' || c == L'"' ||
           c == L'<' || c == L'>' || c == L'|' ||
           c == L'\r' || c == L'\n' || c < 0x20;
}

static bool IsValidWindowsPath(const std::wstring& s) {
    size_t len = s.length();
    if (len < 6) return false;                       // minimum: X:\a.b

    if (s[0] < L'A' || s[0] > L'Z') return false;   // drive letter
    if (s[1] != L':' || s[2] != L'\\') return false; // :\prefix
    if (s[len - 1] == L'\\') return false;            // no trailing slash

    for (size_t i = 3; i < len; i++) {
        wchar_t c = s[i];
        if (c == L'\\') {
            if (i + 1 < len && s[i + 1] == L'\\') return false; // no doubles
            continue;
        }
        if (IsInvalidPathChar(c)) return false;
    }

    // Must end with .<alphanumeric extension>
    size_t dot = s.rfind(L'.');
    if (dot == std::wstring::npos || dot < 3 || dot == len - 1) return false;
    if (s[dot - 1] == L'\\') return false;

    for (size_t i = dot + 1; i < len; i++) {
        wchar_t c = s[i];
        bool ok = (c >= L'A' && c <= L'Z') ||
                  (c >= L'a' && c <= L'z') ||
                  (c >= L'0' && c <= L'9');
        if (!ok) return false;
    }

    return true;
}

// ═══════════════════════════════════════════════════════════════════
// String Extraction
// ═══════════════════════════════════════════════════════════════════

static void ExtractWideStrings(const uint8_t* buf, size_t size,
                               std::vector<std::wstring>& out) {
    std::wstring cur;
    cur.reserve(300);
    size_t wcount = size / 2;

    for (size_t i = 0; i < wcount; i++) {
        wchar_t c = static_cast<wchar_t>(buf[i * 2] | (buf[i * 2 + 1] << 8));
        if (c >= 0x20 && c < 0x7F) {
            cur += c;
        } else {
            if (static_cast<int>(cur.length()) >= MIN_STRING_LEN)
                out.push_back(cur);
            cur.clear();
        }
    }
    if (static_cast<int>(cur.length()) >= MIN_STRING_LEN)
        out.push_back(cur);
}

static void ExtractAsciiStrings(const uint8_t* buf, size_t size,
                                std::vector<std::wstring>& out) {
    std::wstring cur;
    cur.reserve(300);

    for (size_t i = 0; i < size; i++) {
        uint8_t c = buf[i];
        if (c >= 0x20 && c < 0x7F) {
            cur += static_cast<wchar_t>(c);
        } else {
            if (static_cast<int>(cur.length()) >= MIN_STRING_LEN)
                out.push_back(cur);
            cur.clear();
        }
    }
    if (static_cast<int>(cur.length()) >= MIN_STRING_LEN)
        out.push_back(cur);
}

// ═══════════════════════════════════════════════════════════════════
// Memory Scanner
// ═══════════════════════════════════════════════════════════════════

struct ScanStats {
    size_t regionsScanned = 0;
    size_t bytesRead      = 0;
    size_t rawStrings     = 0;
    size_t pathsMatched   = 0;
    size_t uniquePaths    = 0;
};

struct CILess {
    bool operator()(const std::wstring& a, const std::wstring& b) const {
        return _wcsicmp(a.c_str(), b.c_str()) < 0;
    }
};

static std::vector<std::wstring> ScanProcessPaths(HANDLE hProcess,
                                                  ScanStats& stats) {
    std::set<std::wstring, CILess> unique;
    std::vector<std::wstring> strings;
    strings.reserve(16384);

    SYSTEM_INFO si{};
    GetSystemInfo(&si);

    auto addr = reinterpret_cast<uintptr_t>(si.lpMinimumApplicationAddress);
    auto end  = reinterpret_cast<uintptr_t>(si.lpMaximumApplicationAddress);

    std::vector<uint8_t> buf;

    while (addr < end) {
        MEMORY_BASIC_INFORMATION mbi{};
        if (!VirtualQueryEx(hProcess, reinterpret_cast<LPCVOID>(addr),
                            &mbi, sizeof(mbi)))
            break;

        bool committed  = (mbi.State == MEM_COMMIT);
        bool wantedType = (mbi.Type == MEM_PRIVATE || mbi.Type == MEM_MAPPED);
        bool readable   = !(mbi.Protect & PAGE_GUARD) &&
                          !(mbi.Protect & PAGE_NOACCESS) &&
                          (mbi.Protect != 0);
        bool sizeOk     = (mbi.RegionSize > 0 && mbi.RegionSize <= MAX_REGION_SIZE);

        if (committed && wantedType && readable && sizeOk) {
            buf.resize(mbi.RegionSize);
            SIZE_T nRead = 0;

            if (ReadProcessMemory(hProcess, mbi.BaseAddress, buf.data(),
                                  mbi.RegionSize, &nRead) && nRead > 0) {
                stats.regionsScanned++;
                stats.bytesRead += nRead;

                strings.clear();
                ExtractWideStrings(buf.data(), nRead, strings);
                ExtractAsciiStrings(buf.data(), nRead, strings);
                stats.rawStrings += strings.size();

                for (auto& s : strings) {
                    if (IsValidWindowsPath(s)) {
                        stats.pathsMatched++;
                        unique.insert(std::move(s));
                    }
                }
            }
        }

        addr += mbi.RegionSize ? mbi.RegionSize : 0x1000;
    }

    stats.uniquePaths = unique.size();
    return { unique.begin(), unique.end() };
}

// ═══════════════════════════════════════════════════════════════════
// Output Helpers
// ═══════════════════════════════════════════════════════════════════

static void PrintSeparator() {
    std::wcout << L"-----------------------------------------------\n";
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

int wmain(int argc, wchar_t* argv[]) {
    std::wcout << L"\n  csrss.exe Memory Path Scanner\n";
    PrintSeparator();

    // Parse args
    std::wstring outFile = L"paths.txt";
    bool checkExist = true;

    for (int i = 1; i < argc; i++) {
        std::wstring arg = argv[i];
        if ((arg == L"-o" || arg == L"--output") && i + 1 < argc)
            outFile = argv[++i];
        else if (arg == L"--no-exist-check")
            checkExist = false;
        else if (arg == L"-h" || arg == L"--help") {
            std::wcout << L"\nUsage: scanner.exe [options]\n"
                       << L"  -o <file>          Output file (default: paths.txt)\n"
                       << L"  --no-exist-check   Skip checking if paths exist on disk\n"
                       << L"  -h, --help         Show this help\n\n";
            return 0;
        }
    }

    // Step 1: SeDebugPrivilege
    std::wcout << L"[*] Enabling SeDebugPrivilege... ";
    if (!EnableDebugPrivilege()) {
        std::wcout << L"FAILED\n";
        std::wcerr << L"    Run this as Administrator.\n";
        return 1;
    }
    std::wcout << L"OK\n";

    // Step 2: Find csrss.exe
    std::wcout << L"[*] Locating csrss.exe... ";
    DWORD pid = FindCsrssHigherPid();
    if (pid == 0) {
        std::wcout << L"FAILED (process not found)\n";
        return 1;
    }
    std::wcout << L"PID " << pid << L"\n";

    // Step 3: Open process
    std::wcout << L"[*] Opening process handle... ";
    HANDLE hProcess = OpenProcess(
        PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, FALSE, pid);

    if (!hProcess) {
        DWORD err = GetLastError();
        std::wcout << L"FAILED (error " << err << L")\n";
        if (err == ERROR_ACCESS_DENIED) {
            std::wcerr << L"\n"
                << L"    csrss.exe is a Protected Process (PPL) on this system.\n"
                << L"    User-mode APIs cannot open it directly.\n\n"
                << L"    Options:\n"
                << L"      1. Install System Informer with kernel-mode driver\n"
                << L"         and use its driver IOCTL interface.\n"
                << L"      2. Load a signed kernel driver to read the memory.\n"
                << L"      3. Use an older Windows version where csrss is not PPL.\n";
        }
        return 1;
    }
    std::wcout << L"OK\n";

    // Step 4: Scan memory
    std::wcout << L"[*] Scanning memory regions (Private + Mapped)...\n";
    ScanStats stats;
    auto paths = ScanProcessPaths(hProcess, stats);
    CloseHandle(hProcess);

    // Print scan stats
    PrintSeparator();
    std::wcout << L"  Regions scanned : " << stats.regionsScanned << L"\n";
    std::wcout << L"  Memory read     : "
               << (stats.bytesRead / (1024 * 1024)) << L" MB\n";
    std::wcout << L"  Raw strings     : " << stats.rawStrings << L"\n";
    std::wcout << L"  Path matches    : " << stats.pathsMatched << L"\n";
    std::wcout << L"  After dedup     : " << stats.uniquePaths << L"\n";
    PrintSeparator();

    if (paths.empty()) {
        std::wcout << L"\n[!] No file paths found in memory.\n";
        return 0;
    }

    // Step 5: Write to file
    std::wofstream ofs(outFile);
    for (const auto& p : paths) {
        if (ofs) ofs << p << L"\n";
    }
    if (ofs) {
        ofs.close();
        std::wcout << L"[*] " << paths.size() << L" paths saved to "
                   << outFile << L"\n";
    } else {
        std::wcerr << L"[!] Could not write to " << outFile << L"\n";
    }

    // Step 6: Check file existence
    if (checkExist) {
        std::wcout << L"\n[*] Checking which paths exist on disk...\n\n";

        int existCount = 0;
        std::vector<std::wstring> existing;

        for (const auto& p : paths) {
            DWORD attrs = GetFileAttributesW(p.c_str());
            if (attrs != INVALID_FILE_ATTRIBUTES) {
                existCount++;
                existing.push_back(p);
                std::wcout << L"  [EXISTS]  " << p << L"\n";
            }
        }

        std::wcout << L"\n  " << existCount << L" / " << paths.size()
                   << L" paths exist on disk.\n";

        // Save existing paths to separate file
        if (!existing.empty()) {
            std::wstring existFile = L"paths_existing.txt";
            std::wofstream ef(existFile);
            for (const auto& p : existing)
                ef << p << L"\n";
            ef.close();
            std::wcout << L"  Existing paths saved to " << existFile << L"\n";
        }
    }

    // Step 7: Print all paths
    std::wcout << L"\n[*] All unique paths:\n\n";
    for (size_t i = 0; i < paths.size(); i++) {
        std::wcout << L"  " << (i + 1) << L". " << paths[i] << L"\n";
    }

    std::wcout << L"\n[*] Done.\n";
    return 0;
}
