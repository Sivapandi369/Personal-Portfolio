/* ----------------------------------------------------------------
   PORTFOLIO ADMIN PANEL
   Schema-driven CMS for every section of the public website.
   Saving a section writes to /api/admin/content/:section, which the
   public page reads on load — so edits show up immediately.
   ---------------------------------------------------------------- */

(function () {
    'use strict';

    /* ==================== STATE ==================== */

    const TOKEN_KEY = 'sp-admin-token';
    const state = {
        token: localStorage.getItem(TOKEN_KEY) || '',
        user: null,
        content: null,
        view: 'dashboard',
        drafts: {},
        messages: { filter: 'all', query: '' }
    };

    /* ==================== TINY DOM HELPERS ==================== */

    function h(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach((k) => {
                const v = attrs[k];
                if (v === null || v === undefined || v === false) return;
                if (k === 'class') node.className = v;
                else if (k === 'html') node.innerHTML = v;
                else if (k === 'text') node.textContent = v;
                else if (k.startsWith('on') && typeof v === 'function') {
                    node.addEventListener(k.slice(2).toLowerCase(), v);
                } else if (v === true) node.setAttribute(k, '');
                else node.setAttribute(k, v);
            });
        }
        (Array.isArray(children) ? children : children ? [children] : [])
            .filter((c) => c !== null && c !== undefined && c !== false)
            .forEach((c) => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        return node;
    }

    const $ = (sel) => document.querySelector(sel);
    const clone = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));
    const esc = (s) =>
        String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));

    function toast(message, kind) {
        const el = $('#admin-toast');
        el.className = 'admin-toast show' + (kind ? ' ' + kind : '');
        el.textContent = message;
        clearTimeout(toast._t);
        toast._t = setTimeout(() => (el.className = 'admin-toast'), 3600);
    }

    function confirmDialog(title, text, okLabel) {
        return new Promise((resolve) => {
            const box = $('#confirm-dialog');
            $('#confirm-title').textContent = title;
            $('#confirm-text').textContent = text || '';
            $('#confirm-ok').textContent = okLabel || 'Confirm';
            box.hidden = false;

            const done = (val) => {
                box.hidden = true;
                $('#confirm-ok').onclick = null;
                $('#confirm-cancel').onclick = null;
                resolve(val);
            };
            $('#confirm-ok').onclick = () => done(true);
            $('#confirm-cancel').onclick = () => done(false);
        });
    }

    const timeAgo = (iso) => {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (isNaN(diff)) return '';
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
        return new Date(iso).toLocaleDateString();
    };

    const bytes = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB');

    /* ==================== API ==================== */

    async function api(path, options) {
        const opts = Object.assign({ headers: {} }, options || {});
        if (!(opts.body instanceof FormData)) {
            opts.headers['Content-Type'] = 'application/json';
            if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
        }
        if (state.token) opts.headers.Authorization = 'Bearer ' + state.token;

        const res = await fetch(path, opts);
        let data = {};
        try {
            data = await res.json();
        } catch (e) {
            /* non-JSON response */
        }

        if (res.status === 401) {
            logout(data.expired ? 'Session expired — please sign in again.' : 'Please sign in.');
            throw new Error(data.error || 'Unauthorized');
        }
        if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed (${res.status})`);
        return data;
    }

    /* ==================== FORM BUILDER ==================== */

    function defaultFor(spec) {
        if ('default' in spec) return clone(spec.default);
        switch (spec.type) {
            case 'switch': return true;
            case 'number': return 0;
            case 'tags':
            case 'lines':
            case 'list': return [];
            case 'group': return blankFrom(spec.fields);
            default: return '';
        }
    }

    function blankFrom(fields) {
        const obj = {};
        (fields || []).forEach((f) => (obj[f.key] = defaultFor(f)));
        return obj;
    }

    /* Renders one field, bound to data[spec.key]. */
    function buildField(spec, data, onStructureChange) {
        if (data[spec.key] === undefined) data[spec.key] = defaultFor(spec);

        const label = spec.label
            ? h('label', { text: spec.label + (spec.required ? ' *' : '') })
            : null;
        const hint = spec.hint ? h('p', { class: 'hint', html: spec.hint }) : null;
        const wrap = h('div', { class: 'field' + (spec.full ? ' field-full' : '') });

        /* ---- switch ---- */
        if (spec.type === 'switch') {
            const input = h('input', { type: 'checkbox' });
            input.checked = data[spec.key] !== false;
            input.addEventListener('change', () => (data[spec.key] = input.checked));
            wrap.appendChild(
                h('label', { class: 'switch' }, [
                    input,
                    h('span', { class: 'track' }),
                    h('span', { class: 'switch-label', text: spec.label })
                ])
            );
            if (hint) wrap.appendChild(hint);
            return wrap;
        }

        if (label) wrap.appendChild(label);

        /* ---- select ---- */
        if (spec.type === 'select') {
            const sel = h(
                'select',
                {},
                spec.options.map((o) => h('option', { value: o.value, text: o.label }))
            );
            sel.value = data[spec.key];
            sel.addEventListener('change', () => {
                data[spec.key] = sel.value;
                if (spec.reRender && onStructureChange) onStructureChange();
            });
            wrap.appendChild(sel);
            if (hint) wrap.appendChild(hint);
            return wrap;
        }

        /* ---- textarea ---- */
        if (spec.type === 'textarea') {
            const ta = h('textarea', { rows: spec.rows || 4, placeholder: spec.placeholder || '' });
            ta.value = data[spec.key] || '';
            ta.addEventListener('input', () => (data[spec.key] = ta.value));
            wrap.appendChild(ta);
            if (hint) wrap.appendChild(hint);
            return wrap;
        }

        /* ---- lines: array<string> edited one per line ---- */
        if (spec.type === 'lines') {
            const ta = h('textarea', { rows: spec.rows || 4, placeholder: spec.placeholder || 'One item per line' });
            ta.value = (data[spec.key] || []).join('\n');
            ta.addEventListener('input', () => {
                data[spec.key] = ta.value.split('\n').map((l) => l.trim()).filter(Boolean);
            });
            wrap.appendChild(ta);
            wrap.appendChild(hint || h('p', { class: 'hint', text: 'One entry per line.' }));
            return wrap;
        }

        /* ---- tags: array<string> comma separated ---- */
        if (spec.type === 'tags') {
            const input = h('input', { type: 'text', placeholder: spec.placeholder || 'React, Node.js, MySQL' });
            input.value = (data[spec.key] || []).join(', ');
            input.addEventListener('input', () => {
                data[spec.key] = input.value.split(',').map((t) => t.trim()).filter(Boolean);
            });
            wrap.appendChild(input);
            wrap.appendChild(hint || h('p', { class: 'hint', text: 'Separate with commas.' }));
            return wrap;
        }

        /* ---- icon: Font Awesome class with live preview ---- */
        if (spec.type === 'icon') {
            const preview = h('div', { class: 'media-thumb' }, h('i', { class: data[spec.key] || 'fa-solid fa-circle' }));
            const input = h('input', { type: 'text', placeholder: 'fa-solid fa-code' });
            input.value = data[spec.key] || '';
            input.addEventListener('input', () => {
                data[spec.key] = input.value.trim();
                preview.innerHTML = '';
                preview.appendChild(h('i', { class: data[spec.key] || 'fa-solid fa-circle' }));
            });
            wrap.appendChild(h('div', { class: 'media-field' }, [preview, input]));
            wrap.appendChild(
                hint ||
                    h('p', {
                        class: 'hint',
                        html: 'Any <a href="https://fontawesome.com/search?o=r&m=free" target="_blank" rel="noopener">Font Awesome 6 free</a> class, e.g. <code>fa-solid fa-rocket</code>.'
                    })
            );
            return wrap;
        }

        /* ---- image: URL + upload button ---- */
        if (spec.type === 'image') {
            const thumb = h('div', { class: 'media-thumb' });
            const paint = () => {
                if (data[spec.key]) {
                    thumb.style.backgroundImage = `url('${data[spec.key]}')`;
                    thumb.innerHTML = '';
                } else {
                    thumb.style.backgroundImage = '';
                    thumb.innerHTML = '<i class="fa-regular fa-image"></i>';
                }
            };
            const input = h('input', { type: 'text', placeholder: '/uploads/cover.png (optional)' });
            input.value = data[spec.key] || '';
            input.addEventListener('input', () => {
                data[spec.key] = input.value.trim();
                paint();
            });

            const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
            const pick = h('button', { class: 'btn btn-outline btn-sm', type: 'button' }, [
                h('i', { class: 'fa-solid fa-upload' }),
                document.createTextNode(' Upload')
            ]);
            pick.addEventListener('click', () => file.click());
            file.addEventListener('change', async () => {
                if (!file.files[0]) return;
                pick.disabled = true;
                pick.innerHTML = '<i class="fa-solid fa-spinner spin"></i>';
                try {
                    const fd = new FormData();
                    fd.append('file', file.files[0]);
                    const res = await api('/api/admin/upload/image', { method: 'POST', body: fd });
                    data[spec.key] = res.url;
                    input.value = res.url;
                    paint();
                    toast('Image uploaded — remember to Save.', 'success');
                } catch (err) {
                    toast(err.message, 'error');
                } finally {
                    pick.disabled = false;
                    pick.innerHTML = '<i class="fa-solid fa-upload"></i> Upload';
                    file.value = '';
                }
            });

            paint();
            wrap.appendChild(h('div', { class: 'media-field' }, [thumb, input, pick, file]));
            if (hint) wrap.appendChild(hint);
            return wrap;
        }

        /* ---- group: nested object ---- */
        if (spec.type === 'group') {
            const box = h('div', { class: 'nested' });
            if (spec.label) box.appendChild(h('p', { class: 'nested-title', text: spec.label }));
            const grid = h('div', { class: 'grid grid-2' });
            spec.fields.forEach((f) => grid.appendChild(buildField(f, data[spec.key], onStructureChange)));
            box.appendChild(grid);
            if (hint) box.appendChild(hint);
            // groups render their own label
            wrap.innerHTML = '';
            wrap.classList.add('field-full');
            wrap.appendChild(box);
            return wrap;
        }

        /* ---- list: repeatable array of objects ---- */
        if (spec.type === 'list') {
            wrap.innerHTML = '';
            wrap.classList.add('field-full');
            if (spec.label) wrap.appendChild(h('label', { text: spec.label }));
            if (hint) wrap.appendChild(hint);

            const host = h('div', { class: 'repeat-list' });
            const rows = data[spec.key];

            const rerender = () => {
                host.innerHTML = '';
                if (!rows.length) {
                    host.appendChild(
                        h('div', { class: 'empty' }, [
                            h('i', { class: 'fa-regular fa-folder-open' }),
                            document.createTextNode(spec.emptyText || 'Nothing here yet — click "Add" below.')
                        ])
                    );
                }

                rows.forEach((row, i) => {
                    const titleText =
                        (spec.itemTitle && row[spec.itemTitle]) || `${spec.itemName || 'Item'} ${i + 1}`;

                    const move = (delta) => {
                        const j = i + delta;
                        if (j < 0 || j >= rows.length) return;
                        [rows[i], rows[j]] = [rows[j], rows[i]];
                        rerender();
                    };

                    const head = h('div', { class: 'repeat-head' }, [
                        h('span', { class: 'num', text: String(i + 1) }),
                        h('span', { class: 'repeat-title', text: titleText }),
                        h('button', {
                            class: 'mini-btn', type: 'button', title: 'Move up',
                            disabled: i === 0, onclick: () => move(-1)
                        }, h('i', { class: 'fa-solid fa-arrow-up' })),
                        h('button', {
                            class: 'mini-btn', type: 'button', title: 'Move down',
                            disabled: i === rows.length - 1, onclick: () => move(1)
                        }, h('i', { class: 'fa-solid fa-arrow-down' })),
                        h('button', {
                            class: 'mini-btn', type: 'button', title: 'Duplicate',
                            onclick: () => { rows.splice(i + 1, 0, clone(row)); rerender(); }
                        }, h('i', { class: 'fa-regular fa-clone' })),
                        h('button', {
                            class: 'mini-btn danger', type: 'button', title: 'Delete',
                            onclick: async () => {
                                const ok = await confirmDialog(
                                    'Delete this entry?',
                                    `"${titleText}" will be removed. You still need to press Save to apply it.`,
                                    'Delete'
                                );
                                if (!ok) return;
                                rows.splice(i, 1);
                                rerender();
                            }
                        }, h('i', { class: 'fa-regular fa-trash-can' }))
                    ]);

                    const grid = h('div', { class: 'grid grid-2' });
                    spec.fields.forEach((f) => grid.appendChild(buildField(f, row, rerender)));

                    host.appendChild(
                        h('div', { class: 'repeat-item' }, [head, h('div', { class: 'repeat-body' }, grid)])
                    );
                });

                host.appendChild(
                    h('button', {
                        class: 'btn btn-outline btn-sm', type: 'button',
                        onclick: () => { rows.push(blankFrom(spec.fields)); rerender(); }
                    }, [
                        h('i', { class: 'fa-solid fa-plus' }),
                        document.createTextNode(' Add ' + (spec.itemName || 'item'))
                    ])
                );
            };

            rerender();
            wrap.appendChild(host);
            return wrap;
        }

        /* ---- number ---- */
        if (spec.type === 'number') {
            const input = h('input', {
                type: 'number',
                min: spec.min !== undefined ? spec.min : '',
                max: spec.max !== undefined ? spec.max : '',
                placeholder: spec.placeholder || ''
            });
            input.value = data[spec.key];
            input.addEventListener('input', () => (data[spec.key] = Number(input.value) || 0));
            wrap.appendChild(input);
            if (hint) wrap.appendChild(hint);
            return wrap;
        }

        /* ---- text / url (default) ---- */
        const input = h('input', { type: spec.type === 'url' ? 'url' : 'text', placeholder: spec.placeholder || '' });
        input.value = data[spec.key] || '';
        input.addEventListener('input', () => (data[spec.key] = input.value));
        wrap.appendChild(input);
        if (hint) wrap.appendChild(hint);
        return wrap;
    }

    /* ==================== CONTENT SCHEMAS ==================== */

    const F = {
        tag: { key: 'tag', label: 'Section label (small text above the title)', type: 'text' },
        title: { key: 'title', label: 'Section heading', type: 'text' },
        visible: { key: 'visible', label: 'Show this section on the website', type: 'switch' }
    };

    const SCHEMAS = {
        site: {
            title: 'Site & Navigation',
            subtitle: 'Browser title, SEO description, logo and the navbar menu',
            groups: [
                {
                    title: 'SEO & Branding',
                    icon: 'fa-solid fa-globe',
                    fields: [
                        { key: 'title', label: 'Browser / SEO title', type: 'text', full: true },
                        { key: 'description', label: 'Meta description', type: 'textarea', rows: 3, full: true,
                          hint: 'Shown by Google and when the link is shared. Aim for 140–160 characters.' },
                        { key: 'logoText', label: 'Logo text', type: 'text' },
                        { key: 'logoDot', label: 'Logo accent (coloured part)', type: 'text' },
                        { key: 'defaultTheme', label: 'Default theme for new visitors', type: 'select',
                          options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] }
                    ]
                },
                {
                    title: 'Navbar Menu',
                    icon: 'fa-solid fa-bars',
                    fields: [
                        { key: 'navLinks', type: 'list', itemName: 'link', itemTitle: 'label', full: true,
                          fields: [
                              { key: 'label', label: 'Label', type: 'text' },
                              { key: 'href', label: 'Target', type: 'text', hint: 'e.g. <code>#projects</code> or a full URL' },
                              { key: 'visible', label: 'Visible', type: 'switch' }
                          ] }
                    ]
                },
                {
                    title: 'Navbar Resume Button',
                    icon: 'fa-solid fa-file-arrow-down',
                    fields: [
                        { key: 'resumeButton', type: 'group', label: 'Resume button', fields: [
                            { key: 'label', label: 'Button text', type: 'text' },
                            { key: 'icon', label: 'Icon', type: 'icon' },
                            { key: 'visible', label: 'Show the button', type: 'switch' }
                        ] }
                    ]
                }
            ]
        },

        hero: {
            title: 'Hero Section',
            subtitle: 'The first thing visitors see — headline, buttons and profile card',
            groups: [
                {
                    title: 'Headline',
                    icon: 'fa-solid fa-star',
                    fields: [
                        { key: 'statusBadge', label: 'Availability badge', type: 'text', full: true,
                          hint: 'Leave empty to hide the green pulsing badge.' },
                        { key: 'titlePrefix', label: 'Greeting', type: 'text' },
                        { key: 'name', label: 'Your name (gradient text)', type: 'text' },
                        { key: 'subtitle', label: 'Role / tagline', type: 'text', full: true },
                        { key: 'description', label: 'Intro paragraph', type: 'textarea', rows: 4, full: true,
                          hint: 'Use <code>**bold**</code> for emphasis.' }
                    ]
                },
                {
                    title: 'Call-to-action Buttons',
                    icon: 'fa-solid fa-hand-pointer',
                    fields: [
                        { key: 'buttons', type: 'list', itemName: 'button', itemTitle: 'label', full: true,
                          fields: [
                              { key: 'label', label: 'Text', type: 'text' },
                              { key: 'icon', label: 'Icon', type: 'icon' },
                              { key: 'action', label: 'Behaviour', type: 'select', options: [
                                  { value: '', label: 'Open link / scroll to section' },
                                  { value: 'resume', label: 'Download resume PDF' },
                                  { value: 'zip', label: 'Download source code (.zip)' }
                              ] },
                              { key: 'href', label: 'Link (for the link behaviour)', type: 'text',
                                placeholder: '#projects' },
                              { key: 'style', label: 'Style', type: 'select', options: [
                                  { value: 'btn-primary', label: 'Primary (filled)' },
                                  { value: 'btn-outline', label: 'Outline' },
                                  { value: 'btn-secondary', label: 'Secondary' },
                                  { value: 'btn-light', label: 'Light' }
                              ] },
                              { key: 'visible', label: 'Visible', type: 'switch' }
                          ] }
                    ]
                },
                {
                    title: 'Quick Contact Pills',
                    icon: 'fa-solid fa-address-card',
                    fields: [
                        { key: 'contactPills', type: 'list', itemName: 'pill', itemTitle: 'text', full: true,
                          fields: [
                              { key: 'icon', label: 'Icon', type: 'icon' },
                              { key: 'text', label: 'Text shown', type: 'text' },
                              { key: 'copy', label: 'Copy-to-clipboard value', type: 'text',
                                hint: 'Leave empty to disable click-to-copy.' }
                          ] }
                    ]
                },
                {
                    title: 'Profile Card',
                    icon: 'fa-solid fa-id-badge',
                    fields: [
                        { key: 'avatar', type: 'group', label: 'Avatar card', fields: [
                            { key: 'name', label: 'Name', type: 'text' },
                            { key: 'role', label: 'Role', type: 'text' },
                            { key: 'icon', label: 'Icon (used when no photo)', type: 'icon' },
                            { key: 'image', label: 'Profile photo', type: 'image' }
                        ] },
                        { key: 'floatingBadges', type: 'list', itemName: 'badge', itemTitle: 'text', full: true,
                          emptyText: 'No floating badges.',
                          hint: 'The first three badges are positioned around the profile card.',
                          fields: [
                              { key: 'icon', label: 'Icon', type: 'icon' },
                              { key: 'text', label: 'Text', type: 'text' }
                          ] }
                    ]
                }
            ]
        },

        about: {
            title: 'About Section',
            subtitle: 'Career objective and highlight cards',
            groups: [
                { title: 'Section Header', icon: 'fa-solid fa-heading', fields: [F.tag, F.title, F.visible] },
                {
                    title: 'Cards',
                    icon: 'fa-solid fa-table-cells-large',
                    fields: [
                        { key: 'cards', type: 'list', itemName: 'card', itemTitle: 'title', full: true,
                          fields: [
                              { key: 'icon', label: 'Icon', type: 'icon' },
                              { key: 'title', label: 'Card title', type: 'text' },
                              { key: 'text', label: 'Card text', type: 'textarea', rows: 4, full: true }
                          ] }
                    ]
                }
            ]
        },

        skills: {
            title: 'Skills Section',
            subtitle: 'Skill categories with progress bars, plus the tools grid',
            groups: [
                { title: 'Section Header', icon: 'fa-solid fa-heading', fields: [F.tag, F.title, F.visible] },
                {
                    title: 'Skill Categories',
                    icon: 'fa-solid fa-chart-simple',
                    fields: [
                        { key: 'categories', type: 'list', itemName: 'category', itemTitle: 'title', full: true,
                          fields: [
                              { key: 'icon', label: 'Category icon', type: 'icon' },
                              { key: 'title', label: 'Category title', type: 'text' },
                              { key: 'items', type: 'list', itemName: 'skill', itemTitle: 'name', full: true,
                                emptyText: 'No skills in this category yet.',
                                fields: [
                                    { key: 'name', label: 'Skill name', type: 'text' },
                                    { key: 'label', label: 'Text shown on the right', type: 'text',
                                      placeholder: '90%' },
                                    { key: 'percent', label: 'Bar width (%)', type: 'number', min: 0, max: 100 }
                                ] }
                          ] }
                    ]
                },
                {
                    title: 'Tools & Ecosystem',
                    icon: 'fa-solid fa-screwdriver-wrench',
                    fields: [
                        { key: 'toolsCategory', type: 'group', label: 'Tools card', fields: [
                            { key: 'title', label: 'Card title', type: 'text' },
                            { key: 'icon', label: 'Card icon', type: 'icon' },
                            { key: 'visible', label: 'Show the tools card', type: 'switch' },
                            { key: 'tools', type: 'list', itemName: 'tool', itemTitle: 'label', full: true,
                              fields: [
                                  { key: 'icon', label: 'Icon', type: 'icon' },
                                  { key: 'label', label: 'Tool name', type: 'text' }
                              ] }
                        ] }
                    ]
                }
            ]
        },

        experience: {
            title: 'Experience Section',
            subtitle: 'Internship and job timeline',
            groups: [
                { title: 'Section Header', icon: 'fa-solid fa-heading', fields: [F.tag, F.title, F.visible] },
                {
                    title: 'Timeline Entries',
                    icon: 'fa-solid fa-briefcase',
                    fields: [
                        { key: 'items', type: 'list', itemName: 'role', itemTitle: 'role', full: true,
                          fields: [
                              { key: 'role', label: 'Job title', type: 'text' },
                              { key: 'company', label: 'Company', type: 'text' },
                              { key: 'period', label: 'Period', type: 'text', placeholder: 'Feb 2024 – Mar 2024' },
                              { key: 'bullets', label: 'Responsibilities', type: 'lines', rows: 5, full: true,
                                hint: 'One bullet point per line. <code>**bold**</code> works.' }
                          ] }
                    ]
                }
            ]
        },

        projects: {
            title: 'Projects Section',
            subtitle: 'Project cards and their detail pop-ups',
            groups: [
                { title: 'Section Header', icon: 'fa-solid fa-heading', fields: [F.tag, F.title, F.visible] },
                {
                    title: 'Projects',
                    icon: 'fa-solid fa-diagram-project',
                    fields: [
                        { key: 'items', type: 'list', itemName: 'project', itemTitle: 'title', full: true,
                          fields: [
                              { key: 'title', label: 'Project title', type: 'text' },
                              { key: 'id', label: 'Unique ID', type: 'text', placeholder: 'my-project',
                                hint: 'Lowercase, no spaces. Used to link the card to its pop-up.' },
                              { key: 'desc', label: 'Short description (on the card)', type: 'textarea', rows: 3, full: true },
                              { key: 'tags', label: 'Tech tags', type: 'tags' },
                              { key: 'icon', label: 'Banner icon', type: 'icon' },
                              { key: 'image', label: 'Cover image (replaces the icon)', type: 'image', full: true },
                              { key: 'liveUrl', label: 'Live demo URL', type: 'url', placeholder: 'https://…' },
                              { key: 'repoUrl', label: 'Source code URL', type: 'url', placeholder: 'https://github.com/…' },
                              { key: 'modal', type: 'group', label: 'Detail pop-up', fields: [
                                  { key: 'title', label: 'Pop-up title', type: 'text' },
                                  { key: 'tags', label: 'Pop-up tags', type: 'tags' },
                                  { key: 'text', label: 'Pop-up description', type: 'textarea', rows: 3, full: true },
                                  { key: 'bullets', label: 'Feature list', type: 'lines', rows: 5, full: true }
                              ] }
                          ] }
                    ]
                }
            ]
        },

        education: {
            title: 'Education Section',
            subtitle: 'Degrees, certifications and languages',
            groups: [
                { title: 'Section Header', icon: 'fa-solid fa-heading', fields: [F.tag, F.title, F.visible] },
                {
                    title: 'Education Column',
                    icon: 'fa-solid fa-graduation-cap',
                    fields: [
                        { key: 'educationTitle', label: 'Column title', type: 'text' },
                        { key: 'educationIcon', label: 'Column icon', type: 'icon' },
                        { key: 'items', type: 'list', itemName: 'qualification', itemTitle: 'title', full: true,
                          fields: [
                              { key: 'title', label: 'Qualification', type: 'text' },
                              { key: 'institution', label: 'Institution', type: 'text' },
                              { key: 'year', label: 'Year / period', type: 'text' },
                              { key: 'grade', label: 'Grade badge text', type: 'text',
                                placeholder: 'CGPA: 7.3 / 10', hint: 'Leave empty to hide the badge.' },
                              { key: 'gradeIcon', label: 'Grade badge icon', type: 'icon' },
                              { key: 'highlight', label: 'Highlight this card', type: 'switch', default: false }
                          ] }
                    ]
                },
                {
                    title: 'Certifications',
                    icon: 'fa-solid fa-certificate',
                    fields: [
                        { key: 'certTitle', label: 'Column title', type: 'text' },
                        { key: 'certIcon', label: 'Column icon', type: 'icon' },
                        { key: 'certs', type: 'list', itemName: 'certificate', itemTitle: 'title', full: true,
                          fields: [
                              { key: 'icon', label: 'Icon', type: 'icon' },
                              { key: 'title', label: 'Certificate name', type: 'text' },
                              { key: 'sub', label: 'Issuer / year', type: 'text' }
                          ] }
                    ]
                },
                {
                    title: 'Languages',
                    icon: 'fa-solid fa-language',
                    fields: [
                        { key: 'langTitle', label: 'Block title', type: 'text' },
                        { key: 'langIcon', label: 'Block icon', type: 'icon' },
                        { key: 'languages', type: 'list', itemName: 'language', itemTitle: 'label', full: true,
                          fields: [
                              { key: 'icon', label: 'Icon', type: 'icon' },
                              { key: 'label', label: 'Language', type: 'text', placeholder: 'Tamil (Native)' }
                          ] }
                    ]
                }
            ]
        },

        contact: {
            title: 'Contact Section',
            subtitle: 'Contact details and the enquiry form',
            groups: [
                { title: 'Section Header', icon: 'fa-solid fa-heading', fields: [F.tag, F.title, F.visible] },
                {
                    title: 'Contact Details',
                    icon: 'fa-solid fa-address-book',
                    fields: [
                        { key: 'heading', label: 'Card heading', type: 'text', full: true },
                        { key: 'text', label: 'Card paragraph', type: 'textarea', rows: 3, full: true },
                        { key: 'info', type: 'list', itemName: 'detail', itemTitle: 'label', full: true,
                          fields: [
                              { key: 'icon', label: 'Icon', type: 'icon' },
                              { key: 'label', label: 'Label', type: 'text', placeholder: 'Email Address' },
                              { key: 'value', label: 'Displayed value', type: 'text' },
                              { key: 'copy', label: 'Copy-to-clipboard value', type: 'text',
                                hint: 'Leave empty to disable click-to-copy.' }
                          ] }
                    ]
                },
                {
                    title: 'Enquiry Form',
                    icon: 'fa-solid fa-paper-plane',
                    fields: [
                        { key: 'form', type: 'group', label: 'Form settings', fields: [
                            { key: 'enabled', label: 'Show the contact form', type: 'switch' },
                            { key: 'submitLabel', label: 'Submit button text', type: 'text' },
                            { key: 'successMessage', label: 'Success message', type: 'text', full: true,
                              hint: 'Use <code>{name}</code> to insert the sender\'s name.' }
                        ] }
                    ]
                }
            ]
        },

        footer: {
            title: 'Footer',
            subtitle: 'Copyright line and tagline',
            groups: [
                {
                    title: 'Footer Text',
                    icon: 'fa-solid fa-shoe-prints',
                    fields: [
                        { key: 'owner', label: 'Copyright line', type: 'text', full: true,
                          hint: 'The year is added automatically in front of this text.' },
                        { key: 'subtext', label: 'Sub-text', type: 'text', full: true }
                    ]
                }
            ]
        },

        resume: {
            title: 'Resume / PDF',
            subtitle: 'What the "Resume PDF" button gives your visitors',
            groups: [
                {
                    title: 'Download Behaviour',
                    icon: 'fa-solid fa-gear',
                    fields: [
                        { key: 'mode', label: 'Resume source', type: 'select', options: [
                            { value: 'generate', label: 'Generate the PDF from the content below' },
                            { value: 'file', label: 'Serve the uploaded PDF file' }
                        ] },
                        { key: 'fileName', label: 'Download file name', type: 'text', placeholder: 'Resume.pdf' },
                        { key: 'uploadedFile', label: 'Uploaded file path', type: 'text', full: true,
                          hint: 'Filled automatically when you upload a PDF below.' }
                    ]
                },
                {
                    title: 'Generated PDF Content',
                    icon: 'fa-solid fa-file-lines',
                    fields: [
                        { key: 'header', type: 'group', label: 'PDF header', fields: [
                            { key: 'name', label: 'Name', type: 'text' },
                            { key: 'contact', label: 'Contact line', type: 'text', full: true }
                        ] },
                        { key: 'sections', type: 'list', itemName: 'section', itemTitle: 'title', full: true,
                          fields: [
                              { key: 'title', label: 'Section heading', type: 'text', full: true },
                              { key: 'body', label: 'Section content', type: 'textarea', rows: 6, full: true,
                                hint: 'One line per entry. <code>- text</code> = bullet, <code>Title | Subtitle</code> = two-line entry, <code>**text**</code> = bold, anything else = paragraph.' }
                          ] }
                    ]
                }
            ]
        }
    };

    /* ==================== VIEWS ==================== */

    const host = () => $('#view-host');

    function setHeader(title, subtitle) {
        $('#view-title').textContent = title;
        $('#view-subtitle').textContent = subtitle || '';
    }

    function loadingBlock() {
        return h('div', { class: 'loading-block' }, h('i', { class: 'fa-solid fa-spinner spin' }));
    }

    /* ---------- generic content editor ---------- */
    function renderContentView(sectionKey) {
        const schema = SCHEMAS[sectionKey];
        setHeader(schema.title, schema.subtitle);

        if (!state.drafts[sectionKey]) {
            state.drafts[sectionKey] = clone(state.content[sectionKey]);
        }
        const draft = state.drafts[sectionKey];

        const view = h('div', { class: 'view' });

        view.appendChild(
            h('div', { class: 'callout' }, [
                h('i', { class: 'fa-solid fa-circle-info' }),
                h('span', {
                    html: 'Edit anything below and press <strong>Save changes</strong>. The public website picks it up on the next page load — use the <i class="fa-solid fa-desktop"></i> live preview to check it instantly.'
                })
            ])
        );

        schema.groups.forEach((group) => {
            const grid = h('div', { class: 'grid grid-2' });
            group.fields.forEach((f) => grid.appendChild(buildField(f, draft, null)));

            view.appendChild(
                h('div', { class: 'card' }, [
                    h('div', { class: 'card-head' }, [
                        h('i', { class: group.icon, style: 'color:var(--accent)' }),
                        h('div', {}, [h('h3', { text: group.title }), group.desc ? h('p', { text: group.desc }) : null])
                    ]),
                    h('div', { class: 'card-body' }, grid)
                ])
            );
        });

        /* Resume upload lives inside the resume view */
        if (sectionKey === 'resume') view.appendChild(resumeUploadCard());

        const status = h('span', { class: 'status', text: 'Last saved: ' + timeAgo(state.contentUpdatedAt) });
        const saveBtn = h('button', { class: 'btn btn-primary' }, [
            h('i', { class: 'fa-solid fa-floppy-disk' }),
            document.createTextNode(' Save changes')
        ]);

        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Saving…';
            try {
                const res = await api('/api/admin/content/' + sectionKey, {
                    method: 'PUT',
                    body: { data: draft }
                });
                state.content[sectionKey] = clone(draft);
                state.contentUpdatedAt = new Date().toISOString();
                status.textContent = 'Saved just now';
                toast(res.message || 'Saved.', 'success');
                reloadPreview();
            } catch (err) {
                toast(err.message, 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save changes';
            }
        });

        const resetBtn = h('button', { class: 'btn btn-ghost' }, [
            h('i', { class: 'fa-solid fa-rotate-left' }),
            document.createTextNode(' Reset section')
        ]);
        resetBtn.addEventListener('click', async () => {
            const ok = await confirmDialog(
                'Reset this section?',
                `"${schema.title}" goes back to the original portfolio content. This is saved immediately.`,
                'Reset'
            );
            if (!ok) return;
            try {
                const res = await api('/api/admin/content/reset', { method: 'POST', body: { section: sectionKey } });
                state.content[sectionKey] = res.data;
                delete state.drafts[sectionKey];
                toast(res.message, 'success');
                reloadPreview();
                renderView(sectionKey);
            } catch (err) {
                toast(err.message, 'error');
            }
        });

        const discardBtn = h('button', { class: 'btn btn-outline' }, [
            h('i', { class: 'fa-solid fa-xmark' }),
            document.createTextNode(' Discard edits')
        ]);
        discardBtn.addEventListener('click', () => {
            delete state.drafts[sectionKey];
            renderView(sectionKey);
            toast('Unsaved edits discarded.');
        });

        view.appendChild(
            h('div', { class: 'card' }, h('div', { class: 'save-bar' }, [saveBtn, discardBtn, resetBtn, status]))
        );

        host().innerHTML = '';
        host().appendChild(view);
    }

    function resumeUploadCard() {
        const drop = h('div', { class: 'dropzone' }, [
            h('i', { class: 'fa-solid fa-file-pdf' }),
            h('div', { html: '<strong>Click to upload a resume PDF</strong>' }),
            h('div', { class: 'hint', text: 'Max 8 MB. Uploading switches the download source to "uploaded PDF".' })
        ]);
        const file = h('input', { type: 'file', accept: 'application/pdf', style: 'display:none' });

        const doUpload = async (chosen) => {
            if (!chosen) return;
            drop.classList.remove('over');
            drop.innerHTML = '<i class="fa-solid fa-spinner spin"></i><div>Uploading…</div>';
            try {
                const fd = new FormData();
                fd.append('file', chosen);
                const res = await api('/api/admin/upload/resume', { method: 'POST', body: fd });
                toast(res.message, 'success');
                await loadContent();
                delete state.drafts.resume;
                renderView('resume');
                reloadPreview();
            } catch (err) {
                toast(err.message, 'error');
                renderView('resume');
            }
        };

        drop.addEventListener('click', () => file.click());
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('over'));
        drop.addEventListener('drop', (e) => {
            e.preventDefault();
            doUpload(e.dataTransfer.files[0]);
        });
        file.addEventListener('change', () => doUpload(file.files[0]));

        const current = state.content.resume.uploadedFile;

        return h('div', { class: 'card' }, [
            h('div', { class: 'card-head' }, [
                h('i', { class: 'fa-solid fa-upload', style: 'color:var(--accent)' }),
                h('div', {}, [
                    h('h3', { text: 'Upload Resume PDF' }),
                    h('p', { text: 'Use your own designed PDF instead of the generated one' })
                ])
            ]),
            h('div', { class: 'card-body' }, [
                drop,
                file,
                current
                    ? h('p', { class: 'hint', html: `Current file: <a href="${esc(current)}" target="_blank" rel="noopener">${esc(current)}</a> — visitors download it from <code>/api/resume</code>.` })
                    : h('p', { class: 'hint', text: 'No file uploaded yet. The PDF is generated in the browser from the content above.' })
            ])
        ]);
    }

    /* ---------- dashboard ---------- */
    async function renderDashboard() {
        setHeader('Dashboard', 'Live overview of your portfolio');
        host().innerHTML = '';
        host().appendChild(loadingBlock());

        let payload;
        try {
            payload = await api('/api/admin/stats');
        } catch (err) {
            host().innerHTML = '';
            host().appendChild(h('div', { class: 'callout danger' }, [
                h('i', { class: 'fa-solid fa-triangle-exclamation' }),
                h('span', { text: err.message })
            ]));
            return;
        }

        const s = payload.stats;
        const view = h('div', { class: 'view' });

        if (state.user && state.user.mustChangePassword) {
            view.appendChild(h('div', { class: 'callout warn' }, [
                h('i', { class: 'fa-solid fa-triangle-exclamation' }),
                h('span', { html: 'You are still using the default password. Open <strong>Account</strong> and set your own before putting this site online.' })
            ]));
        }

        const tile = (label, value, iconClass, tone) =>
            h('div', { class: 'stat' }, [
                h('div', { class: 'stat-top' }, [
                    h('div', { class: 'stat-icon' + (tone ? ' ' + tone : '') }, h('i', { class: iconClass })),
                ]),
                h('div', { class: 'stat-value', text: String(value) }),
                h('div', { class: 'stat-label', text: label })
            ]);

        view.appendChild(
            h('div', { class: 'grid grid-4 grid-stats', style: 'margin-bottom:20px' }, [
                tile('Total page views', s.views, 'fa-solid fa-eye'),
                tile('Views today', s.viewsToday, 'fa-solid fa-calendar-day', 'green'),
                tile('Messages', s.messages, 'fa-solid fa-inbox', 'amber'),
                tile('Unread messages', s.unread, 'fa-solid fa-envelope-open-text', s.unread ? 'red' : 'green'),
                tile('Resume downloads', s.resumeDownloads, 'fa-solid fa-file-arrow-down'),
                tile('Source ZIP downloads', s.zipDownloads, 'fa-solid fa-file-zipper'),
                tile('Projects', s.projects, 'fa-solid fa-diagram-project'),
                tile('Skills listed', s.skills, 'fa-solid fa-code')
            ])
        );

        /* views chart */
        const max = Math.max(1, ...s.daily.map((d) => d.views));
        view.appendChild(
            h('div', { class: 'card' }, [
                h('div', { class: 'card-head' }, [
                    h('i', { class: 'fa-solid fa-chart-column', style: 'color:var(--accent)' }),
                    h('div', {}, [h('h3', { text: 'Visitors — last 14 days' }), h('p', { text: 'One bar per day' })])
                ]),
                h('div', { class: 'card-body' },
                    h('div', { class: 'chart' }, s.daily.map((d) =>
                        h('div', { class: 'bar-wrap', title: `${d.date}: ${d.views} views` }, [
                            h('div', { class: 'bar', style: `height:${Math.round((d.views / max) * 100)}%` }),
                            h('span', { class: 'bar-label', text: d.date.slice(5) })
                        ])
                    ))
                )
            ])
        );

        /* recent messages + activity */
        const msgCard = h('div', { class: 'card' }, [
            h('div', { class: 'card-head' }, [
                h('i', { class: 'fa-solid fa-inbox', style: 'color:var(--accent)' }),
                h('div', {}, [h('h3', { text: 'Latest messages' })]),
                h('span', { class: 'spacer' }),
                h('button', {
                    class: 'btn btn-outline btn-sm',
                    onclick: () => navigate('messages')
                }, 'Open inbox')
            ]),
            h('div', { class: 'card-body' },
                payload.recentMessages.length
                    ? h('div', { class: 'activity' }, payload.recentMessages.map((m) =>
                        h('div', { class: 'activity-row' }, [
                            h('span', { class: 'dot' }, h('i', { class: m.read ? 'fa-regular fa-envelope-open' : 'fa-solid fa-envelope' })),
                            h('div', {}, [
                                h('strong', { text: m.name }),
                                document.createTextNode(' — ' + m.subject),
                                h('span', { class: 'when', text: timeAgo(m.createdAt) })
                            ])
                        ])
                    ))
                    : h('div', { class: 'empty' }, [
                        h('i', { class: 'fa-regular fa-envelope' }),
                        document.createTextNode('No messages yet.')
                    ])
            )
        ]);

        const actCard = h('div', { class: 'card' }, [
            h('div', { class: 'card-head' }, [
                h('i', { class: 'fa-solid fa-clock-rotate-left', style: 'color:var(--accent)' }),
                h('div', {}, [h('h3', { text: 'Recent activity' })])
            ]),
            h('div', { class: 'card-body' },
                payload.activity.length
                    ? h('div', { class: 'activity' }, payload.activity.map((a) =>
                        h('div', { class: 'activity-row' }, [
                            h('span', { class: 'dot' }, h('i', { class: activityIcon(a.action) })),
                            h('div', {}, [
                                h('span', { text: a.detail || a.action }),
                                h('span', { class: 'when', text: timeAgo(a.at) })
                            ])
                        ])
                    ))
                    : h('div', { class: 'empty' }, 'No activity recorded yet.')
            )
        ]);

        view.appendChild(h('div', { class: 'grid grid-2', style: 'margin-bottom:20px' }, [msgCard, actCard]));

        view.appendChild(
            h('div', { class: 'card' }, [
                h('div', { class: 'card-head' }, [
                    h('i', { class: 'fa-solid fa-bolt', style: 'color:var(--accent)' }),
                    h('div', {}, [h('h3', { text: 'Quick edits' })])
                ]),
                h('div', { class: 'card-body' },
                    h('div', { class: 'grid grid-3' }, [
                        ['hero', 'Hero Section', 'fa-solid fa-star'],
                        ['projects', 'Projects', 'fa-solid fa-diagram-project'],
                        ['skills', 'Skills', 'fa-solid fa-code'],
                        ['experience', 'Experience', 'fa-solid fa-briefcase'],
                        ['resume', 'Resume PDF', 'fa-solid fa-file-pdf'],
                        ['contact', 'Contact', 'fa-solid fa-envelope']
                    ].map(([key, label, ico]) =>
                        h('button', { class: 'btn btn-outline', onclick: () => navigate(key) }, [
                            h('i', { class: ico }), document.createTextNode(' ' + label)
                        ])
                    ))
                )
            ])
        );

        view.appendChild(
            h('div', { class: 'card' }, [
                h('div', { class: 'card-head' }, [
                    h('i', { class: 'fa-solid fa-server', style: 'color:var(--accent)' }),
                    h('div', {}, [h('h3', { text: 'System' })])
                ]),
                h('div', { class: 'card-body' },
                    h('div', { class: 'kv' }, [
                        kv('Content last updated', new Date(s.lastUpdated).toLocaleString()),
                        kv('Experience entries', s.experience),
                        kv('Certifications', s.certifications),
                        kv('Signed in as', state.user ? state.user.username : '—'),
                        kv('Last login', state.user && state.user.lastLogin ? new Date(state.user.lastLogin).toLocaleString() : '—')
                    ])
                )
            ])
        );

        host().innerHTML = '';
        host().appendChild(view);
        updateUnreadBadge(s.unread);
    }

    const kv = (k, v) => h('div', { class: 'kv-row' }, [h('span', { text: k }), h('span', { text: String(v) })]);

    const activityIcon = (action) =>
        ({
            login: 'fa-solid fa-right-to-bracket',
            content: 'fa-solid fa-pen',
            message: 'fa-solid fa-envelope',
            upload: 'fa-solid fa-upload',
            reset: 'fa-solid fa-rotate-left',
            account: 'fa-solid fa-user-shield'
        }[action] || 'fa-solid fa-circle-dot');

    /* ---------- messages ---------- */
    async function renderMessages() {
        setHeader('Messages', 'Enquiries submitted through the contact form');

        const listHost = h('div', { class: 'msg-list' }, loadingBlock());

        const search = h('input', {
            type: 'text', class: 'search', placeholder: 'Search name, email, subject or text…'
        });
        search.value = state.messages.query;
        let debounce;
        search.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                state.messages.query = search.value;
                load();
            }, 260);
        });

        const chips = ['all', 'unread', 'starred'].map((f) =>
            h('button', {
                class: 'chip' + (state.messages.filter === f ? ' active' : ''),
                onclick: () => {
                    state.messages.filter = f;
                    renderMessages();
                }
            }, f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Starred')
        );

        const readAll = h('button', { class: 'btn btn-outline btn-sm' }, [
            h('i', { class: 'fa-solid fa-check-double' }), document.createTextNode(' Mark all read')
        ]);
        readAll.addEventListener('click', async () => {
            try {
                await api('/api/admin/messages/read-all', { method: 'POST' });
                toast('All messages marked as read.', 'success');
                load();
            } catch (err) {
                toast(err.message, 'error');
            }
        });

        const view = h('div', { class: 'view' }, [
            h('div', { class: 'card' }, [
                h('div', { class: 'card-body' },
                    h('div', { class: 'msg-toolbar' }, [
                        h('div', { class: 'field', style: 'flex:1;min-width:200px;margin:0' }, search),
                        ...chips,
                        readAll
                    ])
                )
            ]),
            listHost
        ]);

        host().innerHTML = '';
        host().appendChild(view);

        async function load() {
            listHost.innerHTML = '';
            listHost.appendChild(loadingBlock());
            let data;
            try {
                data = await api(
                    `/api/admin/messages?filter=${encodeURIComponent(state.messages.filter)}&q=${encodeURIComponent(state.messages.query)}`
                );
            } catch (err) {
                listHost.innerHTML = '';
                listHost.appendChild(h('div', { class: 'callout danger' }, [
                    h('i', { class: 'fa-solid fa-triangle-exclamation' }), h('span', { text: err.message })
                ]));
                return;
            }

            updateUnreadBadge(data.counts.unread);
            listHost.innerHTML = '';

            if (!data.messages.length) {
                listHost.appendChild(h('div', { class: 'empty' }, [
                    h('i', { class: 'fa-regular fa-envelope-open' }),
                    document.createTextNode('No messages match this view.')
                ]));
                return;
            }

            data.messages.forEach((m) => {
                const patch = async (body) => {
                    try {
                        await api('/api/admin/messages/' + m.id, { method: 'PATCH', body });
                        load();
                    } catch (err) {
                        toast(err.message, 'error');
                    }
                };

                listHost.appendChild(
                    h('div', { class: 'msg' + (m.read ? '' : ' unread') }, [
                        h('div', { class: 'msg-top' }, [
                            h('span', { class: 'from', text: m.name }),
                            h('a', { class: 'mail', href: 'mailto:' + m.email, text: m.email }),
                            m.read ? null : h('span', { class: 'pill-tag', text: 'New' }),
                            m.starred ? h('span', { class: 'pill-tag', text: '★ Starred' }) : null,
                            h('span', { class: 'when', text: new Date(m.createdAt).toLocaleString() })
                        ]),
                        h('div', { class: 'subject', text: m.subject }),
                        h('div', { class: 'body', text: m.message }),
                        h('div', { class: 'acts' }, [
                            h('a', {
                                class: 'btn btn-primary btn-sm',
                                href: `mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`
                            }, [h('i', { class: 'fa-solid fa-reply' }), document.createTextNode(' Reply')]),
                            h('button', {
                                class: 'btn btn-outline btn-sm',
                                onclick: () => patch({ read: !m.read })
                            }, [
                                h('i', { class: m.read ? 'fa-regular fa-envelope' : 'fa-regular fa-envelope-open' }),
                                document.createTextNode(m.read ? ' Mark unread' : ' Mark read')
                            ]),
                            h('button', {
                                class: 'btn btn-outline btn-sm',
                                onclick: () => patch({ starred: !m.starred })
                            }, [
                                h('i', { class: m.starred ? 'fa-solid fa-star' : 'fa-regular fa-star' }),
                                document.createTextNode(m.starred ? ' Unstar' : ' Star')
                            ]),
                            h('button', {
                                class: 'btn btn-ghost btn-sm',
                                onclick: async () => {
                                    const ok = await confirmDialog('Delete this message?', `Message from ${m.name} will be permanently removed.`, 'Delete');
                                    if (!ok) return;
                                    try {
                                        await api('/api/admin/messages/' + m.id, { method: 'DELETE' });
                                        toast('Message deleted.', 'success');
                                        load();
                                    } catch (err) {
                                        toast(err.message, 'error');
                                    }
                                }
                            }, [h('i', { class: 'fa-regular fa-trash-can' }), document.createTextNode(' Delete')])
                        ])
                    ])
                );
            });
        }

        load();
    }

    /* ---------- media library ---------- */
    async function renderMedia() {
        setHeader('Media Library', 'Images and PDFs uploaded to your site');

        const grid = h('div', { class: 'media-grid' }, loadingBlock());
        const file = h('input', { type: 'file', accept: 'image/*,application/pdf', style: 'display:none' });
        const drop = h('div', { class: 'dropzone' }, [
            h('i', { class: 'fa-solid fa-cloud-arrow-up' }),
            h('div', { html: '<strong>Click or drop a file to upload</strong>' }),
            h('div', { class: 'hint', text: 'PNG, JPG, WEBP, GIF, SVG or PDF — up to 8 MB.' })
        ]);

        const upload = async (chosen) => {
            if (!chosen) return;
            const isPdf = chosen.type === 'application/pdf';
            try {
                const fd = new FormData();
                fd.append('file', chosen);
                const res = await api(isPdf ? '/api/admin/upload/resume' : '/api/admin/upload/image', {
                    method: 'POST', body: fd
                });
                toast(res.message, 'success');
                if (isPdf) await loadContent();
                load();
            } catch (err) {
                toast(err.message, 'error');
            }
        };

        drop.addEventListener('click', () => file.click());
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('over'));
        drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); upload(e.dataTransfer.files[0]); });
        file.addEventListener('change', () => { upload(file.files[0]); file.value = ''; });

        host().innerHTML = '';
        host().appendChild(h('div', { class: 'view' }, [
            h('div', { class: 'card' }, [
                h('div', { class: 'card-head' }, [
                    h('i', { class: 'fa-solid fa-cloud-arrow-up', style: 'color:var(--accent)' }),
                    h('div', {}, [h('h3', { text: 'Upload' })])
                ]),
                h('div', { class: 'card-body' }, [drop, file])
            ]),
            h('div', { class: 'card' }, [
                h('div', { class: 'card-head' }, [
                    h('i', { class: 'fa-solid fa-images', style: 'color:var(--accent)' }),
                    h('div', {}, [h('h3', { text: 'Uploaded files' }), h('p', { text: 'Copy a path to use it in any image field' })])
                ]),
                h('div', { class: 'card-body' }, grid)
            ])
        ]));

        async function load() {
            grid.innerHTML = '';
            grid.appendChild(loadingBlock());
            let data;
            try {
                data = await api('/api/admin/uploads');
            } catch (err) {
                grid.innerHTML = '';
                grid.appendChild(h('div', { class: 'callout danger' }, err.message));
                return;
            }
            grid.innerHTML = '';
            if (!data.files.length) {
                grid.appendChild(h('div', { class: 'empty', style: 'grid-column:1/-1' }, [
                    h('i', { class: 'fa-regular fa-image' }),
                    document.createTextNode('No uploads yet.')
                ]));
                return;
            }
            data.files.forEach((f) => {
                const isPdf = /\.pdf$/i.test(f.name);
                grid.appendChild(h('div', { class: 'media-item' }, [
                    h('a', {
                        class: 'thumb', href: f.url, target: '_blank', rel: 'noopener',
                        style: isPdf ? '' : `background-image:url('${f.url}')`
                    }, isPdf ? h('i', { class: 'fa-solid fa-file-pdf' }) : null),
                    h('div', { class: 'meta' }, [
                        h('div', { class: 'name', text: f.name }),
                        h('div', { class: 'size', text: bytes(f.size) + ' · ' + timeAgo(f.modified) })
                    ]),
                    h('div', { class: 'acts' }, [
                        h('button', {
                            class: 'mini-btn', title: 'Copy path',
                            onclick: () => {
                                navigator.clipboard.writeText(f.url).then(
                                    () => toast('Path copied: ' + f.url, 'success'),
                                    () => toast(f.url)
                                );
                            }
                        }, h('i', { class: 'fa-regular fa-copy' })),
                        h('button', {
                            class: 'mini-btn danger', title: 'Delete',
                            onclick: async () => {
                                const ok = await confirmDialog('Delete file?', `${f.name} will be removed from the server.`, 'Delete');
                                if (!ok) return;
                                try {
                                    await api('/api/admin/uploads/' + encodeURIComponent(f.name), { method: 'DELETE' });
                                    toast('File deleted.', 'success');
                                    load();
                                } catch (err) {
                                    toast(err.message, 'error');
                                }
                            }
                        }, h('i', { class: 'fa-regular fa-trash-can' }))
                    ])
                ]));
            });
        }

        load();
    }

    /* ---------- account ---------- */
    function renderAccount() {
        setHeader('Account', 'Your admin username, email and password');

        const f = {
            username: h('input', { type: 'text', value: state.user.username, autocomplete: 'username' }),
            email: h('input', { type: 'email', value: state.user.email || '', autocomplete: 'email' }),
            current: h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Required to save any change' }),
            next: h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Leave blank to keep the current one' }),
            confirm: h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Repeat the new password' })
        };

        const save = h('button', { class: 'btn btn-primary' }, [
            h('i', { class: 'fa-solid fa-floppy-disk' }), document.createTextNode(' Update account')
        ]);

        save.addEventListener('click', async () => {
            if (!f.current.value) return toast('Enter your current password to confirm.', 'error');
            if (f.next.value && f.next.value !== f.confirm.value) {
                return toast('The new passwords do not match.', 'error');
            }
            save.disabled = true;
            save.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Saving…';
            try {
                const res = await api('/api/auth/account', {
                    method: 'PUT',
                    body: {
                        currentPassword: f.current.value,
                        username: f.username.value,
                        email: f.email.value,
                        newPassword: f.next.value || undefined
                    }
                });
                state.token = res.token;
                localStorage.setItem(TOKEN_KEY, res.token);
                state.user = res.user;
                paintUser();
                toast(res.message, 'success');
                renderAccount();
            } catch (err) {
                toast(err.message, 'error');
            } finally {
                save.disabled = false;
                save.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update account';
            }
        });

        const wrapField = (label, input, hint) =>
            h('div', { class: 'field' }, [
                h('label', { text: label }),
                input,
                hint ? h('p', { class: 'hint', text: hint }) : null
            ]);

        host().innerHTML = '';
        host().appendChild(h('div', { class: 'view' }, [
            state.user.mustChangePassword
                ? h('div', { class: 'callout warn' }, [
                    h('i', { class: 'fa-solid fa-triangle-exclamation' }),
                    h('span', { html: 'You are still using the default password (<code>Admin@123</code>). Set a new one now.' })
                ])
                : null,
            h('div', { class: 'card' }, [
                h('div', { class: 'card-head' }, [
                    h('i', { class: 'fa-solid fa-user-shield', style: 'color:var(--accent)' }),
                    h('div', {}, [h('h3', { text: 'Admin credentials' })])
                ]),
                h('div', { class: 'card-body' }, h('div', { class: 'grid grid-2' }, [
                    wrapField('Username', f.username),
                    wrapField('Contact email', f.email, 'Where contact-form messages are forwarded when SMTP is configured.'),
                    wrapField('Current password *', f.current),
                    h('div', {}),
                    wrapField('New password', f.next, 'Minimum 8 characters.'),
                    wrapField('Confirm new password', f.confirm)
                ])),
                h('div', { class: 'save-bar' }, [save])
            ])
        ]));
    }

    /* ---------- backup ---------- */
    function renderBackup() {
        setHeader('Backup & Reset', 'Export, import or restore your portfolio content');

        const importFile = h('input', { type: 'file', accept: 'application/json', style: 'display:none' });
        const importBtn = h('button', { class: 'btn btn-outline' }, [
            h('i', { class: 'fa-solid fa-file-import' }), document.createTextNode(' Import backup JSON')
        ]);
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', async () => {
            const file = importFile.files[0];
            if (!file) return;
            try {
                const parsed = JSON.parse(await file.text());
                const content = parsed.content || parsed;
                const ok = await confirmDialog(
                    'Import this backup?',
                    'Every section will be overwritten with the contents of this file.',
                    'Import'
                );
                if (!ok) return;
                await api('/api/admin/content', { method: 'PUT', body: { content } });
                await loadContent();
                state.drafts = {};
                toast('Backup imported successfully.', 'success');
                reloadPreview();
            } catch (err) {
                toast('Import failed: ' + err.message, 'error');
            } finally {
                importFile.value = '';
            }
        });

        const exportBtn = h('button', { class: 'btn btn-primary' }, [
            h('i', { class: 'fa-solid fa-file-export' }), document.createTextNode(' Download backup JSON')
        ]);
        exportBtn.addEventListener('click', () => {
            window.location.href = '/api/admin/backup?token=' + encodeURIComponent(state.token);
        });

        const resetBtn = h('button', { class: 'btn btn-danger' }, [
            h('i', { class: 'fa-solid fa-triangle-exclamation' }), document.createTextNode(' Reset ALL content')
        ]);
        resetBtn.addEventListener('click', async () => {
            const ok = await confirmDialog(
                'Reset the whole website?',
                'Every section returns to the original portfolio content. Messages and uploads are kept. This cannot be undone.',
                'Reset everything'
            );
            if (!ok) return;
            try {
                const res = await api('/api/admin/content/reset', { method: 'POST', body: {} });
                state.content = res.content;
                state.drafts = {};
                toast(res.message, 'success');
                reloadPreview();
                navigate('dashboard');
            } catch (err) {
                toast(err.message, 'error');
            }
        });

        host().innerHTML = '';
        host().appendChild(h('div', { class: 'view' }, [
            h('div', { class: 'callout' }, [
                h('i', { class: 'fa-solid fa-circle-info' }),
                h('span', { html: 'All content lives in <code>data/db.json</code>. Download a backup before big edits — importing it restores everything exactly.' })
            ]),
            h('div', { class: 'card' }, [
                h('div', { class: 'card-head' }, [
                    h('i', { class: 'fa-solid fa-database', style: 'color:var(--accent)' }),
                    h('div', {}, [h('h3', { text: 'Export / Import' })])
                ]),
                h('div', { class: 'card-body' }, [
                    h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, [exportBtn, importBtn, importFile])
                ])
            ]),
            h('div', { class: 'card' }, [
                h('div', { class: 'card-head' }, [
                    h('i', { class: 'fa-solid fa-rotate-left', style: 'color:var(--danger)' }),
                    h('div', {}, [h('h3', { text: 'Danger zone' }), h('p', { text: 'Restore the factory portfolio content' })])
                ]),
                h('div', { class: 'card-body' }, [
                    h('p', { class: 'hint', style: 'margin-bottom:14px',
                        text: 'This rewrites every section with the original Sivapandi R content that shipped with the site.' }),
                    resetBtn
                ])
            ])
        ]));
    }

    /* ==================== ROUTING ==================== */

    const VIEWS = {
        dashboard: renderDashboard,
        messages: renderMessages,
        media: renderMedia,
        account: renderAccount,
        backup: renderBackup
    };

    function renderView(key) {
        if (VIEWS[key]) return VIEWS[key]();
        if (SCHEMAS[key]) return renderContentView(key);
        return renderDashboard();
    }

    function navigate(key) {
        state.view = key;
        document.querySelectorAll('.nav-item').forEach((b) =>
            b.classList.toggle('active', b.dataset.view === key)
        );
        closeSidebar();
        window.scrollTo({ top: 0 });
        location.hash = key;
        renderView(key);
    }

    /* ==================== PREVIEW PANE ==================== */

    function reloadPreview() {
        const frame = $('#preview-frame');
        const pane = $('#preview-pane');
        if (frame && !pane.hidden) frame.src = '/?t=' + Date.now();
    }

    /* ==================== AUTH FLOW ==================== */

    function paintUser() {
        $('#who-name').textContent = state.user.username;
        $('#who-avatar').textContent = (state.user.username || 'A').charAt(0);
    }

    function updateUnreadBadge(count) {
        const badge = $('#unread-badge');
        badge.textContent = count;
        badge.hidden = !count;
    }

    async function loadContent() {
        const res = await api('/api/content');
        state.content = res.content;
        state.contentUpdatedAt = res.updatedAt;
    }

    async function enterApp() {
        $('#login-screen').hidden = true;
        $('#admin-app').hidden = false;
        paintUser();
        await loadContent();
        const initial = (location.hash || '').replace('#', '');
        navigate(SCHEMAS[initial] || VIEWS[initial] ? initial : 'dashboard');
    }

    function logout(message) {
        state.token = '';
        state.user = null;
        state.drafts = {};
        localStorage.removeItem(TOKEN_KEY);
        $('#admin-app').hidden = true;
        $('#login-screen').hidden = false;
        if (message) {
            const box = $('#login-error');
            box.textContent = message;
            box.classList.add('show');
        }
    }

    /* ==================== BOOT ==================== */

    document.addEventListener('DOMContentLoaded', async () => {
        /* theme */
        const savedTheme = localStorage.getItem('sp-admin-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        $('#admin-theme-toggle').addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('sp-admin-theme', next);
        });

        /* sidebar (mobile) */
        $('#menu-btn').addEventListener('click', () => {
            $('#sidebar').classList.add('open');
            $('#sidebar-backdrop').classList.add('show');
        });
        $('#sidebar-close').addEventListener('click', closeSidebar);
        $('#sidebar-backdrop').addEventListener('click', closeSidebar);

        /* nav */
        document.querySelectorAll('.nav-item').forEach((btn) =>
            btn.addEventListener('click', () => navigate(btn.dataset.view))
        );

        /* preview pane */
        $('#preview-toggle').addEventListener('click', () => {
            const pane = $('#preview-pane');
            pane.hidden = !pane.hidden;
            if (!pane.hidden) reloadPreview();
        });
        $('#preview-close').addEventListener('click', () => ($('#preview-pane').hidden = true));
        $('#preview-reload').addEventListener('click', reloadPreview);

        /* logout */
        $('#logout-btn').addEventListener('click', async () => {
            const ok = await confirmDialog('Sign out?', 'You will need your password to get back in.', 'Sign out');
            if (ok) logout('You have been signed out.');
        });

        /* password reveal */
        $('#reveal-pass').addEventListener('click', () => {
            const input = $('#login-password');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        /* login */
        $('#login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = $('#login-submit');
            const errBox = $('#login-error');
            errBox.classList.remove('show');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> Signing in…';

            try {
                const res = await api('/api/auth/login', {
                    method: 'POST',
                    body: {
                        username: $('#login-username').value,
                        password: $('#login-password').value
                    }
                });
                state.token = res.token;
                state.user = res.user;
                localStorage.setItem(TOKEN_KEY, res.token);
                $('#login-password').value = '';
                await enterApp();
                toast('Welcome back, ' + res.user.username + '!', 'success');
            } catch (err) {
                errBox.textContent = err.message;
                errBox.classList.add('show');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
            }
        });

        window.addEventListener('hashchange', () => {
            const key = (location.hash || '').replace('#', '');
            if (key && key !== state.view && (SCHEMAS[key] || VIEWS[key])) navigate(key);
        });

        /* resume an existing session */
        if (state.token) {
            try {
                const me = await api('/api/auth/me');
                state.user = me.user;
                await enterApp();
                return;
            } catch (err) {
                /* token invalid — the login screen is already showing */
            }
        }
        $('#login-username').focus();
    });

    function closeSidebar() {
        $('#sidebar').classList.remove('open');
        $('#sidebar-backdrop').classList.remove('show');
    }
})();
