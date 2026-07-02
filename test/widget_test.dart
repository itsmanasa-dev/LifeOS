import 'package:flutter_test/flutter_test.dart';

import 'package:lifeos/main.dart';

void main() {
  testWidgets('renders the splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.text('LifeOS'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
  });
}
