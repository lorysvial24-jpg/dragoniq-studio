import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/content_bundle.dart';
import '../../l10n/app_localizations.dart';

/// Bandeau discret quand le contenu affiché n'est pas frais.
///
/// Volontairement une bande fine et sourde, pas un dialogue : le contenu reste
/// utilisable, et un joueur qui ouvre l'app entre deux parties n'a pas à
/// écarter une alerte pour lire son loadout.
class StaleContentBanner extends StatelessWidget {
  const StaleContentBanner({
    required this.snapshot,
    required this.onRetry,
    super.key,
  });

  final ContentSnapshot snapshot;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (!snapshot.isStale) return const SizedBox.shrink();

    final l10n = AppL10n.of(context);
    final fetchedAt = snapshot.fetchedAt;

    final message = switch (snapshot.origin) {
      ContentOrigin.bundled => l10n.bannerBundled,
      _ when fetchedAt != null => l10n.bannerStaleCache(
        DateFormat.yMMMd(Localizations.localeOf(context).toString())
            .format(fetchedAt),
      ),
      _ => l10n.bannerOfflineCache,
    };

    return Material(
      color: AppColors.surfaceRaised,
      child: InkWell(
        onTap: onRetry,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm,
          ),
          child: Row(
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                size: 15,
                color: AppColors.textMuted,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                l10n.bannerRetry,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
