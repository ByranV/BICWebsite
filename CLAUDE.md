# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static website for British International College (britishinternationalcollege.co.za), a migration off an old WordPress site. Plain hand-written HTML, one shared stylesheet (`assets/css/site.css`), one shared script (`assets/js/site.js`, no framework), and a single PHP endpoint (`contact.php`) for enquiry forms. Pages load only Materialize 1.0's CSS, as a trimmed copy (`assets/vendor/materialize-lite.css`, holding just the rules the site uses); the full `materialize.min.css`/`.js` stay in `assets/vendor/` as an unused fallback. There is no build step, package manager, linter or test suite. Content is written in UK English.

Design tokens (original navy + blue palette with a gold call-to-action accent; white text goes on `--blue-dark`, not `--blue`, for contrast; `--serif` heading font Source Serif 4, header sizes `--hdr`/`--hdr-full`) are CSS variables at the top of `site.css`. The header is `position: fixed`; scrolling adds `html.is-compact`, which hides the top bar and shortens the nav.

## Images

Pages reference compressed WebP copies, never the originals: `assets/img/min/<name>.webp` (at most 1600px wide), plus `min/1200/` and `min/800/` versions of large photos, used in `srcset`. The originals in `assets/img/` are kept, full size, as the fallback, and are still used where a JPG/PNG is needed (`og:image`, favicon/apple-touch-icon, JSON-LD logo). When adding an image, keep the original in `assets/img/` and add its WebP copies (photos: quality 72; logos/PNGs: lossless or quality 90, whichever is smaller). Hero photos are `<img class="bic-hero-img" fetchpriority="high">` inside the hero section, not CSS backgrounds.

To preview locally, serve the repo root with any static server (e.g. `php -S localhost:8000`, which also runs `contact.php`). `.htaccess` rewrites only apply on Apache.

## Deployment

Pushing to `main` deploys it via GitHub Actions (`.github/workflows/deploy-main.yml`, `main` environment) over FTP(S) to Afrihost hosting. `development` has no deploy workflow; changes reach production by a PR from `development` into `main`.

The workflow rsyncs the repo into `_deploy/` (excluding `.git`, `.github`, `.claude`, `README.md`, `mail-config*.php`) and generates `mail-config.php` from environment secrets/variables. Pushing or merging to `main` is a production deploy, so only do it when asked.

## Page structure

- Pages live at the root (`index.html`, `about-us.html`, `site-map.html`, `404.html`) and in section folders `bryanston/`, `pretoria/`, `distance/`, `examinations/`. File names are kept from the old WordPress slugs (e.g. `subjects-offered-2.html`, `eresources-4.html`) so redirects map 1:1 — don't rename them casually.
- Every page duplicates the full `<head>` (title, meta description, canonical, Open Graph tags), header, main nav, and footer inline. **Site-wide changes (nav items, footer links, contact details) must be applied to every HTML page** — search and replace across all `*.html`. Paths are relative, so subfolder pages use `../` prefixes; match each page's depth.
- Desktop nav items are a link plus a `.bic-sub-toggle` button that opens the dropdown (hover also opens it for mouse users); dropdowns group pages under `li.bic-sub-head` headings ("Studying here", "Joining", …). The mobile menu is `#mobile-nav.bic-drawer` with one `.bic-side-toggle` accordion per section. The header's gold "Enquire" button links to `#enquire` (the `.bic-paper` around the page's form) or, on pages without a form, to the section's campus page `#enquire`. Each campus column in the footer starts with a `.bic-foot-contact` list.
- Section pages include a `.bic-tabs` sub-nav listing the section's pages, with `class="active" aria-current="page"` on the current one. Bryanston's two calendars share one "Calendar" item (→ `calendar-2027.html`; the pages cross-link). Pretoria links to the college-wide results page as "College Results".
- `404.html` uses root-absolute paths (`/assets/…`, `/index.html`) because it is served at any URL depth.
- When adding/renaming a page also update: `sitemap.xml`, `site-map.html`, the nav/footer/tabs on all pages, and `.htaccess` redirects if an old URL changes.
- Meta descriptions and `og:description` often repeat body text; when editing copy, update those too.

## Forms (site.js ↔ contact.php)

- Forms are `<form class="bic-form" data-subject="..." novalidate>` with a hidden honeypot field `_hp`, a `.bic-form-status` element, and field `name` attributes that are human-readable labels (e.g. `Name`, `Select Campus`, `Parent First Name`) — these names become the email body lines.
- Each field is `<div class="bic-field col …"><label class="bic-label" for>…</label><input|select|textarea class="browser-default" …></div>`: label first, native controls (`browser-default` opts out of Materialize's underline styling). Selects are native `<select>`; a required select starts with a disabled, selected placeholder option.
- `site.js` validates, gets a reCAPTCHA v3 token (site key in `CONFIG`), and POSTs JSON to `contact.php` (resolved relative to the script URL so subfolder pages work). If `formEndpoint` is emptied it falls back to `mailto:`.
- `contact.php` checks Origin, honeypot, reCAPTCHA score and a per-IP rate limit, then sends via its own SMTP client (implicit TLS, AUTH LOGIN). Recipients are fixed server-side: routing is chosen by the campus field value (any field label containing "campus") and form type (`Name` field → contact form via `CONTACT_TO`; `Parent First Name` → interview form via `INTERVIEW_TO`), otherwise `MAIL_TO`/`MAIL_CC`.
- `mail-config.php` holds credentials and is git-ignored and blocked by `.htaccess`; `mail-config.example.php` documents its shape.

## Redirects

`.htaccess` forces HTTPS on the non-www host, strips `/index.html`, and 301-redirects old WordPress URLs (flat slugs → section folders, `wp-content/uploads/...pdf` → `assets/docs/`, `/slug/` → `/slug.html`). Rule order matters: the generic `/slug/` → `/slug.html` catch-all must stay last.

## Spellcheck lists

`spellcheck-*.txt` in the repo root (git-ignored) are UK English review lists grouped into issue blocks (`[A1]`, `[B3]`, …) with File(s) / Current / Fix to. The user deletes blocks they don't want; when asked to apply a list, fix only the blocks that remain.
