# Fortnite Meta — architecture

App mobile Flutter (Android puis iOS) pour joueurs compétitifs Fortnite.
Contenu éditorial mis à jour chaque semaine sans republier l'app.

Non affiliée à Epic Games.

## Principe directeur

**Rien de spécifique à une saison ne vit dans le code.** Le nom de la saison,
les items du loadout, les spots, leurs coordonnées, les niveaux de
contestation : tout vient de `content/v1/content.json`. Passer au Chapitre 7
Saison 5 = éditer un JSON, pas recompiler.

## Chaîne de données

```
content/v1/manifest.json   (~250 o)   ──┐
content/v1/content.json    (~15 Ko)   ──┤  GitHub Pages
                                        │
                          ┌─────────────┘
                          v
              ContentRepository
                          │
      ┌───────────────────┼───────────────────┐
      v                   v                   v
  réseau (ETag)      cache disque       asset embarqué
  si version ↑       dernier connu      1er lancement
```

Au lancement : manifeste d'abord. Si `content_version` est inchangé, on
s'arrête là — quelques centaines d'octets. Sinon on tire `content.json`,
on l'écrit sur disque, on le sert.

Réseau injoignable → cache disque. Cache vide (première installation hors
ligne) → asset embarqué dans l'APK. **Il n'existe aucun chemin qui mène à un
écran vide.** Un bandeau discret signale que le contenu affiché est le
dernier connu, avec sa date.

Les images suivent la même logique : `cached_network_image` garde les PNG sur
disque, donc le loadout et la map restent visibles hors ligne après un
premier affichage.

## Arborescence

```
dragoniq-studio/
├── content/                        ← LE BACKEND (servi par GitHub Pages)
│   ├── v1/manifest.json
│   ├── v1/content.json
│   ├── schema/manifest.schema.json
│   ├── schema/content.schema.json
│   └── README.md                   procédure de mise à jour hebdo
├── tool/validate_content.py        schéma + règles métier
├── .github/workflows/validate-content.yml
├── docs/ARCHITECTURE.md
└── fortnite_meta/                  ← L'APP FLUTTER
    ├── assets/
    │   ├── bootstrap/content.json  copie figée, 1er lancement hors ligne
    │   └── images/                 placeholders par type + map de secours
    ├── lib/
    │   ├── main.dart
    │   ├── app.dart                MaterialApp, thème, 3 onglets
    │   │
    │   ├── core/
    │   │   ├── config/app_config.dart      lit les --dart-define
    │   │   ├── network/http_client.dart    timeouts, retry, ETag
    │   │   ├── result.dart                 Result<T> : aucune exception jusqu'à l'UI
    │   │   ├── localized_text.dart         résolution de langue + repli + N/A
    │   │   └── theme/                      app_theme, app_colors, app_spacing
    │   │
    │   ├── l10n/app_en.arb, app_fr.arb     libellés d'INTERFACE
    │   │
    │   ├── data/
    │   │   ├── models/
    │   │   │   season.dart, loadout_slot.dart, spot.dart,
    │   │   │   contest_level.dart, manifest.dart, content_bundle.dart
    │   │   ├── content/
    │   │   │   ├── content_source.dart        interface — point de bascule
    │   │   │   ├── github_content_source.dart
    │   │   │   ├── content_cache.dart
    │   │   │   └── content_repository.dart
    │   │   └── images/
    │   │       ├── item_image_resolver.dart   les 4 niveaux
    │   │       ├── fortnite_io_loot_api.dart  ⚠ SEUL fichier couplé à fortniteapi.io
    │   │       └── map_image_api.dart         fortnite-api.com /v1/map
    │   │
    │   ├── features/
    │   │   ├── loadout/   loadout_page, loadout_slot_card, loadout_controller
    │   │   ├── spawns/    spawns_page, map_view, spot_marker, spot_sheet,
    │   │   │              spots_list_view, spot_filters, spawns_controller
    │   │   └── settings/  settings_page, language_page, about_page
    │   │
    │   └── shared/widgets/
    │       offline_banner, na_text, placeholder_image, contest_chip, error_state
    └── test/
```

### Pourquoi ce découpage

`core/` ne connaît aucune feature. `data/` ne connaît aucun widget.
`features/` ne parle jamais au réseau directement. Conséquence pratique :
changer de backend ne touche que `data/content/`, changer d'API d'images ne
touche que `data/images/`.

**`fortnite_io_loot_api.dart` est le seul fichier qui connaît le nom des
champs de fortniteapi.io.** Tant que la vraie réponse JSON n'est pas
disponible, il expose une interface stable (`Future<Map<String, String>>
iconUrlsByName()`) et le reste de l'app est déjà écrit contre elle.

