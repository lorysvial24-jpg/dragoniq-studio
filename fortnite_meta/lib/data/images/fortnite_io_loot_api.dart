import 'dart:convert';

import 'package:http/http.dart' as http;

import 'loot_icon_source.dart';

/// Adaptateur fortniteapi.io.
///
/// ⚠️ SEUL FICHIER DE L'APP COUPLÉ AU FORMAT DE CE FOURNISSEUR.
///
/// Endpoint et authentification sont vérifiés dans le code source du client
/// officiel `fortnite-api-io` (`lib/endpoints.js:51` pour l'URL,
/// `lib/base-client.js:48` pour le header `Authorization` sans préfixe
/// `Bearer`).
///
/// En revanche le NOM EXACT DES CHAMPS de la réponse n'a pas pu être observé :
/// le domaine est injoignable depuis l'environnement de développement. D'où
/// [_rootKeys] et [_imagePaths] ci-dessous : une liste de candidats essayés
/// dans l'ordre. Dès que la vraie réponse est disponible, il suffit de réduire
/// ces deux listes au bon chemin — rien d'autre dans l'app ne bouge.
///
/// L'endpoint renvoie tout le loot en un appel ; le rapprochement avec le
/// loadout se fait ensuite en local, donc hors ligne et sans quota.
class FortniteIoLootApi implements LootIconSource {
  FortniteIoLootApi({
    required this.apiKey,
    required this.timeout,
    this.language = 'en',
    http.Client? client,
  }) : _client = client ?? http.Client();

  /// Clés sous lesquelles la liste d'items peut se trouver, dans l'ordre d'essai.
  static const _rootKeys = ['weapons', 'items', 'loot', 'data'];

  /// Chemins vers l'URL de l'icône, dans l'ordre de préférence.
  /// Les PNG transparents sont attendus sur les entrées `icon`.
  static const _imagePaths = [
    ['images', 'icon'],
    ['images', 'background'],
    ['images', 'full'],
    ['image'],
    ['icon'],
  ];

  final String apiKey;
  final Duration timeout;
  final String language;
  final http.Client _client;

  Map<String, String>? _byName;
  Map<String, String>? _byId;

  @override
  Future<Map<String, String>> iconUrlsByName() async {
    await _ensureLoaded();
    return _byName ?? const {};
  }

  @override
  Future<Map<String, String>> iconUrlsById() async {
    await _ensureLoaded();
    return _byId ?? const {};
  }

  Future<void> _ensureLoaded() async {
    if (_byName != null) return;

    final uri = Uri.parse('https://fortniteapi.io/v1/loot/list?lang=$language');
    final response = await _client
        .get(uri, headers: {'Authorization': apiKey})
        .timeout(timeout);

    if (response.statusCode != 200) {
      throw http.ClientException('loot/list a répondu ${response.statusCode}');
    }

    parseInto(utf8.decode(response.bodyBytes));
  }

  /// Séparé de l'appel réseau pour être testable sans réseau.
  void parseInto(String body) {
    final decoded = jsonDecode(body);
    if (decoded is! Map) throw const FormatException('racine inattendue');

    final entries = _findEntries(decoded.cast<String, Object?>());
    final byName = <String, String>{};
    final byId = <String, String>{};

    for (final entry in entries) {
      if (entry is! Map) continue;
      final item = entry.cast<String, Object?>();

      final imageUrl = _findImage(item);
      if (imageUrl == null) continue;

      final name = item['name'];
      if (name is String && name.trim().isNotEmpty) {
        // `putIfAbsent` : à noms égaux, la première occurrence gagne. Les
        // variantes mythiques réutilisent souvent le nom de base.
        byName.putIfAbsent(normalizeItemName(name), () => imageUrl);
      }

      final id = item['id'];
      if (id is String && id.trim().isNotEmpty) {
        byId.putIfAbsent(id, () => imageUrl);
      }
    }

    _byName = byName;
    _byId = byId;
  }

  List<Object?> _findEntries(Map<String, Object?> root) {
    for (final key in _rootKeys) {
      final value = root[key];
      if (value is List && value.isNotEmpty) return value;
    }
    // Dernier recours : la première liste non vide du document.
    for (final value in root.values) {
      if (value is List && value.isNotEmpty) return value;
    }
    return const [];
  }

  String? _findImage(Map<String, Object?> item) {
    for (final path in _imagePaths) {
      Object? current = item;
      for (final segment in path) {
        if (current is! Map) {
          current = null;
          break;
        }
        current = current[segment];
      }
      if (current is String && current.startsWith('http')) return current;
    }
    return null;
  }

  void dispose() => _client.close();
}
