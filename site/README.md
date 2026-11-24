# Masjed Alhasany — Next.js site

The new version of the site (Next.js + TypeScript + Tailwind + shadcn/ui), built on mosque-media v2 with the Alhasany identity.
The old static site in `../web` is untouched and stays live until the switch.

## Look
The public pages use the original `../web/style.css` as is (copied by `scripts/prepare.mjs`) and the same HTML as `web/app.js`,
so both sites look the same. `components/ah/extra.css` only adds the English (left-to-right) bits. The dashboard keeps Tailwind/shadcn.

## Data
- `../web/lessons.json` (from `tools/build_data.py`) and `../web/overrides.json` (from the dashboard) are still the source.
  `scripts/prepare.mjs` copies them into `content/` before each `dev` / `build`.
- The dashboard at `/lawha` commits `web/overrides.json` on the server (the GitHub token never reaches the browser).
- Old public files (`/lessons.json`, `/og-v2.png`, the `-v2` icons, `/logo.png`) are copied into `public/`, so old links still work.

## Run locally
```
pnpm install
pnpm dev -p 3500
```

## Switching the live site (later, with the owner's OK)
1. Vercel → Project → Settings → Build → Root Directory: `site` (Framework: Next.js).
2. Environment variables: `ADMIN_PASSWORD` and `GITHUB_TOKEN` are already there.
   For audio uploads from the dashboard, connect a Blob store (adds `BLOB_READ_WRITE_TOKEN`).
3. Merge `next` into `main`.
