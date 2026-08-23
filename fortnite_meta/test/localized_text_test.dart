import 'package:flutter_test/flutter_test.dart';
import 'package:fortnite_meta/core/localized_text.dart';

void main() {
  group('LocalizedText', () {
    test('rend la langue demandée quand elle est remplie', () {
      const text = LocalizedText({
        'en': 'Shield truck',
        'fr': 'Camion de shield',
      });
      expect(text.resolve('fr', fallbackCode: 'en'), 'Camion de shield');
    });

    test('retombe sur la langue par défaut si la traduction manque', () {
      const text = LocalizedText({'en': 'Shield truck', 'fr': ''});
      expect(text.resolve('fr', fallbackCode: 'en'), 'Shield truck');
    });

    test('rend null plutôt qu\'une autre langue quand le défaut est vide', () {
      // Le cœur de la règle : un anglophone ne doit jamais recevoir de
      // français en douce, même si c\'est le seul texte disponible.
      const text = LocalizedText({'en': '', 'fr': 'Camion de shield'});
      expect(text.resolve('en', fallbackCode: 'en'), isNull);
    });

    test('traite une chaîne d\'espaces comme un placeholder vide', () {
      const text = LocalizedText({'en': '   '});
      expect(text.resolve('en', fallbackCode: 'en'), isNull);
    });

    test('rogne les espaces autour d\'un texte rempli', () {
      const text = LocalizedText({'en': '  Medkit  '});
      expect(text.resolve('en', fallbackCode: 'en'), 'Medkit');
    });

    test('fait retomber pt-BR sur pt si seul le générique existe', () {
      const text = LocalizedText({'pt': 'Kit médico', 'en': 'Medkit'});
      expect(text.resolve('pt-BR', fallbackCode: 'en'), 'Kit médico');
    });

    test('ne lève pas sur un JSON du mauvais type', () {
      expect(LocalizedText.fromJson('pas un objet').isEmpty, isTrue);
      expect(LocalizedText.fromJson(null).isEmpty, isTrue);
      expect(LocalizedText.fromJson(const {'en': 42}).isEmpty, isTrue);
    });
  });
}
