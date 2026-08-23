// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppL10nFr extends AppL10n {
  AppL10nFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'Fortnite Meta';

  @override
  String get tabLoadout => 'Loadout';

  @override
  String get tabSpawns => 'Spawns';

  @override
  String get tabSettings => 'Réglages';

  @override
  String get notAvailable => 'N/A';

  @override
  String seasonChip(int chapter, int season) {
    return 'C$chapter S$season';
  }

  @override
  String get loadoutWhyMeta => 'Pourquoi c\'est méta';

  @override
  String loadoutSlotBadge(int number) {
    return '$number';
  }

  @override
  String loadoutUpdatedOn(String date) {
    return 'Mis à jour le $date';
  }

  @override
  String get loadoutEmpty => 'Aucun loadout publié pour l\'instant.';

  @override
  String get itemTypeWeapon => 'Arme';

  @override
  String get itemTypeMobility => 'Mobilité';

  @override
  String get itemTypeConsumable => 'Consommable';

  @override
  String get itemTypeUtility => 'Utilitaire';

  @override
  String get itemTypeUnknown => 'Objet';

  @override
  String get bannerOfflineCache => 'Hors ligne — contenu enregistré';

  @override
  String bannerStaleCache(String date) {
    return 'Actualisation impossible — contenu du $date';
  }

  @override
  String get bannerBundled => 'Contenu fourni avec l\'app';

  @override
  String get bannerRetry => 'Réessayer';

  @override
  String get errorTitle => 'Rien à afficher';

  @override
  String get errorBody =>
      'Le contenu n\'a pas pu être chargé et aucune copie n\'est enregistrée sur cet appareil.';

  @override
  String get settingsLanguage => 'Langue';

  @override
  String get settingsAbout => 'À propos';

  @override
  String settingsContentVersion(int version) {
    return 'Version du contenu $version';
  }

  @override
  String get aboutDisclaimer =>
      'Cette application n\'est ni affiliée, ni approuvée, ni sponsorisée par Epic Games, Inc. Fortnite est une marque déposée d\'Epic Games, Inc.';
}
