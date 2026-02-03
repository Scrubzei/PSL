To add Discord authentication to your 1v1LB Windows application, we'll integrate OAuth2 using the Authorization Code Flow with PKCE (Proof Key for Code Exchange). This is suitable for a public desktop client like yours, as it avoids exposing a client secret. The goal is to securely obtain the user's Discord ID, store it locally, and use it to mention the user (e.g., `<@userID>`) in anti-cheat reports sent via nyxx to your Discord server.

This integration assumes:

- Users must log in with Discord to use the app (e.g., to join queues or launch games), ensuring reports can mention them.
- We'll use the `identify` scope to fetch the user's ID via the `/users/@me` endpoint.
- No email or other sensitive data is needed.
- The app remains Windows-only (Flutter desktop target).

## Updated Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  desktopoauth2: ^1.0.4 # For desktop OAuth2 flow
  flutter_secure_storage: ^9.0.0 # Secure storage for user ID (supports Windows)
  http: ^1.2.0 # For API calls to Discord (e.g., /users/@me)
```

Run `flutter pub get`.

## Discord Developer Portal Setup

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications) and create a new application (e.g., "1v1LB Anti-Cheat").
2. In the **OAuth2** tab:
   - Add a Redirect URI: `http://localhost:9298/callback` (use port 9298 or any unused port; must match your code).
   - Note your **Client ID** (no Client Secret needed with PKCE).
3. Save changes. This URI allows the desktop app to receive the auth code via a local HTTP server.

## Architecture Updates

- **New Module**: Auth Module – Handles login, token exchange, user ID fetch, and storage.
- **Data Flow**:
  - On app start: Check for stored user ID. If none, show login screen.
  - Login: Open system browser for Discord auth → Redirect to local URI → Exchange code for token → Fetch user ID → Store ID.
  - Reporting: If cheat detected, append `<@userID>` to the Discord message embed.
- **Security**:
  - Use PKCE to avoid client secret.
  - Store only the user ID (string) securely; no tokens needed long-term.
  - Handle errors: Invalid tokens, revoked access, etc.

## UI Updates

- **New Screen**: LoginScreen – A simple shadcn card with a "Login with Discord" button.
  - Use shadcn_flutter: `ShadButton` for the button, with Material Icon (e.g., `Icon(Icons.login)`).
  - After login, redirect to Dashboard and store ID.
- **Settings**: Add "Logout" button to clear stored ID.
- **Example Widget**:
  ```dart
  class LoginScreen extends StatelessWidget {
    @override
    Widget build(BuildContext context) {
      return Scaffold(
        body: Center(
          child: ShadCard(
            child: ShadButton(
              onPressed: () => AuthService.login(),  // Call login logic
              child: Row(
                children: [
                  Icon(Icons.login),
                  SizedBox(width: 8),
                  Text('Login with Discord'),
                ],
              ),
            ),
          ),
        ),
      );
    }
  }
  ```

## Implementation Details

### 1. Auth Service Class

Create `lib/services/auth_service.dart`:

```dart
import 'package:desktopoauth2/desktopoauth2.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  static const _storage = FlutterSecureStorage();
  static const _userIdKey = 'discord_user_id';
  static const _clientId = 'YOUR_DISCORD_CLIENT_ID';  // From Discord portal
  static const _authUrl = 'https://discord.com/oauth2/authorize';
  static const _tokenUrl = 'https://discord.com/api/oauth2/token';
  static const _scopes = ['identify'];
  static const _redirectUri = 'http://localhost:9298/callback';
  static const _localPort = 9298;

  static Future<String?> getUserId() async {
    return await _storage.read(key: _userIdKey);
  }

  static Future<void> login() async {
    final flow = DesktopAuthorizationCodeFlow()
      ..authorizationUrl = _authUrl
      ..clientId = _clientId
      ..localPort = _localPort
      ..pkce = true  // Enable PKCE for security
      ..redirectUri = _redirectUri
      ..scopes = _scopes
      ..tokenUrl = _tokenUrl;

    final oauth = DesktopOAuth2();
    final tokenResponse = await oauth.oauthorizeCode(flow);

    if (tokenResponse != null && tokenResponse.containsKey('access_token')) {
      final accessToken = tokenResponse['access_token'];
      final userInfo = await _fetchUserInfo(accessToken);
      if (userInfo != null) {
        await _storage.write(key: _userIdKey, value: userInfo['id']);
      }
    }
  }

  static Future<Map<String, dynamic>?> _fetchUserInfo(String accessToken) async {
    final response = await http.get(
      Uri.parse('https://discord.com/api/users/@me'),
      headers: {'Authorization': 'Bearer $accessToken'},
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return null;
  }

  static Future<void> logout() async {
    await _storage.delete(key: _userIdKey);
  }
}
```

- **Explanation**:
  - `login()`: Initiates OAuth flow, opens browser, handles redirect via local server.
  - Fetches user info to get `id`.
  - Stores only ID (e.g., "123456789012345678").
- **Error Handling**: Add try-catch for network errors, invalid responses.

### 2. Integration with Launcher and Queue

- In Dashboard/Launcher: Check `AuthService.getUserId() != null` before allowing launch or queue join. If null, navigate to LoginScreen.
- Example in `launchPlutonium()`:
  ```dart
  if (await AuthService.getUserId() == null) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => LoginScreen()));
    return;
  }
  // Proceed with launch
  ```

### 3. Update Reporting Module

In your existing Discord reporting (using nyxx):

- Fetch user ID and mention in embed.
- Example update to report function:

  ```dart
  Future<void> reportCheat(DetectionReport report) async {
    final userId = await AuthService.getUserId();
    final mention = userId != null ? '<@$userId>' : 'Unknown User';

    final embed = EmbedBuilder()
      ..title = 'Cheat Detected'
      ..description = '$mention attempted to use a cheat: ${report.type} - ${report.evidence}';

    final channel = await client.fetchChannel<Snowflake>(channelId);
    await channel.sendMessage(MessageBuilder.embed(embed));
  }
  ```

- If no ID, report as "Unknown User" or block gameplay until logged in.

## Testing

- **Local**: Run app, click login → Browser opens Discord auth → Approve → App gets ID.
- **Edge Cases**: Revoke access in Discord portal, test logout, handle port conflicts (change \_localPort).
- **Security**: Verify no client secret is used/exposed. Test on clean Windows VM.

## Potential Enhancements

- Refresh token handling if you need ongoing access (store refresh_token securely and refresh access_token).
- Guild check: Add `guilds` scope to verify user is in your Discord server.
- Error UI: Show shadcn alerts for failed logins (e.g., "Discord login failed").

This adds minimal overhead and ensures users can be mentioned in reports for accountability. If you need more scopes (e.g., `guilds.join`), update `_scopes` and Discord app accordingly.
