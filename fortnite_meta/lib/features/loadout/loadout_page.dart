import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../app/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/images/item_image_resolver.dart';
import '../../data/models/content_bundle.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/stale_content_banner.dart';
import 'loadout_slot_card.dart';

/// Onglet 1 — le stuff méta de la saison.
class LoadoutPage extends ConsumerWidget {
  const LoadoutPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final content = ref.watch(contentProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tabLoadout),
        actions: [
          // La saison vient du backend : rien ici n'est figé pour C7S4.
          content.maybeWhen(
            data: (snapshot) => _SeasonChip(snapshot: snapshot),
            orElse: () => const SizedBox.shrink(),
          ),
          const SizedBox(width: AppSpacing.lg),
        ],
      ),
      body: content.when(
        loading: () => const Center(
          child: CircularProgressIndicator(
            color: AppColors.accent,
            strokeWidth: 2.5,
          ),
        ),
        // N'arrive que si même le contenu embarqué est illisible.
        error: (_, _) =>
            ErrorState(onRetry: () => ref.invalidate(contentProvider)),
        data: (snapshot) => _LoadoutBody(snapshot: snapshot),
      ),
    );
  }
}

class _LoadoutBody extends ConsumerWidget {
  const _LoadoutBody({required this.snapshot});

  final ContentSnapshot snapshot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final fallbackCode = ref.watch(fallbackLanguageProvider);
    final slots = snapshot.bundle.loadout.slots;

    // Le résolveur peut encore être en vol : on affiche les cartes tout de
    // suite avec leur placeholder plutôt que de bloquer l'onglet sur une API
    // d'images. Le texte est le contenu, l'image est un enrichissement.
    final resolver =
        ref.watch(imageResolverProvider).asData?.value ?? ItemImageResolver();

    return Column(
      children: [
        StaleContentBanner(
          snapshot: snapshot,
          onRetry: () => ref.invalidate(contentProvider),
        ),
        Expanded(
          child: slots.isEmpty
              ? Center(
                  child: Text(
                    l10n.loadoutEmpty,
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
                )
              : RefreshIndicator(
                  color: AppColors.accent,
                  backgroundColor: AppColors.surfaceRaised,
                  onRefresh: () async {
                    ref.invalidate(contentProvider);
                    await ref.read(contentProvider.future);
                  },
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      AppSpacing.md,
                      AppSpacing.lg,
                      AppSpacing.xl,
                    ),
                    itemCount: slots.length + 1,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.md),
                    itemBuilder: (context, index) {
                      if (index == slots.length) {
                        return _UpdatedFooter(snapshot: snapshot);
                      }
                      final slot = slots[index];
                      return LoadoutSlotCard(
                        slot: slot,
                        image: resolver.resolve(slot),
                        fallbackCode: fallbackCode,
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}

/// « C7 S4 · Override ». Le nom de saison est traduit s'il l'est côté backend.
class _SeasonChip extends ConsumerWidget {
  const _SeasonChip({required this.snapshot});

  final ContentSnapshot snapshot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final season = snapshot.bundle.season;
    final languageCode = Localizations.localeOf(context).languageCode;
    final name = season.name.resolve(
      languageCode,
      fallbackCode: ref.watch(fallbackLanguageProvider),
    );

    final label = l10n.seasonChip(season.chapter, season.number);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 5,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        borderRadius: BorderRadius.circular(7),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: AppColors.accent,
              letterSpacing: 0.4,
            ),
          ),
          if (name != null) ...[
            const SizedBox(width: AppSpacing.xs),
            const Text(
              '·',
              style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
            ),
            const SizedBox(width: AppSpacing.xs),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 110),
              child: Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Date de publication du loadout. Un joueur doit pouvoir juger si le méta
/// affiché date d'avant le dernier patch.
class _UpdatedFooter extends StatelessWidget {
  const _UpdatedFooter({required this.snapshot});

  final ContentSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final updatedAt = snapshot.bundle.loadout.updatedAt;
    if (updatedAt == null) return const SizedBox.shrink();

    final l10n = AppL10n.of(context);
    final formatted = DateFormat.yMMMd(
      Localizations.localeOf(context).toString(),
    ).format(updatedAt);

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: Center(
        child: Text(
          l10n.loadoutUpdatedOn(formatted),
          style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
        ),
      ),
    );
  }
}
