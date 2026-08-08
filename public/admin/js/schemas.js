/* ----------------------------------------------------------------
   CONTENT SCHEMAS
   One entry per section of content.json. Each schema describes the
   editing form; fields.js turns it into controls, app.js renders it.
   Adding a field here is all it takes to make it editable.
   ---------------------------------------------------------------- */

const F = {
    tag: { key: 'tag', label: 'Section label (small text above the title)', type: 'text' },
    title: { key: 'title', label: 'Section heading', type: 'text' },
    visible: { key: 'visible', label: 'Show this section on the website', type: 'switch' }
};

export const SCHEMAS = {
    site: {
        title: 'Site & Navigation',
        subtitle: 'Browser title, SEO description, logo and the navbar menu',
        icon: 'fa-solid fa-sliders',
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
        icon: 'fa-solid fa-star',
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
                              { value: 'resume', label: 'Download resume PDF' }
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
        icon: 'fa-solid fa-user',
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
        icon: 'fa-solid fa-code',
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
                                { key: 'label', label: 'Text shown on the right', type: 'text', placeholder: '90%' },
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
        icon: 'fa-solid fa-briefcase',
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
        icon: 'fa-solid fa-diagram-project',
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
        icon: 'fa-solid fa-graduation-cap',
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
        icon: 'fa-solid fa-envelope',
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
                          hint: 'Use <code>{name}</code> to insert the sender\'s name.' },
                        { key: 'endpoint', label: 'Form service endpoint', type: 'url', full: true,
                          placeholder: 'https://formspree.io/f/xxxxxxx',
                          hint: 'A static site cannot store messages itself. Paste a <a href="https://formspree.io" target="_blank" rel="noopener">Formspree</a> / Getform URL to receive them by email.' },
                        { key: 'mailto', label: 'Fallback email address', type: 'text', full: true,
                          hint: 'Used when no endpoint is set, or if it fails — the visitor\'s mail app opens with the message pre-filled.' }
                    ] }
                ]
            }
        ]
    },

    footer: {
        title: 'Footer',
        subtitle: 'Copyright line and tagline',
        icon: 'fa-solid fa-shoe-prints',
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
        icon: 'fa-solid fa-file-pdf',
        groups: [
            {
                title: 'Download Behaviour',
                icon: 'fa-solid fa-gear',
                fields: [
                    { key: 'mode', label: 'Resume source', type: 'select', options: [
                        { value: 'generate', label: 'Generate the PDF from the content below' },
                        { value: 'file', label: 'Download a PDF file from the repo' }
                    ] },
                    { key: 'fileName', label: 'Download file name', type: 'text', placeholder: 'Resume.pdf' },
                    { key: 'file', label: 'PDF path in the repo', type: 'text', full: true,
                      placeholder: 'Resume.pdf',
                      hint: 'Relative to <code>public/</code> — commit your PDF there, e.g. <code>Resume.pdf</code>.' }
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

export const SECTION_KEYS = Object.keys(SCHEMAS);
