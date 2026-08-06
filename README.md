# Sivapandi R — Software Developer Portfolio (Full Stack + Admin Panel)

A modern, responsive portfolio for **Sivapandi R**, now backed by a **Node.js/Express API** and a
**full admin panel (CMS)**. Every word, card, skill bar, project, certificate and resume line on the
public site is stored in the database and editable from the admin panel — no code editing required.

The public UI is unchanged: same design, same animations, same theme toggle. It simply renders
itself from `/api/content` instead of hard-coded HTML.

---

## Quick Start

```bash
npm install        # install dependencies (already done if node_modules exists)
npm start          # start the server
```

| What            | URL                             |
| --------------- | ------------------------------- |
| **Website**     | http://localhost:3000/          |
| **Admin panel** | http://localhost:3000/admin     |
| API health      | http://localhost:3000/api/health |

**First-run admin login** (printed in the console on first start):

```
username : admin
password : Admin@123
```

> Change it immediately in **Admin Panel → Account**. The dashboard shows a warning until you do.

`npm run dev` starts the server with auto-restart on file changes.
`npm run reset-db` deletes `data/db.json` (keeping a timestamped backup) so the next start re-seeds
the original portfolio content.

---

## What the Admin Panel Controls

| Panel section           | What you can change                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Dashboard**           | Page views, views today, message counts, resume/ZIP downloads, 14-day visitor chart, activity log |
| **Messages**            | Contact-form inbox — read/unread, star, search, filter, reply by email, delete            |
| **Site & Navigation**   | Browser/SEO title, meta description, logo text, default theme, navbar links, resume button |
| **Hero Section**        | Availability badge, headline, tagline, intro, CTA buttons, contact pills, profile card, floating badges |
| **About**               | Section header and every highlight card (icon, title, text)                               |
| **Skills**              | Skill categories, each skill's label + bar width, and the whole Tools & Ecosystem grid     |
| **Experience**          | Timeline entries — role, company, period and bullet points                                |
| **Projects**            | Project cards, tech tags, banner icon or cover image, live/repo links, and the detail pop-up |
| **Education**           | Qualifications with grade badges, certifications, languages                                |
| **Contact**             | Heading, text, contact rows with click-to-copy, form on/off, success message               |
| **Footer**              | Copyright line and sub-text                                                                |
| **Resume / PDF**        | Upload your own PDF **or** edit the generated one section by section                       |
| **Media Library**       | Upload/browse/delete images and PDFs, copy their paths                                     |
| **Account**             | Username, contact email, password                                                          |
| **Backup & Reset**      | Export/import the whole content document as JSON, or reset to the original content         |

Extras: reorder / duplicate / delete any list entry, toggle whole sections off (the navbar link hides
too), a **live preview pane** that reloads the site next to the editor, dark mode, and full mobile support.

---

## File Structure

```text
sivapandi_portfolio/
├── package.json
├── .env                     # your config (git-ignored) — created from .env.example
├── .env.example
├── vercel.json              # Vercel routing (all requests -> api/index.js)
├── api/index.js             # Vercel serverless entry (exports the Express app)
├── server/
│   ├── app.js               # Express app: API + static hosting
│   ├── server.js            # local/long-running entry (listens on PORT)
│   ├── db.js                # single JSON document over a pluggable store
│   ├── paths.js             # DATA_DIR / UPLOAD_DIR resolution
│   ├── store/
│   │   ├── index.js         # picks the backend from the environment
│   │   ├── fsStore.js       # filesystem (local, Render, VPS)
│   │   └── blobStore.js     # Vercel Blob (serverless)
│   ├── defaults.js          # the original portfolio content (seed + "reset")
│   ├── reset.js             # npm run reset-db
│   ├── middleware/auth.js   # JWT guard
│   └── routes/
│       ├── auth.js          # login, session, account
│       ├── content.js       # public read + admin write of every section
│       ├── messages.js      # contact form + admin inbox
│       ├── stats.js         # visitor tracking + dashboard metrics
│       └── uploads.js       # file uploads, resume + source-zip downloads
├── public/
│   ├── index.html           # the portfolio (unchanged design)
│   ├── style.css            # unchanged
│   ├── script.js            # theme, animations, modals, PDF, form -> API
│   ├── content.js           # renders the page from /api/content
│   ├── favicon.svg
│   ├── Resume.pdf
│   ├── uploads/             # admin-uploaded files
│   └── admin/
│       ├── index.html       # admin panel shell
│       ├── admin.css
│       └── admin.js         # schema-driven CMS editor
└── data/
    └── db.json              # content, messages, stats, admin account (git-ignored)
```

