/* ----------------------------------------------------------------
   SIVAPANDI R — CONTENT HYDRATION LAYER
   Reads the portfolio content from content.json and re-renders the
   existing markup with it — same classes, same structure, same look.
   If the file cannot be loaded, the hard-coded HTML already in the
   page is kept as-is, so the site never breaks.
   ---------------------------------------------------------------- */

(function () {
    'use strict';

    const CONTENT_URL = 'content.json';

    /* ---------------- helpers ---------------- */

    const esc = (v) =>
        String(v == null ? '' : v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    /* Icon values come from the admin panel: keep them to Font Awesome tokens. */
    const icon = (v, fallback) => {
        const val = String(v || '').trim();
        return /^[a-z0-9 _-]+$/i.test(val) && val ? val : fallback || 'fa-solid fa-circle';
    };

    /* Allows **bold** inside admin-written text without allowing raw HTML. */
    const rich = (v) => esc(v).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    const get = (obj, path) =>
        path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

    const arr = (v) => (Array.isArray(v) ? v : []);
    const el = (sel) => document.querySelector(sel);
    const delay = (i, step) => (i > 0 ? ` style="animation-delay: ${(i * step).toFixed(2)}s;"` : '');

    function setHTML(selector, html) {
        const node = el(selector);
        if (node) node.innerHTML = html;
        return node;
    }

    /* ---------------- section renderers ---------------- */

    function renderHead(site) {
        if (site.title) document.title = site.title;
        const desc = el('meta[name="description"]');
        if (desc && site.description) desc.setAttribute('content', site.description);

        const logo = el('#logo-text');
        if (logo) {
            logo.innerHTML = `${esc(site.logoText)}<span class="dot">${esc(site.logoDot)}</span>`;
        }

        setHTML(
            '#nav-list',
            arr(site.navLinks)
                .filter((l) => l.visible !== false)
                .map((l) => `<li><a href="${esc(l.href)}" class="nav-link">${esc(l.label)}</a></li>`)
                .join('')
        );

        const resumeBtn = el('#download-resume-btn');
        if (resumeBtn) {
            const cfg = site.resumeButton || {};
            if (cfg.visible === false) {
                resumeBtn.remove();
            } else {
                resumeBtn.innerHTML =
                    `<i class="${esc(icon(cfg.icon, 'fa-solid fa-file-arrow-down'))}"></i>` +
                    `<span>${esc(cfg.label || 'Resume PDF')}</span>`;
            }
        }
    }

    function renderHero(hero) {
        const badge = el('#hero-status-badge');
        if (badge) {
            if (hero.statusBadge) {
                badge.innerHTML = `<span class="status-dot pulse"></span>\n${esc(hero.statusBadge)}`;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }

        setHTML(
            '#hero-title',
            `${esc(hero.titlePrefix)} <span class="gradient-text">${esc(hero.name)}</span>`
        );
        const sub = el('#hero-subtitle');
        if (sub) sub.textContent = hero.subtitle || '';
        const desc = el('#hero-description');
        if (desc) desc.textContent = hero.description || '';

        setHTML(
            '#hero-actions',
            arr(hero.buttons)
                .filter((b) => b.visible !== false)
                .map((b) => {
                    const ico = `<i class="${esc(icon(b.icon))}"></i> `;
                    const cls = `btn ${esc(b.style || 'btn-primary')}`;
                    if (b.action === 'zip') {
                        return `<button class="${cls} btn-download-zip" id="download-zip-btn">${ico}${esc(
                            b.label
                        )}</button>`;
                    }
                    if (b.action === 'resume') {
                        return `<button class="${cls} btn-resume-alt" data-resume-download>${ico}${esc(
                            b.label
                        )}</button>`;
                    }
                    const external = /^https?:/i.test(b.href || '');
                    return `<a href="${esc(b.href || '#')}" class="${cls}"${
                        external ? ' target="_blank" rel="noopener"' : ''
                    }>${ico}${esc(b.label)}</a>`;
                })
                .join('\n')
        );

        setHTML(
            '#hero-contact-strip',
            arr(hero.contactPills)
                .map(
                    (p) =>
                        `<div class="contact-pill${p.copy ? ' copyable' : ''}"${
                            p.copy ? ` data-copy="${esc(p.copy)}"` : ''
                        }>\n<i class="${esc(icon(p.icon))}"></i> ${esc(p.text)}${
                            p.copy ? '\n<i class="fa-regular fa-copy copy-icon"></i>' : ''
                        }\n</div>`
                )
                .join('\n')
        );

        const av = hero.avatar || {};
        const avatarFace = av.image
            ? `<div class="avatar-icon" style="background-image:url('${esc(
                  av.image
              )}');background-size:cover;background-position:center;"></div>`
            : `<div class="avatar-icon"><i class="${esc(icon(av.icon, 'fa-solid fa-code'))}"></i></div>`;

        setHTML(
            '#avatar-card',
            `<div class="avatar-glow"></div>
            <div class="avatar-inner">
                ${avatarFace}
                <div class="avatar-details">
                    <span class="avatar-name">${esc(av.name)}</span>
                    <span class="avatar-role">${esc(av.role)}</span>
                </div>
            </div>
            ${arr(hero.floatingBadges)
                .slice(0, 3)
                .map(
                    (b, i) =>
                        `<div class="floating-badge badge-${i + 1}">
                <i class="${esc(icon(b.icon))}"></i>
                <span>${esc(b.text)}</span>
            </div>`
                )
                .join('\n')}`
        );
    }

    function renderAbout(about) {
        setHTML(
            '#about-grid',
            arr(about.cards)
                .map(
                    (c, i) =>
                        `<div class="about-card reveal"${delay(i, 0.15)}>
                <div class="card-icon"><i class="${esc(icon(c.icon))}"></i></div>
                <h3>${esc(c.title)}</h3>
                <p>${rich(c.text)}</p>
            </div>`
                )
                .join('\n')
        );
    }

    function renderSkills(skills) {
        const cards = arr(skills.categories).map(
            (cat, i) =>
                `<div class="skill-category-card reveal"${delay(i, 0.15)}>
                <div class="category-header">
                    <i class="${esc(icon(cat.icon))}"></i>
                    <h3>${esc(cat.title)}</h3>
                </div>
                <div class="skill-bars">
                    ${arr(cat.items)
                        .map((s) => {
                            const pct = Math.max(0, Math.min(100, Number(s.percent) || 0));
                            const label = s.label != null && s.label !== '' ? s.label : pct + '%';
                            return `<div class="skill-item">
                        <div class="skill-info">
                            <span>${esc(s.name)}</span>
                            <span>${esc(label)}</span>
                        </div>
                        <div class="progress-track"><div class="progress-fill" style="width: ${pct}%;"></div></div>
                    </div>`;
                        })
                        .join('\n')}
                </div>
            </div>`
        );

        const tools = skills.toolsCategory || {};
        if (tools.visible !== false && arr(tools.tools).length) {
            cards.push(
                `<div class="skill-category-card reveal"${delay(cards.length, 0.15)}>
                <div class="category-header">
                    <i class="${esc(icon(tools.icon))}"></i>
                    <h3>${esc(tools.title)}</h3>
                </div>
                <div class="tools-grid">
                    ${arr(tools.tools)
                        .map(
                            (t) =>
                                `<div class="tool-badge"><i class="${esc(icon(t.icon))}"></i> ${esc(
                                    t.label
                                )}</div>`
                        )
                        .join('\n')}
                </div>
            </div>`
            );
        }

        setHTML('#skills-wrapper', cards.join('\n'));
    }

    function renderExperience(exp) {
        setHTML(
            '#experience-timeline',
            arr(exp.items)
                .map(
                    (it) =>
                        `<div class="timeline-item reveal">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <div>
                            <h3 class="role-title">${esc(it.role)}</h3>
                            <h4 class="company-name"><i class="fa-solid fa-building"></i> ${esc(
                                it.company
                            )}</h4>
                        </div>
                        <span class="timeline-badge"><i class="fa-regular fa-calendar-days"></i> ${esc(
                            it.period
                        )}</span>
                    </div>
                    <ul class="timeline-details">
                        ${arr(it.bullets)
                            .map((b) => `<li>${rich(b)}</li>`)
                            .join('\n')}
                    </ul>
                </div>
            </div>`
                )
                .join('\n')
        );
    }

    function renderProjects(projects) {
        const items = arr(projects.items);

        setHTML(
            '#projects-grid',
            items
                .map((p, i) => {
                    const modalId = 'modal-' + esc(p.id || 'p' + i);
                    const cover = p.image
                        ? ` style="background-image:url('${esc(
                              p.image
                          )}');background-size:cover;background-position:center;"`
                        : '';
                    const links = [
                        p.liveUrl
                            ? `<a href="${esc(
                                  p.liveUrl
                              )}" target="_blank" rel="noopener" class="btn btn-primary btn-sm"><i class="fa-solid fa-arrow-up-right-from-square"></i> Live Demo</a>`
                            : '',
                        p.repoUrl
                            ? `<a href="${esc(
                                  p.repoUrl
                              )}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="fa-brands fa-github"></i> Code</a>`
                            : ''
                    ]
                        .filter(Boolean)
                        .join('\n');

                    return `<div class="project-card reveal"${delay(i, 0.2)}>
                <div class="project-preview preview-${esc(p.id || i)}"${cover}>
                    <div class="preview-overlay">
                        <button class="btn btn-light btn-sm open-modal" data-modal="${modalId}">
                            <i class="fa-solid fa-eye"></i> View Details
                        </button>
                    </div>
                    ${
                        p.image
                            ? ''
                            : `<div class="project-banner-icon"><i class="${esc(icon(p.icon))}"></i></div>`
                    }
                </div>
                <div class="project-body">
                    <div class="project-tags">
                        ${arr(p.tags)
                            .map((t) => `<span class="tag">${esc(t)}</span>`)
                            .join('\n')}
                    </div>
                    <h3 class="project-title">${esc(p.title)}</h3>
                    <p class="project-desc">${rich(p.desc)}</p>
                    <div class="project-footer">
                        <button class="btn btn-outline btn-sm open-modal" data-modal="${modalId}">
                            <i class="fa-solid fa-circle-info"></i> Project Details
                        </button>
                        ${links}
                    </div>
                </div>
            </div>`;
                })
                .join('\n')
        );

        setHTML(
            '#project-modals',
            items
                .map((p, i) => {
                    const m = p.modal || {};
                    const tags = arr(m.tags).length ? arr(m.tags) : arr(p.tags);
                    return `<div id="modal-${esc(p.id || 'p' + i)}" class="modal">
                <div class="modal-content">
                    <span class="modal-close">&times;</span>
                    <h2>${esc(m.title || p.title)}</h2>
                    <div class="modal-tags">
                        ${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('\n')}
                    </div>
                    <p class="modal-body-text">${rich(m.text || p.desc)}</p>
                    <ul class="modal-bullets">
                        ${arr(m.bullets)
                            .map(
                                (b) =>
                                    `<li><i class="fa-solid fa-check text-success"></i> ${rich(b)}</li>`
                            )
                            .join('\n')}
                    </ul>
                </div>
            </div>`;
                })
                .join('\n')
        );
    }

    function renderEducation(edu) {
        setHTML(
            '#academics-grid',
            `<div class="academic-column reveal">
                <h3 class="column-title"><i class="${esc(
                    icon(edu.educationIcon, 'fa-solid fa-graduation-cap')
                )}"></i> ${esc(edu.educationTitle)}</h3>
                ${arr(edu.items)
                    .map(
                        (it) =>
                            `<div class="academic-card${it.highlight ? ' highlight-card' : ''}">
                    <span class="card-year">${esc(it.year)}</span>
                    <h4>${esc(it.title)}</h4>
                    <p class="institution">${esc(it.institution)}</p>
                    ${
                        it.grade
                            ? `<div class="grade-badge"><i class="${esc(
                                  icon(it.gradeIcon, 'fa-solid fa-award')
                              )}"></i> ${esc(it.grade)}</div>`
                            : ''
                    }
                </div>`
                    )
                    .join('\n')}
            </div>

            <div class="academic-column reveal" style="animation-delay: 0.2s;">
                <h3 class="column-title"><i class="${esc(
                    icon(edu.certIcon, 'fa-solid fa-certificate')
                )}"></i> ${esc(edu.certTitle)}</h3>
                ${arr(edu.certs)
                    .map(
                        (c) =>
                            `<div class="cert-card">
                    <div class="cert-icon"><i class="${esc(icon(c.icon))}"></i></div>
                    <div>
                        <h4>${esc(c.title)}</h4>
                        <p>${esc(c.sub)}</p>
                    </div>
                </div>`
                    )
                    .join('\n')}

                ${
                    arr(edu.languages).length
                        ? `<h3 class="column-title mt-4"><i class="${esc(
                              icon(edu.langIcon, 'fa-solid fa-language')
                          )}"></i> ${esc(edu.langTitle)}</h3>
                <div class="languages-flex">
                    ${arr(edu.languages)
                        .map(
                            (l) =>
                                `<div class="lang-pill"><i class="${esc(
                                    icon(l.icon, 'fa-solid fa-check-double')
                                )}"></i> ${esc(l.label)}</div>`
                        )
                        .join('\n')}
                </div>`
                        : ''
                }
            </div>`
        );
    }

    function renderContact(contact) {
        setHTML(
            '#contact-info-card',
            `<h3>${esc(contact.heading)}</h3>
            <p>${rich(contact.text)}</p>
            <div class="info-list">
                ${arr(contact.info)
                    .map(
                        (it) =>
                            `<div class="info-item${it.copy ? ' copyable' : ''}"${
                                it.copy ? ` data-copy="${esc(it.copy)}"` : ''
                            }>
                    <div class="info-icon"><i class="${esc(icon(it.icon))}"></i></div>
                    <div>
                        <span class="info-label">${esc(it.label)}</span>
                        <span class="info-val">${esc(it.value)}</span>
                    </div>
                    ${it.copy ? '<i class="fa-regular fa-copy info-copy-icon"></i>' : ''}
                </div>`
                    )
                    .join('\n')}
            </div>`
        );

        const form = contact.form || {};
        const card = el('.contact-form-card');
        if (card) card.style.display = form.enabled === false ? 'none' : '';
        const submit = el('#contact-form button[type="submit"]');
        if (submit && form.submitLabel) {
            submit.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${esc(form.submitLabel)}`;
        }
    }

    function renderFooter(footer) {
        const owner = el('#footer-owner');
        if (owner) owner.textContent = footer.owner || '';
        const subtext = el('#footer-subtext');
        if (subtext) subtext.textContent = footer.subtext || '';
    }

    /* Printable resume — the source for the in-browser PDF export.
       Body syntax: "- item" = bullet, "Title | Subtitle" = item block,
       anything else = paragraph, **text** = bold. */
    function renderResume(resume) {
        const header = resume.header || {};
        const blocks = arr(resume.sections)
            .map((section) => {
                const lines = String(section.body || '')
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean);

                let html = '';
                let listOpen = false;
                lines.forEach((line) => {
                    const isBullet = /^[-*•]\s+/.test(line);
                    if (isBullet && !listOpen) {
                        html += '<ul>';
                        listOpen = true;
                    }
                    if (!isBullet && listOpen) {
                        html += '</ul>';
                        listOpen = false;
                    }

                    if (isBullet) {
                        html += `<li>${rich(line.replace(/^[-*•]\s+/, ''))}</li>`;
                    } else if (line.includes('|')) {
                        const [title, ...rest] = line.split('|');
                        html += `<div class="resume-item-pdf">
                        <div class="item-title-pdf">${rich(title.trim())}</div>
                        <div class="item-sub-pdf">${rich(rest.join('|').trim())}</div>
                    </div>`;
                    } else {
                        html += `<p>${rich(line)}</p>`;
                    }
                });
                if (listOpen) html += '</ul>';

                return `<div class="resume-section-pdf">
                <h2>${esc(section.title)}</h2>
                ${html}
            </div>`;
            })
            .join('\n');

        setHTML(
            '#printable-resume',
            `<div class="resume-pdf-header">
                <h1>${esc(header.name)}</h1>
                <p class="resume-contact">${esc(header.contact)}</p>
            </div>
            ${blocks}`
        );
    }

    /* Simple text bindings: <span data-bind="about.tag">…</span> */
    function renderBindings(content) {
        document.querySelectorAll('[data-bind]').forEach((node) => {
            const value = get(content, node.getAttribute('data-bind'));
            if (value != null && value !== '') node.textContent = value;
        });
    }

    /* Hide a whole <section> when it is switched off in the admin panel. */
    function applyVisibility(content) {
        [
            ['about', '#about'],
            ['skills', '#skills'],
            ['experience', '#experience'],
            ['projects', '#projects'],
            ['education', '#education'],
            ['contact', '#contact']
        ].forEach(([key, sel]) => {
            const section = el(sel);
            if (!section) return;
            const hidden = content[key] && content[key].visible === false;
            section.style.display = hidden ? 'none' : '';
            const navLink = el(`.nav-link[href="${sel}"]`);
            if (navLink && navLink.parentElement) {
                navLink.parentElement.style.display = hidden ? 'none' : '';
            }
        });
    }

    function hydrate(content) {
        renderHead(content.site || {});
        renderHero(content.hero || {});
        renderBindings(content);
        renderAbout(content.about || {});
        renderSkills(content.skills || {});
        renderExperience(content.experience || {});
        renderProjects(content.projects || {});
        renderEducation(content.education || {});
        renderContact(content.contact || {});
        renderFooter(content.footer || {});
        renderResume(content.resume || {});
        applyVisibility(content);
    }

    /* ---------------- boot ----------------
       Normally the content comes from content.json. The admin panel opens
       this page as ?preview=1 inside an iframe, which makes it read the
       working copy the editor keeps in localStorage instead — that is how
       unsaved edits show up in the live preview. */

    function loadContent() {
        if (/[?&]preview=1\b/.test(window.location.search)) {
            try {
                const draft = JSON.parse(localStorage.getItem('sp-portfolio-content') || 'null');
                if (draft) return Promise.resolve(draft);
            } catch (e) {
                /* corrupt draft — fall through to content.json */
            }
        }
        return fetch(CONTENT_URL, { headers: { Accept: 'application/json' } }).then((r) => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    window.portfolioContent = null;

    window.portfolioContentReady = loadContent()
        .then((content) => {
            if (!content || typeof content !== 'object') throw new Error('Malformed content.json');
            window.portfolioContent = content;
            hydrate(content);
            window.PORTFOLIO_DEFAULT_THEME = (content.site || {}).defaultTheme || 'light';
            return content;
        })
        .catch((err) => {
            console.warn('[portfolio] content.json unavailable — showing the built-in markup.', err.message);
            return null;
        });
})();
