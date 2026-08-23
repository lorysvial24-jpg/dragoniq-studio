import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/spot.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/contest_chip.dart';
import '../../shared/widgets/na_text.dart';

/// La fiche d'un spot, ouverte au tap sur un marqueur ou une ligne de liste.
///
/// Un bottom sheet plutôt qu'un écran : la map reste visible derrière, et la
/// fiche se referme d'un glissement du pouce.
Future<void> showSpotSheet(BuildContext context, Spot spot) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: AppColors.surface,
    barrierColor: Colors.black54,
    showDragHandle: true,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
    ),
    builder: (context) => SpotSheet(spot: spot),
  );
}

class SpotSheet extends ConsumerWidget {
  const SpotSheet({required this.spot, super.key});

  final Spot spot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final fallbackCode = ref.watch(fallbackLanguageProvider);

    return SafeArea(
      top: false,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.72,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            0,
            AppSpacing.lg,
            AppSpacing.xl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              NaText(
                spot.name,
                fallbackCode: fallbackCode,
                style: const TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              // Les deux niveaux côte à côte, jamais fusionnés en un seul.
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  ContestChip(
                    context_: l10n.spawnsContestPublic,
                    level: spot.publicContest,
                  ),
                  ContestChip(
                    context_: l10n.spawnsContestTournament,
                    level: spot.tournamentContest,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              _Field(
                label: l10n.spawnsLoot,
                child: NaText(
                  spot.loot,
                  fallbackCode: fallbackCode,
                  style: const TextStyle(
                    fontSize: 14.5,
                    height: 1.45,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              _Field(
                label: l10n.spawnsWhy,
                child: NaText(
                  spot.why,
                  fallbackCode: fallbackCode,
                  style: const TextStyle(
                    fontSize: 14.5,
                    height: 1.45,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 1,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        child,
      ],
    );
  }
}
