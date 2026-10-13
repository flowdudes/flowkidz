# Flowkidz

Static site for [flowkidz.com](https://flowkidz.com), exported from Webflow and hosted on Cloudflare Pages.

## Structure

| Path | What |
| --- | --- |
| `index.html`, `pick-a-game.html`, `coming-soon.html`, `privacy.html`, `404.html` | Main pages |
| `games/*.html` | Game detail pages (each embeds its game from `/play/`) |
| `play/*.html` | The standalone games (previously served at play.flowkidz.com) |
| `css/`, `js/`, `fonts/`, `images/` | Assets (CMS images are still loaded from the Webflow CDN) |
| `_redirects`, `_headers` | Cloudflare Pages redirects and response headers |
| `sitemap.xml`, `robots.txt` | SEO |

## Deploying

Cloudflare Pages: no build command, output directory `/`. Every push to `main` deploys; other branches get preview URLs.

## Local preview

```bash
npx wrangler pages dev .
```

Note: edit the files here directly. Re-exporting from Webflow will overwrite these changes.
