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
builder.html   Constructeur de map (header/footer/modale partages)
merci.html     Page de confirmation apres paiement Stripe
builder.css    Styles propres au constructeur (le reste vient de styles.css)
builder.js     Moteur isometrique 2D : apercu d'accueil + repli du constructeur
builder3d.js   Constructeur 3D three.js (scene, orbite maison, export)
hero3d.js      Fond shader GLSL + diorama low-poly du hero (three.js, repli automatique)
fx.js          Couche d'animation : typo cinematique, magnetisme, speculaire,
               onde de choc, particules, parallaxe, curseur, garde-fou 60 fps
tools.js       Estimateur de prix, generateur de brief, carrousel de temoignages
theme.js       Panneau de personnalisation du theme cote visiteur
styles.css     Tokens & palettes -> reset -> chrome -> primitives -> sections -> marquee -> modale
               -> loader -> son -> portfolio scroll -> versus -> FAQ -> motion
i18n.js        Dictionnaires des 6 langues (objet plat cle -> texte)
main.js        i18n, son, loader, marquees, scroll, reveals, tilt 3D, curseur, ripple,
               modale FLIP, portfolio scroll, FAQ, nav mobile, badge de dispo, compteurs
               + les constantes reglables : STRIPE_LINK, PRICING, STATS, AVAILABILITY
assets/        Logo, miniatures des maps
```

Ordre des sections : hero (violet) -> bandeau cyan -> services (bleu electrique) ->
estimateur (vert profond) -> portfolio (bleu puis cramoisi, selon la map) ->
bandeau de compteurs (nuit) -> versus (creme, texte sombre) -> constructeur (nuit) ->
process (magenta) -> tarifs (orange, texte sombre) -> temoignages (jaune, texte sombre) ->
FAQ (turquoise profond) -> bandeau violet -> contact (prune).

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

L'adoucissement du compteur se fait sur une courbe en temps reel (et non par image),
pour qu'un appareil qui tourne a 10 images par seconde ne rallonge pas l'ecran de
chargement de plusieurs secondes. Un filet de securite force la fin au bout de 8 s
pour ne jamais bloquer un visiteur derriere une requete qui ne repond pas. Sans JavaScript, un `<noscript>` masque le loader.
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

> Les reponses de la FAQ engagent commercialement (paiement PayPal, publication sur
> le compte createur DragonIQ, absence de remboursement, modifications hors prix de
> base). Relis-les si ta pratique evolue.

## Modifier la section versus

Quatre lignes `versus.rN.bad` / `versus.rN.good` dans `i18n.js`. Le texte barre utilise
la balise `<s>` (semantiquement « ce n'est plus valable »), barree en rouge via
`text-decoration-color`.

## Atmosphere du hero

Le fond du hero n'est pas un aplat : c'est un empilement de cinq `.cloud` (violet,
magenta, bleu electrique, orange, cyan) en `mix-blend-mode: screen` sur une base tres
sombre (`#1B0140`), plus deux blobs SVG qui se deforment en boucle. Chaque nuage a sa
propre duree, son propre flou et son propre delai, donc les couleurs se recouvrent et
se melangent en permanence sans jamais repasser par le meme etat.

La profondeur vient de l'attribut `data-depth` : `initHeroDepth()` deplace chaque
couche proportionnellement a sa valeur (les plans proches bougent jusqu'a cinq fois
plus que les plans lointains), a la souris comme au scroll. Par-dessus, une lueur
suit le curseur et un grain anime en `steps()` donne la texture.

Le titre est decoupe mot par mot par `splitHeroTitle()` : chaque mot est masque par un
conteneur en `overflow: hidden` et remonte avec un decalage de 85 ms. Le decoupage est
refait a chaque changement de langue ; si l'entree a deja joue, les nouveaux mots
s'affichent directement au lieu de rejouer l'animation.

> L'animation d'un `<svg>` remplacerait la transformation de parallaxe posee sur le
> meme element : la rotation des blobs est donc appliquee au `<path>` interieur.

## Ajouter ou modifier un texte

Chaque texte porte un attribut `data-i18n="cle"`. Pour renseigner un attribut plutot
que le contenu (ex. `aria-label`), ajoute `data-i18n-attr="aria-label"`. La cle doit
exister dans les 6 dictionnaires — sinon le texte retombe automatiquement sur l'anglais.

Le texte des bandeaux defilants vient de la cle `marquee.text` ; il est repete et
duplique par `renderMarquees()` pour que la boucle soit invisible a n'importe quelle
largeur d'ecran.

