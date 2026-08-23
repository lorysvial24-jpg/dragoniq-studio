import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../features/loadout/loadout_page.dart';
import '../features/settings/settings_page.dart';
import '../features/spawns/spawns_page.dart';
import '../l10n/app_localizations.dart';

/// Trois onglets, pas un de plus.
///
/// `IndexedStack` plutôt qu'un rebuild : le zoom de la map et la position de
/// scroll du loadout survivent au changement d'onglet, et le contenu n'est
/// pas rechargé à chaque aller-retour.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);

    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [LoadoutPage(), SpawnsPage(), SettingsPage()],
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (index) => setState(() => _index = index),
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.shield_outlined),
              selectedIcon: const Icon(Icons.shield),
              label: l10n.tabLoadout,
            ),
            NavigationDestination(
              icon: const Icon(Icons.location_on_outlined),
              selectedIcon: const Icon(Icons.location_on),
              label: l10n.tabSpawns,
            ),
            NavigationDestination(
              icon: const Icon(Icons.tune_outlined),
              selectedIcon: const Icon(Icons.tune),
              label: l10n.tabSettings,
            ),
          ],
        ),
      ),
    );
  }
}
