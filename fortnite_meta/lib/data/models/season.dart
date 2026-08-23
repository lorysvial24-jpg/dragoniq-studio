import '../../core/json.dart';
import '../../core/localized_text.dart';

/// La saison en cours. Entièrement pilotée par le backend : aucun numéro de
/// chapitre ni nom de saison n'est écrit dans le code.
class Season {
  const Season({
    required this.code,
    required this.chapter,
    required this.number,
    required this.name,
    required this.startsAt,
    required this.endsAt,
  });

  factory Season.fromJson(Object? json) {
    final map = asMap(json);
    return Season(
      code: asString(map['code']),
      chapter: asInt(map['chapter']),
      number: asInt(map['season']),
      name: LocalizedText.fromJson(map['name']),
      startsAt: asDate(map['starts_at']),
      endsAt: asDate(map['ends_at']),
    );
  }

  final String code;
  final int chapter;
  final int number;
  final LocalizedText name;
  final DateTime? startsAt;
  final DateTime? endsAt;
}
