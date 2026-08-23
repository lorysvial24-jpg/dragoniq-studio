import '../models/content_manifest.dart';

/// Réponse brute d'un fetch de contenu.
///
/// [body] à `null` signifie « 304 Not Modified » : rien n'a changé, le cache
/// reste valable et aucune donnée n'a été retéléchargée.
class RawContent {
  const RawContent({required this.body, required this.etag});

  const RawContent.notModified() : body = null, etag = null;

  final String? body;
  final String? etag;

  bool get isNotModified => body == null;
}

/// Le point de bascule vers un autre backend.
///
/// Passer à Supabase ou à Firebase revient à écrire une nouvelle implémentation
/// de cette interface. Ni les modèles, ni les contrôleurs, ni l'UI ne bougent.
abstract interface class ContentSource {
  Future<ContentManifest> fetchManifest();

  Future<RawContent> fetchContent(String fileName, {String? etag});
}
