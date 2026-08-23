import 'package:flutter_test/flutter_test.dart';
import 'package:fortnite_meta/data/images/map_image_api.dart';

/// Forme de la réponse relevée dans le SDK Python officiel de fortnite-api.com
/// (`fortnite_api/map.py`). Le contenu des URL est fictif, la structure non.
const _response = '''
{
  "status": 200,
  "data": {
    "images": {
      "blank": "https://media.fortniteapi.example/map.png",
      "pois": "https://media.fortniteapi.example/map-pois.png"
    },
    "pois": [
      { "id": "Athena.Location.POI.01", "name": "Some Place",
        "location": { "x": -35000, "y": 22000, "z": 0 } }
    ]
  }
}
''';

void main() {
  group('MapImageApi.parseBlankUrl', () {
    test('prend la map sans les noms de lieux', () {
      // `blank` et pas `pois` : nos marqueurs se posent par-dessus, les noms
      // d'Epic parasiteraient la lecture.
      expect(
        MapImageApi.parseBlankUrl(_response),
        'https://media.fortniteapi.example/map.png',
      );
    });

    test('retombe sur la map annotée si la version nue manque', () {
      const body = '''
      { "data": { "images": { "pois": "https://media.example/map-pois.png" } } }
      ''';
      expect(
        MapImageApi.parseBlankUrl(body),
        'https://media.example/map-pois.png',
      );
    });

    test('rend null sur une réponse inattendue, sans lever', () {
      for (final body in [
        '{}',
        '{ "data": {} }',
        '{ "data": { "images": {} } }',
        '{ "data": { "images": { "blank": 42 } } }',
        '{ "data": { "images": { "blank": "pas-une-url" } } }',
        'pas du json',
        '[]',
      ]) {
        expect(MapImageApi.parseBlankUrl(body), isNull, reason: body);
      }
    });
  });
}
