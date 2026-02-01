# Discord OAuth2 Setup Guide

## Issue: Discord Shows "Add to Server" Instead of "Authorize"

If Discord is showing "Add to Server" instead of an authorization screen, follow these steps:

### 1. Check Your Discord Application Type

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to the **OAuth2** tab (not the "Bot" tab)
4. Make sure you're configuring an **OAuth2 application**, not a Bot application

### 2. Configure Redirect URI

1. In the **OAuth2** tab, scroll down to **Redirects**
2. Click **Add Redirect**
3. Add BOTH of these redirect URIs (Discord sometimes prefers one over the other):
   - `http://localhost:9298/callback`
   - `http://127.0.0.1:9298/callback`
4. Click **Save Changes**

**Note:** The application currently uses `http://127.0.0.1:9298/callback`. Make sure this exact URI is in your redirect list.

### 3. Verify Scopes

The application uses these scopes:

- `identify` - Get user information
- `guilds` - Read user's guilds (to check server membership)

These are **user scopes**, not bot scopes. If you see "Add to Server", it means Discord thinks you're trying to install a bot.

### 4. When Authorizing

When Discord opens:

**If you see "Add to my apps" and "Add to Server":**

- ✅ Click **"Add to my apps"** - This will authorize the OAuth2 flow
- ❌ Do NOT click "Add to Server" (this installs the bot to a server)

**If you see "Authorize":**

- ✅ Click **"Authorize"** - This will authorize the OAuth2 flow

**Note:** If your Discord application has a Bot configured, Discord will show "Add to my apps" instead of "Authorize". This is normal and "Add to my apps" will still work for OAuth2 authorization.

### 5. Troubleshooting

**If you only see "Add to Server":**

- Your application might be configured as a Bot
- Create a new OAuth2 application or reconfigure the existing one
- Make sure you're in the **OAuth2** tab, not the **Bot** tab

**If authorization doesn't complete (browser stays on Discord page):**

- **This means Discord is NOT redirecting back** - check your Redirect URIs in Discord Developer Portal
- The redirect URI must be EXACTLY: `http://127.0.0.1:9298/callback` (or `http://localhost:9298/callback`)
- Make sure there are NO trailing slashes, NO HTTPS, and it matches EXACTLY
- After clicking "Add to my apps", the browser should automatically redirect to `http://127.0.0.1:9298/callback?code=...`
- If the browser stays on Discord page, Discord isn't configured to redirect - double-check the redirect URI
- Try adding BOTH `http://localhost:9298/callback` AND `http://127.0.0.1:9298/callback` to be safe
- Make sure you clicked **"Save Changes"** in Discord Developer Portal after adding the redirect URI

**If you get "Invalid redirect URI":**

- The redirect URI in Discord must match exactly: `http://localhost:9298/callback`
- No trailing slashes, no HTTPS, must be exactly as shown

### 6. Testing

After configuring:

1. Restart your Flutter application
2. Click "Login with Discord"
3. You should see an authorization screen with an "Authorize" button
4. After clicking "Authorize", you should be redirected back to the app
5. The browser window should show "Authentication Successful" and close automatically
