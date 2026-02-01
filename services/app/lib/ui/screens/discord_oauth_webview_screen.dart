import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart' as material;
import 'package:shadcn_flutter/shadcn_flutter.dart';
import 'package:webview_windows/webview_windows.dart';
import '../../services/auth/auth_service.dart';
import '../../core/config/config_service.dart';
import 'package:logger/logger.dart' as logger_pkg;
import 'dashboard_screen.dart';
import 'server_join_screen.dart';

/// Screen that shows an embedded WebView for Discord OAuth2 authentication
class DiscordOAuthWebViewScreen extends StatefulWidget {
  const DiscordOAuthWebViewScreen({super.key});

  @override
  State<DiscordOAuthWebViewScreen> createState() =>
      _DiscordOAuthWebViewScreenState();
}

class _DiscordOAuthWebViewScreenState extends State<DiscordOAuthWebViewScreen> {
  final AuthService _authService = AuthService();
  final ConfigService _configService = ConfigService();
  final logger_pkg.Logger _logger = logger_pkg.Logger();

  WebviewController? _controller;
  bool _isLoading = true;
  String? _errorMessage;
  StreamSubscription<String>? _urlSubscription;
  HttpServer? _callbackServer;

  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  @override
  void dispose() {
    _urlSubscription?.cancel();
    _controller?.dispose();
    _callbackServer?.close(force: true);
    super.dispose();
  }

  Future<void> _initializeWebView() async {
    try {
      // Start callback server first
      await _startCallbackServer();

      _controller = WebviewController();
      await _controller!.initialize();

      // Listen for URL changes to detect the callback
      // webview_windows uses controller.url stream
      _urlSubscription = _controller!.url.listen((url) {
        _logger.d('WebView URL changed: $url');
        _handleUrlChange(url);
      });

      // Load the Discord OAuth URL
      await _loadDiscordAuth();
    } catch (e) {
      _logger.e('Error initializing WebView: $e');
      setState(() {
        _errorMessage = 'Failed to initialize browser: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _startCallbackServer() async {
    try {
      _callbackServer = await HttpServer.bind('127.0.0.1', 9298);
      _logger.i('Callback server started on http://127.0.0.1:9298');

      _callbackServer!.listen((request) async {
        _logger.d('Callback server received request: ${request.uri}');

        if (request.uri.path == '/callback') {
          final code = request.uri.queryParameters['code'];
          final error = request.uri.queryParameters['error'];

          // Send success page
          final response = request.response;
          response.statusCode = 200;
          response.headers.contentType = ContentType.html;
          response.write('''
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Successful</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                }
                .container {
                  text-align: center;
                  padding: 40px;
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 10px;
                  backdrop-filter: blur(10px);
                }
                h1 { margin: 0 0 10px 0; }
                p { margin: 0; opacity: 0.9; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>✓ Authentication Successful!</h1>
                <p>You can close this window and return to the application.</p>
              </div>
            </body>
            </html>
          ''');
          await response.close();

          // Handle the callback
          if (error != null) {
            _logger.e('OAuth error: $error');
            if (mounted) {
              setState(() {
                _errorMessage = 'Discord authentication error: $error';
              });
            }
          } else if (code != null && code.isNotEmpty) {
            _logger.i('Authorization code received from callback server');
            if (mounted) {
              await _completeAuthentication(code);
            }
          }
        } else {
          request.response.statusCode = 404;
          await request.response.close();
        }
      });
    } catch (e) {
      _logger.e('Error starting callback server: $e');
      // Server might already be running, continue anyway
    }
  }

  Future<void> _loadDiscordAuth() async {
    try {
      final config = await _configService.loadConfig();
      final clientId = config.discordClientId;

      if (clientId == null || clientId.isEmpty) {
        setState(() {
          _errorMessage =
              'Discord Client ID not configured. Please set DISCORD_CLIENT_ID in your .env file.';
          _isLoading = false;
        });
        return;
      }

      // Build authorization URL (AuthService will handle PKCE generation internally)
      final authUrl = _authService.buildAuthorizationUrl(clientId: clientId);

      _logger.i('Loading Discord OAuth URL in WebView: $authUrl');
      await _controller!.loadUrl(authUrl);
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      _logger.e('Error loading Discord auth: $e');
      setState(() {
        _errorMessage = 'Error loading Discord authentication: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _handleUrlChange(String url) async {
    _logger.d('Handling URL change: $url');

    // Check if this is our callback URL
    if (url.startsWith('http://127.0.0.1:9298/callback') ||
        url.startsWith('http://localhost:9298/callback')) {
      _logger.i('Callback URL detected: $url');

      try {
        final uri = Uri.parse(url);
        final code = uri.queryParameters['code'];
        final error = uri.queryParameters['error'];

        if (error != null) {
          _logger.e('OAuth error: $error');
          setState(() {
            _errorMessage = 'Discord authentication error: $error';
          });
          return;
        }

        if (code != null && code.isNotEmpty) {
          _logger.i('Authorization code received from WebView');
          await _completeAuthentication(code);
        }
      } catch (e) {
        _logger.e('Error parsing callback URL: $e');
        setState(() {
          _errorMessage = 'Error processing callback: $e';
        });
      }
    }
  }

  Future<void> _completeAuthentication(String code) async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      final success = await _authService.completeLoginWithCode(code);

      if (success) {
        // Check if user is in required guild
        final isInGuild = await _authService.isInRequiredGuild();
        if (mounted) {
          if (isInGuild) {
            Navigator.of(context).pushReplacement(
              material.MaterialPageRoute(
                builder: (context) => const DashboardScreen(),
              ),
            );
          } else {
            Navigator.of(context).pushReplacement(
              material.MaterialPageRoute(
                builder: (context) => const ServerJoinScreen(),
              ),
            );
          }
        }
      } else {
        setState(() {
          _errorMessage =
              'Failed to complete authentication. Please try again.';
          _isLoading = false;
        });
      }
    } catch (e) {
      _logger.e('Error completing authentication: $e');
      setState(() {
        _errorMessage = 'Error during authentication: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      headers: [
        AppBar(
          title: const Text('Discord Login'),
          leading: [
            Button(
              style: const ButtonStyle.ghost(),
              onPressed: () => Navigator.of(context).pop(),
              child: const Icon(Icons.close),
            ),
          ],
        ),
      ],
      child: Column(
        children: [
          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: material.Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: material.Colors.red.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error, color: material.Colors.red),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: material.Colors.red),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: _controller != null
                ? Webview(_controller!)
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const material.CircularProgressIndicator(),
                        const SizedBox(height: 16),
                        const Text('Initializing browser...'),
                      ],
                    ),
                  ),
          ),
          if (_isLoading) const LinearProgressIndicator(),
        ],
      ),
    );
  }
}
