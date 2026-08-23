import 'dart:convert';

import '../../core/json.dart';

/// Une langue proposée par le backend.
///
/// Le libellé est un endonyme (« Français », pas « French ») : dans un
/// sélecteur de langue, chacun doit reconnaître la sienne.
class LanguageOption {
  const LanguageOption({required this.code, required this.label});

  factory LanguageOption.fromJson(Object? json) {
    final map = asMap(json);
    return LanguageOption(
      code: asString(map['code']),
      label: asString(map['label']),
    );
  }

  final String code;
  final String label;
}

/// Le petit fichier lu en premier à chaque lancement.
///
/// Quelques centaines d'octets qui disent s'il faut aller chercher les 15 Ko
/// de contenu, ou si le cache est déjà à jour.
class ContentManifest {
  const ContentManifest({
    required this.schemaVersion,
    required this.contentVersion,
    required this.updatedAt,
    required this.minAppBuild,
    required this.defaultLanguage,
    required this.languages,
    required this.contentFile,
  });

  factory ContentManifest.fromJsonString(String source) {
    final Object? decoded;
    try {
      decoded = jsonDecode(source);
    } on FormatException catch (error) {
      throw FormatException('manifest illisible : ${error.message}');
    }
    return ContentManifest.fromJson(decoded);
  }

  factory ContentManifest.fromJson(Object? json) {
    final map = asMap(json);
    final languages = asList(map['languages'])
        .map(LanguageOption.fromJson)
        .where((language) => language.code.isNotEmpty)
        .toList();

    return ContentManifest(
      schemaVersion: asInt(map['schema_version'], fallback: 1),
      contentVersion: asInt(map['content_version']),
      updatedAt: asDate(map['updated_at']),
      minAppBuild: asInt(map['min_app_build'], fallback: 1),
      defaultLanguage: asString(map['default_language'], fallback: 'en'),
      languages: List.unmodifiable(
        languages.isEmpty
            // Un manifeste sans langue rendrait le sélecteur vide : on garde
            // au moins la langue par défaut.
            ? [
                LanguageOption(
                  code: asString(map['default_language'], fallback: 'en'),
                  label: 'English',
                ),
              ]
            : languages,
      ),
      contentFile: asString(
        asMap(map['files'])['content'],
        fallback: 'content.json',
      ),
    );
  }

  final int schemaVersion;
  final int contentVersion;
  final DateTime? updatedAt;
  final int minAppBuild;
  final String defaultLanguage;
  final List<LanguageOption> languages;
  final String contentFile;
}
