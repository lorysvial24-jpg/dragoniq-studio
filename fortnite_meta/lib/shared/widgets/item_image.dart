import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../data/images/item_image_resolver.dart';
import '../../data/models/item_type.dart';

/// L'image d'un item du loadout — l'élément visuel dominant de l'onglet.
///
/// Trois états, jamais d'exception : chargement, image, placeholder. Une URL
/// qui renvoie 404 bascule sur le placeholder comme si elle n'existait pas.
class ItemImage extends StatelessWidget {
  const ItemImage({
    required this.image,
    required this.type,
    required this.size,
    super.key,
  });

  final ResolvedImage image;
  final ItemType type;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppSpacing.cardRadius - 2),
          // Halo léger derrière l'item : détache les PNG transparents du fond
          // sans ajouter de cadre, qui alourdirait une liste de cinq cartes.
          gradient: RadialGradient(
            colors: [
              AppColors.accent.withValues(alpha: 0.10),
              Colors.transparent,
            ],
            radius: 0.75,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xs),
          child: switch (image) {
            RemoteImage(:final url) => CachedNetworkImage(
              imageUrl: url,
              fit: BoxFit.contain,
              fadeInDuration: const Duration(milliseconds: 180),
              placeholder: (_, _) => _Placeholder(type: type, dimmed: true),
              errorWidget: (_, _, _) => _Placeholder(type: type),
            ),
            NoImage() => _Placeholder(type: type),
          },
        ),
      ),
    );
  }
}

/// Placeholder typé. Une icône vectorielle plutôt qu'un PNG : elle reste nette
/// à toute taille et ne pèse rien dans l'APK.
class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.type, this.dimmed = false});

  final ItemType type;
  final bool dimmed;

  @override
  Widget build(BuildContext context) {
    final icon = switch (type) {
      ItemType.weapon => Icons.my_location_rounded,
      ItemType.mobility => Icons.rocket_launch_rounded,
      ItemType.consumable => Icons.local_drink_rounded,
      ItemType.utility => Icons.build_rounded,
      ItemType.unknown => Icons.inventory_2_rounded,
    };

    return Center(
      child: Icon(
        icon,
        size: 34,
        color: AppColors.unavailable.withValues(alpha: dimmed ? 0.4 : 1),
      ),
    );
  }
}
