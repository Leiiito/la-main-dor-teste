# La Main d’Or — Site one-page conversion (Ongles & Cils)

Site vitrine one-page premium orienté **prise de rendez-vous** (WhatsApp en priorité).

## Objectif
- Maximiser les demandes via **WhatsApp**
- Proposer un choix rapide des prestations (tabs + recherche)
- Afficher **Prix + Durée** sur chaque prestation
- Message WhatsApp pré-rempli : **Nom + Prix + Durée**

## Stack
- HTML / CSS / JS (vanilla)
- Compatible GitHub Pages
- Aucune dépendance externe

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
```

## Modifier les prestations
Ouvrir `assets/js/main.js` → tableau `SERVICES`.

Exemple :
```js
{ title: "Pose américaine", price: 35, duration: 90, category: "Ongles mains" }
```

- `price` = euros
- `duration` = minutes
- Si une info manque : mettre `null` (affiche “—” et remonte dans “À vérifier”).

## Mise en ligne GitHub Pages
1) Créer un repo GitHub (public)
2) Uploader **le contenu** de `site-final/` à la racine du repo
3) Settings → Pages
4) Deploy from branch → `main` → `/ (root)` → Save

## À faire avant mise en ligne
- Remplacer l’URL dans `sitemap.xml` par ton URL GitHub Pages
- Remplacer les placeholders dans `assets/img/` par tes photos (garde les mêmes noms ou adapte les chemins)

—
© La Main d’Or — Gravelines
