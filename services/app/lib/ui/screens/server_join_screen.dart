import 'dart:io';
import 'package:shadcn_flutter/shadcn_flutter.dart';
import '../../services/auth/auth_service.dart';
import '../../core/config/config_service.dart';
import 'package:logger/logger.dart' as logger_pkg;
import 'dashboard_screen.dart';

class ServerJoinScreen extends StatefulWidget {
  const ServerJoinScreen({super.key});

  @override
  State<ServerJoinScreen> createState() => _ServerJoinScreenState();
}

class _ServerJoinScreenState extends State<ServerJoinScreen> {
  final AuthService _authService = AuthService();
  final ConfigService _configService = ConfigService();
  final logger_pkg.Logger _logger = logger_pkg.Logger();
  bool _isChecking = false;
  String? _inviteLink;

  @override
  void initState() {
    super.initState();
    _loadInviteLink();
  }

  Future<void> _loadInviteLink() async {
    final config = await _configService.loadConfig();
    setState(() {
      _inviteLink = config.discordInviteLink;
    });
  }

  Future<void> _openInviteLink() async {
    if (_inviteLink == null || _inviteLink!.isEmpty) {
      _logger.e('Invite link not configured');
      if (mounted) {
        _showError(
          'Discord invite link not configured. Please contact support.',
        );
      }
      return;
    }

    try {
      // Launch browser using platform-specific method
      if (Platform.isWindows) {
        // Windows: use start command
        await Process.start('cmd', [
          '/c',
          'start',
          '',
          _inviteLink!,
        ], runInShell: true);
      } else if (Platform.isMacOS) {
        // macOS: use open command
        await Process.run('open', [_inviteLink!]);
      } else if (Platform.isLinux) {
        // Linux: use xdg-open
        await Process.run('xdg-open', [_inviteLink!]);
      } else {
        _logger.e('Unsupported platform for launching browser');
        if (mounted) {
          _showError('Unsupported platform for opening links.');
        }
        return;
      }
      _logger.d('Invite link opened successfully');
    } catch (e) {
      _logger.e('Error opening invite link: $e');
      if (mounted) {
        _showError('Error opening invite link: $e');
      }
    }
  }

  Future<void> _checkGuildMembership() async {
    setState(() {
      _isChecking = true;
    });

    try {
      // Wait a moment for user to join server
      await Future.delayed(const Duration(seconds: 2));

      final isInGuild = await _authService.isInRequiredGuild();
      if (isInGuild) {
        if (mounted) {
          // Navigate to dashboard
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const DashboardScreen()),
          );
        }
      } else {
        setState(() {
          _isChecking = false;
        });
        if (mounted) {
          _showError(
            'You are not in the required Discord server. Please join using the invite link above and try again.',
          );
        }
      }
    } catch (e) {
      _logger.e('Error checking guild membership: $e');
      setState(() {
        _isChecking = false;
      });
      if (mounted) {
        _showError('Error checking server membership: $e');
      }
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          PrimaryButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      child: Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.group, size: 48, color: Colors.blue),
                const SizedBox(height: 16),
                const Text(
                  'Discord Server Required',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'You must join our Discord server to use this application.',
                  style: TextStyle(fontSize: 14, color: Color(0xFF9E9E9E)),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                PrimaryButton(
                  onPressed: _inviteLink == null || _inviteLink!.isEmpty
                      ? null
                      : _openInviteLink,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.open_in_new),
                      SizedBox(width: 8),
                      Text('Join Discord Server'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                PrimaryButton(
                  onPressed: _isChecking ? null : _checkGuildMembership,
                  child: _isChecking
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.refresh),
                            SizedBox(width: 8),
                            Text('I\'ve Joined - Verify'),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
