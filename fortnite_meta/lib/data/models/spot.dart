import '../../core/json.dart';
import '../../core/localized_text.dart';
import 'contest_level.dart';

/// Un spot de spawn.
class Spot {
  const Spot({
    required this.id,
    required this.name,
    required this.x,
    required this.y,
    required this.publicContest,
    required this.tournamentContest,
    required this.loot,
    required this.why,
  });

  factory Spot.fromJson(Object? json) {
    final map = asMap(json);
    final contest = asMap(map['contest']);
    return Spot(
      id: asInt(map['id']),
      name: LocalizedText.fromJson(map['name']),
      x: asPercent(map['x']),
      y: asPercent(map['y']),
      publicContest: ContestLevel.parse(contest['public']),
      tournamentContest: ContestLevel.parse(contest['tournament']),
      loot: LocalizedText.fromJson(map['loot']),
      why: LocalizedText.fromJson(map['why']),
    );
  }

  final int id;
  final LocalizedText name;

  /// Position horizontale en pourcentage de la largeur de l'image de map.
  /// Jamais en pixels : la map change de résolution à chaque saison.
  final double x;

  /// Position verticale en pourcentage de la hauteur de l'image de map.
  final double y;

  /// Contestation en partie publique. Indépendante de [tournamentContest].
  final ContestLevel publicContest;

  /// Contestation en tournoi. Un spot calme en public peut être chaud ici.
  final ContestLevel tournamentContest;

  final LocalizedText loot;
  final LocalizedText why;
}
