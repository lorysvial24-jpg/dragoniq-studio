import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/contest_level.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/contest_chip.dart';
import 'spawns_controller.dart';

/// Les deux filtres de contestation, sur deux lignes distinctes.
///
/// Séparés parce qu'ils le sont dans les données : un spot calme en partie
/// publique peut être brûlant en tournoi. Les fusionner en un seul filtre
/// perdrait précisément l'information qui intéresse un joueur compétitif.
class SpotFilters extends ConsumerWidget {
  const SpotFilters({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final filter = ref.watch(spotFilterProvider);
    final controller = ref.read(spotFilterProvider.notifier);

    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.md,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Row(
            label: l10n.spawnsContestPublic,
            selected: filter.public,
            onSelect: controller.setPublic,
          ),
          const SizedBox(height: AppSpacing.sm),
          _Row(
            label: l10n.spawnsContestTournament,
            selected: filter.tournament,
            onSelect: controller.setTournament,
          ),
          if (filter.isActive) ...[
            const SizedBox(height: AppSpacing.xs),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: controller.clear,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.accent,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                  ),
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  l10n.spawnsFilterClear,
                  style: const TextStyle(fontSize: 12.5),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.label,
    required this.selected,
    required this.onSelect,
  });

  final String label;
  final ContestLevel? selected;
  final ValueChanged<ContestLevel?> onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);

    return Row(
      children: [
        SizedBox(
          width: 62,
          child: Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: AppColors.textMuted,
            ),
          ),
        ),
        Expanded(
          child: Wrap(
            spacing: AppSpacing.xs + 2,
            children: [
              _Option(
                label: l10n.spawnsFilterAny,
                color: AppColors.textSecondary,
                active: selected == null,
                onTap: () => onSelect(null),
              ),
              for (final level in [
                ContestLevel.calm,
                ContestLevel.medium,
                ContestLevel.hot,
              ])
                _Option(
                  label: contestLabel(l10n, level),
                  color: contestColor(level),
                  active: selected == level,
                  // Retaper un filtre déjà actif le retire : plus rapide que
                  // de viser « Indifférent ».
                  onTap: () => onSelect(selected == level ? null : level),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Option extends StatelessWidget {
  const _Option({
    required this.label,
    required this.color,
    required this.active,
    required this.onTap,
  });

  final String label;
  final Color color;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? color.withValues(alpha: 0.16) : Colors.transparent,
      borderRadius: BorderRadius.circular(6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Container(
          // Pas d'`alignment` ici : dans un Wrap, un Container aligné s'étire
          // jusqu'à la contrainte maximale et chaque option prendrait toute la
          // largeur. Le padding suffit à dimensionner la puce sur son texte.
          constraints: const BoxConstraints(minHeight: 30),
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: active ? color.withValues(alpha: 0.55) : AppColors.border,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: active ? FontWeight.w700 : FontWeight.w500,
              color: active ? color : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