## Langues

Chaque page declare ses propres cles de metadonnees via `<html data-meta="...">` :
la page d'accueil utilise `meta.*`, le constructeur `builder.meta.*`.

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
- Barre de progression de lecture, retour en haut, copie du code d'ile, skeleton sur
  les miniatures, transition entre pages et konami code sont tous dans `main.js`.
- Attention aux surfaces translucides : un voile **blanc** pose sur une section de
  ton moyen eclaircit le fond et fait passer le texte secondaire sous AA. Les cartes
  du process et de la FAQ utilisent donc un voile sombre.

## Le constructeur de map

`builder.html` laisse un visiteur esquisser sa map en isometrique, l'exporter en PNG
et joindre l'image a son ticket. Aucune dependance : tout est du canvas 2D.

**Geometrie.** `project(x, y, z)` est lineaire, donc les coordonnees fractionnaires se
projettent aussi bien que les entieres — c'est ce qui permet a une seule primitive
(`box()`) de dessiner aussi bien une tuile entiere qu'une marche d'escalier. Grille de
24x24 sur 6 niveaux, tri painter par `x + y` puis `z`.

**Rendu a la demande.** La boucle ne repeint que si un drapeau `dirty` est leve : zero
repaint au repos (mesure), et le cout de dessin reste sous le budget 60 fps
(mesure : 1,5 ms a 200 blocs, 4,6 ms a 800, 13,4 ms a 2000). La liste de cellules est
mise en cache et invalidee a chaque mutation.

**Le lattice suit le niveau actif.** Quand on monte d'un cran, le plan de pose monte
aussi : dessiner la grille au sol donnerait l'impression de viser a cote. La grille
claire est donc tracee sur le plan courant, le sol restant visible en filigrane.

**Historique.** Un appui-glisser-relacher = une entree contenant les `{cle, avant,
apres}` de toutes les cases touchees, plafonne a 60 entrees. « Tout effacer » est
enregistre comme une seule entree, donc annulable.

**Export.** `renderExport()` recadre la scene sur les blocs poses, ajoute le titre, le
nombre de blocs, la legende des elements utilises et la signature. Le logo est dessine
quand il est disponible ; ouvert en `file://` il « teinte » le canvas et `toDataURL`
leve une exception — le code retombe alors sur une signature texte. Les deux chemins
sont testes.

**Ajouter un element.** Une entree dans `ELEMENTS` (`id`, `cat`, `role`, hauteur,
`shape`), la cle `builder.el.<id>` dans les 6 langues, et c'est tout : l'icone de la
palette est dessinee avec le meme code que le bloc, donc les deux ne peuvent pas
diverger. Les couleurs viennent du `role`, que chaque theme remappe — aucune couleur
codee en dur par element.

**Themes.** `THEMES` mappe role -> couleur pour Fortnite classique, Desert, Neige,
Neon et Horreur. Les faces sont derivees automatiquement (dessus eclairci, gauche
moyenne, droite assombrie).

**Tactile.** Appui pour poser, appui long pour supprimer, deux doigts pour deplacer et
zoomer. Sous 760 px un bandeau suggere l'ordinateur sans jamais bloquer l'outil.

**Sauvegarde.** Le plan est ecrit dans `localStorage` (`diq-builder`) avec un debounce
de 400 ms, sous forme compacte `[x, y, z, type, rotation]`.

## Personnalisation du theme par le visiteur

Chaque couleur de section est declaree en deux temps :

```css
.sec--violet { --sec-bg: var(--u-hero-bg, #1B0140); }
```

Le panneau n'ecrit **que** les `--u-*` sur `:root`. Il ne lutte donc jamais contre la
feuille de style sur la specificite, aucun `!important` n'est necessaire, et un
visiteur qui ne touche a rien garde le design d'origine. Tout est stocke dans
`localStorage` (`diq-theme`), donc strictement local a son appareil.

Les controles sont **generes depuis un registre** (`SECTIONS` x `ROLES` dans
`theme.js`) : ajouter une section au site, c'est ajouter une entree dans ce tableau.
Les valeurs par defaut qui y figurent doivent refleter `styles.css` — ce sont elles
qui alimentent les color pickers et le bouton Reinitialiser.

Reglages globaux : rayon des coins, intensite des animations (`data-motion` sur
`<html>`), grain, flou du fond, son, couleur et texte des boutons. Quatre themes
predefinis (Defaut, Sombre, Neon, Pastel) repartent toujours d'une table rase, donc
ils ne s'heritent jamais entre eux.

