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

The build generates 13 page documents, checks routes and assets, then bundles browser modules into `dist/`. The local review server serves clean routes and API handlers. Vercel also renders event, gallery, partner and impact sharing metadata through `api/page.js`. Secrets must stay server-side in secure environment settings or an ignored `.env.local`.

## Product and operations

- [Team access, PDF passes and giving workflow](docs/TEAM-AND-GIVING.md)
- [Product structure and future feature roadmap](docs/URC-BLUEPRINT.md)
- [Release scope, verification and activation checklist](docs/REVAMP-STATUS.md)
- [Base database schema](supabase/SCHEMA.sql) and [additive Community schema](supabase/COMMUNITY.sql) — not yet applied to a live URC project. Apply in that order.

Attendance is free. Optional donations are recorded separately and never appear on a participant's pass. Cash, pending EcoCash references and confirmed transfers stay private to authorised team roles. No payment provider or merchandise checkout is simulated.

Published content uses immutable snapshots until the next explicit Publish. Anonymous clients cannot read private draft payloads or draft media. Pass tokens are random bearer credentials stored only as hashes; no service key is included in browser bundles. Local database tests check permissions, draft isolation, private media, registration limits, check-in and donation verification. API checks cover unsafe browser keys, cross-origin writes and missing configuration.

## Content and assets

`public/club.json` holds launch defaults and verified organiser/social links. `public/community.json` contains reviewed public Eventbrite content, checked on 27 October 2026. RESET now has a URC guest-reservation interface with the owner-supplied free experience options. Real reservations remain unavailable until the dedicated backend and native event record are connected. Existing Eventbrite bookings remain managed by their original confirmation. Device-only saved runs and a first-run checklist work without an account. No advertising trackers or analytics are installed.

The homepage and gallery use photographs from the organiser page supplied by the owner. Origins are recorded in `public/assets/urc-eventbrite-sources.json`. Generated hero/reference photographs have been removed. The community collection is not presented as a dated event recap. The owner's photo ZIP is still pending. Local Barlow Condensed and Manrope subsets include SIL Open Font Licenses. The wordmark is a typographic interpretation of the supplied identity.

Run `npm run test:browser` after a build for public, phone, Studio preview, PDF and simulated connected-member flows. Database checks exercise actual policies in isolated PGlite; browser transport fixtures are not proof of a working production connection. `npm audit --omit=dev` checks published dependency advisories, not all possible application vulnerabilities.
