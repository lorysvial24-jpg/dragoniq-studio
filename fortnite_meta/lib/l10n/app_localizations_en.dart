// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppL10nEn extends AppL10n {
  AppL10nEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Fortnite Meta';

  @override
  String get tabLoadout => 'Loadout';

  @override
  String get tabSpawns => 'Spawns';

  @override
  String get tabSettings => 'Settings';

  @override
  String get notAvailable => 'N/A';

  @override
  String seasonChip(int chapter, int season) {
    return 'C$chapter S$season';
  }

  @override
  String get loadoutWhyMeta => 'Why it\'s meta';

  @override
  String loadoutSlotBadge(int number) {
    return '$number';
  }

  @override
  String loadoutUpdatedOn(String date) {
    return 'Updated $date';
  }

  @override
  String get loadoutEmpty => 'No loadout published yet.';

  @override
  String get itemTypeWeapon => 'Weapon';

  @override
  String get itemTypeMobility => 'Mobility';

  @override
  String get itemTypeConsumable => 'Consumable';

  @override
  String get itemTypeUtility => 'Utility';

  @override
  String get itemTypeUnknown => 'Item';

  @override
  String get bannerOfflineCache => 'Offline — showing last saved content';

  @override
  String bannerStaleCache(String date) {
    return 'Couldn\'t refresh — showing content from $date';
  }

  @override
  String get bannerBundled => 'Showing content bundled with the app';

  @override
  String get bannerRetry => 'Retry';

  @override
  String get errorTitle => 'Nothing to show yet';

  @override
  String get errorBody =>
      'The content couldn\'t be loaded and no copy is saved on this device.';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get settingsAbout => 'About';

  @override
  String settingsContentVersion(int version) {
    return 'Content version $version';
  }

  @override
  String get aboutDisclaimer =>
      'This app is not affiliated with, endorsed by, or sponsored by Epic Games, Inc. Fortnite is a trademark of Epic Games, Inc.';
}
