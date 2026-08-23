import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/config/app_config.dart';
import '../data/content/content_cache.dart';
import '../data/content/content_repository.dart';
import '../data/content/content_source.dart';
import '../data/content/http_content_source.dart';
import '../data/images/fortnite_io_loot_api.dart';
import '../data/images/item_image_resolver.dart';
import '../data/models/content_bundle.dart';
import '../data/models/content_manifest.dart';

final appConfigProvider = Provider<AppConfig>(
  (ref) => AppConfig.fromEnvironment(),
);

final contentSourceProvider = Provider<ContentSource>((ref) {
  final config = ref.watch(appConfigProvider);
  final source = HttpContentSource(
    baseUrl: config.contentBaseUrl,
    timeout: config.networkTimeout,
  );
  ref.onDispose(source.dispose);
  return source;
});

final contentRepositoryProvider = Provider<ContentRepository>((ref) {
  return ContentRepository(
    source: ref.watch(contentSourceProvider),
    cache: ContentCache(),
  );
});

/// Le contenu affiché. `AsyncValue` porte à la fois l'état de chargement et le
/// résultat ; la panne réseau, elle, n'est pas une erreur ici mais un
/// [ContentSnapshot] marqué périmé — c'est tout l'intérêt du dépôt.
final contentProvider = FutureProvider<ContentSnapshot>((ref) {
  return ref.watch(contentRepositoryProvider).load();
});

/// Le catalogue d'icônes, chargé une fois puis partagé.
///
/// `warmUp` n'échoue jamais : sans clé API, le résolveur retombe simplement
/// sur `image_url` et sur le placeholder.
final imageResolverProvider = FutureProvider<ItemImageResolver>((ref) async {
  final config = ref.watch(appConfigProvider);

  if (!config.hasFortniteIoKey) return ItemImageResolver();

  final api = FortniteIoLootApi(
    apiKey: config.fortniteIoKey,
    timeout: config.networkTimeout,
  );
  ref.onDispose(api.dispose);

  final resolver = ItemImageResolver(iconSource: api);
  await resolver.warmUp();
  return resolver;
});

/// Les langues proposées, telles que déclarées par le backend.
///
/// Ajouter une langue au manifeste la fait apparaître dans les réglages sans
/// toucher au code.
final availableLanguagesProvider = Provider<List<LanguageOption>>((ref) {
  // On dépend du contenu pour être recalculé une fois le manifeste chargé.
  ref.watch(contentProvider);
  final manifest = ref.watch(contentRepositoryProvider).lastManifest;
  return manifest?.languages ??
      const [
        LanguageOption(code: 'en', label: 'English'),
        LanguageOption(code: 'fr', label: 'Français'),
      ];
});

/// Langue de repli du contenu éditorial, décidée par le backend.
final fallbackLanguageProvider = Provider<String>((ref) {
  ref.watch(contentProvider);
  return ref.watch(contentRepositoryProvider).lastManifest?.defaultLanguage ??
      'en';
});

/// La langue choisie, ou `null` pour « suivre le système ».
class LocaleController extends Notifier<Locale?> {
  static const _key = 'app_locale';

  @override
  Locale? build() => null;

  Future<void> restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(_key);
      if (code != null && code.isNotEmpty) state = Locale(code);
    } on Object {
      // Préférence illisible : on suit le système, ce qui est le défaut.
    }
  }

  Future<void> select(String? languageCode) async {
    state = languageCode == null ? null : Locale(languageCode);
    try {
      final prefs = await SharedPreferences.getInstance();
      if (languageCode == null) {
        await prefs.remove(_key);
      } else {
        await prefs.setString(_key, languageCode);
      }
    } on Object {
      // Le choix reste actif pour la session même s'il n'a pas pu être écrit.
    }
  }
}

final localeControllerProvider = NotifierProvider<LocaleController, Locale?>(
  LocaleController.new,
);
