/// Un catalogue d'icônes d'items de gameplay.
///
/// Interface volontairement minuscule : c'est elle que le reste de l'app
/// connaît, jamais le fournisseur. Changer de fournisseur d'images revient à
/// écrire une autre implémentation.
abstract interface class LootIconSource {
  /// Icônes indexées par nom anglais normalisé (voir `normalizeItemName`).
  Future<Map<String, String>> iconUrlsByName();

  /// Icônes indexées par identifiant du fournisseur.
  Future<Map<String, String>> iconUrlsById();
}

/// Réduit un nom d'item à une clé de comparaison stable.
///
/// « Enhanced 8-Bit Shotgun », « enhanced 8 bit shotgun » et
/// « Enhanced 8-Bit  Shotgun » donnent la même clé. La casse, les accents, les
/// tirets et les espaces multiples ne doivent pas faire rater un match.
String normalizeItemName(String value) {
  const accents = 'àáâäãåèéêëìíîïòóôöõùúûüçñ';
  const plain = 'aaaaaaeeeeiiiiooooouuuucn';

  final buffer = StringBuffer();
  for (final rune in value.toLowerCase().runes) {
    final char = String.fromCharCode(rune);
    final accentIndex = accents.indexOf(char);
    final normalized = accentIndex >= 0 ? plain[accentIndex] : char;
    // On ne garde que l'alphanumérique : la ponctuation varie d'une source à
    // l'autre pour un même item.
    if (RegExp(r'[a-z0-9]').hasMatch(normalized)) buffer.write(normalized);
  }
  return buffer.toString();
}
