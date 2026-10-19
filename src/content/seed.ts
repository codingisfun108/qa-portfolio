import type { Content } from '@/lib/schema';

// Starting content. It is shown until you save from the admin panel; after that the saved
// version (in Redis) is what the site renders. "Reset to starting content" in the admin
// panel restores this file.

export const seed: Content = {
  version: 1,
  updatedAt: '2026-10-19T00:00:00.000Z',

  site: {
    name: 'Rahul Kumar Sharma',
    firstName: 'Rahul',
    initials: 'RS',
    role: 'QA Lead',
    location: 'Noida, India',
    availability: 'Open to QA Lead roles',
    showAvailability: true,
    email: 'rsharma108@hotmail.com',
    phone: '+91 98993 59780',
    showPhone: true,
    linkedin: 'https://www.linkedin.com/in/rsharma108/',
    github: '',
    photoUrl: '/rahul.jpg',
    resumeUrl: '/Rahul-Kumar-Sharma-QA-Lead-Resume.pdf',
    resumeLabel: 'Download resume',
    repoUrl: '',
    seoTitle: 'Rahul Kumar Sharma, QA Lead',
    seoDescription:
      'QA Lead with 9+ years on SaaS web and mobile products. Test strategy, release governance, Playwright automation and AI-assisted QA.',
    siteUrl: '',
  },

  hero: {
    greeting: "Hi, I'm Rahul, QA Lead.",
    headline: 'I decide when a release is ready to ship.',
    intro:
      'QA Lead with 9+ years on SaaS web and mobile products in entertainment ticketing, EdTech and online examinations. I lead a 6-member QA team on the PVR INOX ticketing platform, own test strategy and release sign-off, and build AI agents into everyday QA work.',
    stats: [
      { value: '9+', label: 'years in QA' },
      { value: '10', label: 'QA engineers led' },
      { value: '99%+', label: 'defect-free releases' },
    ],
  },

  signoff: {
    fileName: 'release-signoff.spec.ts',
    command: 'npx playwright test release-signoff',
    checks: [
      { gate: 'functional and regression', detail: 'risk-based coverage' },
      { gate: 'api contracts', detail: 'postman, swagger' },
      { gate: 'database integrity', detail: 'mongodb, sql' },
      { gate: 'payments and booking', detail: 'end-to-end flows' },
      { gate: 'security', detail: 'burp suite pro' },
      { gate: 'load on peak day', detail: 'apache jmeter' },
      { gate: 'risk review and rca', detail: 'go / no-go' },
    ],
    resultText: 'All checks passed. Ready for your next release.',
  },

  sections: [
    { id: 'signoff', visible: true, inNav: false, navLabel: 'Sign-off', title: 'Every release I own goes through this', subtitle: 'The checks behind my go / no-go call, run before anything reaches users.' },
    { id: 'projects', visible: true, inNav: true, navLabel: 'Projects', title: "Projects I've led QA on", subtitle: 'Products where I owned quality from test planning through release sign-off.' },
    { id: 'impact', visible: true, inNav: true, navLabel: 'Impact', title: 'Impact', subtitle: "Results from the teams and products I've led. Each figure names where it came from." },
    { id: 'experience', visible: true, inNav: true, navLabel: 'Experience', title: 'Experience', subtitle: 'Nine years of owning the release decision, from exploratory testing on Samsung devices to leading QA for ticketing and EdTech platforms.' },
    { id: 'recognition', visible: false, inNav: false, navLabel: 'Recognition', title: 'Recognition', subtitle: 'What clients and leaders said about the work.' },
    { id: 'toolkit', visible: true, inNav: true, navLabel: 'Toolkit', title: 'My testing toolkit', subtitle: 'What I use to plan, test and sign off releases across web, Android and iOS.' },
    { id: 'certifications', visible: false, inNav: false, navLabel: 'Certifications', title: 'Certifications', subtitle: '' },
    { id: 'blog', visible: false, inNav: false, navLabel: 'Writing', title: 'Writing', subtitle: 'Notes on test strategy, release quality and AI in QA.' },
    { id: 'now', visible: true, inNav: false, navLabel: 'Now', title: "What I'm working on now", subtitle: '' },
    { id: 'contact', visible: true, inNav: false, navLabel: 'Contact', title: 'Get in touch', subtitle: "Hiring a QA Lead, or want a second opinion on your release process? Pick whatever's easiest." },
  ],

  projects: [
    {
      id: 'pvr-inox',
      visible: true,
      title: 'PVR INOX',
      domain: 'Entertainment ticketing',
      status: 'Releasing soon',
      summary:
        "Movie ticket booking for India's largest multiplex chain, across Android, iOS, website and mobile site. I'm leading QA through to the upcoming release.",
      role: 'QA Lead at Appinventiv, team of 6',
      tested: [
        'Showtime discovery and seat selection',
        'Payments, offers and e-tickets',
        'Food and beverage ordering',
        'Regression for every milestone release',
        'Jira defect triage and release go / no-go',
      ],
      link: '',
    },
    {
      id: 'think-exam',
      visible: true,
      title: 'Think Exam',
      domain: 'Online examinations',
      status: 'Shipped',
      summary: 'Cloud-based SaaS platform that organizations use to run secure, large-scale online exams.',
      role: 'QA Lead',
      tested: [
        'Exam flows end to end, from scheduling to results',
        'APIs behind exam delivery and scoring',
        'Security of exam sessions and candidate data',
        'Stability under many concurrent candidates',
        'Accuracy of results and reports',
      ],
      link: '',
    },
    {
      id: 'glorifire-lms',
      visible: true,
      title: 'Glorifire LMS',
      domain: 'EdTech',
      status: 'Shipped',
      summary: 'End-to-end learning platform for Class IX–XII students preparing for competitive exams. Released 99% defect-free.',
      role: 'QA owner, LMS modules',
      tested: ['LMS modules end to end', 'Regression suite before every release', 'UAT validation with stakeholders', 'Release readiness and QA sign-off'],
      link: '',
    },
    {
      id: 'glorifire-stakeholder',
      visible: false,
      title: 'Glorifire Stakeholder',
      domain: 'EdTech',
      status: 'Shipped',
      summary: 'Educator platform for teaching, student analytics and administration.',
      role: 'QA',
      tested: ['Teaching tools and educator workflows', 'Analytics dashboards and data accuracy', 'Admin and user management', 'Regression across releases'],
      link: '',
    },
    {
      id: 'ai-qa-agents',
      visible: true,
      title: 'AI QA agent toolkit',
      domain: 'AI in QA',
      status: 'In use',
      summary: 'Claude agents connected to Jira through MCP that handle test design, defect logging and triage for the PVR INOX team.',
      role: 'Designer and builder',
      tested: [
        'Requirements to ISTQB test plans, Xray test cases and an RTM',
        'Structured Jira bug reports created directly through Atlassian MCP',
        'Read-only triage reports by fix version, plus tickets ready for QA',
      ],
      link: '',
    },
  ],

  impact: [
    { value: '95%', label: 'reduction in defect leakage', source: 'Edfora Infotech' },
    { value: '85%', label: 'fewer critical production issues', source: 'Edfora Infotech' },
    { value: '99%+', label: 'defect-free production releases', source: 'Ginger Webs, Glorifire LMS' },
    { value: '10', label: 'QA engineers led and mentored', source: 'Edfora Infotech' },
    { value: '40%', label: 'higher customer satisfaction', source: 'Edfora Infotech' },
    { value: '10%', label: 'faster release cycles from QA reporting', source: 'Edfora Infotech' },
  ],

  experience: [
    {
      id: 'appinventiv',
      visible: true,
      title: 'QA Lead',
      company: 'Appinventiv',
      place: 'Noida',
      period: 'Feb 2026 – Present',
      current: true,
      points: [
        'Lead a team of 6 QA engineers on the PVR INOX ticketing platform across Android, iOS, website and mobile site.',
        'Own test strategy, planning, estimation and QA sign-off for milestone releases.',
        'Leading release readiness and the go / no-go call for the platform’s upcoming launch.',
        'Validate end-to-end booking: showtimes, seat selection, payments, food and beverage, offers and e-tickets.',
        'Built Claude agents for test case design, Jira defect reporting through MCP, and triage reports.',
      ],
    },
    {
      id: 'ginger-webs',
      visible: true,
      title: 'QA Lead',
      company: 'Ginger Webs',
      place: 'Noida',
      period: 'Sep 2025 – Jan 2026',
      current: false,
      points: [
        'Led QA strategy across functional, regression, API, database and security testing for high-concurrency platforms.',
        'Achieved 99%+ defect-free production releases through stronger test planning and pre-release validation.',
        'Ran pre-release risk assessments, RCA and post-production monitoring; set up QA processes for web and mobile.',
      ],
    },
    {
      id: 'edfora',
      visible: true,
      title: 'Module Lead, QA',
      company: 'Edfora Infotech',
      place: 'Delhi',
      period: 'Nov 2017 – Sep 2025',
      current: false,
      points: [
        'Led and mentored 10 QA engineers; owned test planning, execution and release sign-off across EdTech products.',
        'Cut defect leakage by 95% and critical production issues by 85% through regression planning and preventive QA.',
        'Improved customer satisfaction by 40% by aligning QA outcomes with end-user expectations.',
        'Defined automation strategy and regression coverage; data-driven QA reporting sped up release cycles by 10%.',
        'Doubled as Project Manager for vendor-built products, owning their quality compliance.',
      ],
    },
    {
      id: 'ienergizer',
      visible: true,
      title: 'Team Lead',
      company: 'iEnergizer',
      place: 'Noida',
      period: 'Jun 2015 – May 2017',
      current: false,
      points: [
        'Proposed and led a 4-member exploratory testing team on Samsung HHP devices, including premium smartphones.',
        'Managed 12 Samsung HHP support representatives; acting on user pain points raised customer satisfaction by 15%.',
      ],
    },
  ],
  earlier: '',

  recognition: [],

  toolkit: [
    { name: 'Jira', use: 'Defect tracking, sprint and release boards', tag: '' },
    { name: 'TestRail, Xray', use: 'Test case design, runs and coverage', tag: '' },
    { name: 'Postman, Swagger', use: 'API contract and negative testing', tag: '' },
    { name: 'Playwright', use: 'UI and API automation', tag: 'Current focus' },
    { name: 'Claude and MCP', use: 'AI agents for test design, bug reports and triage', tag: 'AI' },
    { name: 'Selenium (Java)', use: 'Web UI automation', tag: '' },
    { name: 'BrowserStack', use: 'Cross-browser and real-device testing on web, Android, iOS', tag: '' },
    { name: 'Apache JMeter', use: 'Load and concurrency testing', tag: '' },
    { name: 'Burp Suite Pro', use: 'Security testing', tag: '' },
    { name: 'MongoDB, SQL', use: 'Data validation with Robo 3T and Studio 3T', tag: '' },
  ],
  practices: [
    'Risk-based test planning',
    'Release readiness and QA sign-off',
    'Regression strategy',
    'Exploratory testing',
    'Root cause analysis',
    'Agile and Kanban delivery',
  ],

  certifications: [],

  posts: [
    {
      slug: 'how-i-use-ai-agents-in-qa',
      published: false,
      title: 'How I use AI agents in day-to-day QA',
      date: '2026-10-19',
      summary: 'Draft. Replace this with your own write-up before publishing.',
      tags: ['AI', 'Playwright', 'Jira'],
      body:
        '## The problem\n\nWrite what took the most time before the agents existed.\n\n## What I built\n\n- Test design agent\n- Bug reporting agent\n- Triage agent\n\n## What changed\n\nAdd a real before and after number here.',
    },
  ],

  now: [
    'Building AI-assisted test automation with Playwright and LLM agents.',
    'Creating a Udemy course on AI-powered Playwright automation.',
  ],
  education: [
    { degree: 'MBA', school: 'Sikkim Manipal University', year: '2021' },
    { degree: 'Bachelor of Computer Applications', school: 'Sikkim Manipal University', year: '2014' },
  ],

  contact: {
    formEnabled: true,
    formIntro: 'Or send a message here. It comes straight to my inbox.',
  },
};