---

## API Reference

### Public

| Method | Endpoint                  | Purpose                                    |
| ------ | ------------------------- | ------------------------------------------ |
| GET    | `/api/health`             | Service check + which storage backend is active |
| GET    | `/api/content`            | All content used to render the site        |
| GET    | `/api/content/:section`   | One section                                |
| POST   | `/api/messages`           | Submit the contact form (rate-limited)     |
| POST   | `/api/track`              | Count a view / resume / zip event          |
| GET    | `/api/resume`             | Download the uploaded resume PDF           |
| GET    | `/api/download/source`    | Download the website source as `.zip`      |

### Admin (require `Authorization: Bearer <token>`)

| Method | Endpoint                          | Purpose                        |
| ------ | --------------------------------- | ------------------------------ |
| POST   | `/api/auth/login`                 | Sign in (rate-limited)         |
| GET    | `/api/auth/me`                    | Validate the current session   |
| PUT    | `/api/auth/account`               | Change username/email/password |
| PUT    | `/api/admin/content`              | Replace the whole document     |
| PUT    | `/api/admin/content/:section`     | Save one section               |
| POST   | `/api/admin/content/reset`        | Reset all, or one section      |
| GET    | `/api/admin/messages`             | Inbox (`?filter=`, `?q=`)      |
| PATCH  | `/api/admin/messages/:id`         | Mark read / starred            |
| POST   | `/api/admin/messages/read-all`    | Mark everything read           |
| DELETE | `/api/admin/messages/:id`         | Delete a message               |
| GET    | `/api/admin/stats`                | Dashboard metrics              |
| POST   | `/api/admin/upload/resume`        | Upload a resume PDF            |
| POST   | `/api/admin/upload/image`         | Upload an image                |
| GET    | `/api/admin/uploads`              | List uploaded files            |
| DELETE | `/api/admin/uploads/:name`        | Delete an uploaded file        |
| GET    | `/api/admin/backup`               | Export content as JSON         |

---

## Configuration (`.env`)

```ini
PORT=3000
HOST=0.0.0.0

# Storage — leave empty locally. Set these to a mounted persistent disk
# when hosting on a platform with an ephemeral filesystem.
DATA_DIR=
UPLOAD_DIR=

# Only used on the FIRST run, when data/db.json is created
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@123
ADMIN_EMAIL=sivapandi622004@gmail.com

JWT_SECRET=<a long random string>
JWT_EXPIRES_IN=12h

# Optional: also email contact-form messages to you
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
CONTACT_TO=
```

Leave the SMTP block empty to keep messages in the admin inbox only.

---

## Editing Tips

**Resume section body syntax** (Admin → Resume / PDF):

| You type              | You get                          |
| --------------------- | -------------------------------- |
| `Some text`           | a paragraph                      |
| `- Some text`         | a bullet point                   |
| `Title \| Subtitle`   | a bold title with a muted sub-line |
| `**text**`            | **bold** text                    |

`**bold**` also works in hero/about/project descriptions and experience bullets.

