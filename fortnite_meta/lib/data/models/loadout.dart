import '../../core/json.dart';
import '../../core/localized_text.dart';
import 'item_type.dart';

/// Un des cinq emplacements du stuff méta.
class LoadoutSlot {
  const LoadoutSlot({
    required this.slot,
    required this.name,
    required this.displayName,
    required this.type,
    required this.why,
    required this.imageUrl,
    required this.apiId,
  });

  factory LoadoutSlot.fromJson(Object? json) {
    final map = asMap(json);
    return LoadoutSlot(
      slot: asInt(map['slot']),
      name: asString(map['name']),
      displayName: LocalizedText.fromJson(map['display_name']),
      type: ItemType.parse(map['type']),
      why: LocalizedText.fromJson(map['why']),
      imageUrl: asOptionalString(map['image_url']),
      apiId: asOptionalString(map['api_id']),
    );
  }

  /// Numéro d'emplacement, 1 à 5.
  final int slot;

  /// Nom anglais officiel de l'item. Sert de clé de résolution d'image, il
  /// n'est donc jamais traduit.
  final String name;

  /// Nom traduit, optionnel. Vide, on retombe sur [name].
  final LocalizedText displayName;

  final ItemType type;

  /// La phrase éditoriale qui justifie la place de l'item dans le méta.
  final LocalizedText why;

  /// Niveau 1 de résolution d'image : l'URL décidée à la main.
  final String? imageUrl;

  /// Niveau 2 : l'identifiant de l'item chez le fournisseur d'images.
  final String? apiId;

  /// Ce qu'on affiche comme titre de carte. Ne renvoie jamais null : si le
  /// backend n'a pas de traduction, le nom anglais reste plus utile qu'un
  /// « N/A » sur le titre.
  String label(String languageCode, {required String fallbackCode}) =>
      displayName.resolve(languageCode, fallbackCode: fallbackCode) ?? name;
}

/// Le loadout complet, avec sa date de publication.
class Loadout {
  const Loadout({
    required this.updatedAt,
    required this.note,
    required this.slots,
  });

  factory Loadout.fromJson(Object? json) {
    final map = asMap(json);
    final slots = asList(map['slots']).map(LoadoutSlot.fromJson).toList()
      ..sort((a, b) => a.slot.compareTo(b.slot));
    return Loadout(
      updatedAt: asDate(map['updated_at']),
      note: LocalizedText.fromJson(map['note']),
      slots: List.unmodifiable(slots),
    );
  }

  final DateTime? updatedAt;
  final LocalizedText note;
  final List<LoadoutSlot> slots;
}
