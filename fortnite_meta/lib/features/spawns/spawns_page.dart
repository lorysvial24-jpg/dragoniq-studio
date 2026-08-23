import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../l10n/app_localizations.dart';

/// Onglet 2 — placeholder assumé.
///
/// La map, les marqueurs en pourcentage, la fiche de spot et la vue liste
/// filtrable arrivent au tour de cet onglet. Les modèles (`Spot`,
/// `ContestLevel`) et les données sont déjà en place.
class SpawnsPage extends StatelessWidget {
  const SpawnsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.tabSpawns)),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.map_outlined, size: 40, color: AppColors.unavailable),
              SizedBox(height: AppSpacing.md),
              Text(
                'Prochaine étape',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
