import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/content_bundle.dart';
import '../../data/models/spot.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/error_state.dart';
import '../../shared/widgets/stale_content_banner.dart';
import 'map_legend.dart';
import 'map_view.dart';
import 'spawns_controller.dart';
import 'spot_filters.dart';
import 'spot_sheet.dart';
import 'spots_list_view.dart';

/// Onglet 2 — où se poser pour se stuff.
class SpawnsPage extends ConsumerWidget {
  const SpawnsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final content = ref.watch(contentProvider);
    final view = ref.watch(spawnsViewProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tabSpawns),
        actions: [
          _ViewToggle(current: view),
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
        error: (_, _) =>
            ErrorState(onRetry: () => ref.invalidate(contentProvider)),
        data: (snapshot) => _SpawnsBody(snapshot: snapshot, view: view),
      ),
    );
  }
}

class _SpawnsBody extends ConsumerWidget {
  const _SpawnsBody({required this.snapshot, required this.view});

  final ContentSnapshot snapshot;
  final SpawnsView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allSpots = snapshot.bundle.spots;
    final spots = ref.watch(filteredSpotsProvider);

    return Column(
      children: [
        StaleContentBanner(
          snapshot: snapshot,
          onRetry: () => ref.invalidate(contentProvider),
        ),
        // Les filtres n'ont de sens que sur la liste : sur la map, masquer des
        // marqueurs enlèverait le repère spatial qu'on vient y chercher.
        if (view == SpawnsView.list) const SpotFilters(),
        Expanded(
          child: switch (view) {
            SpawnsView.map => _MapPane(spots: allSpots),
            SpawnsView.list => SpotsListView(spots: spots, allSpots: allSpots),
          },
        ),
      ],
    );
  }
}

class _MapPane extends ConsumerWidget {
  const _MapPane({required this.spots});

  final List<Spot> spots;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final mapUrl = ref.watch(mapImageUrlProvider);

    return mapUrl.when(
      loading: () => const Center(
        child: CircularProgressIndicator(
          color: AppColors.accent,
          strokeWidth: 2.5,
        ),
      ),
      // Le fournisseur d'images de map n'est pas critique : sans lui on invite
      // à passer en liste plutôt que d'afficher une erreur.
      error: (_, _) => _NoMap(message: l10n.spawnsMapUnavailable),
      data: (url) => url == null
          ? _NoMap(message: l10n.spawnsMapUnavailable)
          : Column(
              children: [
                Expanded(
                  child: MapView(
                    imageUrl: url,
                    spots: spots,
                    onSpotTap: (spot) => showSpotSheet(context, spot),
                  ),
                ),
                const MapLegend(),
              ],
            ),
    );
  }
}

class _NoMap extends ConsumerWidget {
  const _NoMap({required this.message});

  final String message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.map_outlined,
              size: 38,
              color: AppColors.unavailable,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            FilledButton.tonal(
              onPressed: () =>
                  ref.read(spawnsViewProvider.notifier).select(SpawnsView.list),
              child: Text(l10n.spawnsListTab),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bascule map / liste, dans la barre du haut.
class _ViewToggle extends ConsumerWidget {
  const _ViewToggle({required this.current});

  final SpawnsView current;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ToggleButton(
            icon: Icons.map_outlined,
            label: l10n.spawnsMapTab,
            active: current == SpawnsView.map,
            onTap: () =>
                ref.read(spawnsViewProvider.notifier).select(SpawnsView.map),
          ),
          _ToggleButton(
            icon: Icons.format_list_bulleted_rounded,
            label: l10n.spawnsListTab,
            active: current == SpawnsView.list,
            onTap: () =>
                ref.read(spawnsViewProvider.notifier).select(SpawnsView.list),
          ),
        ],
      ),
    );
  }
}

class _ToggleButton extends StatelessWidget {
  const _ToggleButton({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: active,
      button: true,
      child: Material(
        color: active
            ? AppColors.accent.withValues(alpha: 0.16)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(6),
          child: Container(
            constraints: const BoxConstraints(minHeight: 30),
            padding: const EdgeInsets.symmetric(horizontal: 9),
            alignment: Alignment.center,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 14,
                  color: active ? AppColors.accent : AppColors.textSecondary,
                ),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                    color: active ? AppColors.accent : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
