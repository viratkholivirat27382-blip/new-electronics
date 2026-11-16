# Shopies Store

Online electronics store built with React, Vite, TypeScript, Tailwind CSS and Supabase.

## Setup

1. Install packages: `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase URL and anon key.
3. Run the SQL files in `supabase/migrations/` in order (oldest first) on your Supabase project.
4. Start the site: `npm run dev`

## Commands

- `npm run dev` - start locally
- `npm run build` - make a production build
- `npm run typecheck` - check TypeScript
- `npm run lint` - check code style

## Deploying to Cloudflare Pages

Project layout: `index.html`, `package.json`, `vite.config.ts`, `src/` and `public/` must all sit at the **root** of the repository (not inside a sub-folder). `index.html` loads `/src/main.tsx`, so the whole `src/` folder must be uploaded too.

Build settings:

- Framework preset: Vite (or None)
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave empty (`/`)
- Node version: 22 (set by `.node-version`)

Environment variables (Settings > Variables and Secrets, for Production and Preview):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`public/_redirects` makes React Router routes (e.g. `/admin`, `/checkout`) work on refresh.
