import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/contest_level.dart';
import '../../l10n/app_localizations.dart';

/// Couleur d'un niveau de contestation.
///
/// La couleur ne porte jamais l'information seule : chaque puce affiche aussi
/// son libellé. Vert et rouge seuls seraient illisibles pour un daltonien.
Color contestColor(ContestLevel level) => switch (level) {
  ContestLevel.calm => AppColors.contestCalm,
  ContestLevel.medium => AppColors.contestMedium,
  ContestLevel.hot => AppColors.contestHot,
  ContestLevel.unknown => AppColors.unavailable,
};

String contestLabel(AppL10n l10n, ContestLevel level) => switch (level) {
  ContestLevel.calm => l10n.contestCalm,
  ContestLevel.medium => l10n.contestMedium,
  ContestLevel.hot => l10n.contestHot,
  ContestLevel.unknown => l10n.notAvailable,
};

/// Une contestation, avec le contexte auquel elle s'applique.
///
/// Les deux contextes sont toujours affichés côte à côte : un spot calme en
/// partie publique peut être brûlant en tournoi, et c'est exactement
/// l'information qu'un joueur compétitif vient chercher.
class ContestChip extends StatelessWidget {
  const ContestChip({
    required this.context_,
    required this.level,
    this.compact = false,
    super.key,
  });

  final String context_;
  final ContestLevel level;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    final color = contestColor(level);
    final known = level.isKnown;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 7 : 9,
        vertical: compact ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: known ? 0.13 : 0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: known ? 0.4 : 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            context_.toUpperCase(),
            style: TextStyle(
              fontSize: compact ? 9 : 9.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
              color: AppColors.textMuted,
            ),
          ),
          SizedBox(width: compact ? 5 : 6),
          Text(
            contestLabel(l10n, level),
            style: TextStyle(
              fontSize: compact ? 11 : 12,
              fontWeight: FontWeight.w700,
              fontStyle: known ? FontStyle.normal : FontStyle.italic,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