**Icons** — any [Font Awesome 6 free](https://fontawesome.com/search?o=r&m=free) class, e.g.
`fa-solid fa-rocket`, `fa-brands fa-react`. Each icon field shows a live preview.

---

## Deploying to Vercel

Vercel's filesystem is **read-only** (only `/tmp`, which is per-instance and ephemeral), so the app
cannot keep its database or uploads on disk there. It therefore ships with a pluggable storage
layer — [`server/store/`](server/store/) — that switches to **Vercel Blob** automatically.

### Steps

1. **Import the repo** — [vercel.com/new](https://vercel.com/new) → pick `Sivapandi369/portfolio`.
   No build settings to change; [`vercel.json`](vercel.json) routes every request to
   [`api/index.js`](api/index.js), which is the same Express app used locally.
2. **Create a Blob store** — project → **Storage** → **Create** → **Blob** → connect it.
   Vercel injects `BLOB_READ_WRITE_TOKEN`, which is what flips the app to Blob storage.
   **Skip this and the site still renders, but no admin edit can be saved.**
3. **Add environment variables** — project → Settings → Environment Variables:

   | Variable | Value |
   | --- | --- |
   | `JWT_SECRET` | a long random string |
   | `ADMIN_PASSWORD` | your admin password |
   | `ADMIN_USERNAME` | `admin` (optional) |
   | `ADMIN_EMAIL` | your email (optional) |

4. **Redeploy** so the new variables take effect. Then open `/admin` and sign in.

`GET /api/health` reports which backend is live: `{"store":"vercel-blob"}` means persistence is on;
`"filesystem"` on Vercel means step 2 was missed and edits will not survive.

### Trade-offs vs a normal server

- Cold starts add ~1s to the first request after idling.
- The `.zip` source download reads files bundled into the function (`includeFiles` in `vercel.json`).
- Every write is awaited before responding, so nothing is lost when the function freezes.

---

## Deploying to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Sivapandi369/portfolio)

A [`render.yaml`](render.yaml) blueprint is included, so deployment is one click on the button above
(or in the dashboard: **New + → Blueprint → pick this repo → Apply**). Set `ADMIN_PASSWORD` when
Render prompts for it, then **Apply** — the first build takes 2–4 minutes.

If you deploy with `NODE_ENV=production` and **no** `ADMIN_PASSWORD`, the app refuses to fall back
to the publicly documented `Admin@123`; it generates a random password and prints it **once** in the
deploy logs. Copy it from there, sign in, and change it in **Admin → Account**.

### Read this first: persistence

Render's filesystem is **ephemeral**. Without a mounted disk, `data/db.json` and
`public/uploads/` are recreated from scratch on every deploy *and* every restart — so admin
edits and contact messages disappear. Two supported setups:

| Setup | Config | Result |
| --- | --- | --- |
| **Paid (recommended)** — `plan: starter`, keep the `disk:` block, `DATA_DIR=/var/data/db`, `UPLOAD_DIR=/var/data/uploads` | as shipped in `render.yaml` | Edits, uploads and messages persist across deploys and restarts |
| **Free (demo only)** — set `plan: free`, delete the `disk:` block and the `DATA_DIR`/`UPLOAD_DIR` vars | free instance | Site always renders correctly, but content reverts to the seeded defaults on restart and messages are not kept |

Disks are not available on Render's free instance type — that is a platform limit, not an app limit.
The server prints a warning at boot if `NODE_ENV=production` and `DATA_DIR` is unset.

Free instances also sleep after ~15 minutes of inactivity, so the first request after idling
takes 30–60 seconds to wake up.

### Other hosts

Any Node host works — the app only needs `PORT` (it binds `0.0.0.0` by default) and, for
persistence, a writable directory pointed to by `DATA_DIR` / `UPLOAD_DIR`.

---

## Security Notes

- Passwords are hashed with bcrypt; sessions use signed JWTs that expire (12h by default).
- Login and contact-form endpoints are rate-limited.
- Contact input is validated, length-capped and escaped on render — no HTML injection.
- Uploads are restricted to PDF/PNG/JPG/WEBP/GIF/SVG and capped at 8 MB.
- Before going live: set a strong `JWT_SECRET`, change the admin password, and serve over HTTPS.

If the backend is ever unreachable, the site falls back to the static HTML already in
`public/index.html` instead of showing an empty page.

---

## Profile Summary

- **Name**: Sivapandi R
- **Location**: Theni - 625531, Tamil Nadu
- **Phone**: +91 9360833565
- **Email**: sivapandi622004@gmail.com
- **Education**: BE Electronics & Communication Engineering, Sethu Institute of Technology (2025, CGPA: 7.3)
- **Stack**: Python, C, Java (Basics), HTML5, CSS3, JavaScript, React.js, Node.js, Express, MongoDB, MySQL, Git/GitHub
- **Internships**: Junior Software Developer — Cadd Technologies · Web Development Intern — Corizo Corporation
