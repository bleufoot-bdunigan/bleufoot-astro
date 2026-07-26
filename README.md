# Bleufoot Solutions — Astro site

This is the Astro conversion of the Bleufoot Solutions static website.

## Requirements

- Node.js 22.12.0 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Astro will display the local URL, normally `http://localhost:4321`.

## Production build

```bash
npm run build
npm run preview
```

The static production site is written to `dist/`.

## Cloudflare Pages

Use these build settings:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** repository root

The existing Cloudflare Pages Function remains at `functions/api/quote.js` and the security headers remain at `public/_headers`.

Create these environment variables in Cloudflare Pages:

- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `QUOTE_FROM_EMAIL`
- `QUOTE_TO_EMAIL`

A template is included in `.env.example`. Do not commit real secrets.

## Structure

```text
src/
  components/
    Header.astro
    Footer.astro
  layouts/
    BaseLayout.astro
  pages/
    index.astro
    about.astro
    ...
public/
  assets/
  _headers
  robots.txt
  sitemap.xml
  site.webmanifest
functions/
  api/quote.js
```

All original page content, CSS, JavaScript, metadata, structured data, booking integration, Turnstile form protection, and the Resend submission function were retained. Shared navigation, footer, metadata, and external scripts are now managed through reusable Astro components and a base layout.
