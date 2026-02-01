#ifndef DETECTION_H
#define DETECTION_H

#ifdef __cplusplus
extern "C" {
#endif

// Export functions for FFI
#ifdef _WIN32
    #ifdef BUILDING_DLL
        #define DLL_EXPORT __declspec(dllexport)
    #else
        #define DLL_EXPORT __declspec(dllimport)
    #endif
#else
    #define DLL_EXPORT
#endif

/// Detect DLL injection in the current process
/// Returns 1 if injection detected, 0 otherwise
DLL_EXPORT int DetectInjection();

/// Scan memory for suspicious patterns
/// Returns 1 if suspicious memory found, 0 otherwise
DLL_EXPORT int ScanMemory();

/// Check for open handles to the process
/// Returns 1 if suspicious handles found, 0 otherwise
DLL_EXPORT int CheckOpenHandles();

/// Detect manual mapping of DLLs
/// Returns 1 if manual mapping detected, 0 otherwise
DLL_EXPORT int DetectManualMapping();

#ifdef __cplusplus
}
#endif

#endif // DETECTION_H