## Deux systèmes de traduction, et c'est volontaire

| | Interface | Contenu éditorial |
|---|---|---|
| Exemples | « Réglages », « Loot », « Chaud » | noms de spots, phrases « pourquoi » |
| Format | ARB (`l10n/app_*.arb`) | maps `{"en":…, "fr":…}` dans le JSON |
| Publié par | une release de l'app | un push sur `main` |
| Rythme | rare | hebdomadaire |

Les mélanger obligerait à republier l'app pour corriger une faute dans un
texte de spot. C'est exactement ce qu'on veut éviter.

Le contenu embarque **toutes** les langues d'un coup (~15 Ko) : changer de
langue est instantané et fonctionne hors ligne, sans re-télécharger.

### Repli de langue

`langue demandée` → `default_language` du manifeste → `"N/A"`.

On ne montre jamais du français à un anglophone en douce. Un texte vide n'est
pas une erreur : c'est un placeholder que l'éditeur n'a pas encore rempli,
et `N/A` le dit honnêtement.

## Onglet 1 — Loadout

5 slots. L'image de l'item est l'élément dominant de chaque carte ; le nom et
la phrase « pourquoi » sont secondaires. Aucune mention de rareté nulle part,
ni dans le modèle de données, ni à l'écran.

Résolution d'image en 4 niveaux (`item_image_resolver.dart`) :
`image_url` → `api_id` → recherche par `name` anglais normalisé → placeholder
typé selon `type`. Chaque niveau échoue en silence vers le suivant.

Conséquence importante : si `image_url` est rempli pour les 5 slots,
**l'app n'a besoin d'aucune clé API**.

## Onglet 2 — Spawns

Map plein écran dans un `InteractiveViewer` (pinch-zoom, pan). Marqueurs
positionnés en pourcentage via `LayoutBuilder` :

```dart
left: constraints.maxWidth  * spot.x / 100
top:  constraints.maxHeight * spot.y / 100
```

Les marqueurs contre-scalent au zoom : ils gardent leur taille de touche
au doigt quel que soit le niveau de zoom.

Tap sur un marqueur → fiche en bottom sheet : nom, les deux niveaux de
contestation côte à côte, loot, phrase « pourquoi ». Chaque champ vide
affiche `N/A`.

Vue liste alternative (bascule dans l'app bar) avec deux filtres
**indépendants** : contestation publique et contestation tournoi. Un spot
sans niveau renseigné n'est jamais masqué par un filtre — il apparaît avec
`N/A`, parce que « inconnu » n'est pas « calme ».

## Onglet 3 — Réglages

Choix de la langue, alimenté par `manifest.languages` : ajouter une langue au
backend la fait apparaître ici sans toucher au code. Écran « À propos » avec
le disclaimer de non-affiliation à Epic Games, la version de contenu affichée
et la date de dernière mise à jour.

## Configuration et secrets

Aucune clé dans le code, aucune clé dans git. Injection au build :

```bash
flutter run --dart-define=FORTNITE_IO_KEY=xxxx
```

`app_config.dart` lit `String.fromEnvironment`. Absente, la clé vaut `""` :
l'app démarre normalement, l'étape 3 de la résolution d'image est simplement
sautée. **Une clé manquante dégrade, elle ne casse pas.**

À savoir : une clé injectée au build reste extractible de l'APK. Le
`--dart-define` protège le dépôt, pas le binaire. Raison de plus pour
privilégier `image_url` dans le contenu.

## Choix techniques

| Sujet | Choix | Raison |
|---|---|---|
| État | Riverpod | `AsyncValue` modélise exactement loading / données / erreur-avec-cache-périmé, le cœur de cette app |
| HTTP | `http` + ETag | pas besoin de Dio pour deux endpoints |
| Cache images | `cached_network_image` | disque, hors ligne, placeholder intégré |
| Cache contenu | fichier JSON + `shared_preferences` | le contenu est un document, pas une base |
| Sérialisation | manuelle, tolérante | un champ inconnu ou d'un mauvais type ne doit jamais lever |

Sur le dernier point : chaque `fromJson` est défensif. Un `contest` valant
`"chaud"` au lieu de `"hot"` donne `ContestLevel.unknown` et affiche `N/A`.
Il ne lève pas d'exception et ne fait pas tomber l'écran entier.

## Hors périmètre V1

Pas de rotations ni de tracés sur la map, pas de comptes, pas de pubs, pas de
stats par rareté, pas de calculateur de dégâts, pas de favoris.
