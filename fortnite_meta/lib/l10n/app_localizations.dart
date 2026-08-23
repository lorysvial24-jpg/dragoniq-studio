import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_fr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppL10n
/// returned by `AppL10n.of(context)`.
///
/// Applications need to include `AppL10n.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppL10n.localizationsDelegates,
///   supportedLocales: AppL10n.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppL10n.supportedLocales
/// property.
abstract class AppL10n {
  AppL10n(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppL10n of(BuildContext context) {
    return Localizations.of<AppL10n>(context, AppL10n)!;
  }

  static const LocalizationsDelegate<AppL10n> delegate = _AppL10nDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('fr'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Fortnite Meta'**
  String get appTitle;

  /// No description provided for @tabLoadout.
  ///
  /// In en, this message translates to:
  /// **'Loadout'**
  String get tabLoadout;

  /// No description provided for @tabSpawns.
  ///
  /// In en, this message translates to:
  /// **'Spawns'**
  String get tabSpawns;

  /// No description provided for @tabSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get tabSettings;

  /// Shown wherever the backend has no value. Never a guess.
  ///
  /// In en, this message translates to:
  /// **'N/A'**
  String get notAvailable;

  /// No description provided for @seasonChip.
  ///
  /// In en, this message translates to:
  /// **'C{chapter} S{season}'**
  String seasonChip(int chapter, int season);

  /// No description provided for @loadoutWhyMeta.
  ///
  /// In en, this message translates to:
  /// **'Why it\'s meta'**
  String get loadoutWhyMeta;

  /// No description provided for @loadoutSlotBadge.
  ///
  /// In en, this message translates to:
  /// **'{number}'**
  String loadoutSlotBadge(int number);

  /// No description provided for @loadoutUpdatedOn.
  ///
  /// In en, this message translates to:
  /// **'Updated {date}'**
  String loadoutUpdatedOn(String date);

  /// No description provided for @loadoutEmpty.
  ///
  /// In en, this message translates to:
  /// **'No loadout published yet.'**
  String get loadoutEmpty;

  /// No description provided for @itemTypeWeapon.
  ///
  /// In en, this message translates to:
  /// **'Weapon'**
  String get itemTypeWeapon;

  /// No description provided for @itemTypeMobility.
  ///
  /// In en, this message translates to:
  /// **'Mobility'**
  String get itemTypeMobility;

  /// No description provided for @itemTypeConsumable.
  ///
  /// In en, this message translates to:
  /// **'Consumable'**
  String get itemTypeConsumable;

  /// No description provided for @itemTypeUtility.
  ///
  /// In en, this message translates to:
  /// **'Utility'**
  String get itemTypeUtility;

  /// No description provided for @itemTypeUnknown.
  ///
  /// In en, this message translates to:
  /// **'Item'**
  String get itemTypeUnknown;

  /// No description provided for @bannerOfflineCache.
  ///
  /// In en, this message translates to:
  /// **'Offline — showing last saved content'**
  String get bannerOfflineCache;

  /// No description provided for @bannerStaleCache.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t refresh — showing content from {date}'**
  String bannerStaleCache(String date);

  /// No description provided for @bannerBundled.
  ///
  /// In en, this message translates to:
  /// **'Showing content bundled with the app'**
  String get bannerBundled;

  /// No description provided for @bannerRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get bannerRetry;

  /// No description provided for @errorTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing to show yet'**
  String get errorTitle;

  /// No description provided for @errorBody.
  ///
  /// In en, this message translates to:
  /// **'The content couldn\'t be loaded and no copy is saved on this device.'**
  String get errorBody;

  /// No description provided for @settingsLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get settingsLanguage;

  /// No description provided for @settingsAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get settingsAbout;

  /// No description provided for @settingsContentVersion.
  ///
  /// In en, this message translates to:
  /// **'Content version {version}'**
  String settingsContentVersion(int version);

  /// No description provided for @aboutDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'This app is not affiliated with, endorsed by, or sponsored by Epic Games, Inc. Fortnite is a trademark of Epic Games, Inc.'**
  String get aboutDisclaimer;

  /// No description provided for @spawnsMapTab.
  ///
  /// In en, this message translates to:
  /// **'Map'**
  String get spawnsMapTab;

  /// No description provided for @spawnsListTab.
  ///
  /// In en, this message translates to:
  /// **'List'**
  String get spawnsListTab;

  /// No description provided for @spawnsContestPublic.
  ///
  /// In en, this message translates to:
  /// **'Public'**
  String get spawnsContestPublic;

  /// No description provided for @spawnsContestTournament.
  ///
  /// In en, this message translates to:
  /// **'Tournament'**
  String get spawnsContestTournament;

  /// No description provided for @contestCalm.
  ///
  /// In en, this message translates to:
  /// **'Calm'**
  String get contestCalm;

  /// No description provided for @contestMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get contestMedium;

  /// No description provided for @contestHot.
  ///
  /// In en, this message translates to:
  /// **'Hot'**
  String get contestHot;

  /// No description provided for @spawnsLoot.
  ///
  /// In en, this message translates to:
  /// **'Loot'**
  String get spawnsLoot;

  /// No description provided for @spawnsWhy.
  ///
  /// In en, this message translates to:
  /// **'Why this spot'**
  String get spawnsWhy;

  /// No description provided for @spawnsFilterTitle.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get spawnsFilterTitle;

  /// No description provided for @spawnsFilterAny.
  ///
  /// In en, this message translates to:
  /// **'Any'**
  String get spawnsFilterAny;

  /// No description provided for @spawnsFilterClear.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get spawnsFilterClear;

  /// No description provided for @spawnsNoMatch.
  ///
  /// In en, this message translates to:
  /// **'No spot matches these filters.'**
  String get spawnsNoMatch;

  /// No description provided for @spawnsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No spots published yet.'**
  String get spawnsEmpty;

  /// No description provided for @spawnsMapUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Map image unavailable'**
  String get spawnsMapUnavailable;

  /// No description provided for @spawnsMapAttribution.
  ///
  /// In en, this message translates to:
  /// **'Map via {source}'**
  String spawnsMapAttribution(String source);

  /// No description provided for @spawnsSpotCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No spots} =1{1 spot} other{{count} spots}}'**
  String spawnsSpotCount(int count);

  /// No description provided for @spawnsResetZoom.
  ///
  /// In en, this message translates to:
  /// **'Reset zoom'**
  String get spawnsResetZoom;

  /// No description provided for @spawnsLegend.
  ///
  /// In en, this message translates to:
  /// **'Ring colour = tournament contest'**
  String get spawnsLegend;
}

class _AppL10nDelegate extends LocalizationsDelegate<AppL10n> {
  const _AppL10nDelegate();

  @override
  Future<AppL10n> load(Locale locale) {
    return SynchronousFuture<AppL10n>(lookupAppL10n(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'fr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppL10nDelegate old) => false;
}

AppL10n lookupAppL10n(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppL10nEn();
    case 'fr':
      return AppL10nFr();
  }

  throw FlutterError(
    'AppL10n.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
