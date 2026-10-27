# Powerhouse Urban Run Club — product structure

Harare, Zimbabwe. Owner-provided identity: black, white and URC green. The supplied concept is reference material; it does not establish that a named event happened, that a sponsor agreed, or that a donation total is verified.

## The operating model

One or two purpose-led runs a month. Each event connects a cause, one or more activity distances, free registration and optional giving, and optional partner experiences. Once finished, the same event becomes the permanent home of its photos, recap and verified impact. Do not scatter these into unrelated pages.

`Upcoming event → registration → attendee confirmation → event-day check-in → gallery + recap → verified impact → next event`

## Public navigation

Home · Runs · Gallery · Impact · Partners · Shop · Join

- **Home:** the club's feeling and identity, next confirmed event, accessible run/walk options, community moments, partner contributions and a clear next step.
- **Runs:** upcoming, past and activity filters. Each run has a stable, shareable address.
- **Event page:** event story, purpose, date/time in CAT, meeting pin, activity/distance choices, pace, itinerary, practical checklist, ticket state, beneficiary, partner offers and redemption terms. Visual accents can follow the event's theme while navigation, typography and URC identity remain consistent.
- **Gallery:** event albums plus On the Move, Our People, Experiences and Making a Difference. Full-screen photos, swipe/keyboard viewing, captions, shareable album links and the related event.
- **Impact:** beneficiary identity, campaign story, how funds reach the beneficiary, gross/net figures and fees where relevant, then verified reporting after the event. Never invent totals or imply tax-deductible donations or registered charitable status.
- **Partners:** each partner's work, its contribution to URC, related events, website and an optional partnership enquiry. Monetary sponsorship, services, venue access, discounts and recovery experiences must be distinguished.
- **Shop:** provider-backed catalog, product variants, accurate stock, delivery/collection, cart, secure checkout and order confirmations. The provider still needs to be selected against budget and Zimbabwean merchant/payment support. Do not incur a monthly store subscription by default.
- **Join:** the verified community link once supplied. Browsing, galleries and guest checkout should not require a member account.

## URC Studio for Wayne, Vaughn and the owner

An iPhone-first workspace with clear tasks on laptop. Large touch targets, plain labels, one primary action per screen, short forms, sticky Save/Publish, image previews, clear actual upload progress, failed-save recovery and a usable Back action.

1. **Runs:** New run / edit a run / duplicate a previous event. Guided sections: basics → activities → cause → partners → registration → review/publish.
2. **Photos:** choose a run → select many photos → upload → set cover/captions → publish. Optimised public images, correct orientation, no public EXIF, bounded upload queue, retry failed items and duplicate checks.
3. **Recaps:** short summary, highlights, gallery link and optional verified results. Draft first; preview the public result before publishing.
4. **Partners:** name, logo, contribution type, plain-language 'what they do for URC', related offers, terms, valid dates and external link.
5. **Shop:** simplify the provider-backed product workflow to title, photos, price, sizes/colours, stock and collection/delivery. Orders remain authoritative in the commerce provider.
6. **Website:** homepage wording, featured event, images, social links, FAQs, community link, contact details and notices. Keep brand/layout controls restrained.

### Sign-in and roles

Invite-only team access. Use familiar email/password sign-in initially, with optional email-code sign-in once delivery is configured. No public team signup and no shared password. Verify the authenticated user and current team membership rather than trusting editable user metadata. Owner manages invitations, reconciliation and access; editors manage content and record giving. The event-day check-in role only needs attendee verification, never donation records or the entire customer database.

Real authentication/publishing requires a separate URC project and invited email addresses. A layout preview is never a real login and cannot publish content.

## Additional features worth building

### Event and attendance essentials

1. Multiple run/walk distances on one event, with separate capacities where required.
2. Clear sold-out/closed/cancelled/postponed states.
3. Waitlist with explicit invitation expiry when a place opens.
4. Calendar download with correct Africa/Harare time and event updates.
5. Maps link and 'Where do I park?' arrival guidance.
6. Activity ability and accessibility notes; do not claim accessibility without confirmation.
7. Event reminders with opt-in and one-tap unsubscribe.
8. Clear cancellation/transfer rules for attendance and separate refund terms for online giving.
9. Individual and group registration with free passes for everyone.
10. Unique free QR passes immediately after a saved registration; donations do not gate admission.
11. One-use check-in with an auditable reversal for a genuine scanning mistake.
12. Event-day quick view: start times, location, ticket and emergency/organiser contact.

### Partners and charity

