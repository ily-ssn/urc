# Connect and run URC

Use the **URC Supabase project `ktfwfeuyrpvelvpdborw`**. The website is built and deployed, but live accounts, uploads and bookings need this connection. These changes do not require a new database or a public media bucket.

1. Open **SQL Editor → New query**, paste [SETUP.sql](../supabase/SETUP.sql), and run it. It includes both reviewed schemas, private media policies and editable versions of the current content. The older photo collection is seeded as a draft until you link it to its actual past run; its current public fallback remains visible. It runs in one transaction, skips installed schema groups and preserves existing content on a rerun. If your project contains a partially installed older schema, resolve the SQL error before proceeding; do not drop existing tables.
2. In **Authentication → Users → Add user**, create your own account with your email and a strong password. Copy [OWNER.sql](../supabase/OWNER.sql), replace `YOUR_OWNER_EMAIL` with that exact email, and run it in SQL Editor. This grants your account the owner role. Do not give other users this SQL; add teammates from Studio.
3. In **Authentication → URL Configuration**, set Site URL to `https://powerhouse-urc.vercel.app` and allow `https://powerhouse-urc.vercel.app/studio` and `https://powerhouse-urc.vercel.app/account` for redirects. Password sign-in is the default; email codes are optional.
4. In **Vercel → powerhouse-urc → Settings → Environment Variables**, set `SUPABASE_URL` to `https://ktfwfeuyrpvelvpdborw.supabase.co`, `SUPABASE_PUBLISHABLE_KEY` to this project's publishable key, and `SUPABASE_SERVICE_ROLE_KEY` to this project's server-only service-role key. Obtain keys from Supabase's API settings. Never paste the service key into website fields or commit it. Redeploy the latest main commit after setting the variables.
5. Open `/studio`, sign in and use **Edit homepage**, **Runs → Add a run**, or **Photos → New gallery**. Upload pictures, assign them to a section and inspect Desktop/Phone previews. Save draft keeps edits private; Publish changes the live page. Website photo edits use the existing `homepage-introduction` page.
6. For each run, enter the banner, title, date/time, meeting point, headline, full description, distance, elevation, difficulty, estimated duration, water checkpoints and map links. Optional information can remain empty. A photo can be used as the card cover, full banner or figures portrait separately. No code edits are needed for this layout.
7. For a gallery, select its run, enter the gallery date and upload photos. The latest four albums appear first in the camera roll, one cover per album. While only one album exists, additional photographs fill the four slots. Older albums remain saved and accessible. Add the shared Google Drive folder URL to **Edit homepage → Browse photos** if you want the official-photo button to open Drive.
8. After connection, verify your owner login, upload/save/publish a draft and check it publicly. Make a test future run and complete a free reservation, download its PDF, and check it in from Studio. Native reservations on the seeded Reset remain **coming soon** until you deliberately open registration after checking the live flow. Set the confirmed route and event terms before opening it. Archive the test event afterward.

The installer was tested against an isolated Postgres-compatible database, including a repeat run. It has not been executed on your live Supabase project. Existing tables are not deleted and historical albums are not erased.

## Image exports

| Placement | Export width × height | Ratio |
| --- | --- | --- |
| Home and shared page banners, including each run | **2560 × 1440 px** | 16:9 horizontal |
| Run card image | **1920 × 1080 px** | 16:9 horizontal |
| Club/editorial photographs and run figures portrait | **1500 × 2000 px** | 3:4 vertical |
| Camera roll and gallery highlights | **1200 × 1600 px** | 3:4 vertical |
| Before you go cards | **1200 × 1600 px** | 3:4 vertical |
| Brand logo masters | SVG preferred; transparent PNG at least 1600 px wide | Original proportions |

JPEG or WebP for photographs. Keep faces and key action near the middle; wide banners crop more tightly on phones. A full-resolution vertical original can supply both portrait sizes. Studio prepares web copies up to 2048 px on the longest edge and keeps the image proportions. The current photo brief remains **13 horizontal + 15 vertical**; your 20 vertical exports cover the portrait requirement with spares. Brand artwork is separate.

For maintainers: `node scripts/prepare-setup.mjs` regenerates `SETUP.sql` from the reviewed base, community and editor SQL plus the current curated content. Existing installations can apply `supabase/EDITOR.sql` alone for the image-slot storage policy. Do not treat the layout preview as a connected booking or upload test.
