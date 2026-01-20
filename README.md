# La Main d’Or — Site one-page conversion (Ongles & Cils)

Site vitrine one-page premium orienté **prise de rendez-vous** (réservation en ligne via Calendly par prestation).

## Objectif
- Maximiser les clics **Réserver en ligne (Calendly)**
- Afficher toutes les prestations avec **Prix (€) + Durée (min)**
- Un clic = ouvre la bonne page Calendly
- Mettre en valeur les résultats (galerie + lightbox)
- Rester rapide, mobile-first, sans librairie lourde

## Arborescence
```
site-final/
  index.html
  favicon.svg
  robots.txt
  sitemap.xml
  README.md
  LICENSE
  assets/
    css/style.css
    js/main.js
    img/
      hero.jpg
      og-cover.jpg
      galerie/
        ongles/...
        cils/...
      bg/
        bg-01.jpg ... bg-06.jpg
```

## Modifier / ajouter une prestation
Les prestations sont dans `assets/js/main.js` → tableau `SERVICES`.

Format :
```js
{
  title: "Pose américaine",
  price: 35,
  duration: 90,
  category: "Ongles mains",
  tag: "Capsules",
  featured: true,
  calendlyUrl: "https://calendly.com/..."
}
```
- `price` = euros
- `duration` = minutes
- `calendlyUrl` = lien Calendly de la prestation
- Si une valeur manque : mettez `null` (elle apparaîtra dans la section **À vérifier**).

## Ajouter des photos à la galerie
Ajoutez vos images dans :
- `assets/img/galerie/ongles/`
- `assets/img/galerie/cils/`

Puis dupliquez un bloc `<figure class="g-item" ...>` dans la section Galerie de `index.html`.

## Mise en ligne GitHub Pages
1. Créez un repo GitHub (public)
2. Uploadez le contenu de `site-final/` à la racine du repo
3. `Settings` → `Pages` → `Deploy from a branch` → `main` / `/(root)` → `Save`

### IMPORTANT
Remplacez `https://example.github.io/site-final/` par votre vraie URL :
- dans `sitemap.xml`
- dans `robots.txt`

## Licence
MIT — voir `LICENSE`.
