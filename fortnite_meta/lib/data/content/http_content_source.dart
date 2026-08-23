import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/content_manifest.dart';
import 'content_source.dart';

/// Lit le contenu servi en fichiers statiques sur le CDN.
///
/// Deux GET, pas d'authentification : le contenu est public. La fraîcheur est
/// gérée par `ETag` / `If-None-Match`, donc une vérification qui ne trouve rien
/// de neuf coûte un 304 et zéro octet de données.
class HttpContentSource implements ContentSource {
  HttpContentSource({
    required this.baseUrl,
    required this.timeout,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final Duration timeout;
  final http.Client _client;

  @override
  Future<ContentManifest> fetchManifest() async {
    final response = await _get('manifest.json');
    if (response.statusCode != 200) {
      throw http.ClientException(
        'manifest.json a répondu ${response.statusCode}',
      );
    }
    return ContentManifest.fromJsonString(utf8.decode(response.bodyBytes));
  }

  @override
  Future<RawContent> fetchContent(String fileName, {String? etag}) async {
    final response = await _get(
      fileName,
      headers: etag == null ? null : {'If-None-Match': etag},
    );

    if (response.statusCode == 304) return const RawContent.notModified();
    if (response.statusCode != 200) {
      throw http.ClientException('$fileName a répondu ${response.statusCode}');
    }

    return RawContent(
      body: utf8.decode(response.bodyBytes),
      etag: response.headers['etag'],
    );
  }

  Future<http.Response> _get(String fileName, {Map<String, String>? headers}) {
    final uri = Uri.parse('$baseUrl/$fileName');
    return _client.get(uri, headers: headers).timeout(timeout);
  }

  void dispose() => _client.close();
}
