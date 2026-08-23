import 'dart:convert';

import 'package:http/http.dart' as http;

/// Adaptateur fortnite-api.com pour l'image de la map BR.
///
/// ⚠️ SEUL FICHIER DE L'APP COUPLÉ AU FORMAT DE CE FOURNISSEUR.
///
/// Endpoint et forme de la réponse vérifiés dans le code source du client
/// Python officiel `fortnite-api` 3.3.0 (`fortnite_api/http.py:259` pour la
/// route, `fortnite_api/map.py` pour le modèle) :
///
/// ```
/// data.images.blank  PNG de la map sans les noms de lieux
/// data.images.pois   PNG de la map avec les noms de lieux
/// data.pois[]        { id, name, location: { x, y, z } }
/// ```
///
/// Aucune clé n'est requise, le contenu est public.
///
/// On prend délibérément `blank` : nos marqueurs se posent par-dessus, et les
/// noms de lieux d'Epic parasiteraient la lecture.
///
/// Note importante : `data.pois[].location` est en coordonnées monde Fortnite,
/// ni en pixels ni en pourcentage. Ces POI ne servent donc pas à positionner
/// nos spots — d'où les `x` / `y` en pourcentage stockés dans le contenu.
class MapImageApi {
  MapImageApi({required this.timeout, http.Client? client})
    : _client = client ?? http.Client();

  final Duration timeout;
  final http.Client _client;

  String? _cachedUrl;

  /// URL du PNG de la map, ou `null` si le fournisseur n'a rien d'exploitable.
  ///
  /// Ne lève pas sur une réponse inattendue : l'appelant affiche alors un
  /// écran « map indisponible » plutôt qu'une erreur.
  Future<String?> blankMapUrl() async {
    final cached = _cachedUrl;
    if (cached != null) return cached;

    final response = await _client
        .get(Uri.parse('https://fortnite-api.com/v1/map'))
        .timeout(timeout);

    if (response.statusCode != 200) {
      throw http.ClientException('/v1/map a répondu ${response.statusCode}');
    }

    final url = parseBlankUrl(utf8.decode(response.bodyBytes));
    _cachedUrl = url;
    return url;
  }

  /// Séparé de l'appel réseau pour être testable sans réseau.
  static String? parseBlankUrl(String body) {
    final Object? decoded;
    try {
      decoded = jsonDecode(body);
    } on FormatException {
      return null;
    }
    if (decoded is! Map) return null;

    final data = decoded['data'];
    if (data is! Map) return null;

    final images = data['images'];
    if (images is! Map) return null;

    // `blank` d'abord, `pois` en secours : mieux vaut une map avec les noms
    // d'Epic que pas de map du tout.
    for (final key in ['blank', 'pois']) {
      final value = images[key];
      if (value is String && value.startsWith('http')) return value;
    }
    return null;
  }

  void dispose() => _client.close();
}
