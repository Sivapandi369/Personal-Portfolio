/* ----------------------------------------------------------------
   Tiny DOM helpers shared by every admin module.
   ---------------------------------------------------------------- */

/** Create an element. `attrs` understands class / text / html / on* handlers. */
export function h(tag, attrs, children) {
    const node = document.createElement(tag);

    Object.entries(attrs || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key.startsWith('on') && typeof value === 'function') {
            node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, value);
    });

    (Array.isArray(children) ? children : children ? [children] : [])
        .filter((child) => child !== null && child !== undefined && child !== false)
        .forEach((child) =>
            node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
        );

    return node;
}

/** Button with a leading Font Awesome icon. */
export const iconBtn = (cls, iconClass, label, onclick) =>
    h('button', { class: cls, type: 'button', onclick }, [
        h('i', { class: iconClass }),
        document.createTextNode(' ' + label)
    ]);

export const $ = (selector) => document.querySelector(selector);

export const clone = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

export const esc = (value) =>
    String(value == null ? '' : value).replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

let toastTimer;
export function toast(message, kind) {
    const el = $('#admin-toast');
    el.className = 'admin-toast show' + (kind ? ' ' + kind : '');
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.className = 'admin-toast'), 3600);
}

/** Promise-based confirm dialog backed by the markup in index.html. */
export function confirmDialog(title, text, okLabel) {
    return new Promise((resolve) => {
        const box = $('#confirm-dialog');
        $('#confirm-title').textContent = title;
        $('#confirm-text').textContent = text || '';
        $('#confirm-ok').textContent = okLabel || 'Confirm';
        box.hidden = false;

        const done = (value) => {
            box.hidden = true;
            $('#confirm-ok').onclick = null;
            $('#confirm-cancel').onclick = null;
            resolve(value);
        };
        $('#confirm-ok').onclick = () => done(true);
        $('#confirm-cancel').onclick = () => done(false);
    });
}

/** Trigger a browser download for a text file. */
export function downloadFile(fileName, text, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime || 'application/json' }));
    const a = h('a', { href: url, download: fileName });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
