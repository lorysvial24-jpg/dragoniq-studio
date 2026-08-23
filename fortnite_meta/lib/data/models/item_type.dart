/// Catégorie d'un item du loadout.
///
/// Sert uniquement à choisir un placeholder et un libellé. Volontairement
/// aucune notion de rareté nulle part dans l'app.
enum ItemType {
  weapon('weapon'),
  mobility('mobility'),
  consumable('consumable'),
  utility('utility'),
  unknown(null);

  const ItemType(this.code);

  final String? code;

  static ItemType parse(Object? value) {
    if (value is! String) return ItemType.unknown;
    final normalized = value.trim().toLowerCase();
    for (final type in ItemType.values) {
      if (type.code == normalized) return type;
    }
    return ItemType.unknown;
  }
}