13. Event-specific benefits with expiry, exclusions and redemption location.
14. Claim/redemption limits so one offer cannot be reused indefinitely.
15. Digital participant pass showing only eligible offers.
16. A partner contribution directory: money, in-kind work, venues, food, recovery or discounts.
17. Partner enquiries separate from general contact.
18. Beneficiary confirmation before a campaign is published.
19. Gross raised, payment fees, expenses if any, net transferred and evidence/date of transfer.
20. Optional donations separate from merchandise purchases, with clear beneficiary flow.
21. Volunteer signups for particular events, with the minimum necessary contact data.
22. Verified impact recaps linked to both event and beneficiary.

### Gallery and community

23. Albums remain attached to their event after its date passes.
24. Mobile swipe, keyboard arrows and a visible image count in the lightbox.
25. Cover selection and drag/reorder with accessible alternative controls.
26. Captions, image alt text and photographer credits.
27. An easy photo removal request route.
28. Optional high-resolution download only when the club has chosen to allow it.
29. Event recaps that can be shared on WhatsApp with a proper preview card.
30. Search by event title, cause, activity and partner.
31. A first-run guide and deterministic pace/format finder.
32. Post-event feedback with a short optional form.

### Commerce and operations

33. Stock reserved/confirmed by the provider; avoid overselling during busy drops.
34. Size guides and event-specific merchandise collections.
35. Collection at an event where offered, alongside real delivery rules.
36. Order status and support links without forcing an account.
37. Product images optimised for browsing while retaining appropriate source assets privately.
38. Exportable attendee/check-in lists with role restrictions.
39. Changes log: who edited or published what and when.
40. Draft recovery, conflict detection and useful undo/version history.
41. Reusable templates so the next monthly run starts from the last one.
42. A completeness check before publishing: date, meeting point, ticket policy, beneficiary, offer terms and cover.

### Measured improvement and optional AI

43. Event-page → completed registration → check-in funnel, with donations reported separately.
44. Attendance rate, repeat participation and capacity utilisation.
45. Partner redemptions and offer engagement, kept separate from ticket sales.
46. Gallery usage and content interest through opt-in anonymous analytics.
47. AI-assisted recap drafts from organiser notes, never invented results.
48. Suggested captions, alt text and category tags for uploaded photos, with review.
49. Image duplicate/quality/orientation checks; deterministic checks before using AI.
50. A plain-language admin summary of measured results, with the date range and source.

## Recommended sequence

- **Now:** visual identity, event/partner/impact structure, gallery, mobile Studio UX and a usable read-only preview.
- **Connect:** dedicated auth/database, invited team and real media storage; then verify save, publish and access revocation end to end.
- **Commerce:** install the chosen store provider before building cart/order/payment logic. Connect real merchant methods, test provider callbacks, inventory and refunds. No mock successful payment.
- **Event operations:** tickets, QR check-in, reminders, waitlists and benefit redemption.
- **Refine:** measured analytics, reviewed AI assistance and quality-of-life improvements.

## Information still needed

- URC backend/project ownership and invite emails for the three team members.
- Commerce account and supported merchant payment methods.
- Verified join link, live event records, partner agreements, beneficiary details and product stock/prices.
- Authentic club photography and the precise permissions/download policy for event photos.

The previously mentioned 16 May 2026 social run and 17 October 2026 awareness initiative are unconfirmed content leads, not published past events. Chicken Inn and a sauna/recovery collaboration were examples, not assumed sponsorship contracts.

## Owner clarification: attendance is free; giving is optional

Free registration and a donation are separate records. A participant who gives nothing receives exactly the same event pass and check-in treatment as a donor. A donation must never be a hidden attendance requirement.

- **Event pass:** name, event, date, meeting point, activity, opaque QR verification and a short pass code. No paid/unpaid badge and no donation amount. Provide an immediate downloadable, event-designed PDF and a private retrieval link; email delivery is optional.
- **Private retrieval:** put the opaque token in the URL fragment rather than a server query string. Validate it on the server and do not index pass pages. Treat this as a bearer link, not a public album link.
- **Cash ledger:** amount, currency, event, collector, date, status and optional note. A donation can be anonymous and need not be linked to a participant.
- **EcoCash ledger:** record a reference, then verify against the merchant record. Typing a reference is not proof of a received payment. Screenshots are supporting information, not authoritative confirmation.
- **Online giving:** only the connected provider’s verified callback can confirm the transfer. Do not count a browser redirect as money received.
- **Check-in:** show only whether the pass is valid and already used. Volunteers do not need donation information.
- **Email costs:** registration and PDF delivery must continue to work without transactional email. Team login should also support normal email/password sign-in to avoid requiring email-code delivery for routine access. An optional email-code method can be enabled once delivery is configured.

The merchandise store remains a separate commerce integration. Optional event giving does not need a shopping basket or a paid ticket product.
