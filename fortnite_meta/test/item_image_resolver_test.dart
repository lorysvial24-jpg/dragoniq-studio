import 'package:flutter_test/flutter_test.dart';
import 'package:fortnite_meta/core/localized_text.dart';
import 'package:fortnite_meta/data/images/item_image_resolver.dart';
import 'package:fortnite_meta/data/images/loot_icon_source.dart';
import 'package:fortnite_meta/data/models/item_type.dart';
import 'package:fortnite_meta/data/models/loadout.dart';

class _FakeIconSource implements LootIconSource {
  _FakeIconSource({
    this.byName = const {},
    this.byId = const {},
    this.fails = false,
  });

  final Map<String, String> byName;
  final Map<String, String> byId;
  final bool fails;

  @override
  Future<Map<String, String>> iconUrlsByName() async {
    if (fails) throw Exception('API injoignable');
    return byName;
  }

  @override
  Future<Map<String, String>> iconUrlsById() async {
    if (fails) throw Exception('API injoignable');
    return byId;
  }
}

LoadoutSlot _slot({String name = 'Medkit', String? imageUrl, String? apiId}) {
  return LoadoutSlot(
    slot: 1,
    name: name,
    displayName: const LocalizedText.empty(),
    type: ItemType.consumable,
    why: const LocalizedText.empty(),
    imageUrl: imageUrl,
    apiId: apiId,
  );
}

void main() {
  group('normalizeItemName', () {
    test('ignore casse, tirets et espaces multiples', () {
      expect(
        normalizeItemName('Enhanced 8-Bit Shotgun'),
        'enhanced8bitshotgun',
      );
      expect(
        normalizeItemName('enhanced  8 bit   shotgun'),
        'enhanced8bitshotgun',
      );
      expect(normalizeItemName('ENHANCED-8BIT-SHOTGUN'), 'enhanced8bitshotgun');
    });

    test('ignore les accents', () {
      expect(
        normalizeItemName('Grenade Surchargée'),
        normalizeItemName('grenade surchargee'),
      );
    });
  });

  group('ItemImageResolver — les quatre niveaux', () {
    test('niveau 1 : image_url gagne sur tout le reste', () async {
      final resolver = ItemImageResolver(
        iconSource: _FakeIconSource(
          byName: {'medkit': 'https://api/medkit.png'},
          byId: {'ID_MEDKIT': 'https://api/by-id.png'},
        ),
      );
      await resolver.warmUp();

      final image = resolver.resolve(
        _slot(imageUrl: 'https://manuel/medkit.png', apiId: 'ID_MEDKIT'),
      );

      expect(image, isA<RemoteImage>());
      expect((image as RemoteImage).url, 'https://manuel/medkit.png');
      expect(image.level, ImageResolutionLevel.explicitUrl);
    });

    test('niveau 2 : api_id passe avant la recherche par nom', () async {
      final resolver = ItemImageResolver(
        iconSource: _FakeIconSource(
          byName: {'medkit': 'https://api/par-nom.png'},
          byId: {'ID_MEDKIT': 'https://api/par-id.png'},
        ),
      );
      await resolver.warmUp();

      final image = resolver.resolve(_slot(apiId: 'ID_MEDKIT')) as RemoteImage;
      expect(image.url, 'https://api/par-id.png');
      expect(image.level, ImageResolutionLevel.apiId);
    });

    test(
      'niveau 3 : recherche par nom anglais, insensible à la forme',
      () async {
        final resolver = ItemImageResolver(
          iconSource: _FakeIconSource(
            byName: {'enhanced8bitshotgun': 'https://api/shotgun.png'},
          ),
        );
        await resolver.warmUp();

        final image = resolver.resolve(
          _slot(name: 'Enhanced 8-Bit Shotgun'),
        ) as RemoteImage;
        expect(image.url, 'https://api/shotgun.png');
        expect(image.level, ImageResolutionLevel.nameLookup);
      },
    );

    test(
      'niveau 4 : item introuvable donne un placeholder, pas une exception',
      () async {
        final resolver = ItemImageResolver(iconSource: _FakeIconSource());
        await resolver.warmUp();

        expect(
          resolver.resolve(_slot(name: 'Item Qui N Existe Pas')),
          isA<NoImage>(),
        );
      },
    );

    test('une API en panne dégrade sur le placeholder sans lever', () async {
      final resolver = ItemImageResolver(
        iconSource: _FakeIconSource(fails: true),
      );

      await resolver.warmUp(); // ne doit pas lever
      expect(resolver.hasCatalog, isFalse);
      expect(resolver.resolve(_slot()), isA<NoImage>());
    });

    test('sans clé API, image_url fonctionne toujours', () async {
      // Le cas qui rend l'app utilisable sans aucune clé.
      final resolver = ItemImageResolver();
      await resolver.warmUp();

      final image = resolver.resolve(
        _slot(imageUrl: 'https://manuel/medkit.png'),
      );
      expect((image as RemoteImage).level, ImageResolutionLevel.explicitUrl);
    });

    test('un api_id inconnu retombe sur le nom', () async {
      final resolver = ItemImageResolver(
        iconSource: _FakeIconSource(
          byName: {'medkit': 'https://api/medkit.png'},
        ),
      );
      await resolver.warmUp();

      final image =
          resolver.resolve(_slot(apiId: 'ID_INEXISTANT')) as RemoteImage;
      expect(image.level, ImageResolutionLevel.nameLookup);
    });
  });
}
