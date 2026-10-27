# URC revamp status

This is an implementation and activation checklist, not a claim that every roadmap feature is live. The existing Vercel project retains its deployment protection.

## Available without a new service

- Thirteen independent page documents: Home, Runs, Gallery, Impact, Partners, Club, First run, Contact, Join, Shop, Your URC, Community and Privacy.
- Authentic organiser photographs, a reviewed RESET page, event search and filters, device-saved runs, calendar downloads in CAT, share links and poster downloads.
- Event-specific accents, practical arrival and activity details, links between runs, galleries, partners and recaps.
- Full-screen gallery photos with swipe/keyboard navigation, captions, credits and removal-request route.
- First-run guide, device checklist and a transparent distance/pace duration calculator.
- RESET registration via its real Eventbrite listing. Eventbrite owns those tickets and confirmations; no duplicate native pass is issued.
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
