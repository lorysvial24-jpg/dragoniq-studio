import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/spot.dart';
import '../../shared/widgets/contest_chip.dart';

/// Un marqueur posé sur la map.
///
/// Le disque porte le numéro du spot ; l'anneau reprend la couleur de la
/// contestation en tournoi — l'information qu'un joueur compétitif regarde en
/// premier. Un niveau inconnu donne un anneau neutre, jamais vert : « je ne
/// sais pas » ne doit pas se lire comme « c'est calme ».
class SpotMarker extends StatelessWidget {
  const SpotMarker({
    required this.spot,
    required this.index,
    required this.selected,
    required this.onTap,
    super.key,
  });

  /// Diamètre du disque. La zone tactile est plus large, voir [_hitPadding].
  static const diameter = 26.0;
  static const _hitPadding = 9.0;

  final Spot spot;
  final int index;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ring = contestColor(spot.tournamentContest);

    return Semantics(
      button: true,
      label: 'Spot $index',
      child: GestureDetector(
        onTap: onTap,
        // Le padding transparent porte la zone tactile à 44 px sans grossir le
        // disque : la map reste lisible et le pouce touche juste.
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.all(_hitPadding),
          child: Container(
            width: diameter,
            height: diameter,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? AppColors.accent : AppColors.surfaceRaised,
              shape: BoxShape.circle,
              border: Border.all(
                color: selected ? AppColors.accent : ring,
                width: 2,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x99000000),
                  blurRadius: 6,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Text(
              '$index',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: selected ? AppColors.background : AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
