import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../l10n/app_localizations.dart';

/// Onglet 3 — version minimale.
///
/// Seul le sélecteur de langue est implémenté à cette étape, parce que sans lui
/// on ne peut pas vérifier que l'onglet Loadout est réellement bilingue.
/// L'écran « À propos » complet arrive avec le tour de cet onglet.
class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final languages = ref.watch(availableLanguagesProvider);
    final selected = ref.watch(localeControllerProvider)?.languageCode;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.tabSettings)),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        children: [
          _SectionLabel(l10n.settingsLanguage),
          // La liste vient du manifeste : ajouter une langue au backend la fait
          // apparaître ici sans toucher au code.
          for (final language in languages)
            RadioListTile<String>(
              value: language.code,
              // ignore: deprecated_member_use
              groupValue: selected,
              // ignore: deprecated_member_use
              onChanged: (code) =>
                  ref.read(localeControllerProvider.notifier).select(code),
              title: Text(language.label),
              activeColor: AppColors.accent,
              dense: true,
            ),
          const Divider(height: AppSpacing.xl),
          _SectionLabel(l10n.settingsAbout),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.xs,
              AppSpacing.lg,
              AppSpacing.lg,
            ),
            child: Text(
              l10n.aboutDisclaimer,
              style: const TextStyle(
                fontSize: 12.5,
                height: 1.4,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.sm,
      ),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.1,
          color: AppColors.textMuted,
        ),
      ),
    );
  }
}
