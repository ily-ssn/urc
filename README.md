# URC — Powerhouse Urban Run Club

A responsive running-community website for Harare, Zimbabwe. Black, warm white and URC green; strong typography, local photography assets and accessible browser-native dialogs.

## Run locally

```sh
npm run dev
```

Open http://localhost:5180. No package dependencies, database credentials or API keys are required.

```sh
npm run build
```

Checks document anchors, required assets and launch configuration, then copies the site to `dist/`. Vercel settings are included.

## Update the club

Edit `public/club.json`:

- `city`: display location.
- `joinUrl`: verified HTTPS registration or WhatsApp link. Left `null` until supplied by the owner. The site keeps an honest coming-soon state meanwhile.
- `events`: confirmed upcoming events only. Each event needs `title`, an ISO `date` with timezone offset, `location` and an HTTPS `joinUrl`. Event times display in Africa/Harare.

Run cards describe proposed formats; they do not imply confirmed dates, routes or fees. The illustrated route is clearly labelled and is not a geographic map. No RSVP, payment, membership or email submission is simulated.

## Included interactions

- URL-backed run-format filters.
- Session detail dialogs with illustrative route preview.
- A deterministic first-run finder. Beginners are directed to the social format; recommendations are not fitness assessments.
- Optional device-local saved run preference, with a privacy delete control.
- Full Field Notes articles and expandable FAQs.
- Responsive navigation, keyboard focus handling, Escape dismissal and reduced-motion support.

## Privacy and security

No analytics or advertising trackers. No personal information collection. Fonts and photos are served locally. The optional saved plan contains only the selected format and never leaves the device. External URLs are HTTPS-validated, and event/config content is rendered with `textContent` rather than injected HTML. Security headers and a restrictive Content Security Policy are in `vercel.json`.

## Imagery and fonts

Hero photography was generated for this design direction. Other reference photographs are sourced from Unsplash; origins are listed in `public/assets/sources.json`. They are illustrative and do not depict verified URC members. Replace them with the club’s own photographs when available.

Typefaces: Barlow Condensed and Manrope, SIL Open Font License. Their local subsets and license files are bundled. The on-page wordmark is a typographic interpretation of the supplied identity; source logo artwork can be substituted later without rebuilding the layout.

## Verification

The initial release passed asset/anchor/configuration checks and browser flows at 1440px, 768px, 390px and 320px: filtering, run dialogs, focus restoration, pace selection, local preference deletion, article reading, FAQs, mobile menus and overflow checks. No browser exceptions were reported.
