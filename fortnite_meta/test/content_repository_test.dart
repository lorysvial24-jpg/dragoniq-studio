import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fortnite_meta/data/content/content_cache.dart';
import 'package:fortnite_meta/data/content/content_repository.dart';
import 'package:fortnite_meta/data/content/content_source.dart';
import 'package:fortnite_meta/data/models/content_bundle.dart';
import 'package:fortnite_meta/data/models/content_manifest.dart';

const _body = '''
{
  "schema_version": 1, "content_version": 3,
  "season": { "code": "c7s4", "chapter": 7, "season": 4,
              "name": { "en": "Override" }, "starts_at": "2026-08-20", "ends_at": "2026-11-01" },
  "map": { "source": "api", "image_url": null, "attribution": "" },
  "loadout": { "updated_at": "2026-08-23", "note": { "en": "" },
    "slots": [ { "slot": 1, "name": "Medkit", "display_name": { "en": "" },
                 "type": "consumable", "why": { "en": "" },
                 "image_url": null, "api_id": null } ] },
  "spots": []
}
''';

const _manifestJson = '''
{ "schema_version": 1, "content_version": 3, "updated_at": "2026-08-23T00:00:00Z",
  "min_app_build": 1, "default_language": "en",
  "languages": [ { "code": "en", "label": "English" } ],
  "files": { "content": "content.json" } }
''';

/// Source qui échoue systématiquement : simule un CDN injoignable.
class _DeadSource implements ContentSource {
  @override
  Future<ContentManifest> fetchManifest() async =>
      throw Exception('hors ligne');

  @override
  Future<RawContent> fetchContent(String fileName, {String? etag}) async =>
      throw Exception('hors ligne');
}

/// Source qui répond normalement.
class _LiveSource implements ContentSource {
  _LiveSource({this.notModified = false});

  final bool notModified;
  String? seenEtag;

  @override
  Future<ContentManifest> fetchManifest() async =>
      ContentManifest.fromJsonString(_manifestJson);

  @override
  Future<RawContent> fetchContent(String fileName, {String? etag}) async {
    seenEtag = etag;
    if (notModified) return const RawContent.notModified();
    return const RawContent(body: _body, etag: 'W/"abc"');
  }
}

/// Source dont le manifeste est bon mais le contenu corrompu.
class _CorruptSource implements ContentSource {
  @override
  Future<ContentManifest> fetchManifest() async =>
      ContentManifest.fromJsonString(_manifestJson);

  @override
  Future<RawContent> fetchContent(String fileName, {String? etag}) async =>
      const RawContent(body: '{ceci nest pas du json', etag: null);
}

/// Cache en mémoire, pour ne pas dépendre du disque dans les tests.
class _FakeCache implements ContentCache {
  _FakeCache({this.stored});

  CachedContent? stored;
  int touchCount = 0;

  @override
  String get fileName => 'content.json';

  @override
  Future<CachedContent?> read() async => stored;

  @override
  Future<void> write({
    required String body,
    required String? etag,
    required int contentVersion,
  }) async {
    stored = CachedContent(
      body: body,
      etag: etag,
      contentVersion: contentVersion,
      fetchedAt: DateTime.now(),
    );
  }

  @override
  Future<void> touch() async => touchCount++;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  /// Sert le contenu embarqué sans passer par un vrai bundle d'assets.
  void stubBundledAsset(String body) {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMessageHandler('flutter/assets', (message) async {
          return ByteData.sublistView(Uint8List.fromList(body.codeUnits));
        });
  }

  group('ContentRepository — la chaîne de repli', () {
    test('réseau disponible : télécharge et met en cache', () async {
      final cache = _FakeCache();
      final repository = ContentRepository(source: _LiveSource(), cache: cache);

      final snapshot = await repository.load();

      expect(snapshot.origin, ContentOrigin.network);
      expect(snapshot.isStale, isFalse);
      expect(snapshot.bundle.contentVersion, 3);
      expect(cache.stored?.etag, 'W/"abc"');
    });

    test('même content_version : sert le cache sans retélécharger', () async {
      final cache = _FakeCache(
        stored: CachedContent(
          body: _body,
          etag: 'W/"abc"',
          contentVersion: 3,
          fetchedAt: DateTime(2026, 8, 23),
        ),
      );
      final source = _LiveSource();
      final repository = ContentRepository(source: source, cache: cache);

      final snapshot = await repository.load();

      // Le contenu est à jour : on ne doit pas avoir touché à content.json.
      expect(source.seenEtag, isNull);
      expect(snapshot.origin, ContentOrigin.network);
      expect(snapshot.isStale, isFalse);
      expect(cache.touchCount, 1);
    });

    test('304 Not Modified : sert le cache et le marque frais', () async {
      final cache = _FakeCache(
        stored: CachedContent(
          body: _body,
          etag: 'W/"abc"',
          contentVersion: 2,
          fetchedAt: DateTime(2026, 8, 23),
        ),
      );
      final source = _LiveSource(notModified: true);
      final repository = ContentRepository(source: source, cache: cache);

      final snapshot = await repository.load();

      expect(source.seenEtag, 'W/"abc"');
      expect(snapshot.origin, ContentOrigin.network);
      expect(snapshot.isStale, isFalse);
    });

    test(
      'hors ligne avec cache : sert le cache et signale la péremption',
      () async {
        final fetchedAt = DateTime(2026, 8, 20);
        final cache = _FakeCache(
          stored: CachedContent(
            body: _body,
            etag: null,
            contentVersion: 3,
            fetchedAt: fetchedAt,
          ),
        );
        final repository = ContentRepository(
          source: _DeadSource(),
          cache: cache,
        );

        final snapshot = await repository.load();

        expect(snapshot.origin, ContentOrigin.cache);
        expect(snapshot.isStale, isTrue);
        expect(snapshot.fetchedAt, fetchedAt);
        expect(snapshot.bundle.loadout.slots.single.name, 'Medkit');
      },
    );

    test('hors ligne sans cache : sert le contenu embarqué', () async {
      stubBundledAsset(_body);
      final repository = ContentRepository(
        source: _DeadSource(),
        cache: _FakeCache(),
      );

      final snapshot = await repository.load();

      expect(snapshot.origin, ContentOrigin.bundled);
      expect(snapshot.isStale, isTrue);
      expect(snapshot.fetchedAt, isNull);
    });

    test('contenu distant corrompu : le cache valide est préservé', () async {
      final cache = _FakeCache(
        stored: CachedContent(
          body: _body,
          etag: null,
          contentVersion: 2,
          fetchedAt: DateTime(2026, 8, 20),
        ),
      );
      final repository = ContentRepository(
        source: _CorruptSource(),
        cache: cache,
      );

      final snapshot = await repository.load();

      // Un document invalide ne doit jamais écraser un cache qui marche.
      expect(snapshot.origin, ContentOrigin.cache);
      expect(cache.stored?.contentVersion, 2);
    });

    test(
      'cache corrompu et réseau mort : le contenu embarqué prend le relais',
      () async {
        stubBundledAsset(_body);
        final cache = _FakeCache(
          stored: const CachedContent(
            body: '{corrompu',
            etag: null,
            contentVersion: 3,
            fetchedAt: null,
          ),
        );
        final repository = ContentRepository(
          source: _DeadSource(),
          cache: cache,
        );

        final snapshot = await repository.load();
        expect(snapshot.origin, ContentOrigin.bundled);
      },
    );
  });
}
