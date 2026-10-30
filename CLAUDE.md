# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static website for British International College (britishinternationalcollege.co.za), a migration off an old WordPress site. Plain hand-written HTML + Materialize 1.0 (vendored in `assets/vendor/`), one shared stylesheet (`assets/css/site.css`), one shared script (`assets/js/site.js`), and a single PHP endpoint (`contact.php`) for enquiry forms. There is no build step, package manager, linter or test suite. Content is written in UK English.

To preview locally, serve the repo root with any static server (e.g. `php -S localhost:8000`, which also runs `contact.php`). `.htaccess` rewrites only apply on Apache.

## Deployment

Pushing to a branch deploys it via GitHub Actions over FTP(S) to Afrihost hosting:
- `development` → `.github/workflows/deploy-development.yml` (`development` environment)
- `main` → `.github/workflows/deploy-main.yml` (`main` environment)

The workflow rsyncs the repo into `_deploy/` (excluding `.git`, `.github`, `.claude`, `README.md`, `mail-config*.php`) and generates `mail-config.php` from environment secrets/variables. The two workflows are near-identical; keep them in sync when changing one. Pushing is effectively a production deploy, so only push when asked.

## Page structure

- Pages live at the root (`index.html`, `about-us.html`, `site-map.html`, `404.html`) and in section folders `bryanston/`, `pretoria/`, `distance/`, `examinations/`. File names are kept from the old WordPress slugs (e.g. `subjects-offered-2.html`, `eresources-4.html`) so redirects map 1:1 — don't rename them casually.
- Every page duplicates the full `<head>` (title, meta description, canonical, Open Graph tags), header, main nav, and footer inline. **Site-wide changes (nav items, footer links, contact details) must be applied to every HTML page** — search and replace across all `*.html`. Paths are relative, so subfolder pages use `../` prefixes; match each page's depth.
- Section pages include a `.bic-tabs` sub-nav listing the section's pages, with `class="active" aria-current="page"` on the current one.
- When adding/renaming a page also update: `sitemap.xml`, `site-map.html`, the nav/footer/tabs on all pages, and `.htaccess` redirects if an old URL changes.
- Meta descriptions and `og:description` often repeat body text; when editing copy, update those too.

## Forms (site.js ↔ contact.php)

- Forms are `<form class="bic-form" data-subject="..." novalidate>` with a hidden honeypot field `_hp`, a `.bic-form-status` element, and field `name` attributes that are human-readable labels (e.g. `Name`, `Select Campus`, `Parent First Name`) — these names become the email body lines.
- `site.js` validates, gets a reCAPTCHA v3 token (site key in `CONFIG`), and POSTs JSON to `contact.php` (resolved relative to the script URL so subfolder pages work). If `formEndpoint` is emptied it falls back to `mailto:`.
- `contact.php` checks Origin, honeypot, reCAPTCHA score and a per-IP rate limit, then sends via its own SMTP client (implicit TLS, AUTH LOGIN). Recipients are fixed server-side: routing is chosen by the campus field value (any field label containing "campus") and form type (`Name` field → contact form via `CONTACT_TO`; `Parent First Name` → interview form via `INTERVIEW_TO`), otherwise `MAIL_TO`/`MAIL_CC`.
- `mail-config.php` holds credentials and is git-ignored and blocked by `.htaccess`; `mail-config.example.php` documents its shape.

## Redirects

`.htaccess` forces HTTPS on the non-www host, strips `/index.html`, and 301-redirects old WordPress URLs (flat slugs → section folders, `wp-content/uploads/...pdf` → `assets/docs/`, `/slug/` → `/slug.html`). Rule order matters: the generic `/slug/` → `/slug.html` catch-all must stay last.

## Spellcheck lists

`spellcheck-*.txt` in the repo root (git-ignored) are UK English review lists grouped into issue blocks (`[A1]`, `[B3]`, …) with File(s) / Current / Fix to. The user deletes blocks they don't want; when asked to apply a list, fix only the blocks that remain.
