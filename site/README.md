# Paneon website

A single static page: `index.html`, `style.css`, `release.js` and `assets/`. No framework and no build step. Open `index.html` in a browser, or serve the folder with any static server (`npx serve site`).

The download buttons link to the latest GitHub release. `release.js` asks `api.github.com` for the newest release and points the buttons at the Setup and Portable assets and fills in the version. With JavaScript off, or when the API is rate limited, the buttons keep their fallback link to `https://github.com/mfathy234/paneon/releases/latest`.

## Canonical URL

The site URL is `https://mfathy234.github.io/paneon/`. It appears in `index.html` in the `canonical` link, `og:url`, `og:image` and `twitter:image`. If you move to a custom domain, replace that prefix in those four places (search for `mfathy234.github.io/paneon`).

`assets/og.png` is the 1200x630 social preview.

## Hosting on GitHub Pages

1. Merge `site/` and `.github/workflows/pages.yml` into `main`.
2. In the repository, open Settings > Pages and set Source to **GitHub Actions**.
3. The `Pages` workflow runs on every push to `main` that changes `site/**`, and can be started by hand from the Actions tab (workflow_dispatch). The site is served at `https://mfathy234.github.io/paneon/`.

## Custom domain

1. Add a file `site/CNAME` containing only the domain, for example `paneon.example.com`.
2. At your DNS provider add either a `CNAME` record from `paneon` to `mfathy234.github.io`, or for an apex domain the four `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and optionally the matching `AAAA` records).
3. In Settings > Pages enter the domain and enable **Enforce HTTPS** once the certificate is issued.
4. Update the canonical URL as described above.

## Free alternatives

Cloudflare Pages: create a project from the GitHub repository, set the build command to empty and the output directory to `site`. It is served at `paneon.pages.dev` (or the name you choose), with custom domains and HTTPS included. Netlify and Vercel work the same way with `site` as the publish directory.
