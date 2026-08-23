import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/contest_level.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/contest_chip.dart';

/// Décode la couleur des anneaux de marqueurs.
///
/// Sans elle, un anneau ambre ne veut rien dire. Chaque pastille est doublée
/// de son libellé : la couleur seule ne porte jamais l'information.
class MapLegend extends StatelessWidget {
  const MapLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.spawnsLegend.toUpperCase(),
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.md,
            runSpacing: AppSpacing.sm,
            children: [
              for (final level in ContestLevel.values)
                _Entry(level: level, label: contestLabel(l10n, level)),
            ],
          ),
        ],
      ),
    );
  }
}

class _Entry extends StatelessWidget {
  const _Entry({required this.level, required this.label});

  final ContestLevel level;
  final String label;

  @override
  Widget build(BuildContext context) {
    final color = contestColor(level);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 13,
          height: 13,
          decoration: BoxDecoration(
            color: AppColors.surfaceRaised,
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            fontStyle: level.isKnown ? FontStyle.normal : FontStyle.italic,
            color: level.isKnown
                ? AppColors.textSecondary
                : AppColors.unavailable,
          ),
        ),
      ],
    );
  }
}
