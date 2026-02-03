import 'package:flutter/foundation.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart';
import 'core/config/config_service.dart';
import 'services/reporting/discord_reporter.dart';
import 'services/auth/auth_service.dart';
import 'ui/screens/auth_wrapper_screen.dart';
import 'package:logger/logger.dart' as logger_pkg;

final logger_pkg.Logger logger = logger_pkg.Logger();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set up global error handlers to catch unhandled exceptions
  FlutterError.onError = (FlutterErrorDetails details) {
    // Log Flutter framework errors
    if (details.exception.toString().contains('Shard') ||
        details.exception.toString().contains('Gateway') ||
        details.exception.toString().contains('disconnected')) {
      // Suppress Discord connection errors - they're handled gracefully
      logger.d('Discord connection event (suppressed): ${details.exception}');
      return;
    }
    // Log other Flutter errors
    logger.e('Flutter error: ${details.exception}');
    FlutterError.presentError(details);
  };

  // Handle async errors
  PlatformDispatcher.instance.onError = (error, stack) {
    // Suppress Discord disconnection errors
    if (error.toString().contains('Shard') ||
        error.toString().contains('Gateway') ||
        error.toString().contains('disconnected')) {
      logger.d('Discord connection event (suppressed): $error');
      return true; // Error handled
    }
    logger.e('Unhandled error: $error');
    logger.e('Stack trace: $stack');
    return true; // Error handled
  };

  // Initialize config service (this will load .env file)
  final configService = ConfigService();
  await configService.loadConfig();

  // Create Discord reporter (lazy init when first report is sent)
  final discordReporter = DiscordReporter();

  // Check authentication status (for logging purposes)
  final authService = AuthService();
  final isAuthenticated = await authService.isAuthenticated();
  if (isAuthenticated) {
    final userId = await authService.getUserId();
    logger.i('User authenticated: $userId');
  } else {
    logger.i(
      'User not authenticated - login required for launch/queue features',
    );
  }

  runApp(
    PlutoniumAntiCheatApp(
      configService: configService,
      discordReporter: discordReporter,
    ),
  );
}

class PlutoniumAntiCheatApp extends StatelessWidget {
  final ConfigService configService;
  final DiscordReporter discordReporter;

  const PlutoniumAntiCheatApp({
    super.key,
    required this.configService,
    required this.discordReporter,
  });

  @override
  Widget build(BuildContext context) {
    return ShadcnApp(
      themeMode: ThemeMode.dark,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: LegacyColorSchemes.darkSlate(),
        radius: 0.5,
      ),
      home: const AuthWrapperScreen(),
    );
  }
}
