import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/spot.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/contest_chip.dart';
import '../../shared/widgets/na_text.dart';
import 'spot_sheet.dart';

/// La vue liste, alternative à la map.
///
/// Utile quand on compare des spots plutôt qu'on ne les situe, et seule vue
/// disponible si l'image de la map ne se charge pas.
class SpotsListView extends ConsumerWidget {
  const SpotsListView({required this.spots, required this.allSpots, super.key});

  final List<Spot> spots;

  /// Sert à numéroter les spots comme sur la map, indépendamment du filtrage.
  final List<Spot> allSpots;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);

    if (spots.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Text(
            allSpots.isEmpty ? l10n.spawnsEmpty : l10n.spawnsNoMatch,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.xl,
      ),
      itemCount: spots.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final spot = spots[index];
        return _SpotTile(
          spot: spot,
          number: allSpots.indexWhere((s) => s.id == spot.id) + 1,
        );
      },
    );
  }
}

class _SpotTile extends ConsumerWidget {
  const _SpotTile({required this.spot, required this.number});

  final Spot spot;
  final int number;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final fallbackCode = ref.watch(fallbackLanguageProvider);

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
      child: InkWell(
        onTap: () => showSpotSheet(context, spot),
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            border: Border.all(color: AppColors.border),
          ),
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceRaised,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: contestColor(spot.tournamentContest),
                        width: 1.5,
                      ),
                    ),
                    child: Text(
                      '$number',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: NaText(
                      spot.name,
                      fallbackCode: fallbackCode,
                      maxLines: 1,
                      style: const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.xs + 2,
                runSpacing: AppSpacing.xs + 2,
                children: [
                  ContestChip(
                    context_: l10n.spawnsContestPublic,
                    level: spot.publicContest,
                    compact: true,
                  ),
                  ContestChip(
                    context_: l10n.spawnsContestTournament,
                    level: spot.tournamentContest,
                    compact: true,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              NaText(
                spot.loot,
                fallbackCode: fallbackCode,
                maxLines: 2,
                style: const TextStyle(
                  fontSize: 12.5,
                  height: 1.35,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
