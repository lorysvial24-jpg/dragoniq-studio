# Fortnite Meta — app mobile

Flutter, Android d'abord, iOS ensuite. Le contenu éditorial vient de
`../content/` et se met à jour sans republier l'app.

Architecture détaillée : [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Lancer

```bash
flutter pub get
flutter run
```

Aucune clé n'est nécessaire pour démarrer. Pour activer la résolution des
images d'items par nom anglais :

```bash
flutter run --dart-define=FORTNITE_IO_KEY=ta_cle
```

La clé n'est **jamais** écrite dans un fichier du dépôt. Sans elle, l'app
fonctionne : elle utilise les `image_url` du contenu, et affiche un
placeholder pour le reste.

Pour pointer sur un backend local pendant le développement :

```bash
flutter run --dart-define=CONTENT_BASE_URL=http://10.0.2.2:8000/content/v1
```

## Vérifier

```bash
flutter analyze   # doit finir sur "No issues found!"
flutter test      # 33 tests
```

## Le contenu embarqué

`assets/bootstrap/content.json` est une copie de `../content/v1/content.json`.
Il ne sert qu'au tout premier lancement sans réseau : dès qu'un
téléchargement réussit, c'est le cache disque qui prend le relais.

Il n'a donc pas à suivre chaque mise à jour hebdomadaire. Le rafraîchir avant
une publication sur les stores suffit :

```bash
cp ../content/v1/content.json assets/bootstrap/content.json
```

## État d'avancement

| Onglet | État |
|---|---|
| Loadout | fait |
| Spawns | à venir — modèles et données déjà en place |
| Réglages | sélecteur de langue fait, écran « À propos » complet à venir |

## Limite connue

`path_provider` ne fournit pas de dossier applicatif sur le web : le cache
disque y est donc inactif, et l'app retombe sur le contenu embarqué quand le
réseau manque. Sans effet sur Android et iOS, les seules cibles de la V1 ;
le web ne sert qu'aux captures d'écran de développement.
