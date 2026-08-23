import 'dart:convert';

import '../../core/json.dart';
import 'loadout.dart';
import 'season.dart';
import 'spot.dart';

/// Levée quand le document est inexploitable dans son ensemble — pas quand un
/// champ isolé manque. Elle déclenche le repli sur le cache, elle ne remonte
/// jamais jusqu'à l'UI.
class ContentFormatException implements Exception {
  const ContentFormatException(this.message);

  final String message;

  @override
  String toString() => 'ContentFormatException: $message';
}

/// D'où vient le contenu actuellement affiché. Détermine le bandeau.
enum ContentOrigin { network, cache, bundled }

/// Comment obtenir l'image de la map.
enum MapImageSource { api, url }

class MapConfig {
  const MapConfig({
    required this.source,
    required this.imageUrl,
    required this.attribution,
  });

  factory MapConfig.fromJson(Object? json) {
    final map = asMap(json);
    final imageUrl = asOptionalString(map['image_url']);
    final declared = asString(map['source'], fallback: 'api');
    return MapConfig(
      // Une source « url » sans URL est incohérente : on repasse sur l'API
      // plutôt que de se retrouver sans image du tout.
      source: declared == 'url' && imageUrl != null
          ? MapImageSource.url
          : MapImageSource.api,
      imageUrl: imageUrl,
      attribution: asString(map['attribution']),
    );
  }

  final MapImageSource source;
  final String? imageUrl;
  final String attribution;
}

/// Tout le contenu éditorial, dans toutes les langues à la fois.
///
/// Les ~15 Ko tiennent largement en mémoire, et embarquer toutes les langues
/// rend le changement de langue instantané et disponible hors ligne.
class ContentBundle {
  const ContentBundle({
    required this.schemaVersion,
    required this.contentVersion,
    required this.season,
    required this.map,
    required this.loadout,
    required this.spots,
  });

  /// Version de schéma que cette build sait lire. Un document plus récent est
  /// refusé plutôt que lu de travers.
  static const supportedSchemaVersion = 1;

  factory ContentBundle.fromJsonString(String source) {
    final Object? decoded;
    try {
      decoded = jsonDecode(source);
    } on FormatException catch (error) {
      throw ContentFormatException('JSON illisible : ${error.message}');
    }
    return ContentBundle.fromJson(decoded);
  }

  factory ContentBundle.fromJson(Object? json) {
    if (json is! Map) {
      throw const ContentFormatException(
        'la racine du document n\'est pas un objet',
      );
    }
    final map = json.cast<String, Object?>();

    final schemaVersion = asInt(
      map['schema_version'],
      fallback: supportedSchemaVersion,
    );
    if (schemaVersion > supportedSchemaVersion) {
      throw ContentFormatException(
        'schema_version $schemaVersion non supportée par cette version de l\'app '
        '(max $supportedSchemaVersion)',
      );
    }

    final spots = asList(map['spots']).map(Spot.fromJson).toList();
    final loadout = Loadout.fromJson(map['loadout']);

    // Un document sans aucun contenu ne vaut pas mieux que pas de document :
    // on préfère garder le cache précédent.
    if (spots.isEmpty && loadout.slots.isEmpty) {
      throw const ContentFormatException('ni loadout ni spots exploitables');
    }

    return ContentBundle(
      schemaVersion: schemaVersion,
      contentVersion: asInt(map['content_version']),
      season: Season.fromJson(map['season']),
      map: MapConfig.fromJson(map['map']),
      loadout: loadout,
      spots: List.unmodifiable(spots),
    );
  }

  final int schemaVersion;
  final int contentVersion;
  final Season season;
  final MapConfig map;
  final Loadout loadout;
  final List<Spot> spots;
}

/// Le contenu servi à l'UI, avec sa provenance et l'échec éventuel de la
/// dernière tentative de rafraîchissement.
///
/// [refreshFailed] à `true` avec [origin] valant [ContentOrigin.cache] est le
/// cas « hors ligne » : on affiche le contenu et un bandeau discret.
class ContentSnapshot {
  const ContentSnapshot({
    required this.bundle,
    required this.origin,
    required this.fetchedAt,
    this.refreshFailed = false,
  });

  final ContentBundle bundle;
  final ContentOrigin origin;

  /// Date du dernier téléchargement réussi. `null` pour le contenu embarqué.
  final DateTime? fetchedAt;

  final bool refreshFailed;

  /// Vrai dès que l'utilisateur mérite d'être prévenu que ce n'est pas frais.
  bool get isStale => origin != ContentOrigin.network || refreshFailed;
}
