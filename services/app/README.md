# Plutonium Anti-Cheat for 1v1LB

A comprehensive Windows desktop application built with Flutter and Dart that serves as an all-in-one launcher, anti-cheat system, and matchmaking tool for the Plutonium Call of Duty client. Designed specifically for the 1v1LB (1v1 Leaderboard) platform, this application ensures fair play by detecting and preventing various cheat types while providing seamless game launching and matchmaking capabilities.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Building](#building)
- [Usage](#usage)
- [Architecture](#architecture)
- [Detection Capabilities](#detection-capabilities)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Credits](#credits)

## Features

### 🚀 Core Functionality

- **Discord OAuth2 Authentication**: Secure user authentication via Discord OAuth2 with PKCE (Proof Key for Code Exchange)
- **Guild Membership Verification**: Ensures users are members of the required Discord server before accessing features
- **Plutonium Launcher**: Launch and manage Plutonium client processes with automatic game window detection
- **Anti-Cheat Detection Engine**: Comprehensive detection system running in isolated Dart isolates for performance and security
- **Discord Reporting**: Automatically report detected cheats to Discord channels with detailed evidence and user mentions
- **1v1 Matchmaking**: Queue system for 1v1 matches with API integration for player pairing and score reporting
- **Modern UI**: Clean, responsive interface built with shadcn_flutter components and Material Design principles

### 🛡️ Anti-Cheat Features

- **Real-time Scanning**: Continuous background scanning during gameplay with configurable intervals
- **Multiple Detection Vectors**: Detects various cheat types including host menus, DLL injections, overlays, DMA devices, game adapters, and more
- **Game Adapter Detection**: Comprehensive detection of hardware game adapters (Cronus Zen, Titan Two, XIM Matrix, etc.) including:
  - Input mode detection (when adapters spoof legitimate controller IDs)
  - Multi-input device support (XInput, HID, DirectInput, MnK-as-controller emulation)
  - Serial number validation and duplicate controller detection
  - Process-based detection (adapter software like Zen Studio, Gtuner)
- **Automatic Prevention**: Automatically terminates game process upon detection
- **Duplicate Prevention**: Prevents duplicate reports for the same detection
- **Isolated Execution**: Scanners run in separate Dart isolates to prevent interference and improve performance

### 📊 Monitoring & Logging

- **Comprehensive Logging**: Detailed logs of all detections and system events
- **Status Dashboard**: Real-time status indicators for anti-cheat and game state
- **Log Viewer**: Built-in log viewer for troubleshooting and monitoring

## Requirements

### System Requirements

- **OS**: Windows 8.1+ (64-bit)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 500MB for application + Plutonium installation
- **DirectX**: DirectX 11+ (for Plutonium)

### Development Requirements

- **Flutter SDK**: 3.10.4 or higher
- **Dart SDK**: Included with Flutter
- **Visual Studio 2022**: Required for building native DLL (optional, for advanced detection features)
- **CMake**: Required for building native components (optional)
- **Git**: For cloning the repository

### Runtime Requirements

- **Plutonium Call of Duty Client**: Must be installed and configured
- **Discord Account**: Required for authentication (users must log in with Discord)
- **Discord Bot Token**: Required for Discord reporting (optional but recommended)
- **Discord OAuth2 Client ID**: Required for user authentication (see Configuration section)
- **Discord Server Membership**: Users must join the configured Discord server
- **API Access**: Backend API endpoint for matchmaking (optional)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd plutonium_anticheat
```

### 2. Install Flutter Dependencies

```bash
flutter pub get
```

### 3. Configure Environment Variables

Copy the example environment file and configure it:

```bash
copy .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#configuration) section).

### 4. Build Native DLL (Optional)

For advanced detection features, build the native anti-cheat DLL:

```bash
cd native/anticheat
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

Copy the resulting `anticheat.dll` to the application directory (where the executable runs).

### 5. Run the Application

For development:

```bash
flutter run -d windows
```

For production, build the application (see [Building](#building) section).

## Configuration

### Environment Variables (.env)

The application uses a `.env` file for sensitive configuration. Create a `.env` file in the project root or executable directory:

```env
# API Configuration
API_BASE_URL=https://api.1v1lb.com

# Discord Bot Configuration (for reporting)
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_discord_channel_id_here

# Discord OAuth2 Configuration (for user authentication)
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_discord_guild_id_here
DISCORD_INVITE_LINK=your_discord_invite_link_here

# Anti-Cheat Settings
ANTI_CHEAT_ENABLED=true
SCAN_INTERVAL_SECONDS=15
```

#### Getting Discord Credentials

1. **Discord Bot Token** (for reporting detections):

   - Go to https://discord.com/developers/applications
   - Create a new application or select an existing one
   - Navigate to the "Bot" section
   - Click "Reset Token" or "Copy" to get your bot token
   - Ensure the bot has "Send Messages" permission

2. **Discord Channel ID** (for reporting detections):

   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click on the channel where you want reports sent
   - Select "Copy Channel ID"

3. **Discord OAuth2 Client ID** (for user authentication):

   - Go to https://discord.com/developers/applications
   - Select your application
   - Navigate to the **OAuth2** tab (not the "Bot" tab)
   - Copy the **Client ID** (no Client Secret needed with PKCE)
   - Under **Redirects**, add: `http://127.0.0.1:9298/callback` (or `http://localhost:9298/callback`)
   - Click **Save Changes**

4. **Discord Guild (Server) ID**:

   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click on your Discord server
   - Select "Copy Server ID"

5. **Discord Invite Link**:
   - In your Discord server, create a permanent invite link
   - Format: `https://discord.gg/xxxxx` or `https://discord.com/invite/xxxxx`
   - This link will be shown to users who need to join the server

> **Note**: For detailed Discord OAuth2 setup instructions, see [DISCORD_OAUTH_SETUP.md](DISCORD_OAUTH_SETUP.md) and [DISCORD_INTEGRATION.md](DISCORD_INTEGRATION.md)

### Application Settings

The application stores non-sensitive settings in:

```
%APPDATA%/plutonium_anticheat/config/config.json
```

Settings include:

- **Plutonium Path**: Path to your Plutonium installation directory

Configure these settings through the Settings screen in the application UI.

### Configuration Priority

Configuration values are loaded in the following order (highest priority first):

1. Environment variables (`.env` file)
2. `config.json` file
3. Default values

## Building

### Development Build

```bash
flutter run -d windows
```

### Release Build

Build for Windows:

```bash
flutter build windows --release
```

The executable will be located at:

```
build/windows/runner/Release/plutonium_anticheat.exe
```

### Build Options

- **Debug Build**: `flutter build windows --debug` (includes debug symbols, larger file size)
- **Release Build**: `flutter build windows --release` (optimized, smaller file size)
- **Profile Build**: `flutter build windows --profile` (performance profiling)

### Distribution

To distribute the application:

1. Build the release version
2. Copy the entire `Release` folder contents (includes required DLLs and assets)
3. Include the `.env.example` file for users to configure
4. Optionally include the native `anticheat.dll` if built

## Usage

### First-Time Setup

1. **Start the Application**: Run `plutonium_anticheat.exe`
2. **Login with Discord**:
   - You'll be prompted to log in with Discord
   - Click "Login with Discord" button
   - A browser window will open for Discord authorization
   - Authorize the application (click "Authorize" or "Add to my apps")
   - The browser will redirect back and close automatically
3. **Join Discord Server** (if required):
   - If you're not a member of the required Discord server, you'll see a server join screen
   - Click "Join Discord Server" to open the invite link
   - After joining, click "I've Joined - Verify" to check membership
   - Once verified, you'll be taken to the dashboard

### Launching the Application

After authentication, the dashboard will display:

- Current status of anti-cheat system
- Plutonium game status
- Queue status
- Quick access buttons

### Launching Plutonium

**Note**: Authentication is required to launch the game.

1. Ensure Plutonium path is configured in Settings
2. Click "Launch Plutonium" button on the dashboard
   - If not authenticated, you'll be redirected to the login screen
3. The application will automatically detect when the game window appears
4. Anti-cheat scanning will begin automatically if enabled

### Joining the Queue

**Note**: Authentication is required to join the queue.

1. Click "Join Queue" button
   - If not authenticated, you'll be redirected to the login screen
2. Enter your player ID (if required by API)
3. Wait for matchmaking to find an opponent
4. Once matched, the game will launch automatically

### Viewing Logs

1. Click "View Logs" button on the dashboard
2. Browse detection reports and system events
3. Logs are stored locally and can be exported

### Settings

Access settings via the gear icon in the top-right corner:

- **Plutonium Path**: Set the installation directory
- **Anti-Cheat**: Enable/disable anti-cheat system
- **Scan Interval**: Configure how often scans run (in seconds)
- **API Configuration**: Set API base URL
- **Discord Configuration**: Configure Discord bot and channel
- **Logout**: Clear stored authentication and return to login screen

## Architecture

### High-Level Architecture

The application follows a layered architecture:

```
┌─────────────────────────────────────┐
│         UI Layer (Flutter)          │
│  (Dashboard, Settings, Queue, Logs) │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│      Business Logic Layer (Dart)    │
│  (Services, Models, Configuration)  │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│      Native Layer (FFI/C++)         │
│  (Windows APIs, Detection DLLs)     │
└─────────────────────────────────────┘
```

### Component Overview

#### UI Layer (`lib/ui/`)

- **Dashboard Screen**: Main interface showing status and controls
- **Settings Screen**: Configuration management
- **Queue Screen**: Matchmaking interface
- **Logs Screen**: Log viewer and detection history

#### Services Layer (`lib/services/`)

- **Auth Service**: Handles Discord OAuth2 authentication, user ID storage, and guild membership verification
- **Detection Engine**: Coordinates all scanners and handles detections
- **Plutonium Launcher**: Manages game process lifecycle
- **Discord Reporter**: Handles Discord bot communication and user mentions in reports
- **Queue Service**: Manages matchmaking API interactions

#### Scanners (`lib/services/anticheat/scanners/`)

Individual detection modules:

- `host_menu_scanner.dart`: Detects GSC file modifications
- `overlay_scanner.dart`: Detects overlay windows and ESP
- `process_scanner.dart`: Scans for suspicious processes
- `dma_scanner.dart`: Detects DMA (Direct Memory Access) devices
- `dll_injection_scanner.dart`: Detects DLL injection
- `adapter_detector.dart`: Detects game adapter devices (Cronus Zen, Titan Two, XIM Matrix, etc.)
  - Input mode detection (spoofed controller IDs)
  - XInput emulation detection
  - HID gamepad emulation (PlayStation, Nintendo)
  - DirectInput emulation (joysticks, wheels)
  - MnK-as-controller emulation
  - Serial number validation and duplicate detection
- `anti_debug_scanner.dart`: Detects debuggers
- `anti_tamper_scanner.dart`: Detects code tampering
- `handle_scanner.dart`: Detects suspicious process handles
- `thread_scanner.dart`: Detects suspicious threads
- `manual_mapping_scanner.dart`: Detects manual DLL mapping
- `hypervisor_scanner.dart`: Detects virtualization
- `blacklist_scanner.dart`: Checks against known cheat processes
- `registry_scanner.dart`: Detects registry modifications
- `checksum_scanner.dart`: Verifies file integrity
- `memory_region_scanner.dart`: Scans memory regions
- `module_signature_scanner.dart`: Verifies module signatures

#### Core (`lib/core/`)

- **Config Service**: Manages application configuration
- **Models**: Data models for detections, matches, players

#### Native Layer (`native/anticheat/`)

- C++ detection code using Windows APIs
- FFI bindings for Dart integration

### Detection Engine Flow

1. **Initialization**: Detection engine spawns an isolate for scanning
2. **Window Detection**: Waits for Plutonium game window to appear
3. **Scanner Initialization**: Initializes all scanners in the isolate
4. **Scan Loop**: Continuously runs scanners at configured intervals
5. **Detection Handling**: When detections are found:
   - Generates detection reports
   - Checks for duplicates
   - Reports to Discord
   - Terminates game process
6. **Cleanup**: Stops scanning when game closes

### Isolate Architecture

Scanners run in a separate Dart isolate to:

- Prevent blocking the UI thread
- Isolate memory for security
- Improve performance through parallel execution
- Allow graceful error handling without crashing the main app

### Authentication Flow

The application uses Discord OAuth2 with PKCE (Proof Key for Code Exchange) for secure authentication:

1. **App Launch**: `AuthWrapperScreen` checks if user is authenticated
2. **Login Screen**: If not authenticated, user is shown login screen
3. **OAuth2 Flow**:
   - User clicks "Login with Discord"
   - Embedded WebView opens Discord authorization page
   - User authorizes the application
   - Discord redirects to local callback server (`http://127.0.0.1:9298/callback`)
   - Application exchanges authorization code for access token (using PKCE)
   - Application fetches user ID from Discord API (`/users/@me`)
   - User ID is stored securely in application data directory
4. **Guild Verification**: Application checks if user is member of required Discord server
5. **Server Join Screen**: If not a member, user is prompted to join via invite link
6. **Dashboard Access**: Once authenticated and verified, user can access dashboard and features
7. **Reporting**: When cheats are detected, user ID is included in Discord reports as a mention (`<@userID>`)

**Security Features**:

- PKCE prevents client secret exposure
- Only user ID is stored (no tokens stored long-term)
- Secure file storage for authentication data
- Automatic token refresh handling

## Detection Capabilities

The application can detect the following types of cheats and modifications:

### Host Menus

- **Description**: In-game mods that edit command values (like `sv_cheats`) without memory modification
- **Detection Method**: GSC file checksum verification and file system monitoring
- **Scanner**: `HostMenuScanner`

### Non-Host Menus

- **Description**: DLL-injected menus that manipulate memory to work on any host
- **Detection Method**: DLL injection detection, module signature verification
- **Scanners**: `DllInjectionScanner`, `ModuleSignatureScanner`

### Injectable Mods (No Menu)

- **Description**: Simple injected DLLs (lock-on, ESP) without visible menus
- **Detection Method**: Process scanning, DLL injection detection, memory region analysis
- **Scanners**: `DllInjectionScanner`, `ProcessScanner`, `MemoryRegionScanner`

### Overlay Menus

- **Description**: External overlays that attach to the game process and draw ESP/aimbot
- **Detection Method**: Window enumeration, process handle detection
- **Scanner**: `OverlayScanner`

### Direct Menus

- **Description**: Overlays that manipulate the game directly (visible in screenshare)
- **Detection Method**: Window detection, process scanning
- **Scanners**: `OverlayScanner`, `ProcessScanner`

### DMA Devices

- **Description**: Direct Memory Access devices used for hardware-based memory reading
- **Detection Method**: PCI device enumeration, driver detection
- **Scanner**: `DmaScanner`

### Debugger Detection

- **Description**: Various debugger detection techniques
- **Detection Methods**:
  - `IsDebuggerPresent()` API checks
  - PEB (Process Environment Block) flags
  - Hardware debug registers
  - Heap flags
  - INT3/INT2C breakpoints
  - CloseHandle anti-debug trick
  - Debug objects
  - VEH (Vectored Exception Handler) debuggers
  - Kernel debuggers
  - Trap flags
  - Debug ports
  - Process debug flags
  - Remote debuggers
  - Known debugger processes
- **Scanner**: `AntiDebugScanner`

### Code Tampering

- **Description**: Detection of code modification and tampering
- **Detection Methods**:
  - Page protection remapping
  - `.text` section integrity checks
  - DLL tampering detection
  - IAT (Import Address Table) hooking
  - Manual DLL mapping
- **Scanners**: `AntiTamperScanner`, `ManualMappingScanner`

### Process-Based Detections

- **Description**: Suspicious processes and handles
- **Detection Methods**:
  - Open process handles to game process
  - Suspended threads
  - Blacklisted processes
  - External illegal programs
- **Scanners**: `HandleScanner`, `ThreadScanner`, `BlacklistScanner`, `ProcessScanner`

### System-Level Detections

- **Description**: System modifications and virtualization
- **Detection Methods**:
  - Registry key modifications
  - Hypervisor detection
  - Unsigned drivers
- **Scanners**: `RegistryScanner`, `HypervisorScanner`

### File Integrity

- **Description**: Verification of game file integrity
- **Detection Methods**:
  - Checksum verification
  - File signature validation
- **Scanners**: `ChecksumScanner`, `FileVerifier`

### Game Adapter Devices

- **Description**: Hardware game adapters used for cheating (Cronus Zen, Titan Two, XIM Matrix, Wingman, etc.)
- **Detection Methods**:
  - **Input Mode Detection**: Detects adapters when they spoof legitimate controller IDs (e.g., Xbox Controller VID_045E)
  - **Serial Number Validation**: Flags devices with missing, blank, duplicate, or invalid serial numbers
  - **Duplicate Controller Detection**: Identifies multiple identical controllers (common adapter signature)
  - **XInput Emulation**: Detects Xbox controller emulation with anomalies (duplicate slots, missing SNs)
  - **HID Gamepad Emulation**: Detects PlayStation/Nintendo controller emulation (DualSense, DualShock, Switch Pro)
  - **DirectInput Emulation**: Detects joystick/wheel/fight stick emulation
  - **MnK-as-Controller**: Detects mouse/keyboard converted to controller input
  - **Process Detection**: Scans for adapter software (Zen Studio, Gtuner IV, etc.)
  - **Registry Detection**: Checks for adapter-related registry entries
- **Supported Adapters**:
  - Cronus Zen / CronusMax Plus
  - Titan One / Titan Two / Titan Spy
  - XIM Matrix / XIM Apex
  - Wingman / Wingman XE
  - Similar adapter devices
- **Scanner**: `AdapterDetector`
- **Scan Frequency**: Runs every 10th scan cycle (less frequent due to overhead)

## Development

### Project Structure

```
plutonium_anticheat/
├── lib/
│   ├── core/
│   │   ├── config/          # Configuration management
│   │   └── models/          # Data models
│   ├── services/
│   │   ├── auth/           # Discord OAuth2 authentication service
│   │   ├── anticheat/       # Anti-cheat detection engine
│   │   │   ├── scanners/   # Individual detection scanners
│   │   │   └── native/     # FFI bindings
│   │   ├── launcher/       # Plutonium launcher
│   │   ├── matchmaking/    # Queue service
│   │   └── reporting/      # Discord reporter
│   ├── ui/
│   │   └── screens/        # UI screens (auth, dashboard, settings, etc.)
│   └── main.dart          # Application entry point
├── native/
│   └── anticheat/         # Native C++ detection code
├── windows/              # Windows-specific code
├── DISCORD_OAUTH_SETUP.md # Discord OAuth2 setup guide
├── DISCORD_INTEGRATION.md # Discord integration documentation
├── pubspec.yaml          # Dependencies
└── README.md            # This file
```

### Adding a New Scanner

1. Create a new scanner class in `lib/services/anticheat/scanners/`:

```dart
import 'package:logger/logger.dart';
import '../../core/models/detection_report.dart';

class MyCustomScanner {
  final Logger _logger = Logger();

  Future<List<DetectionReport>> scan() async {
    final detections = <DetectionReport>[];

    // Your detection logic here
    // If cheat detected:
    // detections.add(DetectionReport(
    //   type: CheatType.yourType,
    //   evidence: {'key': 'value'},
    //   processName: 'process.exe',
    // ));

    return detections;
  }
}
```

2. Add the scanner to `DetectionEngine._scanLoop()`:

```dart
final myCustomScanner = MyCustomScanner();
try {
  final detections = await myCustomScanner.scan();
  allDetections.addAll(detections);
  await Future.delayed(const Duration(milliseconds: 50));
} catch (e) {
  logger.e('Error in my custom scanner: $e');
}
```

3. Add the import at the top of `detection_engine.dart`

### Adding a New Cheat Type

1. Add the enum value to `CheatType` in `lib/core/models/detection_report.dart`
2. Update scanners to use the new type
3. Update Discord reporter formatting if needed

### Testing

Run tests:

```bash
flutter test
```

Run with coverage:

```bash
flutter test --coverage
```

### Code Style

The project uses `flutter_lints` for code style. Ensure your code follows Dart style guidelines:

```bash
flutter analyze
```

Format code:

```bash
dart format lib/
```

## Troubleshooting

### Application Won't Start

- **Check Flutter installation**: Run `flutter doctor`
- **Check dependencies**: Run `flutter pub get`
- **Check .env file**: Ensure `.env` exists and is properly formatted

### Plutonium Won't Launch

- **Verify path**: Check that Plutonium path is correct in Settings
- **Check executable**: Ensure `plutonium.exe` exists in the specified directory
- **Check permissions**: Ensure the application has permission to launch processes
- **Check logs**: View logs for detailed error messages

### Anti-Cheat Not Detecting Cheats

- **Verify enabled**: Check that anti-cheat is enabled in Settings
- **Check scan interval**: Lower values scan more frequently but use more CPU
- **Check logs**: Review logs for scanner errors
- **Verify game running**: Anti-cheat only scans when game window is detected

### Discord Reports Not Sending

- **Check token**: Verify Discord bot token is correct in `.env`
- **Check channel ID**: Verify channel ID is correct (enable Developer Mode)
- **Check permissions**: Ensure bot has "Send Messages" permission in the channel
- **Check connection**: Review logs for connection errors
- **Test connection**: Try restarting the application

### Authentication Issues

- **Login Screen Not Appearing**:

  - Check that `.env` file exists and `DISCORD_CLIENT_ID` is set
  - Verify the Client ID is correct from Discord Developer Portal
  - Check logs for authentication errors

- **"Add to Server" Instead of "Authorize"**:

  - This is normal if your Discord application has a Bot configured
  - Click "Add to my apps" instead of "Add to Server"
  - See [DISCORD_OAUTH_SETUP.md](DISCORD_OAUTH_SETUP.md) for detailed instructions

- **Authorization Doesn't Complete**:

  - Check that redirect URI is configured in Discord Developer Portal: `http://127.0.0.1:9298/callback`
  - Ensure the redirect URI matches exactly (no trailing slashes, no HTTPS)
  - Try adding both `http://localhost:9298/callback` and `http://127.0.0.1:9298/callback`
  - Check if port 9298 is already in use by another application
  - Review logs for callback server errors

- **Server Membership Not Detected**:

  - Verify `DISCORD_GUILD_ID` is correct in `.env`
  - Ensure the user has actually joined the Discord server
  - Try clicking "I've Joined - Verify" again after joining
  - Check that the OAuth2 application has `guilds` scope enabled

- **User Mentions Not Working in Reports**:
  - Verify user is authenticated (check Settings or try logging out and back in)
  - Check that user ID is stored correctly (stored in application data directory)
  - Review logs for authentication errors

### High CPU Usage

- **Increase scan interval**: Higher values reduce CPU usage (default: 15 seconds)
- **Disable expensive scanners**: Some scanners run less frequently by design
- **Check for errors**: Review logs for scanner errors causing loops

### False Positives

- **Review evidence**: Check Discord reports for detection evidence
- **Whitelist processes**: Add legitimate processes to exclusion list (requires code modification)
- **Adjust sensitivity**: Modify scanner thresholds (requires code modification)
- **Game Adapter False Positives**:
  - Legitimate multi-controller setups may trigger duplicate controller detection
  - Some third-party controllers may have generic serial numbers
  - Whitelist known legitimate devices via configuration (requires code modification)
  - Review adapter detection evidence in Discord reports for accuracy

### Build Errors

- **Check Flutter version**: Ensure Flutter SDK 3.10.4+ is installed
- **Check Visual Studio**: Ensure Visual Studio 2022 is installed for native builds
- **Clean build**: Run `flutter clean` then rebuild
- **Check dependencies**: Run `flutter pub get`

## License

This project is for educational purposes. See LICENSE file for details.

## Credits

### Anti-Cheat Techniques

Anti-cheat detection techniques adapted from:

- **[thetuh/anti-cheat](https://github.com/thetuh/anti-cheat)**: Reference implementation for various detection methods
- **[AlSch092/UltimateAntiCheat](https://github.com/AlSch092/UltimateAntiCheat)**: Comprehensive usermode anti-cheat system with extensive detection vectors

### Technologies Used

- **Flutter**: Cross-platform UI framework
- **Dart**: Programming language
- **shadcn_flutter**: UI component library
- **nyxx**: Discord API library (bot communication)
- **dio**: HTTP client for API requests and Discord OAuth2
- **webview_windows**: Embedded WebView for OAuth2 flow
- **crypto**: Cryptographic functions for PKCE (OAuth2 security)
- **win32**: Windows API bindings
- **ffi**: Foreign Function Interface for native code
- **Windows APIs**: XInput, HID, DirectInput, Raw Input APIs for device enumeration
- **logger**: Logging framework
- **path_provider**: Secure file storage for authentication data

### Acknowledgments

Special thanks to the open-source community and the developers of the referenced anti-cheat projects for their contributions to game security research.

## Additional Documentation

For more detailed information on specific features:

- **[DISCORD_OAUTH_SETUP.md](DISCORD_OAUTH_SETUP.md)**: Step-by-step guide for setting up Discord OAuth2
- **[DISCORD_INTEGRATION.md](DISCORD_INTEGRATION.md)**: Technical details on Discord authentication integration

---

**Note**: This application is designed for the 1v1LB platform and Plutonium Call of Duty client. Use responsibly and in accordance with the terms of service of both platforms.
