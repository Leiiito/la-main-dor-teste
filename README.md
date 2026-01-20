# La Main d’Or — One-page + Admin (Supabase) — Vanilla

Site vitrine one-page premium orienté conversion “réservation” + espace **/admin** intégré pour gérer :

- **Prestations** (CRUD complet + réorganisation drag & drop)
- **Galerie** (upload drag & drop, compression côté client si possible, suppression, reorder)

⚙️ Tech : **HTML/CSS/JS vanilla** + **Supabase Auth + Postgres + Storage** (RLS activé).

---

## 0) Prérequis

- Un compte Supabase
- Un serveur local (ex : VS Code Live Server, ou `python -m http.server`)
- (Optionnel) GitHub pour déployer sur GitHub Pages

---

## 1) Créer un projet Supabase

1. Connectez-vous à Supabase
2. **New project**
3. Notez :
   - **Project URL** (SUPABASE_URL)
   - **anon public key** (SUPABASE_ANON_KEY)

---

## 2) Créer le bucket Storage `gallery` (public)

Dans Supabase :
1. Storage → Buckets → **New bucket**
2. Nom : `gallery`
3. Visibility : **Public**

> Les images seront uploadées dans ce bucket, et la DB stocke le `public_url` + `storage_path`.

---

## 3) Exécuter le SQL (tables + RLS + policies)

Dans Supabase :
- SQL editor → collez et exécutez le SQL ci-dessous (section “SQL complet” en bas de ce README).

---

## 4) Créer un compte admin (Auth)

Supabase → Authentication → Users → **Add user**
- Email + Password
- Confirmez l’email si nécessaire

✅ Les policies RLS autorisent l’écriture uniquement aux utilisateurs **authentifiés**.

---

## 5) Renseigner `SUPABASE_URL` + `SUPABASE_ANON_KEY`

Éditez :

`/assets/js/supabase-config.js`

Remplacez :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Optionnel : remplacez aussi `GENERIC_CALENDLY_URL` (CTA hero + navbar).

---

## 6) Lancer en local

### Option A — Python
Dans le dossier parent de `site-final/` :

```bash
cd site-final
python -m http.server 5173
```

Ouvrez : `http://localhost:5173/`

### Option B — VS Code Live Server
Ouvrez `site-final/` dans VS Code → clic droit sur `index.html` → “Open with Live Server”.

---

## 7) Utiliser /admin

Ouvrez :

`/admin/index.html`

1. Connectez-vous avec l’email/password Supabase
2. Onglet **Prestations** : ajouter / modifier / supprimer / réordonner
3. Onglet **Galerie** : glisser-déposer des images, alt, delete, reorder

Tout s’affiche automatiquement sur la vitrine (index.html).

---

## 8) Déployer sur GitHub Pages

1. Créez un repo GitHub (ex : `la-main-dor`)
2. Uploadez le contenu de `site-final/` à la racine du repo
3. Settings → Pages :
   - Source : `Deploy from a branch`
   - Branch : `main` / root
4. Attendez la publication

⚠️ IMPORTANT : Gardez des chemins **relatifs** (déjà le cas).  
Le sitemap contient des URLs “/” simples — c’est OK pour Pages.

---

## 9) Checklist test

- [ ] Mobile : navbar, CTA, cards lisibles
- [ ] Accessibilité : focus visible, navigation clavier, alt images
- [ ] Performances : lazy-loading OK, CLS limité (dimensions / aspect-ratio)
- [ ] Supabase : données visibles sur la vitrine (SELECT public)
- [ ] Admin : login OK, CRUD OK, reorder OK
- [ ] Galerie : upload OK, suppression OK, public_url accessible
- [ ] Liens Calendly : un lien par prestation (sinon fallback générique)

---

# SQL complet (Supabase)

> À exécuter dans **SQL editor**.

```sql
-- Extensions (UUID)
create extension if not exists "pgcrypto";

-- =========================================================
-- TABLE: services (prestations)
-- =========================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Manucure', 'Ongles mains', 'Ongles pieds', 'Cils')),
  title text not null,
  price integer not null default 0,
  duration integer not null default 0,
  description text,
  calendly_url text,
  featured boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_category_idx on public.services(category);
create index if not exists services_order_idx on public.services(order_index);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

-- =========================================================
-- TABLE: gallery_items (galerie)
-- =========================================================
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  public_url text not null,
  alt text,
  category text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_order_idx on public.gallery_items(order_index);

drop trigger if exists set_gallery_updated_at on public.gallery_items;
create trigger set_gallery_updated_at
before update on public.gallery_items
for each row execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table public.services enable row level security;
alter table public.gallery_items enable row level security;

-- Lecture publique (SELECT) sur services + gallery_items
drop policy if exists "Public read services" on public.services;
create policy "Public read services"
on public.services
for select
to public
using (true);

drop policy if exists "Public read gallery_items" on public.gallery_items;
create policy "Public read gallery_items"
on public.gallery_items
for select
to public
using (true);

-- Écriture réservée aux utilisateurs authentifiés (admin)
-- (INSERT/UPDATE/DELETE) sur services
drop policy if exists "Admin write services" on public.services;
create policy "Admin write services"
on public.services
for all
to authenticated
using (true)
with check (true);

-- (INSERT/UPDATE/DELETE) sur gallery_items
drop policy if exists "Admin write gallery_items" on public.gallery_items;
create policy "Admin write gallery_items"
on public.gallery_items
for all
to authenticated
using (true)
with check (true);

-- NOTE:
-- - Les visiteurs (public) peuvent lire (SELECT).
-- - Seuls les utilisateurs connectés (authenticated) peuvent écrire.
-- - Le bucket storage "gallery" doit être PUBLIC pour que public_url soit accessible.
```

---

## Notes sécurité

- Les policies ci-dessus donnent l’écriture à **tout utilisateur authentifié**.
  - Si vous voulez restreindre à un seul compte admin, utilisez un `auth.uid()` spécifique ou un claim.
- Storage :
  - bucket `gallery` public pour lecture directe.
  - Pour limiter l’upload à l’admin : utilisez les Storage policies dans Supabase (optionnel).

---

## Arborescence

```
/site-final/
  index.html
  /admin/
    index.html
  /assets/
    /css/style.css
    /js/
      main.js
      admin.js
      supabase-config.js
  robots.txt
  sitemap.xml
  README.md
  LICENSE
```
