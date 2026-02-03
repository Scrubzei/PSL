import 'package:shadcn_flutter/shadcn_flutter.dart';
import '../../services/auth/auth_service.dart';
import 'login_screen.dart';
import 'server_join_screen.dart';
import 'dashboard_screen.dart';

/// Wrapper screen that checks authentication and guild membership
/// and shows the appropriate screen
class AuthWrapperScreen extends StatefulWidget {
  const AuthWrapperScreen({super.key});

  @override
  State<AuthWrapperScreen> createState() => _AuthWrapperScreenState();
}

class _AuthWrapperScreenState extends State<AuthWrapperScreen> {
  final AuthService _authService = AuthService();
  bool _isChecking = true;
  Widget? _targetScreen;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    try {
      final isAuthenticated = await _authService.isAuthenticated();

      if (!isAuthenticated) {
        // User not authenticated - show login screen
        setState(() {
          _targetScreen = const LoginScreen();
          _isChecking = false;
        });
        return;
      }

      // User is authenticated, check guild membership
      final isInGuild = await _authService.isInRequiredGuild();

      if (!isInGuild) {
        // User not in required guild - show server join screen
        setState(() {
          _targetScreen = const ServerJoinScreen();
          _isChecking = false;
        });
        return;
      }

      // User is authenticated and in guild - show dashboard
      setState(() {
        _targetScreen = const DashboardScreen();
        _isChecking = false;
      });
    } catch (e) {
      // On error, show login screen
      setState(() {
        _targetScreen = const LoginScreen();
        _isChecking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return Scaffold(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                'Checking authentication...',
                style: const TextStyle(color: Color(0xFF9E9E9E)),
              ),
            ],
          ),
        ),
      );
    }

    return _targetScreen ?? const LoginScreen();
  }
}
