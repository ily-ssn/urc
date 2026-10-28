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

## Final owner review in this pass · 28 October 2026

The header now has the compact brand label on the left and a small glass Menu disclosure on the right, with links inside the dropdown. Visible hero text, announcement panels and ticker wording are gone. The homepage hero is two viewports tall with a sticky photo and scroll-controlled zoom; the sole image-to-black separator is the overlapping blank green diagonal. The main section surfaces and cards are black, white or neutral grey.

The Feeling now uses three meaning-led illustrations. Run with Powerhouse has three original runner figures that move along their path and change stride with scroll. Your Pace uses three lanes at different speeds, without rankings or invented times. More than the Run brings people together to represent the social side of the club. Number labels have been removed. Grey-to-green headings and grey-to-white body fills remain.

The camera roll has a left-to-right scroll-linked ghost title, four equal-sized photographic tiles, and titles placed inside the pictures. The owner's supplied titles are stored with the current curated album photos as captions, preserving the gallery viewer and credits. Before You Go has three uniformly styled photographic cards; shoe and ticket diagrams and the coloured card backgrounds have been removed.

The Runs directory now opens with just Runs centred over a large photo and a slim matching diagonal. A photographic club introduction comes before the real run listing. The former exposed filter row is inside a closed Search Runs disclosure; actual filtering, saved runs and result announcements are retained. No founding history, race results or external run-club claims were fabricated.

The revised photo brief has 22 source files: 11 horizontal and 11 vertical. The approved downloadable logo files and connected URC booking backend are still pending. No production database change was made.

## Complete review scope · 28 October 2026

Runs, Gallery, Club, Partners, Shop and individual event pages share an 80%-viewport photograph, a centred page/run name, the compact brand at left, a small glass Menu at right and a matching slim diagonal. Additional masthead descriptions and navigation strips have been removed. The Club uses alternating photographic/text rows in white, grey and black; its surrounding links retain Local Collaborations and People/Moments. Gallery uses the reference's official-photo feature and photographic More Photos tiles. Shop and Partners preserve honest availability and confirmed partner records without search controls or invented inventory.

Runs now contains only an editorial introduction and large genuine event cards. The actual single RESET card has its image/date at left, description and sample route figures at right, and Discover/Tickets links with decorative rotating arrow spans. The fake second run remains only in the explicitly labelled homepage design preview. Search/filter/result controls have been removed from these public pages.

Community is paused: removed from navigation, communityEnabled is false in public configuration, client visits redirect to Club, and Vercel redirects Community paths to Club. The underlying account, opt-in privacy permissions and stored data are not deleted. Archived Community browser flows remain tested under an explicit local transport fixture with communityEnabled true; this is not the production state.

RESET detail now uses previous URC photography, a white title, factual sensory event copy, a black course panel, illustrative profile, run figures, native ticket dialog and click-to-load meeting map. The former invitation, save/calendar/poster bar and chapter cards are gone. The confirmed date remains Saturday 31 October 2026. Elevation is left pending; difficulty/distance/time are organiser-supplied/planned values, proposed water checkpoints are labelled, the unprovided Strava route is disabled, and no marked-route claim is invented. Previous/next run controls activate only when another actual upcoming event exists.

Studio exposes hero photo, distance, elevation, difficulty, estimated time, water checkpoints and Strava URL fields. New URL fields receive the existing HTTPS validation and public output remains escaped. No database schema or production database mutation accompanies these changes.

The final image brief is 28 files: 13 horizontal, 15 vertical. Existing photographs intentionally repeat until owner replacements arrive. The approved logo asset and live URC booking backend remain pending.


## Visual editor and final surface refinements

The homepage now highlights The Reset with its date and two actions, over the existing long scrolling photograph. The overlay fades with scroll. A skippable URC lettering motion study previews the charcoal/draw/colour/transparent/zoom entrance across public pages, with reduced-motion support. Direct homepage arrivals and refreshes use the full sequence: colours clear fully, transparent lettering holds for one second, then the portal zooms. Internal navigation, other pages and restored back/forward pages use the quicker sequence. Menu blur eases in and out, and the First Run and Impact links are absent from the menu; it is not the owner's original logo master. That downloadable artwork remains pending, and the rejected Eventbrite emblem stays unused. Shared page heroes use matching 94svh openings and an uncut diagonal band. The accidental footer margin is removed, floating identity colours follow the underlying section, and Menu blurs and makes the underlying page inert until closed.

Studio now has a side-by-side live canvas, desktop/phone controls, homepage photo slots and manually entered run figures. Uploaded media can be assigned to the cover, banner, figures portrait and homepage cards. New gallery covers rotate into the latest four without deleting old albums. Luxenova Studios is listed as design partner at the owner's explicit request.

The owner handoff is `docs/OWNER-SETUP.md`; `supabase/SETUP.sql` installs missing schema groups and seeds editable content, with reservations closed. `supabase/OWNER.sql` is run after creating the owner's Auth account. Both SQL paths are tested locally; nothing has been applied to the live URC database.
