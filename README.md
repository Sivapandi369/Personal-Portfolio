# Sivapandi R — Portfolio

A static portfolio website. No backend, no database, no build step — plain
HTML, CSS and vanilla JavaScript, deployed on Render's free static plan.

**Live site:** https://sivapandi-portfolio.onrender.com (after the first deploy)

---

## How it works

Every word on the site comes from one file: [`public/content.json`](public/content.json).
`public/content.js` reads it on page load and renders the markup from it.

The **content editor** at `/admin` is a browser-only CMS. It reads the same
`content.json`, keeps your edits in `localStorage`, and hands you a new
`content.json` to commit. There is no login because the page cannot change
the live site by itself — only a `git push` can do that.

```
Edit in /admin  ->  Save (stays in your browser)  ->  Download content.json
                ->  replace public/content.json   ->  git push  ->  Render redeploys
```

---

## Project structure

```
public/                     <- everything Render serves
├── index.html              markup + fallback content
├── content.json            ALL site content lives here
├── content.js              renders index.html from content.json
├── script.js               theme, scroll effects, modals, resume PDF, contact form
├── style.css               site styles
├── favicon.svg
├── Resume.pdf              downloaded when Resume mode = "file"
├── assets/                 your images (referenced as assets/name.jpg)
└── admin/                  the content editor
    ├── index.html          shell: sidebar, topbar, preview pane
    ├── admin.css
    └── js/
        ├── app.js          boot, routing, views, publish flow
        ├── schemas.js      one schema per content section  <- edit this to add fields
        ├── fields.js       schema -> form controls
        ├── store.js        content.json <-> localStorage working copy
        └── dom.js          small DOM helpers

render.yaml                 Render blueprint (static site)
package.json                only a local dev server
```

---

## Run it locally

The admin panel uses `fetch()` and ES modules, so it needs a web server —
opening the HTML file directly (`file://`) will not work.

```bash
npm run dev          # http://localhost:3000
```

Any static server works just as well:

```bash
python -m http.server 3000 --directory public
npx http-server public -p 3000
```

Then open:

- site — <http://localhost:3000>
- editor — <http://localhost:3000/admin/>

---

## Editing content

**With the editor (recommended)**

1. Open `/admin`, pick a section in the sidebar, edit, press **Save**.
2. Use the 🖥 live preview to check it.
3. Go to **Publish & Backup** → **Download content.json**.
4. Replace `public/content.json` with the downloaded file.
5. `git add public/content.json && git commit -m "Update content" && git push`

**By hand** — `public/content.json` is plain JSON; edit and push it.

**Adding a new editable field** — add it to the section's schema in
`public/admin/js/schemas.js`, and render it in `public/content.js`.

### Images

Put the file in `public/assets/`, push it, and use the path `assets/your-file.jpg`
in any image field. Images under 250 KB can also be embedded straight into
`content.json` with the **Embed** button.

### Contact form

A static site has no inbox. Two options, both under **Contact → Enquiry Form**:

- **Form service** — create a free [Formspree](https://formspree.io) form and
  paste its endpoint. Messages arrive in your email.
- **Nothing set** — the form opens the visitor's mail app with the message
  pre-filled, addressed to the fallback email.

### Resume PDF

- `generate` — the PDF is built in the browser from **Resume / PDF → Generated PDF Content**.
- `file` — the browser downloads `public/Resume.pdf` (or whatever path you set).

---

## Deploy on Render

1. Push this repo to GitHub.
2. Render Dashboard → **New +** → **Blueprint** → select the repo → **Apply**.
   `render.yaml` sets everything: static site, publish directory `./public`, no build command.
3. Every later `git push` to `main` redeploys automatically.

Without the blueprint: **New +** → **Static Site** → repo → build command *(empty)*,
publish directory `public`.

---

## License

MIT
