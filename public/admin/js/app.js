/* ----------------------------------------------------------------
   ADMIN PANEL — static content editor

   There is no server: the panel reads content.json, keeps your edits in
   this browser, and hands you a new content.json to commit. The sidebar,
   the forms and the routing are all derived from schemas.js.
   ---------------------------------------------------------------- */

import { $, h, clone, toast, confirmDialog, downloadFile, iconBtn } from './dom.js';
import { buildField } from './fields.js';
import { SCHEMAS, SECTION_KEYS } from './schemas.js';
import * as store from './store.js';

const THEME_KEY = 'sp-admin-theme';
const PUBLISH_VIEW = 'publish';
const HELP_VIEW = 'help';

const drafts = {};          // section key -> in-progress copy
let currentView = SECTION_KEYS[0];

/* ==================== shell ==================== */

const host = () => $('#view-host');

function setHeader(title, subtitle) {
    $('#view-title').textContent = title;
    $('#view-subtitle').textContent = subtitle || '';
}

function card(iconClass, title, desc, body, tone) {
    return h('div', { class: 'card' }, [
        h('div', { class: 'card-head' }, [
            h('i', { class: iconClass, style: `color:var(--${tone || 'accent'})` }),
            h('div', {}, [h('h3', { text: title }), desc ? h('p', { text: desc }) : null])
        ]),
        h('div', { class: 'card-body' }, body)
    ]);
}

function buildSidebar() {
    const nav = $('#sidebar-nav');
    nav.innerHTML = '';

    nav.appendChild(h('p', { class: 'nav-group-title', text: 'Page Content' }));
    SECTION_KEYS.forEach((key) => {
        nav.appendChild(
            h('button', { class: 'nav-item', 'data-view': key, onclick: () => navigate(key) }, [
                h('i', { class: SCHEMAS[key].icon }),
                document.createTextNode(' ' + SCHEMAS[key].title),
                h('span', { class: 'dirty-dot', 'data-dirty-for': key, hidden: true, title: 'Unpublished changes' })
            ])
        );
    });

    nav.appendChild(h('p', { class: 'nav-group-title', text: 'Publish' }));
    nav.appendChild(
        h('button', { class: 'nav-item', 'data-view': PUBLISH_VIEW, onclick: () => navigate(PUBLISH_VIEW) }, [
            h('i', { class: 'fa-solid fa-cloud-arrow-up' }),
            document.createTextNode(' Publish & Backup')
        ])
    );
    nav.appendChild(
        h('button', { class: 'nav-item', 'data-view': HELP_VIEW, onclick: () => navigate(HELP_VIEW) }, [
            h('i', { class: 'fa-solid fa-circle-question' }),
            document.createTextNode(' How it works')
        ])
    );
}

/** Paint the "unpublished changes" markers in the sidebar and topbar. */
function paintDirtyState() {
    SECTION_KEYS.forEach((key) => {
        const dot = document.querySelector(`[data-dirty-for="${key}"]`);
        if (dot) dot.hidden = !store.isSectionDirty(key);
    });

    const banner = $('#dirty-banner');
    banner.hidden = !store.isDirty();
}

/* ==================== content editor ==================== */

function renderSection(key) {
    const schema = SCHEMAS[key];
    setHeader(schema.title, schema.subtitle);

    if (!drafts[key]) drafts[key] = store.section(key);
    const draft = drafts[key];

    const view = h('div', { class: 'view' });

    view.appendChild(
        h('div', { class: 'callout' }, [
            h('i', { class: 'fa-solid fa-circle-info' }),
            h('span', {
                html: 'Edit below and press <strong>Save</strong> — the change is kept in this browser and shows up in the <i class="fa-solid fa-desktop"></i> live preview. Go to <strong>Publish &amp; Backup</strong> when you want it on the real website.'
            })
        ])
    );

    schema.groups.forEach((group) => {
        const grid = h('div', { class: 'grid grid-2' });
        group.fields.forEach((field) => grid.appendChild(buildField(field, draft, null)));
        view.appendChild(card(group.icon, group.title, group.desc, grid));
    });

    const status = h('span', { class: 'status' });
    const paintStatus = () => {
        status.textContent = store.isSectionDirty(key)
            ? 'Saved in this browser — not published yet'
            : 'Matches the published website';
    };
    paintStatus();

    const saveBtn = iconBtn('btn btn-primary', 'fa-solid fa-floppy-disk', 'Save', () => {
        store.saveSection(key, draft);
        paintStatus();
        paintDirtyState();
        reloadPreview();
        toast('Saved. Publish when you are ready.', 'success');
    });

    const discardBtn = iconBtn('btn btn-outline', 'fa-solid fa-xmark', 'Discard edits', () => {
        delete drafts[key];
        renderSection(key);
        toast('Unsaved edits discarded.');
    });

    const revertBtn = iconBtn('btn btn-ghost', 'fa-solid fa-rotate-left', 'Revert to published', async () => {
        const ok = await confirmDialog(
            'Revert this section?',
            `"${schema.title}" goes back to what is live on the website right now.`,
            'Revert'
        );
        if (!ok) return;
        store.revertSection(key);
        delete drafts[key];
        renderSection(key);
        paintDirtyState();
        reloadPreview();
        toast('Reverted to the published content.');
    });

    view.appendChild(h('div', { class: 'card' }, h('div', { class: 'save-bar' }, [saveBtn, discardBtn, revertBtn, status])));

    host().replaceChildren(view);
}

