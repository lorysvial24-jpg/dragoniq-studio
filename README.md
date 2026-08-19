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
index.html     Loader + sections + SEO (OG, Twitter Card, JSON-LD Organization)
styles.css     Tokens & palettes -> reset -> chrome -> primitives -> sections -> marquee -> modale
               -> loader -> son -> portfolio scroll -> versus -> FAQ -> motion
i18n.js        Dictionnaires des 6 langues (objet plat cle -> texte)
main.js        i18n, son, loader, marquees, scroll, reveals, tilt 3D, curseur, ripple,
               modale FLIP, portfolio scroll, FAQ, nav mobile
assets/        Logo, miniatures des maps
```

Ordre des sections : hero (violet) -> bandeau cyan -> services (bleu electrique) ->
portfolio (bleu puis cramoisi, selon la map) -> versus (creme, texte sombre) ->
process (magenta) -> tarifs (orange, texte sombre) -> FAQ (turquoise profond) ->
bandeau violet -> contact (prune).

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

## Ecran de chargement

Le pourcentage suit le **vrai** chargement : `initLoader()` liste les `src` de toutes
les `<img>` de la page, les recharge via des objets `Image()` detaches (ce qui contourne
`loading="lazy"`), et compte une unite supplementaire pour `document.fonts.ready`. Le
compteur affiche se rapproche de la valeur reelle sans jamais la depasser — il n'y a
aucun timer decoratif.

Un filet de securite force la fin au bout de 8 s pour ne jamais bloquer un visiteur
derriere une requete qui ne repond pas. Sans JavaScript, un `<noscript>` masque le loader.
Une fois termine, il se retire vers le haut et **c'est seulement a ce moment** que les
revelations au scroll s'initialisent, pour que le hero s'anime vraiment a l'arrivee.

## Sons

Tout est synthetise avec la Web Audio API : aucun fichier, aucune dependance.

| Son      | Quand                          | Synthese                                  |
| -------- | ------------------------------ | ----------------------------------------- |
| `pop`    | survol cartes / boutons / liens | sinus 620 -> 880 Hz, 70 ms                |
| `click`  | pression                        | triangle 340 -> 190 Hz + sinus 900 Hz     |
| `whoosh` | ouverture / fermeture de modale | bruit blanc filtre en bande, balaye       |
| `chord`  | changement de section au scroll | triade majeure en trois sinus decales     |

Regles appliquees :

- **Coupe par defaut.** Le bouton du header (toujours visible, y compris sur mobile)
  bascule l'etat, memorise dans `localStorage` (`diq-sound`).
- **Aucun son avant un geste utilisateur** : l'`AudioContext` n'est meme pas cree tant
  que le visiteur n'a pas clique ou tape une touche (les navigateurs le bloqueraient).
- **Desactive si `prefers-reduced-motion` est actif** : le bouton est alors masque.
- Le `pop` est limite a un toutes les 70 ms pour ne pas mitrailler au survol d'une grille.

Pour changer le volume general, voir `master.gain.value` dans le module `Sound` de `main.js`.

## Portfolio pilote par le scroll

Chaque map occupe un ecran (`.map`, `min-height: 100svh`). Un IntersectionObserver
detecte la map active, applique `tone-1` / `tone-2` sur la section — ce qui repeint
tout son fond et son encre via les variables CSS — et met a jour les points lateraux.
L'indicateur « Scroller pour decouvrir » disparait des que la premiere map est atteinte.

Pour ajouter une map : duplique un `<article class="map" data-tone="N">`, ajoute un
`.maps__dot` avec le `data-goto` correspondant, cree la palette `.sec--maps.tone-N`
dans `styles.css`, puis les cles i18n et l'entree `MODALS` (voir plus bas).

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

1. Duplique un `<article class="map" data-tone="N">` dans `index.html` et ajoute le
   `.maps__dot` correspondant.
2. Ajoute la palette `.sec--maps.tone-N` dans `styles.css`.
3. Ajoute les cles `portfolio.pN.*` dans les 6 dictionnaires de `i18n.js`.
4. Ajoute l'entree `pN` dans l'objet `MODALS` de `main.js` (`media`, `list`, `actions`).

## Modifier la FAQ

Les questions et reponses vivent uniquement dans `i18n.js` (`faq.q1`..`faq.q6`,
`faq.a1`..`faq.a6`). Pour ajouter une entree, duplique un `.faq__item` dans
`index.html` en incrementant les identifiants `faqB7` / `faqP7`, puis ajoute les
cles dans les 6 langues.

> Les reponses sur les **droits** et le **paiement** engagent commercialement :
> relis-les et ajuste-les a ta pratique reelle avant la mise en ligne.

## Modifier la section versus

Quatre lignes `versus.rN.bad` / `versus.rN.good` dans `i18n.js`. Le texte barre utilise
la balise `<s>` (semantiquement « ce n'est plus valable »), barree en rouge via
`text-decoration-color`.

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
- FAQ en pattern *disclosure* (`aria-expanded` + `aria-controls`), points du portfolio
  avec `aria-current`, loader en `role="progressbar"` avec `aria-valuenow` (le compteur
  visuel est `aria-hidden` pour ne pas inonder les lecteurs d'ecran).
- Attention aux surfaces translucides : un voile **blanc** pose sur une section de
  ton moyen eclaircit le fond et fait passer le texte secondaire sous AA. Les cartes
  du process et de la FAQ utilisent donc un voile sombre.

## Deploiement

Hebergeable tel quel sur n'importe quel hebergeur statique (GitHub Pages, Netlify,
Vercel, Cloudflare Pages). Avant la mise en ligne sur `DragonIQStudio.com`, verifie que
les URLs absolues (`canonical`, `og:url`, `og:image`) pointent vers le domaine final.
