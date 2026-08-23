/// Niveau de contestation d'un spot.
///
/// [unknown] n'est pas un synonyme de [calm]. Le backend peut légitimement ne
/// pas savoir, et pour du tournoi confondre « je ne sais pas » avec « calme »
/// coûte une partie. L'UI affiche « N/A » et les filtres ne masquent jamais un
/// spot sur cette base.
enum ContestLevel {
  calm('calm'),
  medium('medium'),
  hot('hot'),
  unknown(null);

  const ContestLevel(this.code);

  final String? code;

  bool get isKnown => this != ContestLevel.unknown;

  /// Une valeur absente, nulle ou inconnue donne [unknown] : un code que le
  /// backend inventerait ne doit pas faire tomber l'écran.
  static ContestLevel parse(Object? value) {
    if (value is! String) return ContestLevel.unknown;
    final normalized = value.trim().toLowerCase();
    for (final level in ContestLevel.values) {
      if (level.code == normalized) return level;
    }
    return ContestLevel.unknown;
  }
}
