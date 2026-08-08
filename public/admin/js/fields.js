/* ----------------------------------------------------------------
   FORM BUILDER
   Turns one field spec (see schemas.js) into a DOM control bound to
   `data[spec.key]`. Every control writes straight back into the draft
   object, so a view only has to hand the draft to store.saveSection().

   Supported types: text, url, number, textarea, select, switch,
   tags, lines, icon, image, group, list.
   ---------------------------------------------------------------- */

import { h, clone, confirmDialog, toast } from './dom.js';

/* Images live in the repo (assets/…) — a static site has nowhere to upload
   them to, so small files can be embedded directly into content.json. */
const EMBED_LIMIT = 250 * 1024;

export function defaultFor(spec) {
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

export function blankFrom(fields) {
    const obj = {};
    (fields || []).forEach((field) => (obj[field.key] = defaultFor(field)));
    return obj;
}

export function buildField(spec, data, onStructureChange) {
    if (data[spec.key] === undefined) data[spec.key] = defaultFor(spec);

    const hint = spec.hint ? h('p', { class: 'hint', html: spec.hint }) : null;
    const wrap = h('div', { class: 'field' + (spec.full ? ' field-full' : '') });

    const builder = BUILDERS[spec.type] || BUILDERS.text;
    return builder({ spec, data, wrap, hint, onStructureChange });
}

/* ---------------- individual field types ---------------- */

const BUILDERS = {
    switch({ spec, data, wrap, hint }) {
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
    },

    select({ spec, data, wrap, hint, onStructureChange }) {
        addLabel(wrap, spec);
        const select = h('select', {}, spec.options.map((o) => h('option', { value: o.value, text: o.label })));
        select.value = data[spec.key];
        select.addEventListener('change', () => {
            data[spec.key] = select.value;
            if (spec.reRender && onStructureChange) onStructureChange();
        });
        wrap.appendChild(select);
        if (hint) wrap.appendChild(hint);
        return wrap;
    },

    textarea({ spec, data, wrap, hint }) {
        addLabel(wrap, spec);
        const area = h('textarea', { rows: spec.rows || 4, placeholder: spec.placeholder || '' });
        area.value = data[spec.key] || '';
        area.addEventListener('input', () => (data[spec.key] = area.value));
        wrap.appendChild(area);
        if (hint) wrap.appendChild(hint);
        return wrap;
    },

    /* array<string>, one entry per line */
    lines({ spec, data, wrap, hint }) {
        addLabel(wrap, spec);
        const area = h('textarea', { rows: spec.rows || 4, placeholder: 'One item per line' });
        area.value = (data[spec.key] || []).join('\n');
        area.addEventListener('input', () => {
            data[spec.key] = area.value.split('\n').map((l) => l.trim()).filter(Boolean);
        });
        wrap.appendChild(area);
        wrap.appendChild(hint || h('p', { class: 'hint', text: 'One entry per line.' }));
        return wrap;
    },

    /* array<string>, comma separated */
    tags({ spec, data, wrap, hint }) {
        addLabel(wrap, spec);
        const input = h('input', { type: 'text', placeholder: spec.placeholder || 'React, Node.js, MySQL' });
        input.value = (data[spec.key] || []).join(', ');
        input.addEventListener('input', () => {
            data[spec.key] = input.value.split(',').map((t) => t.trim()).filter(Boolean);
        });
        wrap.appendChild(input);
        wrap.appendChild(hint || h('p', { class: 'hint', text: 'Separate with commas.' }));
        return wrap;
    },

    /* Font Awesome class with a live preview */
    icon({ spec, data, wrap, hint }) {
        addLabel(wrap, spec);
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
    },

    /* path inside the repo, or a small embedded file */
    image({ spec, data, wrap, hint }) {
        addLabel(wrap, spec);

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

        const input = h('input', { type: 'text', placeholder: 'assets/photo.jpg' });
        input.value = data[spec.key] || '';
        input.addEventListener('input', () => {
            data[spec.key] = input.value.trim();
            paint();
        });

        const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
        const pick = h('button', { class: 'btn btn-outline btn-sm', type: 'button', title: 'Embed a small image directly in content.json' }, [
            h('i', { class: 'fa-solid fa-paperclip' }),
            document.createTextNode(' Embed')
        ]);
        pick.addEventListener('click', () => file.click());
        file.addEventListener('change', () => {
            const chosen = file.files[0];
            file.value = '';
            if (!chosen) return;
            if (chosen.size > EMBED_LIMIT) {
                toast('Too large to embed (max 250 KB). Put the file in public/assets/ and type its path.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                data[spec.key] = reader.result;
                input.value = reader.result;
                paint();
                toast('Image embedded — press Save.', 'success');
            };
            reader.readAsDataURL(chosen);
        });

        paint();
        wrap.appendChild(h('div', { class: 'media-field' }, [thumb, input, pick, file]));
        wrap.appendChild(
            hint ||
                h('p', {
                    class: 'hint',
                    html: 'Commit the file to <code>public/assets/</code> and use its path, or <strong>Embed</strong> an image under 250 KB.'
                })
        );
        return wrap;
    },

    /* nested object */
    group({ spec, data, wrap, hint, onStructureChange }) {
        const box = h('div', { class: 'nested' });
        if (spec.label) box.appendChild(h('p', { class: 'nested-title', text: spec.label }));

        const grid = h('div', { class: 'grid grid-2' });
        spec.fields.forEach((field) => grid.appendChild(buildField(field, data[spec.key], onStructureChange)));
        box.appendChild(grid);
        if (hint) box.appendChild(hint);

        wrap.classList.add('field-full');
        wrap.appendChild(box);
        return wrap;
    },

    /* repeatable array of objects */
    list({ spec, data, wrap, hint }) {
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
                const title = (spec.itemTitle && row[spec.itemTitle]) || `${spec.itemName || 'Item'} ${i + 1}`;

                const move = (delta) => {
                    const j = i + delta;
                    if (j < 0 || j >= rows.length) return;
                    [rows[i], rows[j]] = [rows[j], rows[i]];
                    rerender();
                };

                const head = h('div', { class: 'repeat-head' }, [
                    h('span', { class: 'num', text: String(i + 1) }),
                    h('span', { class: 'repeat-title', text: title }),
                    miniBtn('fa-solid fa-arrow-up', 'Move up', () => move(-1), i === 0),
                    miniBtn('fa-solid fa-arrow-down', 'Move down', () => move(1), i === rows.length - 1),
                    miniBtn('fa-regular fa-clone', 'Duplicate', () => {
                        rows.splice(i + 1, 0, clone(row));
                        rerender();
                    }),
                    miniBtn('fa-regular fa-trash-can', 'Delete', async () => {
                        const ok = await confirmDialog(
                            'Delete this entry?',
                            `"${title}" will be removed. Press Save afterwards to keep the change.`,
                            'Delete'
                        );
                        if (!ok) return;
                        rows.splice(i, 1);
                        rerender();
                    }, false, true)
                ]);

                const grid = h('div', { class: 'grid grid-2' });
                spec.fields.forEach((field) => grid.appendChild(buildField(field, row, rerender)));

                host.appendChild(h('div', { class: 'repeat-item' }, [head, h('div', { class: 'repeat-body' }, grid)]));
            });

            host.appendChild(
                h('button', {
                    class: 'btn btn-outline btn-sm',
                    type: 'button',
                    onclick: () => {
                        rows.push(blankFrom(spec.fields));
                        rerender();
                    }
                }, [h('i', { class: 'fa-solid fa-plus' }), document.createTextNode(' Add ' + (spec.itemName || 'item'))])
            );
        };

        rerender();
        wrap.appendChild(host);
        return wrap;
    },

    number({ spec, data, wrap, hint }) {
        addLabel(wrap, spec);
        const input = h('input', {
            type: 'number',
            min: spec.min !== undefined ? spec.min : null,
            max: spec.max !== undefined ? spec.max : null,
            placeholder: spec.placeholder || ''
        });
        input.value = data[spec.key];
        input.addEventListener('input', () => (data[spec.key] = Number(input.value) || 0));
        wrap.appendChild(input);
        if (hint) wrap.appendChild(hint);
        return wrap;
    },

    text({ spec, data, wrap, hint }) {
        addLabel(wrap, spec);
        const input = h('input', {
            type: spec.type === 'url' ? 'url' : 'text',
            placeholder: spec.placeholder || ''
        });
        input.value = data[spec.key] || '';
        input.addEventListener('input', () => (data[spec.key] = input.value));
        wrap.appendChild(input);
        if (hint) wrap.appendChild(hint);
        return wrap;
    }
};

BUILDERS.url = BUILDERS.text;

function addLabel(wrap, spec) {
    if (spec.label) wrap.appendChild(h('label', { text: spec.label + (spec.required ? ' *' : '') }));
}

function miniBtn(iconClass, title, onclick, disabled, danger) {
    return h(
        'button',
        { class: 'mini-btn' + (danger ? ' danger' : ''), type: 'button', title, disabled, onclick },
        h('i', { class: iconClass })
    );
}
