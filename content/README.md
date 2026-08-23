# Contenu éditorial — Fortnite Meta

Ce dossier **est** le backend de l'app mobile. Aucune base de données, aucune
clé : l'app lit ces fichiers en HTTP via Cloudflare Pages.

Modifier un fichier ici et pousser sur `main` = mise à jour chez tous les
joueurs, sans republier l'app.

## URLs servies

```
https://dragoniqstudio.com/content/v1/manifest.json
https://dragoniqstudio.com/content/v1/content.json
```

## Mise à jour hebdomadaire

1. Éditer `v1/content.json`.
2. **Incrémenter `content_version` dans `v1/content.json` ET dans `v1/manifest.json`.**
   Les deux, avec la même valeur. Sans ça l'app garde son cache et ne voit
   jamais la mise à jour — la CI bloque si tu oublies.
3. Mettre `updated_at` à jour dans `v1/manifest.json`.
4. Pousser. La CI valide ; si elle est rouge, l'app n'est pas impactée
   (elle continue de servir la version précédente depuis son cache).

Vérification locale avant de pousser :

```bash
pip install 'jsonschema[format]'
python tool/validate_content.py
```

## Règles de contenu

**Une chaîne vide est un placeholder assumé.** L'app affiche `N/A` et ne
devine jamais. Ne remplis jamais un champ « au cas où » : mieux vaut `N/A`
qu'une donnée de gameplay inventée.

**Les positions `x` / `y` sont en pourcentage de l'image de map**, jamais en
pixels. Origine en haut à gauche, `0` à `100`. Elles restent justes si Epic
change la résolution de la map.

**`contest.public` et `contest.tournament` sont indépendants.** Valeurs
autorisées : `"calm"`, `"medium"`, `"hot"`, ou `null` si tu ne sais pas.
Un spot calme en public peut être chaud en tournoi, c'est tout l'intérêt
d'avoir les deux.

**Le champ `name` d'un slot de loadout est le nom anglais officiel de l'item.**
Il sert de clé pour retrouver l'image via l'API. Ne le traduis pas — pour
l'affichage, utilise `display_name`.

## Résolution des images d'items, dans l'ordre

| Niveau | Champ | Quand l'utiliser |
|---|---|---|
| 1 | `image_url` | L'API se trompe ou ne connaît pas l'item. Colle l'URL, c'est réglé. |
| 2 | `api_id` | L'item existe dans l'API mais son nom est ambigu. Le plus robuste. |
| 3 | `name` | Cas normal. L'app cherche par nom anglais. |
| 4 | — | Rien n'a marché : placeholder selon `type`. Jamais de crash. |

## Ajouter une langue

1. Ajouter `{ "code": "es", "label": "Español" }` dans `manifest.languages`.
2. Ajouter la clé `"es"` dans **chaque** bloc de texte de `content.json`
   (la CI liste précisément ceux qui manquent).
3. Ajouter `lib/l10n/app_es.arb` côté app pour les libellés d'interface.

Une clé absente est une erreur bloquante ; une clé vide est un avertissement
et affiche `N/A`. C'est volontaire : ça rend visible ce qui reste à traduire.

## Relecture à faire

Les `spots[].loot.en` ont été traduits littéralement depuis le français
fourni. Ce ne sont pas forcément les termes officiels anglais du jeu
(« bornes de mobilité » → « mobility stations » notamment). À relire.

## Cache et propagation

Le fichier `_headers` à la racine du dépôt fixe `max-age=300` sur `/content/*`.
Une mise à jour est donc visible par les joueurs en **5 minutes maximum**,
sans purge manuelle du CDN.

L'app envoie en plus un `If-None-Match` : si rien n'a changé, Cloudflare
répond `304 Not Modified` et aucune donnée n'est retéléchargée.

Après le premier déploiement, vérifier une fois que l'URL répond bien :

```bash
curl -sI https://dragoniqstudio.com/content/v1/manifest.json | head -5
```

Si tu obtiens un 404, c'est que le projet Cloudflare Pages est configuré avec
un dossier de build autre que la racine du dépôt — il faut alors y copier
`content/` à l'étape de build.
