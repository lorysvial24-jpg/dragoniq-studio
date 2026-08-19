# DragonIQ.Studio

Site vitrine statique du studio DragonIQ.Studio — création de maps Fortnite UEFN.
Objectif unique de la page : amener le visiteur à rejoindre le Discord et à ouvrir un ticket.

## Lancer le site

Aucun build, aucune dépendance à installer. Ouvre `index.html` dans un navigateur.
Pour un aperçu servi en HTTP (recommandé pour tester les partages Open Graph) :

```
npx http-server . -p 8080
```

## Structure

```
index.html     Toutes les sections + SEO (OG, Twitter Card, JSON-LD Organization)
styles.css     Tokens CSS -> reset -> primitives -> header -> sections -> motion
i18n.js        Dictionnaires des 6 langues (objet plat cle -> texte)
main.js        i18n, scroll, reveals, tilt 3D, curseur, ripple, modale FLIP, nav mobile
assets/        Miniatures, favicon, image Open Graph
```

## Remplacer les miniatures

Les images de `assets/` sont des placeholders generes. Remplace-les en gardant les
memes noms de fichier (aucun code a modifier) :

| Fichier                    | Usage                     | Format conseille |
| -------------------------- | ------------------------- | ---------------- |
| `assets/map-1v1.png`       | Carte portfolio 1 + modale | 1600x1000, paysage |
| `assets/map-chapitre2.png` | Carte portfolio 2          | 1600x1000, paysage |
| `assets/map-tycoon.png`    | Carte portfolio 3          | 1600x1000, paysage |
| `assets/og-image.png`      | Partage social            | 1200x630 exactement |

## Ajouter un projet au portfolio

Deux cartes du portfolio sont des emplacements libres (`card--slot`), prets a
recevoir un vrai projet. Pour en remplir un :

1. Dans `index.html`, retire la classe `card--slot` de la carte et remplace le
   `<span class="tag tag--muted">` par un `<span class="tag">`.
2. Mets a jour `style="--thumb:url('assets/...')"` avec la bonne miniature.
3. Dans `i18n.js`, traduis les cles `portfolio.p2.*` (ou `p3.*`) dans les 6 langues.
4. Dans `main.js`, complete l'entree `p2` (ou `p3`) de l'objet `MODALS` : ajoute
   `list: [...]` pour les puces et `actions: [...]` pour les boutons de la modale.

## Ajouter ou modifier un texte

Chaque texte porte un attribut `data-i18n="cle"` dans le HTML. Pour un attribut
plutot que le contenu (ex. `aria-label`), ajoute `data-i18n-attr="aria-label"`.
La cle doit ensuite exister dans les 6 dictionnaires de `i18n.js` — s'il en manque
une, le texte retombe automatiquement sur l'anglais.

## Langues

FR, EN, PT, ES, IT, DE. La langue est detectee via `navigator.languages`
(fallback EN), memorisee dans `localStorage` sous la cle `diq-lang`, et se change
via le menu deroulant du header ou le selecteur du footer. Le changement met a jour
`<html lang>`, le `<title>`, la meta description, les balises Open Graph et Twitter.

## Accessibilite et performances

- Navigation clavier complete (dropdown en pattern listbox, focus piege dans la modale,
  focus restaure a la fermeture), focus visibles, contrastes AA verifies.
- `prefers-reduced-motion` desactive animations, tilt, curseur custom et transitions FLIP.
- Curseur custom et tilt 3D desactives sur tactile.
- Toutes les animations passent par `transform` / `opacity`.

## Deploiement

Heberge tel quel sur n'importe quel hebergeur statique (GitHub Pages, Netlify,
Vercel, Cloudflare Pages). Avant la mise en ligne sur `DragonIQStudio.com`, verifie
que les URLs absolues (`canonical`, `og:url`, `og:image`) pointent bien vers le
domaine final dans `index.html`.
