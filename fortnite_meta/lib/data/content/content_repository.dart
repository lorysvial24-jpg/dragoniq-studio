import 'package:flutter/services.dart' show rootBundle;

import '../models/content_bundle.dart';
import '../models/content_manifest.dart';
import 'content_cache.dart';
import 'content_source.dart';

/// Orchestre réseau, cache disque et contenu embarqué.
///
/// Garantie tenue par cette classe : [load] ne lève jamais tant qu'un des
/// trois niveaux répond, et le contenu embarqué répond toujours. Il n'existe
/// donc aucun chemin qui mène à un écran vide.
class ContentRepository {
  ContentRepository({
    required ContentSource source,
    required ContentCache cache,
    this.bundledAssetPath = 'assets/bootstrap/content.json',
    // Un paramètre nommé ne peut pas être privé en Dart : l'initialisation
    // dans la liste est ici la seule option.
    // ignore: prefer_initializing_formals
  }) : _cache = cache,
       // ignore: prefer_initializing_formals
       _source = source;

  final ContentSource _source;
  final ContentCache _cache;
  final String bundledAssetPath;

  /// Manifeste du dernier chargement réussi. Alimente la liste des langues
  /// du sélecteur, sans imposer un second appel réseau.
  ContentManifest? get lastManifest => _lastManifest;
  ContentManifest? _lastManifest;

  Future<ContentSnapshot> load() async {
    final cached = await _cache.read();

    try {
      final manifest = await _source.fetchManifest();
      _lastManifest = manifest;

      // Le cache est déjà à la bonne version : on s'arrête là. C'est le cas
      // courant, et il ne coûte que le manifeste.
      if (cached != null && cached.contentVersion == manifest.contentVersion) {
        final bundle = _tryParse(cached.body);
        if (bundle != null) {
          await _cache.touch();
          return ContentSnapshot(
            bundle: bundle,
            origin: ContentOrigin.network,
            fetchedAt: DateTime.now(),
          );
        }
        // Cache corrompu malgré la bonne version : on retélécharge.
      }

      final raw = await _source.fetchContent(
        manifest.contentFile,
        etag: cached?.etag,
      );

      if (raw.isNotModified && cached != null) {
        final bundle = _tryParse(cached.body);
        if (bundle != null) {
          await _cache.touch();
          return ContentSnapshot(
            bundle: bundle,
            origin: ContentOrigin.network,
            fetchedAt: DateTime.now(),
          );
        }
      }

      final body = raw.body;
      if (body != null) {
        // On analyse avant d'écrire : un document invalide ne doit jamais
        // remplacer un cache valide.
        final bundle = ContentBundle.fromJsonString(body);
        await _cache.write(
          body: body,
          etag: raw.etag,
          contentVersion: bundle.contentVersion,
        );
        return ContentSnapshot(
          bundle: bundle,
          origin: ContentOrigin.network,
          fetchedAt: DateTime.now(),
        );
      }
    } on Object {
      // Réseau coupé, CDN en vrac, JSON cassé : on descend d'un niveau.
      // L'erreur n'est pas propagée, elle devient un bandeau.
    }

    if (cached != null) {
      final bundle = _tryParse(cached.body);
      if (bundle != null) {
        return ContentSnapshot(
          bundle: bundle,
          origin: ContentOrigin.cache,
          fetchedAt: cached.fetchedAt,
          refreshFailed: true,
        );
      }
    }

    return ContentSnapshot(
      bundle: await _loadBundled(),
      origin: ContentOrigin.bundled,
      fetchedAt: null,
      refreshFailed: true,
    );
  }

  Future<ContentBundle> _loadBundled() async {
    final body = await rootBundle.loadString(bundledAssetPath);
    return ContentBundle.fromJsonString(body);
  }

  ContentBundle? _tryParse(String body) {
    try {
      return ContentBundle.fromJsonString(body);
    } on Object {
      return null;
    }
  }
}