Un court script inline dans le `<head>` de chaque page reapplique le theme **avant le
premier rendu**, pour eviter un flash aux couleurs d'origine. Pendant que le panneau
est ouvert, la classe `theming` coupe les transitions des sections : sans cela le
fondu de 850 ms rendrait chaque color picker inutilisable.

Le registre couvre les douze sections, estimateur et temoignages compris. Comme le
diorama du hero lit ses couleurs sur `#hero`, chaque ecriture appelle aussi
`DIQ_HERO3D.retheme()` : la scene 3D suit donc le theme au meme titre que le CSS.

## Le constructeur 3D

`builder3d.js` construit une scene three.js : orbite implementee a la main (glisser
gauche pour tourner, molette pour zoomer, glisser droit pour deplacer), raycast sur un
plan a la hauteur du niveau courant, lumiere directionnelle avec ombres douces, ciel en
degrade suivant le theme, et de vrais volumes pour les 13 elements.

**three.js est charge dynamiquement avec une echeance de 7 s**, pas par une balise
`<script>` bloquante : un CDN lent, bloque ou hors service ne doit jamais laisser la
page sans constructeur utilisable. Si le chargement echoue, `builder.js` demarre son
moteur isometrique 2D sur le meme canvas et un message l'explique. Les deux moteurs
partagent `ELEMENTS`, `THEMES`, le stockage et les icones de palette.

> Le rendu WebGL lui-meme n'a pas pu etre verifie ici : la politique reseau de
> l'environnement de developpement bloque cdnjs. La logique (construction des 13
> geometries, 5 themes, historique, export, vue de dessus) a ete exercee contre un
> stub de l'API three.js. **A regarder une premiere fois sur un vrai poste.**

## Paiement

`STRIPE_LINK` est en tete de `main.js` avec le placeholder
`https://buy.stripe.com/REMPLACER`. Tout element portant `data-stripe` recoit ce lien
au chargement, donc il n'y a qu'un seul endroit a modifier. Stripe doit rediriger vers
`merci.html` apres paiement.

## Le diorama du hero

`hero3d.js` remplace le fond du hero par une ile flottante low-poly en three.js :
socle de terre, herbe, racines pendantes, trois maisons, un pont, des arbres, des
rochers, un portail lumineux au centre et des particules qui derivent a des vitesses
differentes. L'ile tourne lentement sur elle-meme ; la rotation ralentit et s'incline
en suivant la souris.

* **Budget** : `TRI_BUDGET = 5000` triangles. La scene reelle en compte ~870 ; si tu
  ajoutes des elements, `tally()` previent dans la console au-dela du budget.
* **Performance** : `powerPreference: 'high-performance'`, boucle de rendu arretee des
  que le hero sort de l'ecran (IntersectionObserver) ou que l'onglet passe en arriere-plan,
  et moins de particules sur pointeur grossier (7 au lieu de 16).
* **Couleurs** : la scene lit les variables `--sec-*` calculees sur `#hero`, donc le
  theme choisi par le visiteur la repeint. Chaque ecriture du panneau appelle
  `DIQ_HERO3D.retheme()` (regroupe sur une frame).
* **Repli** : si `prefers-reduced-motion` est actif, si WebGL manque, ou si le CDN ne
  repond pas en 7 s, `#heroScene` passe en `data-mode="fallback"` et le fond de degrade
  anime reste seul. Le titre est lisible dans les deux cas.

* **Facettes** : les materiaux sont en `MeshPhongMaterial` avec `flatShading`.
  `MeshLambertMaterial` eclaire par sommet et **ignore `flatShading`** — avec lui
  l'ile n'etait pas facettee du tout, ce qui vide le style low-poly de son sens.

> Le rendu WebGL a ete verifie cette fois, contre le vrai three.js r128 servi
> localement : le shader s'anime, la souris deforme le champ, le morphing suit
> le scroll, l'echelle de qualite descend et remonte. Reste que cet
> environnement rasterise en logiciel — les couleurs et le mouvement sont bons,
> mais **la fluidite reelle demande un vrai GPU pour etre jugee.**

## Estimateur de prix

Les tarifs vivent dans l'objet `PRICING`, en tete de `main.js` :

```js
var PRICING = {
  base:    { '1v1': 30, boxfight: 40, tycoon: 60, rp: 60, zonewars: 60, other: 60 },
  size:    { small: 1, medium: 1.6, large: 2.4 },   // multiplicateur sur la base
  options: { verse: 25, decor: 20, multi: 30, hud: 15, shop: 20 },  // supplement fixe
  rush: 1.35,      // multiplicateur delai urgent
  spread: 0.35,    // haut de fourchette = bas x (1 + spread)
  currency: '€'
};
```

