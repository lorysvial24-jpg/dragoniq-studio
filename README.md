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
index.html     Sections + SEO (OG, Twitter Card, JSON-LD Organization)
styles.css     Tokens & palettes de section -> reset -> chrome -> primitives -> sections -> marquee -> modale -> motion
i18n.js        Dictionnaires des 6 langues (objet plat cle -> texte)
main.js        i18n, marquees, scroll, reveals, tilt 3D, curseur, ripple, modale FLIP, nav mobile
assets/        Logo, miniatures des maps
```

## Le systeme de couleurs

Chaque section declare sa propre palette en variables CSS, et **aucun composant ne
code une couleur en dur**. Textes, boutons, bordures et lueurs heritent de la section,
donc tout s'inverse automatiquement sur les sections claires en gardant un contraste AA.

```css
.sec--orange {
  --sec-bg: #FF7A18;      /* fond de la section          */
  --sec-ink: #2B1004;     /* texte principal             */
  --sec-ink-soft: #61300F;/* texte secondaire            */
  --sec-accent: #2E0B63;  /* kicker, chiffres, details   */
  --sec-glow: ...;        /* lueur des boutons et du logo*/
  --sec-btn-bg / --sec-btn-ink;
}
```

Rythme actuel : violet profond (hero) → bandeau cyan → bleu electrique (services) →
creme (portfolio, texte sombre) → magenta (process) → orange (tarifs, texte sombre) →
bandeau violet → prune (contact).

Pour ajouter une section, cree une classe `.sec--xxx` sur ce modele et verifie le
contraste du couple `--sec-bg` / `--sec-ink-soft` (viser 4.5:1 minimum).

Le header detecte la section qu'il survole et bascule son encre via `data-tone`
(`light` / `dark`) — la liste des fonds clairs est dans `collectToneBlocks()` de `main.js`.

## Assets

| Fichier                   | Usage                                              | Format conseille    |
| ------------------------- | -------------------------------------------------- | ------------------- |
| `assets/logo.png`         | Header, footer, favicon, Open Graph / Twitter Card | Carre, 768x768, rond sur fond transparent |
| `assets/map-1v1.png`      | Carte portfolio 1 + modale                          | 1200x750, paysage   |
| `assets/map-redblue.png`  | Carte portfolio 2 + modale                          | 1200x750, paysage   |

> **`logo.png` et `map-redblue.png` sont des stand-ins generes.** Remplace-les par tes
> vrais fichiers en gardant exactement ces noms — aucun code a modifier. Le logo est
> toujours affiche en rond (`border-radius: 50%`) avec une lueur `drop-shadow` qui reprend
> l'accent de la section : fournis-le carre, idealement avec un fond transparent hors du disque.
> Pense a compresser les images finales (les placeholders sont volontairement bruts).

Le logo sert aussi d'image de partage social. C'est un carre, donc la Twitter Card est
en `summary` (vignette carree) et non `summary_large_image`, qui rognerait le disque.
Si tu preferes une banniere 1200x630 dediee, ajoute-la dans `assets/` et pointe
`og:image` / `twitter:image` dessus dans `index.html`.

## Ajouter un projet au portfolio

1. Duplique un `<article class="work tilt" data-modal="pN">` dans `index.html`,
   change `data-modal`, l'image et les cles `data-i18n`.
2. Ajoute les cles `portfolio.pN.*` dans les 6 dictionnaires de `i18n.js`.
3. Ajoute l'entree `pN` dans l'objet `MODALS` de `main.js` (`media`, `list`, `actions`).

## Ajouter ou modifier un texte

Chaque texte porte un attribut `data-i18n="cle"`. Pour renseigner un attribut plutot
que le contenu (ex. `aria-label`), ajoute `data-i18n-attr="aria-label"`. La cle doit
exister dans les 6 dictionnaires — sinon le texte retombe automatiquement sur l'anglais.

Le texte des bandeaux defilants vient de la cle `marquee.text` ; il est repete et
duplique par `renderMarquees()` pour que la boucle soit invisible a n'importe quelle
largeur d'ecran.

## Langues

FR, EN, PT, ES, IT, DE. Detection via `navigator.languages` (fallback EN), memorisation
dans `localStorage` (`diq-lang`), changement par le menu du header ou le selecteur du
footer. Met a jour `<html lang>`, le `<title>`, la meta description, les balises Open
Graph / Twitter et les bandeaux marquee.

## Accessibilite et performances

- Navigation clavier complete (dropdown en pattern listbox, focus piege dans la modale,
  focus restaure a la fermeture), focus visibles adaptes au fond, contrastes AA verifies
  sur chaque palette.
- `prefers-reduced-motion` coupe animations, tilt, curseur custom, marquees et transitions
  FLIP, et met en pause les blobs SVG (SMIL, via `pauseAnimations()`).
- Curseur custom et tilt 3D desactives sur tactile ; il utilise `mix-blend-mode: difference`
  pour rester visible sur les fonds clairs comme sombres.
- Animations en `transform` / `opacity`. Seuls les marquees utilisent une courbe `linear` :
  c'est le seul timing qui donne un defilement continu sans a-coup a la boucle.

## Deploiement

Hebergeable tel quel sur n'importe quel hebergeur statique (GitHub Pages, Netlify,
Vercel, Cloudflare Pages). Avant la mise en ligne sur `DragonIQStudio.com`, verifie que
les URLs absolues (`canonical`, `og:url`, `og:image`) pointent vers le domaine final.
