/// Lecteurs JSON défensifs.
///
/// Le contenu vient d'un fichier édité à la main chaque semaine. Une virgule
/// mal placée est rattrapée par la CI, mais un `"x": "42"` au lieu de `42` ne
/// l'est pas forcément. Aucune de ces fonctions ne lève : au pire elles
/// rendent la valeur par défaut, et le champ finit en « N/A » à l'écran.
library;

Map<String, Object?> asMap(Object? value) =>
    value is Map ? value.cast<String, Object?>() : const {};

List<Object?> asList(Object? value) => value is List ? value : const [];

String asString(Object? value, {String fallback = ''}) =>
    value is String ? value : fallback;

/// Renvoie `null` pour une chaîne absente ou vide, afin que l'appelant
/// distingue « pas renseigné » de « chaîne vide ».
String? asOptionalString(Object? value) {
  if (value is! String) return null;
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

int asInt(Object? value, {int fallback = 0}) => switch (value) {
  final int v => v,
  final double v => v.round(),
  final String v => int.tryParse(v) ?? fallback,
  _ => fallback,
};

double asDouble(Object? value, {double fallback = 0}) => switch (value) {
  final double v => v,
  final int v => v.toDouble(),
  final String v => double.tryParse(v) ?? fallback,
  _ => fallback,
};

/// Ramène une coordonnée dans [0, 100]. Un marqueur hors écran serait
/// invisible et donc indébogable ; mieux vaut le coller au bord.
double asPercent(Object? value) => asDouble(value).clamp(0, 100).toDouble();

DateTime? asDate(Object? value) {
  final raw = asOptionalString(value);
  return raw == null ? null : DateTime.tryParse(raw);
}