/* ==================== publish view ==================== */

function renderPublish() {
    setHeader('Publish & Backup', 'Put your saved edits on the live website');

    const dirty = store.isDirty();

    const downloadBtn = iconBtn('btn btn-primary', 'fa-solid fa-file-arrow-down', 'Download content.json', () => {
        downloadFile('content.json', store.asFileText());
        toast('Downloaded — replace public/content.json with this file.', 'success');
    });

    const copyBtn = iconBtn('btn btn-outline', 'fa-regular fa-copy', 'Copy JSON', async () => {
        try {
            await navigator.clipboard.writeText(store.asFileText());
            toast('content.json copied to the clipboard.', 'success');
        } catch (err) {
            toast('Copy failed — use Download instead.', 'error');
        }
    });

    const importInput = h('input', { type: 'file', accept: 'application/json', style: 'display:none' });
    const importBtn = iconBtn('btn btn-outline', 'fa-solid fa-file-import', 'Import a content.json', () =>
        importInput.click()
    );
    importInput.addEventListener('change', async () => {
        const file = importInput.files[0];
        importInput.value = '';
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            const ok = await confirmDialog(
                'Import this file?',
                'Every section of your working copy is replaced by the contents of this file.',
                'Import'
            );
            if (!ok) return;
            store.replaceAll(parsed);
            Object.keys(drafts).forEach((key) => delete drafts[key]);
            paintDirtyState();
            reloadPreview();
            renderPublish();
            toast('Imported.', 'success');
        } catch (err) {
            toast('Import failed: ' + err.message, 'error');
        }
    });

    const revertBtn = iconBtn('btn btn-danger', 'fa-solid fa-triangle-exclamation', 'Discard ALL local edits', async () => {
        const ok = await confirmDialog(
            'Discard every local edit?',
            'The editor goes back to the content.json that is deployed right now. This cannot be undone.',
            'Discard everything'
        );
        if (!ok) return;
        store.revertAll();
        Object.keys(drafts).forEach((key) => delete drafts[key]);
        paintDirtyState();
        reloadPreview();
        renderPublish();
        toast('All local edits discarded.');
    });

    const steps = h('ol', { class: 'steps' }, [
        h('li', { html: 'Press <strong>Download content.json</strong> below.' }),
        h('li', { html: 'Replace <code>public/content.json</code> in the project with that file.' }),
        h('li', { html: 'Commit and push: <code>git add public/content.json &amp;&amp; git commit -m "Update content" &amp;&amp; git push</code>' }),
        h('li', { html: 'Render redeploys automatically — the website shows the new content in a minute or two.' })
    ]);

    host().replaceChildren(
        h('div', { class: 'view' }, [
            h('div', { class: 'callout' + (dirty ? ' warn' : '') }, [
                h('i', { class: dirty ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check' }),
                h('span', {
                    html: dirty
                        ? 'You have saved edits that are <strong>not on the live website yet</strong>. Follow the four steps below.'
                        : 'The editor matches the published website — nothing to publish right now.'
                })
            ]),
            card('fa-solid fa-cloud-arrow-up', 'Publish your changes', 'Four steps, then Render does the rest', [
                steps,
                h('div', { class: 'button-row' }, [downloadBtn, copyBtn])
            ]),
            card('fa-solid fa-database', 'Backup & restore', 'Keep a copy, or load one back in', [
                h('p', { class: 'hint', style: 'margin-bottom:14px',
                    text: 'The downloaded file is a complete backup. Import it here any time to get that version back.' }),
                h('div', { class: 'button-row' }, [importBtn, importInput])
            ]),
            card('fa-solid fa-rotate-left', 'Danger zone', 'Throw away everything edited in this browser', [
                h('p', { class: 'hint', style: 'margin-bottom:14px',
                    text: 'Your edits live in this browser until you publish them. Discarding cannot be undone.' }),
                revertBtn
            ], 'danger')
        ])
    );
}

/* ==================== help view ==================== */

function renderHelp() {
    setHeader('How it works', 'Editing a static website');

    host().replaceChildren(
        h('div', { class: 'view' }, [
            card('fa-solid fa-circle-question', 'The short version', null, [
                h('ol', { class: 'steps' }, [
                    h('li', { html: 'The website reads <code>public/content.json</code>. Nothing else stores content.' }),
                    h('li', { html: 'This panel edits a copy of that file inside your browser (<code>localStorage</code>).' }),
                    h('li', { html: '<strong>Save</strong> keeps an edit locally, and the <i class="fa-solid fa-desktop"></i> preview shows it instantly.' }),
                    h('li', { html: '<strong>Publish &amp; Backup</strong> gives you the new <code>content.json</code> to commit and push.' })
                ])
            ]),
            card('fa-solid fa-image', 'Adding images', null, [
                h('ul', { class: 'steps' }, [
                    h('li', { html: 'Put the file in <code>public/assets/</code>, push it, and type <code>assets/your-file.jpg</code> in the image field.' }),
                    h('li', { html: 'Or press <strong>Embed</strong> on an image under 250 KB to store it inside <code>content.json</code> itself.' })
                ])
            ]),
            card('fa-solid fa-envelope', 'Contact form messages', null, [
                h('p', { class: 'hint', html: 'A static site has no inbox. Create a free <a href="https://formspree.io" target="_blank" rel="noopener">Formspree</a> form and paste its endpoint into <strong>Contact → Enquiry Form</strong>. Without an endpoint the form opens the visitor\'s mail app with the message pre-filled.' })
            ]),
            card('fa-solid fa-shield-halved', 'About security', null, [
                h('p', { class: 'hint', html: 'There is no login because there is nothing to protect: this page cannot change the live website on its own. Only a git push does that — so your GitHub account is the real lock.' })
            ])
        ])
    );
}

/* ==================== routing ==================== */

function renderView(key) {
    if (key === PUBLISH_VIEW) return renderPublish();
    if (key === HELP_VIEW) return renderHelp();
    if (SCHEMAS[key]) return renderSection(key);
    return renderSection(SECTION_KEYS[0]);
}

function navigate(key) {
    currentView = key;
    document.querySelectorAll('.nav-item').forEach((btn) =>
        btn.classList.toggle('active', btn.dataset.view === key)
    );
    closeSidebar();
    window.scrollTo({ top: 0 });
    if (location.hash.slice(1) !== key) location.hash = key;
    renderView(key);
    paintDirtyState();
}

/* ==================== live preview ==================== */

function reloadPreview() {
    const pane = $('#preview-pane');
    const frame = $('#preview-frame');
    if (frame && !pane.hidden) frame.src = '../index.html?preview=1&t=' + Date.now();
}

/* ==================== boot ==================== */

function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sidebar-backdrop').classList.remove('show');
}

