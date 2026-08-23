import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../data/images/map_image_api.dart';
import '../../data/models/content_bundle.dart';
import '../../data/models/contest_level.dart';
import '../../data/models/spot.dart';

enum SpawnsView { map, list }

final spawnsViewProvider = NotifierProvider<SpawnsViewController, SpawnsView>(
  SpawnsViewController.new,
);

class SpawnsViewController extends Notifier<SpawnsView> {
  @override
  SpawnsView build() => SpawnsView.map;

  void select(SpawnsView view) => state = view;
}

/// Les deux filtres, indépendants l'un de l'autre.
///
/// `null` signifie « indifférent ».
class SpotFilter {
  const SpotFilter({this.public, this.tournament});

  final ContestLevel? public;
  final ContestLevel? tournament;

  bool get isActive => public != null || tournament != null;

  SpotFilter copyWith({
    ContestLevel? public,
    ContestLevel? tournament,
    bool clearPublic = false,
    bool clearTournament = false,
  }) => SpotFilter(
    public: clearPublic ? null : (public ?? this.public),
    tournament: clearTournament ? null : (tournament ?? this.tournament),
  );

  /// Un spot dont le niveau n'est pas renseigné passe toujours le filtre.
  ///
  /// C'est un choix, pas un oubli : masquer un spot parce qu'on ignore son
  /// niveau de contestation reviendrait à traiter « inconnu » comme une
  /// réponse. Le spot reste visible, marqué N/A, et le joueur tranche.
  bool matches(Spot spot) {
    bool ok(ContestLevel? wanted, ContestLevel actual) =>
        wanted == null || !actual.isKnown || actual == wanted;

    return ok(public, spot.publicContest) &&
        ok(tournament, spot.tournamentContest);
  }
}

final spotFilterProvider = NotifierProvider<SpotFilterController, SpotFilter>(
  SpotFilterController.new,
);

class SpotFilterController extends Notifier<SpotFilter> {
  @override
  SpotFilter build() => const SpotFilter();

  void setPublic(ContestLevel? level) => state = level == null
      ? state.copyWith(clearPublic: true)
      : state.copyWith(public: level);

  void setTournament(ContestLevel? level) => state = level == null
      ? state.copyWith(clearTournament: true)
      : state.copyWith(tournament: level);

  void clear() => state = const SpotFilter();
}

/// Les spots après filtrage, dans l'ordre du backend.
final filteredSpotsProvider = Provider<List<Spot>>((ref) {
  final snapshot = ref.watch(contentProvider).asData?.value;
  if (snapshot == null) return const [];

  final filter = ref.watch(spotFilterProvider);
  return snapshot.bundle.spots.where(filter.matches).toList();
});

final mapImageApiProvider = Provider<MapImageApi>((ref) {
  final api = MapImageApi(timeout: ref.watch(appConfigProvider).networkTimeout);
  ref.onDispose(api.dispose);
  return api;
});

/// L'URL de la map à afficher.
///
/// Le contenu décide : une `image_url` écrite à la main gagne sur l'API, ce qui
/// permet de corriger une map cassée sans republier l'app.
final mapImageUrlProvider = FutureProvider<String?>((ref) async {
  final snapshot = await ref.watch(contentProvider.future);
  final config = snapshot.bundle.map;

  if (config.source == MapImageSource.url) return config.imageUrl;

  try {
    return await ref.watch(mapImageApiProvider).blankMapUrl();
  } on Object {
    // Le fournisseur d'images de map n'est pas critique : sans lui l'onglet
    // bascule sur la vue liste, qui n'a besoin d'aucune image.
    return null;
  }
});
