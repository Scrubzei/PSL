cmake_minimum_required(VERSION 3.20)
project(anticheat)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Set output directory
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Add source files
add_library(anticheat SHARED
    src/detection.cpp
    src/detection.h
)

# Include directories
target_include_directories(anticheat PRIVATE
    src
)

# Link Windows libraries
target_link_libraries(anticheat
    kernel32
    user32
    psapi
    dbghelp
)

# Set DLL export
if(WIN32)
    set_target_properties(anticheat PROPERTIES
        WINDOWS_EXPORT_ALL_SYMBOLS ON
    )
endif()