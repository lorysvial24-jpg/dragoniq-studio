import 'package:flutter_test/flutter_test.dart';
import 'package:fortnite_meta/core/localized_text.dart';
import 'package:fortnite_meta/data/models/contest_level.dart';
import 'package:fortnite_meta/data/models/spot.dart';
import 'package:fortnite_meta/features/spawns/spawns_controller.dart';

Spot _spot({
  required ContestLevel public,
  required ContestLevel tournament,
  int id = 1,
}) => Spot(
  id: id,
  name: const LocalizedText.empty(),
  x: 50,
  y: 50,
  publicContest: public,
  tournamentContest: tournament,
  loot: const LocalizedText.empty(),
  why: const LocalizedText.empty(),
);

void main() {
  group('SpotFilter', () {
    test('sans filtre, tout passe', () {
      const filter = SpotFilter();
      expect(filter.isActive, isFalse);
      expect(
        filter.matches(
          _spot(public: ContestLevel.hot, tournament: ContestLevel.calm),
        ),
        isTrue,
      );
    });

    test('filtre sur le public sans toucher au tournoi', () {
      const filter = SpotFilter(public: ContestLevel.calm);

      expect(
        filter.matches(
          _spot(public: ContestLevel.calm, tournament: ContestLevel.hot),
        ),
        isTrue,
      );
      expect(
        filter.matches(
          _spot(public: ContestLevel.hot, tournament: ContestLevel.calm),
        ),
        isFalse,
      );
    });

    test('les deux filtres se combinent', () {
      const filter = SpotFilter(
        public: ContestLevel.calm,
        tournament: ContestLevel.hot,
      );

      expect(
        filter.matches(
          _spot(public: ContestLevel.calm, tournament: ContestLevel.hot),
        ),
        isTrue,
      );
      expect(
        filter.matches(
          _spot(public: ContestLevel.calm, tournament: ContestLevel.calm),
        ),
        isFalse,
      );
    });

    test('un niveau inconnu n\'est jamais masqué par un filtre', () {
      // Choix assumé : masquer un spot dont on ignore le niveau reviendrait à
      // traiter « inconnu » comme une réponse. Il reste visible, marqué N/A.
      const filter = SpotFilter(tournament: ContestLevel.hot);

      expect(
        filter.matches(
          _spot(public: ContestLevel.calm, tournament: ContestLevel.unknown),
        ),
        isTrue,
      );
    });

    test('retirer un filtre remet le champ à indifférent', () {
      const filter = SpotFilter(
        public: ContestLevel.calm,
        tournament: ContestLevel.hot,
      );

      final cleared = filter.copyWith(clearPublic: true);
      expect(cleared.public, isNull);
      expect(cleared.tournament, ContestLevel.hot);
      expect(cleared.isActive, isTrue);
    });
  });
}