Calcul : `base x multiplicateur de taille + somme des options`, puis `x rush` si le
delai est urgent. Les deux bornes sont arrondies au multiple de 5 le plus proche pour
qu'elles se lisent comme un devis. A chaque changement les chiffres defilent jusqu'a la
nouvelle valeur ; sous `prefers-reduced-motion` ils sautent directement. Un
`role="status"` invisible annonce la fourchette finale une fois l'animation posee, pour
ne pas bavarder pendant le defilement.

## Generateur de brief

Le bouton **Preparer ma demande** (carte de l'estimateur et section contact) ouvre une
modale a sept questions, une a la fois : type de map, nombre de joueurs, ambiance,
mecaniques, references, delai, budget. Entree passe a la suivante, Maj+Entree garde le
saut de ligne, **Passer** laisse la reponse vide. A la fin le texte formate s'affiche
dans un bloc avec un bouton de copie, un lien vers le ticket Discord et un rappel qu'on
peut joindre le PNG exporte depuis le constructeur.

Les libelles du brief sortent des cles `brief.l1` a `brief.l7` : changer de langue en
cours de questionnaire conserve les reponses et retraduit tout.

## Preuve sociale

* **Compteurs** : les trois chiffres du bandeau viennent de `STATS` en tete de
  `main.js` (`maps`, `clients`, `years`). Ce sont des **placeholders** : mets les vrais
  chiffres avant la mise en ligne.
* **Temoignages** : trois cartes dans un carrousel (fleches, points, fleches du clavier
  sur les points). Defilement automatique toutes les 7 s, en pause au survol, au focus
  et onglet cache, desactive sous `prefers-reduced-motion`. Les textes sont des
  placeholders traduits (`proof.t1.*` a `proof.t3.*`) — **a remplacer par de vrais
  retours**.
* **Badge de disponibilite** : la constante `AVAILABILITY` en tete de `main.js` vaut
  `'open'` (vert, point qui pulse) ou `'full'` (orange). Le badge est masque sous 860 px
  pour laisser la place au burger.

## La couche d'animation (`fx.js`)

Tout ce qui bouge cote DOM vit dans `fx.js`, sous deux regles :

1. **Une seule boucle rAF.** Tous les effets sont des jobs sur le meme
   « chef d'orchestre », qui lit la position de scroll une fois par frame et la
   distribue. Aucun effet n'ouvre sa propre boucle.
2. **Aucun reflow dans une frame.** Les mesures se font dans `Metrics`, jamais
   pendant le scroll : chaque effet stocke ses positions en *coordonnees
   document*, et la frame convertit en coordonnees ecran par une soustraction.
   Les frames n'ecrivent que `transform`, `opacity` et `filter`.

Ce qu'il contient :

| Effet | Ou | Notes |
| ----- | -- | ----- |
| Titre lettre par lettre | hero | chaque lettre arrive d'un `translateZ` different avec un flou qui se resout |
| Masques de ligne | titres de section | les lignes sont mesurees puis reconstruites, remesurees au resize et au changement de langue |
| Mot sur cylindre 3D | hero | `1v1 / Tycoon / RP / Box Fight / Zone Wars`, faces reparties sur un cylindre |
| Lettres magnetiques | gros titres | champ de repulsion, mesure a l'entree du pointeur |
| Boutons magnetiques | partout | ressort amorti, deplacement **plafonne** (sans plafond deux boutons voisins se rejoignent) |
| Cartes speculaires | portfolio, services, paiement | rotation 3D + reflet qui se deplace deux fois plus vite que le pointeur |
| Onde de choc | au clic | anneau qui traverse la section, couleur d'accent de la section |
| Particules | toute la page | canvas 2D, s'ecartent du curseur, se densifient pres des elements interactifs |
| Parallaxe | miniatures du portfolio | 4 couches a des profondeurs differentes |
| Marquee | bandeaux | pilote en JS : la vitesse suit la velocite du scroll, avec un leger cisaillement |
| Curseur | desktop | cercle / point / barre de texte / fleche / pastille « Voir » |
| Plans de scroll | chaque section | decor, puis titre, puis contenu, puis details (`data-plane`) |

### Garde-fou 60 fps

La decoration s'appuie sur de tres grands `filter: blur()`. Un GPU de bureau les
composite gratuitement, un GPU mobile faible non. `fx.js` mesure les vraies
durees de frame et redescend en deux crans plutot que de deviner d'apres
l'user-agent :

* `data-perf="lite"` — rayon de flou reduit, moitie moins de particules, pas de
  `backdrop-filter` ;
* `data-perf="min"` — plus de couches decoratives du tout, plus de particules.

Il ne remonte jamais : un appareil qui a peine une fois peinera encore, et
osciller entre deux rendus est pire que de rester au plus bas. Les onglets en
arriere-plan (bridés a ~1 fps) et les a-coups isoles sont ignores.

> Mesure : sur le rasteriseur logiciel de l'environnement de test, la page
> tourne a ~3 fps avec toute la decoration et **59,7 fps une fois le garde-fou
> declenche**. Sans les flous decoratifs, 55,6 fps — autrement dit tout le JS,
> le canvas et le WebGL tiennent largement dans un budget 60 fps, et le cout
> est entierement dans le flou compose.

## Le shader du hero

Le fond du hero n'est plus un degrade CSS mais un quad plein ecran en GLSL,
rendu dans le **meme contexte WebGL** que le diorama (scene ortho dessinee
avant l'ile) : un seul canvas, une seule boucle, aucun contexte supplementaire.

* **Bruit** : simplex 2D, `fbm` a 4 octaves, deux passes de deformation de
  domaine — une nebuleuse liquide qui se recompose en continu.
* **Souris** : le champ est repousse localement avec une gaussienne, et le
  pointeur a de l'inertie (le champ continue un instant apres l'arret). Le
  deplacement est **lineaire en `md`**, pas `normalize(md)` : une direction
  normalisee tourne sur elle-meme au point exact du curseur et y laisse une
  etoile figee.
* **Scroll** : `uScroll` fait deriver le motif verticalement.
* **Couleurs** : `uA / uB / uC` sont derives de `--sec-bg`, `--sec-accent` et
  `--sec-ink-soft` lus sur `#hero`, donc le theme du visiteur repeint le shader.
* **Lisibilite** : vignette + lavage du cote lecture, et la colonne de texte
  s'arrete avant la scene au-dessus de 1000 px. Mesure sur pixels reels :
  **0 % de la surface du titre, du sous-titre et des chiffres sous le seuil AA**,
  p99.9 a 15:1.
* **Qualite** : echelle a 4 crans (`QUALITY` en tete de `hero3d.js`). Le
  watchdog descend d'un cran quand les frames s'allongent ; le dernier cran
  eteint le shader et rend la main au degrade CSS.

### Le morphing scroll

Pendant que le hero defile, `#heroScene` est **epingle au viewport**
(`.is-pinned`) : sans cela l'ile sortirait de l'ecran bien avant la fin de la
transformation. L'ile bascule alors en vue de dessus, s'aplatit, revient vers le
centre du cadre, et la premiere map du portfolio monte a sa place avec son cadre
cyan. Le tout est pilote par la position de scroll, pas par un timer.

## Transitions de page

`@view-transition { navigation: auto; }` dans `styles.css` : sur une navigation
same-origin, le navigateur garde un instantane des deux pages et joue le pli
entre les deux. `::view-transition-old(root)` se replie vers la gauche,
`::view-transition-new(root)` se deplie depuis la droite.

`document.startViewTransition` **ne convient pas ici** : il n'anime qu'une mise
a jour du meme document, donc il replierait la page pour la deplier a
l'identique avant de naviguer. La detection se fait sur `onpagereveal`, qui
n'existe que la ou les transitions inter-documents existent. Ailleurs, `main.js`
intercepte le clic et joue le meme pli en CSS sur la page vivante, avec le voile
`#pageFade` pour couvrir la bascule.

## Le theme sonore

Toutes les frequences sont des degres d'une **meme gamme** (pentatonique de do
majeur, sur deux octaves) : rien ne peut tomber sur une note qui jure avec ce
qui resonne encore. Les survols montent la gamme et redescendent, donc balayer
une grille de cartes joue une phrase au lieu de repeter le meme bip. `DIQ.tone(nom)`
expose les notes nommees (`hover`, `tap`, `impact`, `lift`, `done`) au reste du
code. Sur mobile, une vibration de 7 ms accompagne le clic — uniquement si le
visiteur a active le son.

## Deploiement

Hebergeable tel quel sur n'importe quel hebergeur statique (GitHub Pages, Netlify,
Vercel, Cloudflare Pages). Avant la mise en ligne sur `DragonIQStudio.com`, verifie que
les URLs absolues (`canonical`, `og:url`, `og:image`) pointent vers le domaine final.
