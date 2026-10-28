# URC revamp status

This is an implementation and activation checklist, not a claim that every roadmap feature is live. The existing Vercel project retains its deployment protection.

## Available without a new service

- Thirteen independent page documents: Home, Runs, Gallery, Impact, Partners, Club, First run, Contact, Join, Shop, Your URC, Community and Privacy.
- Authentic organiser photographs, a reviewed RESET page, event search and filters, device-saved runs, calendar downloads in CAT, share links and poster downloads.
- Event-specific accents, practical arrival and activity details, links between runs, galleries, partners and recaps.
- Full-screen gallery photos with swipe/keyboard navigation, captions, credits and removal-request route.
- First-run guide, device checklist and a transparent distance/pace duration calculator.
- RESET has an on-site reservation dialog for the three owner-supplied free experiences, quantity selection, guest names and email, with a printable pass after a confirmed native booking. It is visibly pending until the backend is connected and a native event is published; it never invents a saved reservation. Existing Eventbrite bookings are handled through their original confirmations.
- Studio and PDF layout previews are explicitly labelled samples. They do not save records or issue valid admission.

## Implemented, requiring the URC database and verification

The Supabase connector currently denies project access. Only `ktfwfeuyrpvelvpdborw` is permitted by backend configuration. Apply SCHEMA.sql followed by COMMUNITY.sql, configure server environment variables and complete the connected checks before enabling these flows publicly.

- Optional member login/signup, own-profile settings, opt-in public discovery, private follows, consent-based connection requests and a following feed.
- Guest or signed-in free registration, guided activity/details/confirmation steps, atomic groups of up to six, separate private passes, QR check-in and PDF downloads.
- Own-registration history for bookings made while signed in, cancellation and replacement of a lost private pass link. Replacement invalidates the old link and QR.
- Contact, volunteer and partnership requests, manual waiting lists and event feedback, with durable request limits and staff-only review.
- Owner/editor/check-in permissions, public snapshot isolation, private draft media, event/gallery/partner/recap editing, per-photo caption/credit/order/cover controls.
- Attendee exports, actual registration/check-in summaries, requests inbox and changes log. Check-in reversal requires an authorised role and a reason.
- Event-specific benefit redemption, enforced once per checked-in pass and only before its confirmed expiry.
- Private cash and manually verified EcoCash donation ledger. Attendance and donations remain separate; currencies are never combined blindly.

## Optional writing assistance

The Studio helper is disabled by default. Configure `URC_AI_ENABLED=true`, a server-only `AI_GATEWAY_API_KEY` and an explicit supported `URC_AI_MODEL` only after budget approval. It writes plain-text drafts from organiser notes, capped at 20 requests per team member per UTC day and 100 across the team. It cannot publish content. No model request has been made during this implementation. Provider billing limits must also be set in the provider account.

## Not implemented or not connected

- Merchandise catalog, inventory, cart, checkout, orders and refunds: no merchant/store account exists. Shop explains the current availability rather than showing invented stock or payments.
- Online donation settlement callbacks: a Zimbabwe-supported merchant provider is still needed. EcoCash reference entry is not automatic payment confirmation.
- Scheduled reminders, automated waitlist invitations and email delivery: require a configured delivery provider, consent handling and a budget. The current waiting list is reviewed manually.
- High-resolution photo downloads: disabled until download rights and source files are supplied. Displayed gallery media is optimised for browsing.
- Automated anonymous analytics, repeat-participation funnels and impression counts: not installed. Studio uses actual managed registration/check-in data, not fabricated engagement.
- Full version restoration, reusable event templates and offline check-in are future work. Current publication snapshots, draft conflict checks and history are retained.
- Google OAuth, custom domains and a public launch require their own configuration and connected validation; no provider is represented as configured when it is not.

## Verification scope

`npm run build`, `npm test` and `npm run test:browser` verify the generated pages, APIs, actual database permissions in isolated PGlite and browser flows with explicit transport fixtures where a live backend would be required. Production database and provider verification remain blocked by access/setup. Dependency advisory checks do not prove that software is free of all vulnerabilities. No claim of a mistake-free system is made.

## Interface refinement · 28 October 2026

The homepage now has distinct event-edition, community portrait, photo contact-sheet and first-run layouts. The event page has larger chapter typography, rounded action controls, a consent-based Google venue map, a schedule and a guest reservation dialog. Recovery venue details are editable in Studio and remain absent until confirmed. The automatic Luxenova sponsor profile has been removed; design attribution appears only once in the bottom footer. The original logo and further owner photos are still pending. No live Supabase change was made: the connector still denies access to URC.

## Race-world direction · 28 October 2026

A new image-led homepage follows the owner's sports-site references through an extended hero, slanted green divider, scroll-drawn illustrative route and word fill, event-themed race/ticket cards, club experience chapters, a staggered photo strip and practical guide cards. Runs, Gallery, Club and First Run have full-height photo openings. Reference photographs/brand assets are not reused. Current URC photographs repeat intentionally pending the owner's replacement images; see PHOTO-BRIEF.md for 21 image exports (8 horizontal, 13 vertical).

Every race card has a ticket link to its event's registration section. The RESET detail page retains the real guest reservation choices, map, calendar, saved-run controls and honest pending backend state. No new backend, authentication, payment or production database change is included.

The old Eventbrite logo has been removed from header, hero and Community. The approved logo files were shown inline in chat but are not downloadable workspace assets yet. A short skip-enabled, once-per-tab entrance is prepared, with reduced-motion support; it remains inactive until the exact approved logo is installed. Do not describe this entrance or the final branding as live until that dependency is resolved.

## Closer reference composition · 28 October 2026

Owner review replaced the visible hero headlines, hero event/recap panels, ticker wording and desktop link row. The header now uses a left Menu dialog, a compact brand label pending the approved logo file, and a right Join the club control. The thick blank green divider overlaps the hero and black section without paper-coloured wedges.

A faint original contour/road background surrounds the scroll-drawn green route and white endpoint circles. The explanatory design caption was removed. A separate centred club introduction continues on black, which finishes with rounded bottom corners. The pale race selection has oversized scroll-linked background lettering and two vertical cards with 16:9 images, wide display typography, distance/elevation pairs and animated directional arrows.

The owner explicitly requested a fabricated second run and illustrative route figures for visual review. These exist only in homepage design-preview markup: Sunday Social is visibly marked Design preview, its details open a preview dialog, and it cannot accept reservations. Both cards' route figures are identified as previews. These values are not persisted to the published event data, ticketing, calendar, or database. The real RESET Discover run link still opens the actual event, which retains its ticket controls and pending native booking state.

The Feeling replaces the portrait-led experience section. Its black rounded panel has an oversized ghost title and three numbered chapters: Free Start, Run Together and Stay a While. Headings fill from grey to green; body copy fills from grey to white. Motion is scroll-linked and honours reduced-motion preferences. No third-party JavaScript or original Baztan artwork/code was imported.

Syncopate Bold is self-hosted from the Google Fonts apache/syncopate directory; the original Apache 2.0 licence is included in public/assets/syncopate-LICENSE.txt. It is a licensed alternative for the wide display style, not an unlicensed copy of Akira.

The updated photo brief is 19 files: 8 horizontal and 11 vertical, with the official event poster reused across two placements. No backend or Supabase changes accompany this pass.
