import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:fortnite_meta/data/models/content_bundle.dart';
import 'package:fortnite_meta/data/models/contest_level.dart';
import 'package:fortnite_meta/data/models/item_type.dart';

/// Le contenu réel du backend, tel qu'il est publié aujourd'hui.
const _minimal = '''
{
  "schema_version": 1,
  "content_version": 1,
  "season": { "code": "c7s4", "chapter": 7, "season": 4,
              "name": { "en": "Override", "fr": "Système Hacké" },
              "starts_at": "2026-08-20", "ends_at": "2026-11-01" },
  "map": { "source": "api", "image_url": null, "attribution": "fortnite-api.com" },
  "loadout": { "updated_at": "2026-08-23", "note": { "en": "", "fr": "" },
    "slots": [ { "slot": 1, "name": "Tactical Pistol",
                 "display_name": { "en": "", "fr": "" }, "type": "weapon",
                 "why": { "en": "", "fr": "" }, "image_url": null, "api_id": null } ] },
  "spots": [ { "id": 1, "name": { "en": "", "fr": "" }, "x": 42, "y": 44,
               "contest": { "public": null, "tournament": null },
               "loot": { "en": "~12 chests", "fr": "~12 coffres" },
               "why": { "en": "", "fr": "" } } ]
}
''';

void main() {
  group('ContentBundle', () {
    test('lit le contenu publié', () {
      final bundle = ContentBundle.fromJsonString(_minimal);

      expect(bundle.season.chapter, 7);
      expect(bundle.season.number, 4);
      expect(bundle.loadout.slots.single.type, ItemType.weapon);
      expect(bundle.spots.single.x, 42);
      expect(bundle.map.source, MapImageSource.api);
    });

    test('un contest absent donne unknown, pas calm', () {
      final bundle = ContentBundle.fromJsonString(_minimal);
      expect(bundle.spots.single.publicContest, ContestLevel.unknown);
      expect(bundle.spots.single.publicContest.isKnown, isFalse);
    });

    test(
      'un niveau de contestation inconnu ne fait pas tomber le document',
      () {
        final json = jsonDecode(_minimal) as Map<String, Object?>;
        (((json['spots']! as List).first as Map)['contest'] as Map)['public'] =
            'chaud';

        final bundle = ContentBundle.fromJson(json);
        expect(bundle.spots.single.publicContest, ContestLevel.unknown);
      },
    );

    test('une coordonnée hors bornes est ramenée dans la map', () {
      final json = jsonDecode(_minimal) as Map<String, Object?>;
      ((json['spots']! as List).first as Map)['x'] = 142;

      // Un marqueur hors écran serait invisible, donc indébogable.
      expect(ContentBundle.fromJson(json).spots.single.x, 100);
    });

    test('un type d\'item inconnu ne fait pas tomber le document', () {
      final json = jsonDecode(_minimal) as Map<String, Object?>;
      final slot = ((json['loadout']! as Map)['slots']! as List).first as Map;
      slot['type'] = 'grenade_launcher_thing';

      expect(
        ContentBundle.fromJson(json).loadout.slots.single.type,
        ItemType.unknown,
      );
    });

    test('rejette une schema_version plus récente que l\'app', () {
      final json = jsonDecode(_minimal) as Map<String, Object?>;
      json['schema_version'] = 99;

      // Mieux vaut garder le cache précédent que lire un format inconnu de travers.
      expect(
        () => ContentBundle.fromJson(json),
        throwsA(isA<ContentFormatException>()),
      );
    });

    test('rejette un document sans aucun contenu', () {
      final json = jsonDecode(_minimal) as Map<String, Object?>;
      json['spots'] = <Object?>[];
      (json['loadout']! as Map)['slots'] = <Object?>[];

      expect(
        () => ContentBundle.fromJson(json),
        throwsA(isA<ContentFormatException>()),
      );
    });

    test('rejette un JSON illisible', () {
      expect(
        () => ContentBundle.fromJsonString('{oops'),
        throwsA(isA<ContentFormatException>()),
      );
    });

    test('une source url sans url repasse sur l\'API plutôt que sur rien', () {
      final json = jsonDecode(_minimal) as Map<String, Object?>;
      (json['map']! as Map)['source'] = 'url';

      expect(ContentBundle.fromJson(json).map.source, MapImageSource.api);
    });

    test(
      'les slots sont triés par numéro quel que soit l\'ordre du fichier',
      () {
        final json = jsonDecode(_minimal) as Map<String, Object?>;
        final slots = (json['loadout']! as Map)['slots']! as List;
        slots.insert(0, {
          'slot': 5,
          'name': 'Medkit',
          'display_name': const {'en': ''},
          'type': 'consumable',
          'why': const {'en': ''},
          'image_url': null,
          'api_id': null,
        });

        final parsed = ContentBundle.fromJson(json);
        expect(parsed.loadout.slots.map((s) => s.slot), [1, 5]);
      },
    );
  });
}
