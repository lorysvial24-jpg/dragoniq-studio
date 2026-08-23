import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'app/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final container = ProviderContainer();

  // La langue choisie est restaurée avant le premier build : sans ça, l'app
  // s'afficherait une fraction de seconde dans la langue du système avant de
  // basculer.
  await container.read(localeControllerProvider.notifier).restore();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const FortniteMetaApp(),
    ),
  );
}
