import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../l10n/app_localizations.dart';

/// Le seul écran vide de l'app, et il n'est atteignable qu'en théorie : il
/// faudrait que le contenu embarqué dans l'APK soit lui-même illisible.
/// Il existe pour que ce cas reste un message clair plutôt qu'un écran noir.
class ErrorState extends StatelessWidget {
  const ErrorState({required this.onRetry, super.key});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.satellite_alt_rounded,
              size: 40,
              color: AppColors.unavailable,
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              l10n.errorTitle,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              l10n.errorBody,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            FilledButton(onPressed: onRetry, child: Text(l10n.bannerRetry)),
          ],
        ),
      ),
    );
  }
}
