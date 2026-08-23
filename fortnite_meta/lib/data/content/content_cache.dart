import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Ce qui a été retenu du dernier téléchargement réussi.
class CachedContent {
  const CachedContent({
    required this.body,
    required this.etag,
    required this.contentVersion,
    required this.fetchedAt,
  });

  final String body;
  final String? etag;
  final int contentVersion;
  final DateTime? fetchedAt;
}

/// Cache disque du contenu.
///
/// Le contenu est un document, pas une base de données : un fichier JSON et
/// trois métadonnées suffisent. Le fichier vit hors du dossier de préférences
/// parce qu'il pèse plus lourd et qu'il doit pouvoir être effacé seul.
class ContentCache {
  ContentCache({this.fileName = 'content.json'});

  static const _keyEtag = 'content_etag';
  static const _keyVersion = 'content_version';
  static const _keyFetchedAt = 'content_fetched_at';

  final String fileName;

  Future<File> _file() async {
    final directory = await getApplicationSupportDirectory();
    return File('${directory.path}/$fileName');
  }

  /// Renvoie `null` s'il n'y a rien de lisible. Une erreur de lecture disque
  /// est traitée comme une absence de cache : l'app repart sur le contenu
  /// embarqué au lieu de s'arrêter.
  Future<CachedContent?> read() async {
    try {
      final file = await _file();
      if (!file.existsSync()) return null;

      final body = await file.readAsString(encoding: utf8);
      if (body.trim().isEmpty) return null;

      final prefs = await SharedPreferences.getInstance();
      final fetchedAtRaw = prefs.getString(_keyFetchedAt);

      return CachedContent(
        body: body,
        etag: prefs.getString(_keyEtag),
        contentVersion: prefs.getInt(_keyVersion) ?? 0,
        fetchedAt: fetchedAtRaw == null
            ? null
            : DateTime.tryParse(fetchedAtRaw),
      );
    } on Object {
      return null;
    }
  }

  /// Écrit d'abord le fichier, puis les métadonnées.
  ///
  /// L'ordre compte : si l'écriture des métadonnées échoue, on a un fichier
  /// sans ETag, ce qui coûte un téléchargement de trop. L'inverse donnerait un
  /// ETag pointant sur un fichier absent, donc un cache qu'on croit à jour
  /// alors qu'il est vide.
  Future<void> write({
    required String body,
    required String? etag,
    required int contentVersion,
  }) async {
    try {
      final file = await _file();
      await file.parent.create(recursive: true);
      await file.writeAsString(body, encoding: utf8, flush: true);

      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_keyVersion, contentVersion);
      await prefs.setString(
        _keyFetchedAt,
        DateTime.now().toUtc().toIso8601String(),
      );
      if (etag == null) {
        await prefs.remove(_keyEtag);
      } else {
        await prefs.setString(_keyEtag, etag);
      }
    } on Object {
      // Un cache qu'on n'arrive pas à écrire ne doit pas empêcher d'afficher
      // le contenu qu'on vient de télécharger.
    }
  }

  /// Met à jour la date de dernière vérification après un 304, sans réécrire
  /// le fichier : le contenu affiché est bien à jour, seul le cache le disait mal.
  Future<void> touch() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _keyFetchedAt,
        DateTime.now().toUtc().toIso8601String(),
      );
    } on Object {
      // Sans conséquence : au pire la date affichée est un peu ancienne.
    }
  }
}
