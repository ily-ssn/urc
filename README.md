# Powerhouse Urban Run Club — Harare

A responsive black, warm-white and URC-green community site with an iPhone-first team workspace. Events connect their purpose, partner experiences, free passes, galleries and recaps.

## Local development

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Open http://localhost:5200. The website and explicitly labelled Studio/PDF design previews work without credentials. Real sign-in, publishing and registration require URC's dedicated Supabase project.

```sh
npm run build
npm test
```

The build checks assets and anchors, then bundles browser modules into `dist/`. The local review server mirrors clean routes and API handlers. Vercel settings and serverless APIs are included. Secrets must stay server-side in secure environment settings or an ignored `.env.local`.

## Product and operations

- [Team access, PDF passes and giving workflow](docs/TEAM-AND-GIVING.md)
- [Product structure and future feature roadmap](docs/URC-BLUEPRINT.md)
- [Reviewed database schema source](supabase/SCHEMA.sql) — not yet applied to a live URC project.

Attendance is free. Optional donations are recorded separately and never appear on a participant's pass. Cash, pending EcoCash references and confirmed transfers stay private to authorised team roles. No payment provider or merchandise checkout is simulated.

Published content uses immutable snapshots until the next explicit Publish. Anonymous clients cannot read private draft payloads or draft media. Pass tokens are random bearer credentials stored only as hashes; no service key is included in browser bundles. Local database tests check permissions, draft isolation, private media, registration limits, check-in and donation verification. API checks cover unsafe browser keys, cross-origin writes and missing configuration.

## Content and assets

`public/club.json` holds launch defaults and the forthcoming verified community link. No invented events, attendance totals or unconfirmed sponsors are published. Homepage run cards describe proposed formats. Native dialogs provide run details, a deterministic pace finder and Field Notes; an optional saved format remains on the visitor's device. No advertising trackers or analytics are installed.

Hero imagery was generated for this design direction; other reference photographs are from Unsplash and do not depict verified URC members. Origins are recorded in `public/assets/sources.json`. Replace with the club's own authorised photography. Local Barlow Condensed and Manrope font subsets include SIL Open Font Licenses. The wordmark is a typographic interpretation of the supplied identity.
