import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/images/item_image_resolver.dart';
import '../../data/models/item_type.dart';
import '../../data/models/loadout.dart';
import '../../l10n/app_localizations.dart';
import '../../shared/widgets/item_image.dart';
import '../../shared/widgets/na_text.dart';

/// Une carte d'item : image dominante à gauche, texte à droite.
///
/// L'image occupe 96 px sur une carte d'environ 124 : c'est l'élément qu'on
/// reconnaît d'un coup d'œil, avant même de lire le nom. Aucune mention de
/// rareté, ni couleur, ni libellé, ni bordure.
class LoadoutSlotCard extends StatelessWidget {
  const LoadoutSlotCard({
    required this.slot,
    required this.image,
    required this.fallbackCode,
    super.key,
  });

  static const _imageSize = 96.0;

  final LoadoutSlot slot;
  final ResolvedImage image;
  final String fallbackCode;

  @override
  Widget build(BuildContext context) {
    final languageCode = Localizations.localeOf(context).languageCode;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        // Centré plutôt qu'aligné en haut : la carte reste équilibrée qu'un
        // « pourquoi » tienne sur une ligne ou sur trois.
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          ItemImage(image: image, type: slot.type, size: _imageSize),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    _SlotBadge(number: slot.slot),
                    const SizedBox(width: AppSpacing.sm),
                    Flexible(child: _TypeLabel(type: slot.type)),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  slot.label(languageCode, fallbackCode: fallbackCode),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                NaText(
                  slot.why,
                  fallbackCode: fallbackCode,
                  maxLines: 3,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.35,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Le numéro d'emplacement, tel qu'il apparaît dans la barre d'inventaire.
class _SlotBadge extends StatelessWidget {
  const _SlotBadge({required this.number});

  final int number;

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);

    return Container(
      width: 20,
      height: 20,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.accent.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Text(
        l10n.loadoutSlotBadge(number),
        style: const TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
          color: AppColors.accent,
        ),
      ),
    );
  }
}

class _TypeLabel extends StatelessWidget {
  const _TypeLabel({required this.type});

  final ItemType type;

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    final label = switch (type) {
      ItemType.weapon => l10n.itemTypeWeapon,
      ItemType.mobility => l10n.itemTypeMobility,
      ItemType.consumable => l10n.itemTypeConsumable,
      ItemType.utility => l10n.itemTypeUtility,
      ItemType.unknown => l10n.itemTypeUnknown,
    };

    return Text(
      label.toUpperCase(),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(
        fontSize: 10.5,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.9,
        color: AppColors.textMuted,
      ),
    );
  }
}
