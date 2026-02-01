import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:logger/logger.dart' as logger_pkg;
import '../../core/config/config_service.dart';

/// Service for handling Discord OAuth2 authentication
class AuthService {
  static const _userIdFileName = 'discord_user_id.txt';
  static const _accessTokenFileName = 'discord_access_token.txt';
  static const _authUrl = 'https://discord.com/oauth2/authorize';
  static const _tokenUrl = 'https://discord.com/api/oauth2/token';
  static const _scopes = ['identify', 'guilds'];
  // Try both localhost and 127.0.0.1 - some systems prefer one over the other
  // Using 127.0.0.1 instead of localhost - some Discord configurations prefer this
  // NOTE: This must match EXACTLY what's configured in Discord Developer Portal
  static const _redirectUri = 'http://127.0.0.1:9298/callback';
  static const _localPort = 9298;

  // Alternative: Try localhost if 127.0.0.1 doesn't work
  // static const _redirectUri = 'http://localhost:9298/callback';

  final logger_pkg.Logger _logger = logger_pkg.Logger();
  final ConfigService _configService = ConfigService();
  final Dio _dio = Dio();

  // Store code verifier for WebView approach
  String? _storedCodeVerifier;

  /// Generate a random string for PKCE code verifier (public for WebView approach)
  String generateCodeVerifier() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    return base64UrlEncode(bytes).replaceAll('=', '');
  }

  /// Generate code challenge from verifier (SHA256 hash, base64url encoded) (public for WebView approach)
  String generateCodeChallenge(String verifier) {
    final bytes = utf8.encode(verifier);
    final digest = sha256.convert(bytes);
    return base64UrlEncode(digest.bytes).replaceAll('=', '');
  }

  /// Get the stored Discord user ID
  Future<String?> getUserId() async {
    try {
      final userIdFile = await _getUserIdFile();
      if (await userIdFile.exists()) {
        final userId = await userIdFile.readAsString();
        return userId.trim().isEmpty ? null : userId.trim();
      }
      return null;
    } catch (e) {
      _logger.e('Error reading user ID: $e');
      return null;
    }
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final userId = await getUserId();
    return userId != null && userId.isNotEmpty;
  }

  /// Start a local HTTP server to receive the OAuth callback
  Future<String?> _startCallbackServer(String codeVerifier) async {
    final completer = Completer<String?>();
    HttpServer? server;

    try {
      // Bind to both IPv4 and IPv6 loopback addresses to ensure compatibility
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, _localPort);
      _logger.i('Callback server started on port $_localPort');
      _logger.i('Listening on: http://127.0.0.1:$_localPort/callback');
      _logger.i('Listening on: http://localhost:$_localPort/callback');

      server.listen((HttpRequest request) async {
        _logger.i('=== CALLBACK RECEIVED ===');
        _logger.i('Request method: ${request.method}');
        _logger.i('Request URI: ${request.uri}');
        try {
          final uri = request.uri;
          _logger.i(
            'Received HTTP request: ${request.method} ${uri.toString()}',
          );
          _logger.d('Request path: ${uri.path}');
          _logger.d('Query parameters: ${uri.queryParameters}');
          _logger.d('All query params: ${uri.queryParametersAll}');

          if (uri.path == '/callback' || uri.path == '/callback/') {
            _logger.i('=== PROCESSING CALLBACK ===');
            _logger.i('Path matches /callback');
            final code = uri.queryParameters['code'];
            final error = uri.queryParameters['error'];
            final errorDescription = uri.queryParameters['error_description'];

            _logger.i('Processing OAuth callback...');
            _logger.i(
              'Code: ${code != null ? "present (${code.length} chars)" : "null"}',
            );
            _logger.i('Error: $error');
            _logger.i('Error description: $errorDescription');
            _logger.i('All query params: ${uri.queryParameters}');

            // Send response to browser first (before completing completer)
            final response = request.response;
            response.statusCode = 200;
            response.headers.set('Content-Type', 'text/html');
            response.headers.set('Access-Control-Allow-Origin', '*');

            if (error != null) {
              // Send error page
              response.write('''
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Authentication Failed</title>
                    <style>
                      body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #2f3136;
                        color: #fff;
                      }
                      .container {
                        text-align: center;
                        padding: 20px;
                      }
                      h1 { color: #ed4245; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>✗ Authentication Failed</h1>
                      <p>Error: $error</p>
                      <p>Please close this window and try again.</p>
                    </div>
                  </body>
                </html>
              ''');
              await response.close();

              _logger.e('OAuth error: $error');
              if (errorDescription != null) {
                _logger.e('Error description: $errorDescription');
              }
              if (!completer.isCompleted) {
                completer.complete(null);
              }
            } else if (code != null && code.isNotEmpty) {
              _logger.i('Sending success page to browser...');
              // Send success page
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
                        background: #2f3136;
                        color: #fff;
                      }
                      .container {
                        text-align: center;
                        padding: 20px;
                      }
                      h1 { color: #5865f2; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>✓ Authentication Successful!</h1>
                      <p>You can close this window and return to the application.</p>
                      <p><small>This window will close automatically...</small></p>
                    </div>
                    <script>
                      setTimeout(function() {
                        window.close();
                      }, 2000);
                    </script>
                  </body>
                </html>
              ''');
              await response.close();

              _logger.i('Response sent to browser, completing completer...');
              _logger.i(
                'Authorization code received successfully: ${code.substring(0, code.length > 20 ? 20 : code.length)}...',
              );
              if (!completer.isCompleted) {
                _logger.i('Completing completer with code...');
                completer.complete(code);
                _logger.i('Completer completed successfully');
              } else {
                _logger.w('Completer already completed, skipping');
              }
            } else {
              // Send warning page
              response.write('''
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Authentication Warning</title>
                    <style>
                      body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #2f3136;
                        color: #fff;
                      }
                      .container {
                        text-align: center;
                        padding: 20px;
                      }
                      h1 { color: #faa61a; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h1>⚠ Authentication Warning</h1>
                      <p>No authorization code received.</p>
                      <p>Please close this window and try again.</p>
                    </div>
                  </body>
                </html>
              ''');
              await response.close();

              _logger.w(
                'No code or error in callback - query params: ${uri.queryParameters}',
              );
              if (!completer.isCompleted) {
                completer.complete(null);
              }
            }

            // Close server after receiving callback
            _logger.d('Closing callback server...');
            await server?.close(force: true);
            _logger.d('Callback server closed');
          } else if (uri.path == '/test' || uri.path == '/test/') {
            // Test endpoint to verify server is reachable
            _logger.i('Test endpoint hit - server is reachable!');
            request.response.statusCode = 200;
            request.response.headers.set('Content-Type', 'text/plain');
            request.response.write(
              'Server is reachable! Current time: ${DateTime.now()}',
            );
            await request.response.close();
          } else {
            _logger.w('Received request for non-callback path: ${uri.path}');
            _logger.w('Full URI: ${uri}');
            _logger.w('Query params: ${uri.queryParameters}');
            request.response.statusCode = 404;
            request.response.headers.set('Content-Type', 'text/plain');
            request.response.write(
              '404 Not Found - Expected /callback or /test',
            );
            await request.response.close();
          }
        } catch (e, stackTrace) {
          _logger.e('Error handling callback: $e');
          _logger.e('Stack trace: $stackTrace');
          if (!completer.isCompleted) {
            _logger.w('Completing completer with null due to error');
            completer.complete(null);
          }
        }
      });

      // Timeout after 5 minutes
      Timer(const Duration(minutes: 5), () {
        if (!completer.isCompleted) {
          _logger.e('OAuth callback timeout');
          completer.complete(null);
          server?.close(force: true);
        }
      });

      return completer.future;
    } catch (e) {
      _logger.e('Error starting callback server: $e');
      if (!completer.isCompleted) {
        completer.complete(null);
      }
      server?.close(force: true);
      return null;
    }
  }

  /// Exchange authorization code for access token
  Future<String?> _exchangeCodeForToken(
    String code,
    String codeVerifier,
  ) async {
    try {
      final config = await _configService.loadConfig();
      final clientId = config.discordClientId;

      if (clientId == null || clientId.isEmpty) {
        _logger.e('Discord Client ID not configured');
        return null;
      }

      _logger.d('Exchanging code for token...');
      _logger.d('Token URL: $_tokenUrl');
      _logger.d('Client ID: $clientId');
      _logger.d('Redirect URI: $_redirectUri');

      final response = await _dio.post(
        _tokenUrl,
        data: {
          'client_id': clientId,
          'client_secret': '', // Not needed with PKCE
          'grant_type': 'authorization_code',
          'code': code,
          'redirect_uri': _redirectUri,
          'code_verifier': codeVerifier,
        },
        options: Options(
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        ),
      );

      _logger.d('Token exchange response status: ${response.statusCode}');

      if (response.statusCode == 200 && response.data is Map) {
        final data = response.data as Map<String, dynamic>;
        final accessToken = data['access_token'] as String?;
        if (accessToken != null) {
          _logger.i('Access token obtained successfully');
          return accessToken;
        } else {
          _logger.e('Access token not found in response');
          _logger.e('Response data: $data');
          return null;
        }
      } else {
        _logger.e('Failed to exchange code for token: ${response.statusCode}');
        _logger.e('Response data: ${response.data}');
        return null;
      }
    } catch (e, stackTrace) {
      _logger.e('Error exchanging code for token: $e');
      _logger.e('Stack trace: $stackTrace');
      return null;
    }
  }

  /// Build authorization URL (public for WebView approach)
  /// Stores the code verifier internally for later use in completeLoginWithCode
  String buildAuthorizationUrl({
    required String clientId,
    String? codeVerifier,
    String? codeChallenge,
  }) {
    // Generate if not provided
    final verifier = codeVerifier ?? generateCodeVerifier();
    final challenge = codeChallenge ?? generateCodeChallenge(verifier);

    // Store verifier for later use
    _storedCodeVerifier = verifier;

    final authParams = {
      'client_id': clientId,
      'redirect_uri': _redirectUri,
      'response_type': 'code',
      'scope': _scopes.join(' '),
      'code_challenge': challenge,
      'code_challenge_method': 'S256',
    };

    final authUri = Uri.parse(_authUrl).replace(queryParameters: authParams);
    return authUri.toString();
  }

  /// Complete login with authorization code (for WebView approach)
  Future<bool> completeLoginWithCode(
    String code, {
    String? codeVerifier,
  }) async {
    try {
      final verifier = codeVerifier ?? _storedCodeVerifier;

      if (verifier == null) {
        _logger.e(
          'Code verifier not available. Make sure buildAuthorizationUrl was called first.',
        );
        return false;
      }

      _logger.i('Exchanging authorization code for access token...');

      // Exchange code for token
      final token = await _exchangeCodeForToken(code, verifier);

      if (token == null) {
        _logger.e('Failed to exchange code for token');
        return false;
      }

      // Store token and get user info
      await _saveAccessToken(token);
      final userInfo = await _fetchUserInfo(token);

      if (userInfo == null || userInfo['id'] == null) {
        _logger.e('Failed to get user info');
        return false;
      }

      final userId = userInfo['id'] as String;
      await _saveUserId(userId);
      _logger.i('Login successful! User ID: $userId');

      // Clear stored verifier
      _storedCodeVerifier = null;

      return true;
    } catch (e) {
      _logger.e('Error completing login with code: $e');
      _storedCodeVerifier = null;
      return false;
    }
  }

  /// Initiate Discord OAuth2 login flow (original method with external browser)
  Future<bool> login() async {
    try {
      final config = await _configService.loadConfig();
      final clientId = config.discordClientId;

      if (clientId == null || clientId.isEmpty) {
        _logger.e('Discord Client ID not configured');
        throw Exception(
          'Discord Client ID not configured. Please set DISCORD_CLIENT_ID in your .env file.',
        );
      }

      // Generate PKCE code verifier and challenge
      final codeVerifier = generateCodeVerifier();
      final codeChallenge = generateCodeChallenge(codeVerifier);

      // Start callback server
      final serverFuture = _startCallbackServer(codeVerifier);

      // Build authorization URL
      // IMPORTANT: redirect_uri must match EXACTLY what's in Discord Developer Portal
      final authParams = {
        'client_id': clientId,
        'redirect_uri': _redirectUri, // Must be: http://127.0.0.1:9298/callback
        'response_type': 'code',
        'scope': _scopes.join(' '),
        'code_challenge': codeChallenge,
        'code_challenge_method': 'S256',
      };

      // Verify redirect URI format
      _logger.d('Verifying redirect URI format...');
      _logger.d('Redirect URI: "$_redirectUri"');
      _logger.d('Length: ${_redirectUri.length} characters');

      if (!_redirectUri.startsWith('http://')) {
        _logger.e('ERROR: Redirect URI must start with http:// (not https://)');
      }
      if (_redirectUri.contains('localhost') &&
          !_redirectUri.contains('127.0.0.1')) {
        _logger.w('WARNING: Using localhost - Discord may prefer 127.0.0.1');
      }
      if (_redirectUri.endsWith('/')) {
        _logger.e('ERROR: Redirect URI has trailing slash - remove it!');
      }

      // Check for common issues
      final expectedUri = 'http://127.0.0.1:9298/callback';
      if (_redirectUri != expectedUri) {
        _logger.w('WARNING: Redirect URI does not match expected format');
        _logger.w('Expected: "$expectedUri"');
        _logger.w('Actual:   "$_redirectUri"');
      }

      // Build the authorization URI
      final authUri = Uri.parse(_authUrl).replace(queryParameters: authParams);
      final authUrlString = authUri.toString();

      // Verify redirect URI encoding
      final encodedRedirectUri = Uri.encodeComponent(_redirectUri);
      _logger.d('Redirect URI (raw): $_redirectUri');
      _logger.d('Redirect URI (encoded): $encodedRedirectUri');
      _logger.d(
        'Redirect URI in URL: ${authUri.queryParameters['redirect_uri']}',
      );

      _logger.i('=== STARTING DISCORD OAUTH ===');
      _logger.i('Opening browser for Discord authentication...');
      _logger.i('Authorization URL: $authUrlString');
      _logger.i('Redirect URI: $_redirectUri');
      _logger.i('Scopes: ${_scopes.join(" ")}');
      _logger.w('');
      _logger.w(
        '╔═══════════════════════════════════════════════════════════════╗',
      );
      _logger.w(
        '║  CRITICAL: Discord Developer Portal Configuration           ║',
      );
      _logger.w(
        '╠═══════════════════════════════════════════════════════════════╣',
      );
      _logger.w(
        '║  1. Go to: https://discord.com/developers/applications       ║',
      );
      _logger.w(
        '║  2. Select your app (Client ID: $clientId)                    ║',
      );
      _logger.w(
        '║  3. Go to OAuth2 tab → Scroll to "Redirects"                 ║',
      );
      _logger.w(
        '║  4. Click "Add Redirect"                                      ║',
      );
      _logger.w('║  5. Add EXACTLY: $_redirectUri');
      _logger.w(
        '║     (No trailing slash, no HTTPS, must match exactly)       ║',
      );
      _logger.w(
        '║                                                               ║',
      );
      _logger.w('║  Current redirect URI being used: "$_redirectUri"');
      _logger.w(
        '║  Length: ${_redirectUri.length} characters                    ║',
      );
      _logger.w(
        '║  Make sure this EXACT string is in Discord Redirects list    ║',
      );
      _logger.w(
        '║                                                               ║',
      );
      _logger.w(
        '║  TROUBLESHOOTING:                                            ║',
      );
      _logger.w(
        '║  - Copy the redirect URI above EXACTLY                        ║',
      );
      _logger.w(
        '║  - Paste it into Discord Developer Portal                    ║',
      );
      _logger.w(
        '║  - Make sure there are NO extra spaces or characters         ║',
      );
      _logger.w(
        '║  - Click "Save Changes" and wait a few seconds               ║',
      );
      _logger.w(
        '║  - Try logging in again                                      ║',
      );
      _logger.w(
        '║  6. Click "Save Changes"                                      ║',
      );
      _logger.w(
        '║                                                               ║',
      );
      _logger.w(
        '║  If browser stays on Discord page after clicking, the        ║',
      );
      _logger.w(
        '║  redirect URI is NOT configured correctly in Discord.        ║',
      );
      _logger.w(
        '╚═══════════════════════════════════════════════════════════════╝',
      );
      _logger.w('');

      // Launch browser using platform-specific method
      try {
        if (Platform.isWindows) {
          // Windows: use start command
          await Process.start('cmd', [
            '/c',
            'start',
            '',
            authUrlString,
          ], runInShell: true);
        } else if (Platform.isMacOS) {
          // macOS: use open command
          await Process.run('open', [authUrlString]);
        } else if (Platform.isLinux) {
          // Linux: use xdg-open
          await Process.run('xdg-open', [authUrlString]);
        } else {
          _logger.e('Unsupported platform for launching browser');
          return false;
        }
        _logger.d('Browser launched successfully');
      } catch (e) {
        _logger.e('Failed to launch browser: $e');
        return false;
      }

      // Wait for callback (with timeout handling)
      _logger.d(
        'Waiting for OAuth callback on http://localhost:$_localPort/callback...',
      );
      _logger.d('Server future created, awaiting callback...');
      _logger.d('If you see the success screen but no callback logs, check:');
      _logger.d(
        '1. Browser address bar - should show http://localhost:9298/callback?code=...',
      );
      _logger.d('2. Windows Firewall might be blocking localhost connections');
      _logger.d('3. Another app might be using port 9298');

      final code = await serverFuture;

      _logger.i('=== CALLBACK FUTURE COMPLETED ===');
      _logger.i(
        'Server future completed. Code: ${code != null ? "received (${code.length} chars)" : "null"}',
      );

      if (code == null || code.isEmpty) {
        _logger.e('No authorization code received from Discord');
        _logger.e('');
        _logger.e(
          '╔═══════════════════════════════════════════════════════════════╗',
        );
        _logger.e(
          '║  NO AUTHORIZATION CODE RECEIVED                              ║',
        );
        _logger.e(
          '╠═══════════════════════════════════════════════════════════════╣',
        );
        _logger.e(
          '║  Possible causes:                                            ║',
        );
        _logger.e(
          '║  1. Redirect URI not configured in Discord Developer Portal  ║',
        );
        _logger.e(
          '║  2. Redirect URI mismatch (check exact spelling)            ║',
        );
        _logger.e(
          '║  3. Browser stayed on Discord page (no redirect happened)   ║',
        );
        _logger.e(
          '║  4. Firewall blocking localhost connections                  ║',
        );
        _logger.e(
          '║                                                               ║',
        );
        _logger.e(
          '║  CHECK: After clicking "Add to my apps", does the browser    ║',
        );
        _logger.e(
          '║  address bar change to http://127.0.0.1:9298/callback?      ║',
        );
        _logger.e(
          '║  If NO → Discord redirect URI not configured correctly       ║',
        );
        _logger.e(
          '║  If YES → Check logs above for callback processing errors   ║',
        );
        _logger.e(
          '╚═══════════════════════════════════════════════════════════════╝',
        );
        _logger.e('');
        return false;
      }

      _logger.i(
        'Authorization code received successfully! Length: ${code.length}',
      );
      _logger.i('Exchanging code for access token...');
      _logger.d('Code length: ${code.length}');
      _logger.d('Code verifier length: ${codeVerifier.length}');

      // Exchange code for token
      final accessToken = await _exchangeCodeForToken(code, codeVerifier);

      if (accessToken == null || accessToken.isEmpty) {
        _logger.e('Failed to obtain access token from Discord');
        _logger.e('Check the logs above for token exchange errors');
        return false;
      }

      _logger.i('Access token obtained successfully');
      _logger.d('Access token length: ${accessToken.length}');

      // Fetch user info
      _logger.d('Fetching user information from Discord API...');
      final userInfo = await _fetchUserInfo(accessToken);

      if (userInfo != null && userInfo['id'] != null) {
        final userId = userInfo['id'] as String;
        _logger.i('User info fetched successfully. User ID: $userId');
        await _saveUserId(userId);
        // Store access token temporarily for guild check
        await _saveAccessToken(accessToken);
        _logger.i('Successfully authenticated with Discord');
        return true;
      } else {
        _logger.e('Failed to fetch user info from Discord');
        _logger.e('User info response: $userInfo');
        return false;
      }
    } catch (e, stackTrace) {
      _logger.e('Error during Discord login: $e');
      _logger.e('Stack trace: $stackTrace');
      return false;
    }
  }

  /// Fetch user information from Discord API
  Future<Map<String, dynamic>?> _fetchUserInfo(String accessToken) async {
    try {
      _logger.d('Fetching user info from Discord API...');
      final response = await _dio.get(
        'https://discord.com/api/users/@me',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );

      _logger.d('User info response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final userInfo = response.data as Map<String, dynamic>;
        _logger.d('User info received: ${userInfo.keys.join(", ")}');
        return userInfo;
      } else {
        _logger.e('Failed to fetch user info: ${response.statusCode}');
        _logger.e('Response data: ${response.data}');
        return null;
      }
    } catch (e, stackTrace) {
      _logger.e('Error fetching user info: $e');
      _logger.e('Stack trace: $stackTrace');
      return null;
    }
  }

  /// Save user ID to file
  Future<void> _saveUserId(String userId) async {
    try {
      final userIdFile = await _getUserIdFile();
      await userIdFile.writeAsString(userId);
      _logger.d('User ID saved successfully');
    } catch (e) {
      _logger.e('Error saving user ID: $e');
      rethrow;
    }
  }

  /// Get the file where user ID is stored
  Future<File> _getUserIdFile() async {
    final appDir = await getApplicationSupportDirectory();
    final authDir = Directory('${appDir.path}/auth');
    if (!await authDir.exists()) {
      await authDir.create(recursive: true);
    }
    return File('${authDir.path}/$_userIdFileName');
  }

  /// Get the file where access token is stored
  Future<File> _getAccessTokenFile() async {
    final appDir = await getApplicationSupportDirectory();
    final authDir = Directory('${appDir.path}/auth');
    if (!await authDir.exists()) {
      await authDir.create(recursive: true);
    }
    return File('${authDir.path}/$_accessTokenFileName');
  }

  /// Save access token to file
  Future<void> _saveAccessToken(String token) async {
    try {
      final tokenFile = await _getAccessTokenFile();
      await tokenFile.writeAsString(token);
      _logger.d('Access token saved temporarily');
    } catch (e) {
      _logger.e('Error saving access token: $e');
    }
  }

  /// Get stored access token
  Future<String?> _getAccessToken() async {
    try {
      final tokenFile = await _getAccessTokenFile();
      if (await tokenFile.exists()) {
        final token = await tokenFile.readAsString();
        return token.trim().isEmpty ? null : token.trim();
      }
      return null;
    } catch (e) {
      _logger.e('Error reading access token: $e');
      return null;
    }
  }

  /// Check if user is in the required Discord guild/server
  Future<bool> isInRequiredGuild() async {
    try {
      final config = await _configService.loadConfig();
      final guildId = config.discordGuildId;

      if (guildId == null || guildId.isEmpty) {
        _logger.w('Discord Guild ID not configured - skipping guild check');
        return true; // If not configured, allow access
      }

      final accessToken = await _getAccessToken();
      if (accessToken == null || accessToken.isEmpty) {
        _logger.w('No access token available for guild check');
        return false;
      }

      // Fetch user's guilds
      final response = await _dio.get(
        'https://discord.com/api/users/@me/guilds',
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );

      if (response.statusCode == 200 && response.data is List) {
        final guilds = response.data as List<dynamic>;
        final isMember = guilds.any((guild) => guild['id'] == guildId);
        _logger.d('User guild membership check: $isMember');
        return isMember;
      } else {
        _logger.e('Failed to fetch user guilds: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      _logger.e('Error checking guild membership: $e');
      return false;
    }
  }

  /// Check if user is fully authorized (authenticated and in required guild)
  Future<bool> isAuthorized() async {
    if (!await isAuthenticated()) {
      return false;
    }
    return await isInRequiredGuild();
  }

  /// Logout and clear stored user ID and access token
  Future<void> logout() async {
    try {
      final userIdFile = await _getUserIdFile();
      final tokenFile = await _getAccessTokenFile();

      if (await userIdFile.exists()) {
        await userIdFile.delete();
      }
      if (await tokenFile.exists()) {
        await tokenFile.delete();
      }
      _logger.i('User logged out successfully');
    } catch (e) {
      _logger.e('Error during logout: $e');
      rethrow;
    }
  }
}