function initChrome() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem(THEME_KEY) || 'light');
    $('#admin-theme-toggle').addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
    });

    $('#menu-btn').addEventListener('click', () => {
        $('#sidebar').classList.add('open');
        $('#sidebar-backdrop').classList.add('show');
    });
    $('#sidebar-close').addEventListener('click', closeSidebar);
    $('#sidebar-backdrop').addEventListener('click', closeSidebar);

    $('#preview-toggle').addEventListener('click', () => {
        const pane = $('#preview-pane');
        pane.hidden = !pane.hidden;
        if (!pane.hidden) reloadPreview();
    });
    $('#preview-close').addEventListener('click', () => ($('#preview-pane').hidden = true));
    $('#preview-reload').addEventListener('click', reloadPreview);
    $('#publish-shortcut').addEventListener('click', () => navigate(PUBLISH_VIEW));

    window.addEventListener('hashchange', () => {
        const key = location.hash.slice(1);
        if (key && key !== currentView) navigate(key);
    });
}

function fatal(message) {
    host().replaceChildren(
        h('div', { class: 'view' }, [
            card('fa-solid fa-triangle-exclamation', 'The editor could not start', null, [
                h('p', { class: 'hint', text: message }),
                h('p', { class: 'hint', html: 'Open this page through a web server (<code>npm run dev</code>), not by double-clicking the HTML file.' })
            ], 'danger')
        ])
    );
}

(async function boot() {
    initChrome();
    try {
        await store.init();
    } catch (err) {
        setHeader('Admin Panel', '');
        fatal(err.message);
        return;
    }

    buildSidebar();
    const initial = location.hash.slice(1);
    navigate(SCHEMAS[initial] || initial === PUBLISH_VIEW || initial === HELP_VIEW ? initial : SECTION_KEYS[0]);
})();
