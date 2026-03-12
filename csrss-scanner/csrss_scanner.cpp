/*
 * csrss_scanner.cpp - csrss.exe memory path scanner + processor
 *
 * Two modes:
 *   DIRECT MODE (default):
 *     Reads csrss.exe memory directly. Requires no PPL protection.
 *
 *   FILE MODE (-f <file>):
 *     Reads raw strings from a text file (e.g. copied from System Informer's
 *     string search results). Applies path regex, dedup, and categorization.
 *     Use this when csrss.exe is PPL-protected.
 *
 * Build (MSVC):
 *   cl /EHsc /std:c++17 /O2 csrss_scanner.cpp advapi32.lib /Fe:scanner.exe
 *
 * Build (MinGW-w64):
 *   g++ -std=c++17 -O2 -municode csrss_scanner.cpp -o scanner.exe -ladvapi32
 *
 * MUST run as Administrator (direct mode only).
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
#include <sstream>

// ═══════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════

static constexpr int    MIN_STRING_LEN  = 4;
static constexpr size_t MAX_REGION_SIZE = 256ULL * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

static void PrintSeparator() {
    std::wcout << L"-----------------------------------------------\n";
}

static int PauseAndExit(int code) {
    std::wcout << L"\nPress Enter to exit...";
    std::wcin.get();
    return code;
}

// Case-insensitive comparator for deduplication
struct CILess {
    bool operator()(const std::wstring& a, const std::wstring& b) const {
        return _wcsicmp(a.c_str(), b.c_str()) < 0;
    }
};

// ═══════════════════════════════════════════════════════════════════
// Path Validation
// Equivalent to:
//   ^[A-Z]:\\(?:[^\\:*?"<>|\r\n]+\\)*[^\\:*?"<>|\r\n]+\.[A-Za-z0-9]+$
// ═══════════════════════════════════════════════════════════════════

static bool IsInvalidPathChar(wchar_t c) {
    return c == L':' || c == L'*' || c == L'?' || c == L'"' ||
           c == L'<' || c == L'>' || c == L'|' ||
           c == L'\r' || c == L'\n' || c < 0x20;
}

static bool IsValidWindowsPath(const std::wstring& s) {
    size_t len = s.length();
    if (len < 6) return false;

    if (s[0] < L'A' || s[0] > L'Z') return false;
    if (s[1] != L':' || s[2] != L'\\') return false;
    if (s[len - 1] == L'\\') return false;

    for (size_t i = 3; i < len; i++) {
        wchar_t c = s[i];
        if (c == L'\\') {
            if (i + 1 < len && s[i + 1] == L'\\') return false;
            continue;
        }
        if (IsInvalidPathChar(c)) return false;
    }

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
// String Extraction (for direct mode)
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
// Direct Memory Scanner
// ═══════════════════════════════════════════════════════════════════

struct ScanStats {
    size_t regionsScanned = 0;
    size_t bytesRead      = 0;
    size_t rawStrings     = 0;
    size_t pathsMatched   = 0;
    size_t uniquePaths    = 0;
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
// File Mode: Read raw strings from a text file
// ═══════════════════════════════════════════════════════════════════

static std::vector<std::wstring> ProcessFromFile(const std::wstring& filePath) {
    std::set<std::wstring, CILess> unique;

    // Try reading as UTF-16 first, then fall back to ASCII/UTF-8
    std::wifstream wf(filePath.c_str());
    if (!wf) {
        std::wcerr << L"[!] Could not open: " << filePath << L"\n";
        return {};
    }

    std::wstring line;
    size_t totalLines = 0;
    size_t matched = 0;

    while (std::getline(wf, line)) {
        totalLines++;

        // Trim whitespace
        while (!line.empty() && (line.back() == L'\r' || line.back() == L'\n' ||
               line.back() == L' ' || line.back() == L'\t'))
            line.pop_back();
        while (!line.empty() && (line.front() == L' ' || line.front() == L'\t'))
            line.erase(line.begin());

        if (line.empty()) continue;

        // System Informer copy format may include address prefix like:
        //   "0x7ff...: C:\Windows\System32\foo.dll"
        // Try to extract just the path portion
        // Look for a drive letter pattern anywhere in the line
        for (size_t i = 0; i < line.length(); i++) {
            if (line[i] >= L'A' && line[i] <= L'Z' &&
                i + 2 < line.length() &&
                line[i + 1] == L':' && line[i + 2] == L'\\') {
                std::wstring candidate = line.substr(i);
                if (IsValidWindowsPath(candidate)) {
                    matched++;
                    unique.insert(candidate);
                }
                break;
            }
        }

        // Also check the whole line as-is
        if (IsValidWindowsPath(line)) {
            matched++;
            unique.insert(line);
        }
    }

    std::wcout << L"  Lines read     : " << totalLines << L"\n";
    std::wcout << L"  Path matches   : " << matched << L"\n";
    std::wcout << L"  After dedup    : " << unique.size() << L"\n";

    return { unique.begin(), unique.end() };
}

// ═══════════════════════════════════════════════════════════════════
// Output: save paths + check existence
// ═══════════════════════════════════════════════════════════════════

static void OutputResults(const std::vector<std::wstring>& paths,
                          const std::wstring& outFile, bool checkExist) {
    if (paths.empty()) {
        std::wcout << L"\n[!] No file paths found.\n";
        return;
    }

    // Write to file
    std::wofstream ofs(outFile.c_str());
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

    // Check file existence
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

        if (!existing.empty()) {
            std::wofstream ef(L"paths_existing.txt");
            for (const auto& p : existing)
                ef << p << L"\n";
            ef.close();
            std::wcout << L"  Existing paths saved to paths_existing.txt\n";
        }
    }

    // Print all paths
    std::wcout << L"\n[*] All unique paths:\n\n";
    for (size_t i = 0; i < paths.size(); i++) {
        std::wcout << L"  " << (i + 1) << L". " << paths[i] << L"\n";
    }

    std::wcout << L"\n[*] Done.\n";
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

int wmain(int argc, wchar_t* argv[]) {
    std::wcout << L"\n  csrss.exe Memory Path Scanner\n";
    PrintSeparator();

    // Parse args
    std::wstring outFile = L"paths.txt";
    std::wstring inputFile;
    bool checkExist = true;
    bool fileMode = false;

    for (int i = 1; i < argc; i++) {
        std::wstring arg = argv[i];
        if ((arg == L"-f" || arg == L"--file") && i + 1 < argc) {
            inputFile = argv[++i];
            fileMode = true;
        }
        else if ((arg == L"-o" || arg == L"--output") && i + 1 < argc)
            outFile = argv[++i];
        else if (arg == L"--no-exist-check")
            checkExist = false;
        else if (arg == L"-h" || arg == L"--help") {
            std::wcout << L"\nUsage: scanner.exe [options]\n\n"
                << L"  DIRECT MODE (default):\n"
                << L"    Reads csrss.exe memory directly. Needs admin.\n\n"
                << L"  FILE MODE:\n"
                << L"    -f <file>          Process raw strings from a text file.\n"
                << L"                       Use this if csrss.exe is PPL-protected.\n"
                << L"                       Copy strings from System Informer into\n"
                << L"                       a .txt file and pass it here.\n\n"
                << L"  Common options:\n"
                << L"    -o <file>          Output file (default: paths.txt)\n"
                << L"    --no-exist-check   Skip checking if paths exist on disk\n"
                << L"    -h, --help         Show this help\n\n";
            return 0;
        }
    }

    // ─── FILE MODE ───────────────────────────────────────────────
    if (fileMode) {
        std::wcout << L"[*] File mode: processing " << inputFile << L"\n";
        PrintSeparator();

        auto paths = ProcessFromFile(inputFile);
        PrintSeparator();
        OutputResults(paths, outFile, checkExist);
        return PauseAndExit(0);
    }

    // ─── DIRECT MODE ─────────────────────────────────────────────

    // Step 1: SeDebugPrivilege
    std::wcout << L"[*] Enabling SeDebugPrivilege... ";
    if (!EnableDebugPrivilege()) {
        std::wcout << L"FAILED\n";
        std::wcerr << L"    Run this as Administrator.\n";
        return PauseAndExit(1);
    }
    std::wcout << L"OK\n";

    // Step 2: Find csrss.exe
    std::wcout << L"[*] Locating csrss.exe... ";
    DWORD pid = FindCsrssHigherPid();
    if (pid == 0) {
        std::wcout << L"FAILED (process not found)\n";
        return PauseAndExit(1);
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
                << L"    Use FILE MODE instead:\n"
                << L"      1. Open System Informer (with kernel driver enabled)\n"
                << L"      2. Find csrss.exe (higher PID) -> Memory -> Strings\n"
                << L"      3. Set minimum=4, check Unicode + Extended + Private + Mapped\n"
                << L"      4. Click OK, then select all results -> right-click -> Copy\n"
                << L"      5. Paste into a text file (e.g. raw_strings.txt)\n"
                << L"      6. Run: scanner.exe -f raw_strings.txt\n";
        }
        return PauseAndExit(1);
    }
    std::wcout << L"OK\n";

    // Step 4: Scan memory
    std::wcout << L"[*] Scanning memory regions (Private + Mapped)...\n";
    ScanStats stats;
    auto paths = ScanProcessPaths(hProcess, stats);
    CloseHandle(hProcess);

    PrintSeparator();
    std::wcout << L"  Regions scanned : " << stats.regionsScanned << L"\n";
    std::wcout << L"  Memory read     : "
               << (stats.bytesRead / (1024 * 1024)) << L" MB\n";
    std::wcout << L"  Raw strings     : " << stats.rawStrings << L"\n";
    std::wcout << L"  Path matches    : " << stats.pathsMatched << L"\n";
    std::wcout << L"  After dedup     : " << stats.uniquePaths << L"\n";
    PrintSeparator();

    OutputResults(paths, outFile, checkExist);
    return PauseAndExit(0);
}
