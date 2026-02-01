import 'package:shadcn_flutter/shadcn_flutter.dart';
import 'package:file_picker/file_picker.dart';
import '../../core/config/config_service.dart';
import '../../core/config/app_config.dart';
import '../../services/auth/auth_service.dart';
import 'package:logger/logger.dart' as logger_pkg;

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final ConfigService _configService = ConfigService();
  final AuthService _authService = AuthService();
  final logger_pkg.Logger _logger = logger_pkg.Logger();

  final _plutoniumPathController = TextEditingController();
  bool _isAuthenticated = false;
  String? _discordUserId;

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _checkAuthStatus();
  }

  Future<void> _loadSettings() async {
    final config = await _configService.loadConfig();
    setState(() {
      _plutoniumPathController.text = config.plutoniumPath ?? '';
    });
  }

  Future<void> _checkAuthStatus() async {
    final isAuth = await _authService.isAuthenticated();
    final userId = await _authService.getUserId();
    setState(() {
      _isAuthenticated = isAuth;
      _discordUserId = userId;
    });
  }

  Future<void> _handleLogout() async {
    try {
      await _authService.logout();
      if (mounted) {
        setState(() {
          _isAuthenticated = false;
          _discordUserId = null;
        });
        showDialog(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Logged Out'),
            content: const Text('You have been successfully logged out.'),
            actions: [
              PrimaryButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      _logger.e('Error during logout: $e');
      if (mounted) {
        showDialog(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Error'),
            content: Text('Error logging out: $e'),
            actions: [
              PrimaryButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    }
  }

  Future<void> _pickPlutoniumPath() async {
    try {
      final result = await FilePicker.platform.getDirectoryPath();
      if (result != null) {
        setState(() {
          _plutoniumPathController.text = result;
        });
      }
    } catch (e) {
      _logger.e('Error picking directory: $e');
    }
  }

  Future<void> _saveSettings() async {
    try {
      // Only save plutoniumPath (other settings come from .env file)
      final config = AppConfig(
        plutoniumPath: _plutoniumPathController.text.isEmpty
            ? null
            : _plutoniumPathController.text,
        apiBaseUrl: '', // Not used - loaded from .env
      );

      await _configService.saveConfig(config);

      if (mounted) {
        // Show success dialog, then navigate back when closed
        showDialog(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Success'),
            content: const Text('Settings saved successfully'),
            actions: [
              PrimaryButton(
                onPressed: () async {
                  Navigator.of(dialogContext).pop();
                  // Wait a frame for dialog to close, then navigate back
                  await Future.delayed(const Duration(milliseconds: 100));
                  if (mounted && Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  }
                },
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      _logger.e('Error saving settings: $e');
      if (mounted) {
        // Show error dialog
        showDialog(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('Error'),
            content: Text('Error saving settings: $e'),
            actions: [
              PrimaryButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _plutoniumPathController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      headers: [
        AppBar(
          title: const Text('Settings'),
          leading: Navigator.of(context).canPop()
              ? [
                  Button(
                    style: const ButtonStyle.ghost(),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Icon(Icons.arrow_back),
                  ),
                ]
              : [],
        ),
      ],
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Discord Authentication',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Icon(
                          _isAuthenticated ? Icons.check_circle : Icons.cancel,
                          color: _isAuthenticated ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _isAuthenticated
                                    ? 'Authenticated'
                                    : 'Not Authenticated',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (_discordUserId != null)
                                Text(
                                  'User ID: $_discordUserId',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF9E9E9E),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (_isAuthenticated)
                          OutlineButton(
                            onPressed: _handleLogout,
                            child: const Text('Logout'),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Plutonium Configuration',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _plutoniumPathController,
                            placeholder: const Text(
                              'Plutonium installation path',
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        PrimaryButton(
                          onPressed: _pickPlutoniumPath,
                          child: const Text('Browse'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            PrimaryButton(
              onPressed: _saveSettings,
              child: const Text('Save Settings'),
            ),
          ],
        ),
      ),
    );
  }
}
