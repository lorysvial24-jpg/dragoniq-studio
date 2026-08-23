/// Configuration injectée au build. Aucune valeur secrète n'est écrite ici.
///
/// ```bash
/// flutter run --dart-define=FORTNITE_IO_KEY=xxxx
/// ```
///
/// Une clé absente n'est pas une erreur : elle vaut `''`, l'app démarre
/// normalement et l'étape « recherche par nom » de la résolution d'image est
/// simplement sautée. Une clé manquante dégrade, elle ne casse pas.
///
/// À savoir : une clé injectée au build reste extractible de l'APK. Le
/// `--dart-define` protège le dépôt, pas le binaire. C'est pourquoi le champ
/// `image_url` du contenu reste le chemin privilégié.
class AppConfig {
  const AppConfig({
    required this.contentBaseUrl,
    required this.fortniteIoKey,
    required this.networkTimeout,
  });

  factory AppConfig.fromEnvironment() => const AppConfig(
    contentBaseUrl: String.fromEnvironment(
      'CONTENT_BASE_URL',
      defaultValue: 'https://dragoniqstudio.com/content/v1',
    ),
    fortniteIoKey: String.fromEnvironment('FORTNITE_IO_KEY'),
    networkTimeout: Duration(seconds: 10),
  );

  /// Racine des fichiers de contenu. Publique, donc pas un secret.
  final String contentBaseUrl;

  /// Clé fortniteapi.io. Vide = résolution d'image par nom désactivée.
  final String fortniteIoKey;

  /// Au-delà, on sert le cache. Un joueur qui ouvre l'app entre deux parties
  /// n'attend pas trente secondes un rafraîchissement.
  final Duration networkTimeout;

  bool get hasFortniteIoKey => fortniteIoKey.isNotEmpty;
}
