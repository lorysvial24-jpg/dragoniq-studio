import '../models/loadout.dart';
import 'loot_icon_source.dart';

/// Ce qu'il faut afficher pour un item : une URL, ou rien.
sealed class ResolvedImage {
  const ResolvedImage();
}

/// Une image distante a été trouvée. [level] sert au débogage et aux tests :
/// il dit lequel des trois niveaux a répondu.
class RemoteImage extends ResolvedImage {
  const RemoteImage(this.url, this.level);

  final String url;
  final ImageResolutionLevel level;
}

/// Aucun niveau n'a répondu. L'UI dessine un placeholder typé.
class NoImage extends ResolvedImage {
  const NoImage();
}

enum ImageResolutionLevel { explicitUrl, apiId, nameLookup }

/// Résout l'image d'un item en quatre niveaux, du plus fiable au plus faillible.
///
/// 1. `image_url` écrit à la main dans le contenu — corrige n'importe quel cas
///    tordu sans republier l'app, et se passe complètement de clé API.
/// 2. `api_id` — insensible aux renommages d'items entre patchs.
/// 3. Recherche par nom anglais normalisé — le cas courant.
/// 4. Rien : [NoImage], et un placeholder à l'écran.
///
/// Chaque niveau échoue en silence vers le suivant. [warmUp] avale ses propres
/// erreurs : un fournisseur d'images en panne fait tomber les niveaux 2 et 3,
/// il ne fait pas tomber l'onglet.
class ItemImageResolver {
  // Même raison que dans ContentRepository : pas de paramètre nommé privé.
  // ignore: prefer_initializing_formals
  ItemImageResolver({LootIconSource? iconSource}) : _iconSource = iconSource;

  final LootIconSource? _iconSource;

  Map<String, String> _byName = const {};
  Map<String, String> _byId = const {};

  /// Vrai si le catalogue distant a pu être chargé. Faux ne signifie pas
  /// « erreur à afficher » : sans clé API c'est le fonctionnement nominal.
  bool get hasCatalog => _byName.isNotEmpty || _byId.isNotEmpty;

  Future<void> warmUp() async {
    final source = _iconSource;
    if (source == null) return;
    try {
      _byName = await source.iconUrlsByName();
      _byId = await source.iconUrlsById();
    } on Object {
      _byName = const {};
      _byId = const {};
    }
  }

  ResolvedImage resolve(LoadoutSlot slot) {
    final explicit = slot.imageUrl;
    if (explicit != null && explicit.isNotEmpty) {
      return RemoteImage(explicit, ImageResolutionLevel.explicitUrl);
    }

    final apiId = slot.apiId;
    if (apiId != null) {
      final byId = _byId[apiId];
      if (byId != null) return RemoteImage(byId, ImageResolutionLevel.apiId);
    }

    if (slot.name.trim().isNotEmpty) {
      final byName = _byName[normalizeItemName(slot.name)];
      if (byName != null) {
        return RemoteImage(byName, ImageResolutionLevel.nameLookup);
      }
    }

    return const NoImage();
  }
}
