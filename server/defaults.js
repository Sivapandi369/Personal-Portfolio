/* ----------------------------------------------------------------
   DEFAULT CONTENT
   Mirrors the original hard-coded index.html 1:1 so that a fresh
   database renders a byte-for-byte identical portfolio UI.
   Everything here is editable from the admin panel afterwards.
   ---------------------------------------------------------------- */

function defaultContent() {
    return {
        site: {
            title: 'Sivapandi R | Software Developer & Web Developer Portfolio',
            description:
                'Portfolio of Sivapandi R - Software Developer, Web Development Intern, and ECE Graduate proficient in React.js, JavaScript, Python, HTML/CSS, MongoDB, and MySQL.',
            logoText: 'Sivapandi',
            logoDot: '.R',
            defaultTheme: 'light',
            navLinks: [
                { label: 'About', href: '#about', visible: true },
                { label: 'Skills', href: '#skills', visible: true },
                { label: 'Experience', href: '#experience', visible: true },
                { label: 'Projects', href: '#projects', visible: true },
                { label: 'Education', href: '#education', visible: true },
                { label: 'Contact', href: '#contact', visible: true }
            ],
            resumeButton: { label: 'Resume PDF', icon: 'fa-solid fa-file-arrow-down', visible: true }
        },

        hero: {
            statusBadge: 'Available for Software Developer Roles',
            titlePrefix: "Hi, I'm",
            name: 'Sivapandi R',
            subtitle: 'Aspiring Software Developer & Web Specialist',
            description:
                'Motivated ECE graduate passionate about crafting efficient, responsive web applications and scalable software solutions with modern technologies like React.js, JavaScript, Python, and SQL databases.',
            buttons: [
                { label: 'View Projects', icon: 'fa-solid fa-briefcase', href: '#projects', style: 'btn-primary', visible: true },
                { label: 'Contact Me', icon: 'fa-solid fa-paper-plane', href: '#contact', style: 'btn-outline', visible: true },
                { label: 'Source Code (.ZIP)', icon: 'fa-solid fa-file-zipper', href: '', style: 'btn-secondary', action: 'zip', visible: true }
            ],
            contactPills: [
                { icon: 'fa-solid fa-location-dot', text: 'Theni - 625531', copy: '' },
                { icon: 'fa-solid fa-phone', text: '+91 9360833565', copy: '9360833565' },
                { icon: 'fa-solid fa-envelope', text: 'sivapandi622004@gmail.com', copy: 'sivapandi622004@gmail.com' }
            ],
            avatar: {
                icon: 'fa-solid fa-code',
                name: 'Sivapandi R',
                role: 'Software Developer Fresher',
                image: ''
            },
            floatingBadges: [
                { icon: 'fa-brands fa-react react-spin', text: 'React.js Specialist' },
                { icon: 'fa-solid fa-graduation-cap', text: 'BE ECE (2025)' },
                { icon: 'fa-solid fa-certificate', text: 'Corizo Certified' }
            ]
        },

        about: {
            tag: 'Overview',
            title: 'Career Objective & Bio',
            visible: true,
            cards: [
                {
                    icon: 'fa-solid fa-bullseye',
                    title: 'Career Objective',
                    text: 'Motivated and enthusiastic fresher seeking an opportunity as a Software Developer where I can apply programming knowledge and web development skills to build efficient, scalable, and user-centric software solutions.'
                },
                {
                    icon: 'fa-solid fa-laptop-code',
                    title: 'Technical Foundation',
                    text: 'Solid foundation in Electronics & Communication Engineering paired with hands-on web development experience in HTML5, CSS3, JavaScript, React.js, Python, C, MongoDB, and MySQL.'
                },
                {
                    icon: 'fa-solid fa-rocket',
                    title: 'Key Strengths',
                    text: 'Strong problem-solving mindset, eager learner of modern web stack frameworks, proven internship track record, and passionate about clean code, UI design, and team collaboration.'
                }
            ]
        },

        skills: {
            tag: 'Expertise',
            title: 'Technical Skills',
            visible: true,
            categories: [
                {
                    icon: 'fa-solid fa-code',
                    title: 'Programming Languages',
                    items: [
                        { name: 'Python', label: '90%', percent: 80 },
                        { name: 'C Programming', label: '80%', percent: 75 },
                        { name: 'Java (Basics)', label: '70%', percent: 65 }
                    ]
                },
                {
                    icon: 'fa-solid fa-globe',
                    title: 'Web Technologies',
                    items: [
                        { name: 'HTML5 & CSS3', label: '95%', percent: 90 },
                        { name: 'JavaScript (ES6+)', label: '95%', percent: 85 },
                        { name: 'React.js', label: '95%', percent: 80 },
                        { name: 'MongoDB & MySQL', label: '95%', percent: 75 }
                    ]
                }
            ],
            toolsCategory: {
                icon: 'fa-solid fa-screwdriver-wrench',
                title: 'Tools & Ecosystem',
                visible: true,
                tools: [
                    { icon: 'fa-brands fa-git-alt', label: 'Git' },
                    { icon: 'fa-brands fa-github', label: 'GitHub' },
                    { icon: 'fa-solid fa-code', label: 'VS Code' },
                    { icon: 'fa-solid fa-database', label: 'MySQL Workbench' },
                    { icon: 'fa-brands fa-npm', label: 'NPM' },
                    { icon: 'fa-solid fa-microchip', label: 'IoT Fundamentals' }
                ]
            }
        },

        experience: {
            tag: 'Work History',
            title: 'Internship Experience',
            visible: true,
            items: [
                {
                    role: 'Juior Software Developer',
                    company: 'Cadd Technologies',
                    period: 'May 2026 – Jul 2026',
                    bullets: [
                        'Worked on real-time software projects, contributing to both front-end and back-end modules.',
                        'Collaborated with senior developers to design and implement features using React.js and MySQL.',
                        'Improved overall UI aesthetics and enhanced user experience through modern design principles.',
                        'Collaborated on front-end modular components and optimized code structure.'
                    ]
                },
                {
                    role: 'Web Development Intern',
                    company: 'Corizo Corporation',
                    period: 'Feb 2024 – Mar 2024',
                    bullets: [
                        'Worked on real-world web development tasks using HTML, CSS, and JavaScript.',
                        'Built responsive, mobile-first web pages ensuring cross-browser compatibility.',
                        'Learned frontend development workflow and debugging techniques.',
                        'Collaborated on front-end modular components and optimized code structure.'
                    ]
                }
            ]
        },

        projects: {
            tag: 'Portfolio',
            title: 'Featured Projects',
            visible: true,
            items: [
                {
                    id: 'portfolio',
                    title: 'Personal Portfolio Website',
                    desc: 'Developed a responsive personal portfolio website showcasing projects, technical skills, interactive themes, and scroll animations. Designed a sleek modern UI to present profile details seamlessly.',
                    tags: ['HTML5', 'CSS3', 'JavaScript'],
                    icon: 'fa-solid fa-user-gear',
                    image: '',
                    liveUrl: '',
                    repoUrl: '',
                    modal: {
                        title: 'Personal Portfolio Website',
                        tags: ['HTML5', 'CSS3', 'JavaScript'],
                        text: 'Designed and developed a highly responsive personal portfolio website to demonstrate technical skills, experience, and projects.',
                        bullets: [
                            'Includes Light and Dark mode theme toggling.',
                            'Smooth scroll animations powered by IntersectionObserver.',
                            'Direct 1-click printable PDF resume generator.',
                            'Clean modern white layout with fluid mobile responsive design.'
                        ]
                    }
                },
                {
                    id: 'sms',
                    title: 'Student Management System',
                    desc: 'Built an intuitive software system to manage student records efficiently. Features full CRUD (Create, Read, Update, Delete) functionality with real-time data input, validation, and search capability.',
                    tags: ['JavaScript / React', 'Database', 'CRUD System'],
                    icon: 'fa-solid fa-users-rectangle',
                    image: '',
                    liveUrl: '',
                    repoUrl: '',
                    modal: {
                        title: 'Student Management System',
                        tags: ['React.js / JS', 'Database', 'CRUD'],
                        text: 'A web application built to manage student academic records, attendance, and details seamlessly.',
                        bullets: [
                            'Add new student profiles with validation.',
                            'Real-time record update and edit capabilities.',
                            'Instant delete confirmation and search filter.',
                            'Clean tabular data display for institutional administration.'
                        ]
                    }
                }
            ]
        },

        education: {
            tag: 'Academics',
            title: 'Education & Certifications',
            visible: true,
            educationTitle: 'Education',
            educationIcon: 'fa-solid fa-graduation-cap',
            items: [
                {
                    year: '2021 – 2025',
                    title: 'BE - Electronics & Communication Engineering',
                    institution: 'Sethu Institute of Technology',
                    gradeIcon: 'fa-solid fa-award',
                    grade: 'CGPA: 7.3 / 10',
                    highlight: true
                },
                {
                    year: '2021',
                    title: 'Higher Secondary Certificate (HSC)',
                    institution: 'Muthalamman Hindu Higher Secondary School',
                    gradeIcon: 'fa-solid fa-percent',
                    grade: 'Percentage: 80%',
                    highlight: false
                },
                {
                    year: '2019',
                    title: 'Secondary School Leaving Certificate (SSLC)',
                    institution: 'Muthalamman Hindu Higher Secondary School',
                    gradeIcon: 'fa-solid fa-percent',
                    grade: 'Percentage: 80%',
                    highlight: false
                }
            ],
            certTitle: 'Certifications',
            certIcon: 'fa-solid fa-certificate',
            certs: [
                { icon: 'fa-solid fa-laptop-code', title: 'Junior Software Developer', sub: 'Cadd Technologies' },
                { icon: 'fa-solid fa-network-wired', title: 'Web Development Certification', sub: 'Corizo Corporation (2024)' },
                { icon: 'fa-solid fa-network-wired', title: 'NPTEL Certification', sub: 'Introduction to Industrial IoT 4.0' }
            ],
            langTitle: 'Languages',
            langIcon: 'fa-solid fa-language',
            languages: [
                { icon: 'fa-solid fa-check-double', label: 'English (Professional)' },
                { icon: 'fa-solid fa-check-double', label: 'Tamil (Native)' }
            ]
        },

        contact: {
            tag: 'Get In Touch',
            title: 'Contact Sivapandi',
            visible: true,
            heading: "Let's Connect & Work Together!",
            text: 'I am actively seeking entry-level Software Developer opportunities. Feel free to contact me directly via email or phone.',
            info: [
                {
                    icon: 'fa-solid fa-envelope',
                    label: 'Email Address',
                    value: 'sivapandi622004@gmail.com',
                    copy: 'sivapandi622004@gmail.com'
                },
                {
                    icon: 'fa-solid fa-phone',
                    label: 'Phone / WhatsApp',
                    value: '+91 9360833565',
                    copy: '9360833565'
                },
                {
                    icon: 'fa-solid fa-location-dot',
                    label: 'Location',
                    value: 'Theni - 625531, Tamil Nadu, India',
                    copy: ''
                }
            ],
            form: {
                enabled: true,
                submitLabel: 'Send Message',
                successMessage: 'Thank you, {name}! Your message has been sent successfully.'
            }
        },

        footer: {
            owner: 'Sivapandi R. All rights reserved.',
            subtext: 'Built with HTML5, CSS3, JavaScript, and Love.'
        },

        resume: {
            /* mode: 'generate' = build the PDF in-browser from the sections below
               mode: 'file'     = serve the uploaded PDF straight to the visitor  */
            mode: 'generate',
            fileName: 'Resume.pdf',
            uploadedFile: '',
            header: {
                name: 'SIVAPANDI R',
                contact: 'Theni - 625531 | Mobile: +91 9360833565 | Email: sivapandi622004@gmail.com'
            },
            /* Body format (per section):
               plain line          -> paragraph
               "- text"            -> bullet list item
               "Title | Subtitle"  -> bold title with a muted sub-line
               **text**            -> bold inline                                  */
            sections: [
                {
                    title: 'Career Objective',
                    body: 'Motivated and enthusiastic fresher seeking an opportunity as a Software Developer where I can apply programming knowledge and web development skills to build efficient and scalable software solutions.'
                },
                {
                    title: 'Education',
                    body: [
                        'BE Electronics and Communication Engineering | Sethu Institute of Technology (2025) — **CGPA: 7.3**',
                        'Higher Secondary Certificate (HSC) | Muthalamman Hindu Higher Secondary School (2021) — **Percentage: 80%**',
                        'Secondary School Leaving Certificate (SSLC) | Muthalamman Hindu Higher Secondary School (2019) — **Percentage: 80%**'
                    ].join('\n')
                },
                {
                    title: 'Technical Skills',
                    body: [
                        '**Programming:** C, Python, Java (Basics)',
                        '**Web Technologies:** HTML, CSS, JavaScript, React.js, MongoDB, MySQL',
                        '**Tools & Platforms:** Git, GitHub, VS Code'
                    ].join('\n')
                },
                {
                    title: 'Projects',
                    body: [
                        '**Personal Portfolio Website** – Developed a responsive portfolio website using HTML, CSS and JavaScript. Designed a modern UI to showcase projects and technical skills.',
                        '**Student Management System** – Built a system to manage student records with add, update and delete functionality.'
                    ].join('\n')
                },
                {
                    title: 'Internship Experience',
                    body: [
                        '**Web Development Intern (Feb 2024 – Mar 2024)** — Corizo Corporation',
                        'Worked on web development tasks using HTML, CSS and JavaScript; built responsive web pages and improved overall user interface aesthetics.'
                    ].join('\n')
                },
                {
                    title: 'Certifications',
                    body: [
                        '- Web Development Certification – Corizo Corporation (2024)',
                        '- NPTEL – Introduction to Industrial IoT 4.0'
                    ].join('\n')
                },
                {
                    title: 'Languages',
                    body: 'English, Tamil'
                }
            ]
        }
    };
}

module.exports = { defaultContent };
