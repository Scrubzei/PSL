// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:plutonium_anticheat/core/config/config_service.dart';
import 'package:plutonium_anticheat/services/reporting/discord_reporter.dart';
import 'package:plutonium_anticheat/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    final configService = ConfigService();
    final discordReporter = DiscordReporter();

    await tester.pumpWidget(
      PlutoniumAntiCheatApp(
        configService: configService,
        discordReporter: discordReporter,
      ),
    );

    // Verify that the app title is displayed
    expect(find.text('1v1LB Anti-Cheat'), findsOneWidget);
  });
}
