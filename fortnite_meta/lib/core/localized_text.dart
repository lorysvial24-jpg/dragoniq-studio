/// Un texte traduit tel qu'il arrive du backend : `{"en": "...", "fr": "..."}`.
///
/// Règle centrale de l'app : une chaîne vide n'est pas une valeur, c'est un
/// placeholder que l'éditeur n'a pas encore rempli. [resolve] renvoie alors
/// `null`, et c'est à l'UI d'afficher « N/A ». On ne devine jamais, et on ne
/// sert jamais une autre langue en douce.
class LocalizedText {
  const LocalizedText(this._values);

  const LocalizedText.empty() : _values = const {};

  /// Tolérant par construction : une valeur absente, nulle ou d'un type
  /// inattendu donne un texte vide plutôt qu'une exception.
  factory LocalizedText.fromJson(Object? json) {
    if (json is! Map) return const LocalizedText.empty();
    final values = <String, String>{};
    for (final entry in json.entries) {
      final key = entry.key;
      final value = entry.value;
      if (key is String && value is String) values[key] = value;
    }
    return LocalizedText(values);
  }

  final Map<String, String> _values;

  /// Chaîne de repli : langue demandée, puis langue par défaut, puis `null`.
  ///
  /// Le repli s'arrête volontairement à la langue par défaut. Servir du
  /// français à un anglophone parce que c'est le seul texte disponible serait
  /// pire qu'afficher « N/A » : le lecteur ne saurait pas que c'est un défaut
  /// de traduction.
  String? resolve(String languageCode, {required String fallbackCode}) {
    final direct = _nonEmpty(_values[languageCode]);
    if (direct != null) return direct;

    // "pt-BR" doit pouvoir retomber sur "pt" si le backend n'a que le générique.
    final dash = languageCode.indexOf('-');
    if (dash > 0) {
      final base = _nonEmpty(_values[languageCode.substring(0, dash)]);
      if (base != null) return base;
    }

    return _nonEmpty(_values[fallbackCode]);
  }

  /// Les codes langue réellement présents, y compris ceux dont le texte est vide.
  Iterable<String> get codes => _values.keys;

  bool get isEmpty => _values.values.every((value) => value.trim().isEmpty);

  static String? _nonEmpty(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  Map<String, String> toJson() => Map.unmodifiable(_values);

  @override
  String toString() => 'LocalizedText($_values)';
}
