# URC Studio, free passes and optional giving

## What this release contains

The website, mobile Studio screens, content API, invite-only authentication integration, draft/publish isolation, private gallery storage integration, registration API, PDF generator, QR check-in and private donation ledger are implemented. They have been checked locally with browser tests and isolated Postgres-compatible database tests.

**They are not connected to a live URC database yet.** Until that project is connected, sign-in and registration fail closed. `/studio?preview=1` demonstrates the layout with memory-only drafts. `/pass?preview=1` downloads a watermarked sample that is not valid for entry. Nothing in those previews records real attendance or money.

The merchandise store and automatic payment-provider callbacks are not implemented. No checkout success is simulated.

## The low-cost operating model

1. Publish a real event with its date, meeting point, cause and activity details. Select **Free URC PDF pass** and open registration.
2. A visitor supplies their name and selected activity. Email and phone are optional. They immediately receive a private pass link and can download the PDF. No transactional email is needed.
3. At the event, a signed-in team member scans the QR or types its short code. The server confirms validity and marks it used. A second attempt is clearly identified. Check-in requires an internet connection; the PDF itself can be kept offline.
4. Giving is a separate choice. Cash can be recorded by the receiving team member, including currency, event and collection time. A donor need not be identified. Their event pass never changes.
5. EcoCash references are recorded as **needs verification**. The owner matches the reference, amount and currency against the actual merchant transaction, then confirms it. Duplicate EcoCash references in the same currency are rejected. An entered reference or screenshot alone is not a verified transfer.
6. The owner sees grouped confirmed/pending totals, separately by event, currency and method, and downloads a reconciliation-summary CSV. Editors see only the records they collected; check-in volunteers see no donation records.

Do not add USD and ZWG as though they were one currency. Owner verification should include a cash count/handover against collector records. This ledger is an operational record, not a replacement for financial statements or a merchant settlement report.

For online giving later, select a Zimbabwe-supported merchant provider after checking onboarding, fees and supported methods. Confirm money only from a verified server callback and settlement record, with idempotency and refund handling. No paid-ticket product or shopping basket is required for free attendance.

## Connect the dedicated Supabase project

The owner is creating this project. Use only URC's project; never apply this schema to Luxenova or Richo.

1. Review `supabase/SCHEMA.sql`, apply it once as a tracked migration to the new project, and verify policies there. Its test fixture is not production data.
2. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key), and server-only `SUPABASE_SERVICE_ROLE_KEY` through secure hosting settings. Never paste credentials into chat, commit them, or prefix the service key for browser exposure. The browser configuration endpoint rejects service/secret keys in the public-key field.
3. Disable public user signup in Auth. Create the first owner user in the Auth dashboard, then add their real Auth user ID to `urc_team` with role `owner` and their display name. Never use a shared team password. Set the intended site URL and allowlisted redirects. Enable strong password protections available on the project.
4. Verify sign-in, password setup, sign-out, role revocation, draft saves, publication, media access, a real test registration, PDF retrieval, check-in and the private ledger against the connected project. Remove test content afterward.
5. The owner can then create Wayne and Vaughn's one-time setup links inside Studio. Share those links privately with the intended person. They choose their own password. No invitation email is sent. The owner can also remove editor/check-in access in the team panel; database permissions stop subsequent privileged requests immediately. Owner accounts are protected from that removal form. Existing non-owner team accounts can receive a fresh setup link through the same form.
6. Email-code sign-in is optional: set `STUDIO_EMAIL_OTP_ENABLED=true` only after appropriate email delivery and code templates are configured. Password sign-in is the default and does not consume an email on every login.

Owner/editor/check-in access is enforced by database policies and guarded functions, independently of the visible controls. A content editor cannot promote themselves. Private tokens are hashed in storage; pass retrieval links carry the token in the fragment, with no-referrer/no-store response headers. Never share a participant's private pass URL as a public event link.

## Publishing and routine work

- **Runs:** create the details, save a draft, then Publish. A live run keeps its existing public snapshot while a new draft is edited. Times use Africa/Harare (CAT).
- **Photos:** create a gallery, choose its run, upload JPG/PNG/WebP photos, set a cover and captions, then publish. Images are resized and re-encoded without original EXIF. iPhone HEIC files need a compatible export. Draft images remain private; only published references receive public access. Previously issued public image URLs expire after five minutes.
- **Recaps:** write the story, attach the run, and add only verified impact. No financial total is auto-published from the private ledger.
- **Partners:** name the partner and explain the actual contribution. Luxenova's in-kind design/digital support is included; example food and recovery businesses are not claimed as sponsors.
- **Website:** use page key `homepage-introduction` to update the homepage introduction and hero cover. A published page can also supply a verified community join URL and announcement. Full layout, arbitrary scripts, FAQs and navigation remain code-managed in this release.
- **Shop:** remains a clear connection/setup state until the real merchant/store provider is selected. Product variants, stock, orders, checkout and refunds must come from that integration.

## Before a public launch

Supply the confirmed join link, first event, beneficiary details, event-day contact and appropriate privacy/contact details. Replace reference photography with photos the club has permission to publish. Establish photo-removal and data-correction/deletion handling, retention periods, cash handover and transfer verification procedures. Validate owner access and all real connected flows before opening registration.

Future work is listed separately in `URC-BLUEPRINT.md`; it is a roadmap, not a claim that all proposed features are shipped.
