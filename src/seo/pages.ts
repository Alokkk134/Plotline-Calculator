// Search/AI-facing content for each calculator page. Used at build time
// (vite.config.ts writes it into each page's HTML so crawlers and AI bots can
// read it without running JavaScript) and at runtime (the shell swaps titles
// and content when the user switches calculators). Plain strings only: this
// file must not import browser-only code.

export const SITE_URL = 'https://tryplotline.xyz';
export const SITE_NAME = 'Plotline';
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
/**
 * When page content last changed (sitemap <lastmod>, guides' dateModified).
 * Bump these only when page text actually changes: a date that changes on every
 * deploy teaches search engines to ignore it. A page's own `updated` wins.
 */
const GUIDES_UPDATED = '2026-11-01';
const HUBS_UPDATED = '2026-11-01';
import { GUIDES, figurePath, type GuideGroup, type GuidePage } from './guides';

export const CREATOR = { name: 'Aalok', email: 'aalok.builds@gmail.com' };

const creatorLd = {
  '@type': 'Person',
  '@id': `${SITE_URL}/#creator`,
  name: CREATOR.name,
  email: `mailto:${CREATOR.email}`,
  description: `Independent developer and the maker of ${SITE_NAME}, a free set of calculators for students.`,
  knowsAbout: ['Graphing calculators', 'Algebra', 'Trigonometry', 'Linear algebra', 'Mathematics education', 'Web development'],
};

export type PageId = 'graphing' | 'scientific' | 'four-function' | 'matrix';

export interface FaqItem {
  q: string;
  /** Plain text answer (also used in FAQPage structured data). */
  a: string;
}

export interface PageSeo {
  id: PageId;
  /** URL path, e.g. "/scientific-calculator". "/" is the graphing calculator. */
  path: string;
  /** Built file name in dist/ (served with clean URLs on Vercel). */
  file: string;
  /** <title>: 50–60 characters, main keyword first. */
  title: string;
  /** Meta description: ~150 characters, says what you can do. */
  description: string;
  h1: string;
  /** One-sentence direct answer (what AI answers and featured snippets quote). */
  lead: string;
  /** Breadcrumb / short label. */
  label: string;
  /** Feature list for structured data and the page. */
  features: string[];
  /** How-to steps. */
  steps: string[];
  /** Example inputs shown on the page. */
  examples: { input: string; result: string }[];
  faq: FaqItem[];
  /** Date this page changed, when it differs from the other hubs. */
  updated?: string;
}

const COMMON_FAQ: FaqItem[] = [
  {
    q: 'Is Plotline free?',
    a: 
      'Yes. Every calculator is free, with no account, no sign-up and no ads inside the calculators. There is no paid tier and nothing kept behind a login: the graphing, scientific, four-function and matrix tools are all open to everyone.',
  },
  {
    q: 'Does Plotline work offline and on phones?',
    a: 'Yes. Plotline works in any modern browser on phones, tablets, Chromebooks and computers. You can install it as an app from Chrome or Safari, and after the first visit it also works offline.',
  },
  {
    q: 'Who made Plotline?',
    a: 
      'Plotline is an independent project made by Aalok, and is not affiliated with Desmos, Texas Instruments or Casio. For questions, ideas, bug reports or feedback, email aalok.builds@gmail.com.',
  },
];

export const PAGES: PageSeo[] = [
  {
    id: 'graphing',
    path: '/',
    file: 'index.html',
    // Keyword first like every other page; a search for "plotline" still
    // matches through the brand at the end and the WebSite structured data.
    title: 'Free Online Graphing Calculator | Plotline',
    updated: '2026-11-11',
    description:
      'Graph functions, circles, inequalities, polar and parametric equations instantly. Free online graphing calculator with sliders and examples. No sign-up.',
    h1: 'Free Online Graphing Calculator',
    lead:
      'Plotline is a free online graphing calculator: type an equation such as y = x² or x² + y² = 25 and it is plotted instantly, with sliders, zoom and one-click examples.',
    label: 'Graphing Calculator',
    features: [
      'Plot y = f(x), x = f(y), circles and any implicit equation',
      'Shade inequalities such as y > x² − 3',
      'Polar (r = 3 sin 4θ) and parametric curves',
      'Sliders for variables, with play/animate',
      'Trace points, pan and zoom, reset view',
      'Save graphs, share them with a link, or download one as an image',
    ],
    steps: [
      'Type an equation in the first row, for example y = 2x + 1. The graph appears as you type.',
      'Press Enter to add another equation; each one gets its own color.',
      'Use a letter such as a in y = a·x² and tap "add slider" to animate it.',
      'Drag to move the graph, scroll or pinch to zoom, and tap the crosshair to reset the view.',
      'Open the Examples tab on the keypad for ready-made graphs you can edit.',
    ],
    examples: [
      { input: 'y = x² − 4', result: 'a parabola crossing the x-axis at −2 and 2' },
      { input: 'x² + y² = 16', result: 'a circle of radius 4' },
      { input: 'y > x² − 3', result: 'the shaded region above a parabola' },
      { input: 'r = 3 sin(4θ)', result: 'an eight-petal polar rose' },
    ],
    faq: [
      {
        q: 'How do I graph an equation online?',
        a: 'Open Plotline, type the equation (for example y = x^2 or x^2 + y^2 = 25) into the first row, and the graph appears instantly. Press Enter to add more equations.',
      },
      {
        q: 'What kinds of equations can Plotline graph?',
        a: 'Functions like y = sin(x), equations in x and y like circles and ellipses, inequalities with shading, polar equations using θ, parametric curves (x(t), y(t)), points, and your own functions such as f(x) = x^3 − 3x.',
      },
      {
        q: 'Is Plotline a free alternative to Desmos?',
        a: 'Plotline is an independent, free online graphing calculator that covers the everyday features students use: graphing equations, sliders, inequalities, polar graphs, a scientific calculator and a matrix calculator. It is not affiliated with Desmos.',
      },
      {
        q: 'How do I add a slider?',
        a: 'Use a letter that is not x or y in an equation, such as y = a·x^2. Plotline offers an "add slider" button for a; drag it or press play to animate the graph.',
      },
      ...COMMON_FAQ,
    ],
  },
  {
    id: 'scientific',
    path: '/scientific-calculator',
    file: 'scientific-calculator.html',
    title: 'Free Scientific Calculator Online – Sin, Log, Roots | Plotline',
    description:
      'Free online scientific calculator with sin, cos, tan, inverse trig, logs, powers, roots, factorials, degrees and radians. Shows answers as you type.',
    h1: 'Free Online Scientific Calculator',
    lead:
      'Plotline’s free scientific calculator handles trigonometry (in degrees or radians), logarithms, powers, roots, fractions and factorials, and shows the answer as you type.',
    label: 'Scientific Calculator',
    features: [
      'sin, cos, tan and their inverses, in degrees or radians',
      'ln, log base 10 and log with any base',
      'Powers, square and cube roots, n-th roots, factorials',
      'Real fractions and exact-looking math input',
      'History of answers and an ans key',
      'One-click examples for beginners',
    ],
    steps: [
      'Type an expression such as sin(30) or 2^10, or tap the keys.',
      'The answer appears live; press = or Enter to keep it in the history.',
      'Tap rad/deg to switch angle units for trigonometry.',
      'Tap 2nd for inverse trig, eˣ and 10ˣ.',
      'Tap ans to reuse the previous answer, or tap a past line to edit it.',
    ],
    examples: [
      { input: 'sin(30°)', result: '0.5' },
      { input: 'log₂(64)', result: '6' },
      { input: '√(3² + 4²)', result: '5' },
      { input: '1000(1 + 0.05)¹⁰', result: '1628.894627' },
    ],
    faq: [
      {
        q: 'How do I switch between degrees and radians?',
        a: 
          'Tap the rad/deg key on the keypad. The key shows the current mode, and every trigonometric answer updates immediately. In degrees sin(30) = 0.5, while in radians the same input gives about −0.988.',
      },
      {
        q: 'How do I calculate a log with a different base?',
        a: 
          'Use the log_b key, then type the base and the number: log_2(64) = 6. Any base works, and the plain log key is base 10 while ln is base e, so log(1000) = 3 and ln(e) = 1.',
      },
      {
        q: 'How do I find inverse sine, cosine or tangent?',
        a: 
          'Tap 2nd and the sin, cos and tan keys become sin⁻¹, cos⁻¹ and tan⁻¹. For example tan⁻¹(1) = 45 in degrees. The answer follows the current angle mode, so check whether the keypad shows deg or rad.',
      },
      ...COMMON_FAQ,
    ],
  },
  {
    id: 'four-function',
    path: '/basic-calculator',
    file: 'basic-calculator.html',
    title: 'Basic Calculator Online – Simple Four-Function Calc | Plotline',
    description:
      'A simple, free online calculator for add, subtract, multiply, divide, percent, square and square root. Big keys, works on phones and offline.',
    h1: 'Simple Online Basic Calculator',
    lead:
      'Plotline’s basic calculator is a free, simple four-function calculator for adding, subtracting, multiplying, dividing, percentages, squares and square roots, with big keys that work well on phones.',
    label: 'Basic Calculator',
    features: [
      'Add, subtract, multiply and divide',
      'Percentages, discounts and splitting bills',
      'Square and square root keys',
      'Brackets and correct order of operations',
      'History of answers and an ans key',
      'Exact decimals: 0.1 + 0.2 shows 0.3',
    ],
    steps: [
      'Tap the number keys or type with your keyboard.',
      'Use + − × ÷ and brackets; × and ÷ are done before + and −.',
      'Use % for percentages, for example 20% × 80 = 16.',
      'Press = to see and keep the answer, then use ans to keep going.',
    ],
    examples: [
      { input: '1250 ÷ 4', result: '312.5' },
      { input: '20% × 80', result: '16' },
      { input: '800 − 800 × 25%', result: '600' },
      { input: '(2 + 3) × 4', result: '20' },
    ],
    faq: [
      {
        q: 'How do I calculate a percentage of a number?',
        a: 
          'Type the percentage, the % key, × and the number: 20% × 80 = 16. The % key divides by 100, so you can also read 20% × 80 as 0.2 × 80 and get the same answer.',
      },
      {
        q: 'How do I work out a discount?',
        a: 
          'Subtract the percentage of the price from the price: for 25% off 800, type 800 − 800 × 25% and the answer is 600. To add a tax or tip instead, use + in place of −.',
      },
      {
        q: 'Does the calculator follow the order of operations?',
        a: 'Yes. Multiplication and division are done before addition and subtraction, and brackets are done first: 2 + 3 × 4 = 14 but (2 + 3) × 4 = 20.',
      },
      ...COMMON_FAQ,
    ],
  },
  {
    id: 'matrix',
    path: '/matrix-calculator',
    file: 'matrix-calculator.html',
    title: 'Matrix Calculator – Determinant, Inverse, RREF | Plotline',
    description:
      'Free matrix calculator: determinant, inverse, multiplication, transpose, RREF, rank, trace and powers, with exact fractions. Solve linear systems.',
    h1: 'Free Online Matrix Calculator',
    lead:
      'Plotline’s free matrix calculator finds determinants, inverses, products, transposes, RREF, rank, trace and powers of matrices up to 10×10, with exact fraction answers.',
    label: 'Matrix Calculator',
    features: [
      'Determinant and inverse with exact fractions',
      'Add, subtract, multiply and scale matrices',
      'Transpose, RREF (row echelon form), rank and trace',
      'Matrix powers, including negative powers',
      'Solve systems of linear equations',
      'Matrices up to 10 × 10; entries can be fractions like 1/3',
    ],
    steps: [
      'Edit matrix A on the left, or tap + New Matrix; set rows and columns with the steppers.',
      'Type an expression such as det(A), A^-1, A*B or rref(A) and press Enter.',
      'Answers keep exact fractions; tap a matrix answer to save it as a new matrix.',
      'Tap ★ Examples for ready-made problems, such as solving equations.',
    ],
    examples: [
      { input: 'det([[4, 7], [2, 6]])', result: '10' },
      { input: '[[4, 7], [2, 6]]⁻¹', result: '[[3/5, −7/10], [−1/5, 2/5]]' },
      { input: 'Solve 2x + y = 5, x + 3y = 10', result: 'x = 1, y = 3' },
      { input: 'rref([[1, 2, 3], [2, 5, 8]])', result: '[[1, 0, −1], [0, 1, 2]]' },
    ],
    faq: [
      {
        q: 'How do I find the inverse of a matrix?',
        a: 'Enter the matrix as A, then type A^-1 or inv(A) and press Enter. The inverse is shown with exact fractions; if the determinant is 0 the matrix has no inverse.',
      },
      {
        q: 'How do I find the determinant of a matrix?',
        a: 
          'Enter a square matrix as A and type det(A). For a 2×2 matrix the determinant is ad − bc, so det([[4, 7], [2, 6]]) = 4·6 − 7·2 = 10. A determinant of 0 means the matrix has no inverse.',
      },
      {
        q: 'How do I solve a system of equations with matrices?',
        a: 'Put the coefficients in A and the right-hand sides in a one-column matrix B, then type inv(A)*B. For 2x + y = 5 and x + 3y = 10 the answer is x = 1, y = 3.',
      },
      {
        q: 'What is RREF?',
        a: 'RREF (reduced row echelon form) is the simplest equivalent form of a matrix using row operations. Type rref(A) to see it; it shows the rank and the solutions of a linear system.',
      },
      ...COMMON_FAQ,
    ],
  },
];


// ---- all pages: calculator hubs + guides --------------------------------------

/** Any page on the site: a calculator hub or a guide/landing page. */
export type SitePage = PageSeo | GuidePage;
export const isGuide = (p: SitePage): p is GuidePage => 'slug' in p;
/** The calculator a page opens. */
export const calcOf = (p: SitePage): PageId => (isGuide(p) ? p.calc : p.id);
export const ALL_PAGES: SitePage[] = [...PAGES, ...GUIDES];

export const pageById = (id: PageId): PageSeo => PAGES.find((p) => p.id === id)!;
export const pageByPath = (path: string): SitePage | undefined => {
  const clean = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  return ALL_PAGES.find((p) => p.path === clean);
};
/** When this page's content last changed. */
export const pageUpdated = (p: SitePage): string => p.updated ?? (isGuide(p) ? GUIDES_UPDATED : HUBS_UPDATED);
export const canonicalUrl = (p: SitePage): string => (p.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${p.path}`);

/** Where each group of guides lives (breadcrumb parent). */
const GROUP_PARENT: Record<GuideGroup, string> = {
  graphs: '/graphs',
  matrix: '/matrix-calculator',
  scientific: '/scientific-calculator',
  basic: '/basic-calculator',
  site: '/',
};

/** Breadcrumb trail from the home page to `p`. */
export function breadcrumbs(p: SitePage): { name: string; url: string }[] {
  const home = { name: SITE_NAME, url: `${SITE_URL}/` };
  if (p.path === '/') return [home];
  const self = { name: p.label, url: canonicalUrl(p) };
  if (!isGuide(p) || p.listGroup) return [home, self];
  const parent = pageByPath(GROUP_PARENT[p.group]);
  return parent && parent.path !== '/' ? [home, { name: parent.label, url: canonicalUrl(parent) }, self] : [home, self];
}

const guidesFor = (calc: PageId): GuidePage[] => GUIDES.filter((g) => g.calc === calc && !g.listGroup && g.group !== 'site');

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const firstSentence = (s: string): string => `${s.split('. ')[0]!.replace(/\.$/, '')}.`;

/** Structured data (JSON-LD) for one page. */
export function jsonLd(p: SitePage): object[] {
  const url = canonicalUrl(p);
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: p.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const crumbs = breadcrumbs(p);
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  };

  if (isGuide(p)) {
    const page: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': p.listGroup ? 'CollectionPage' : p.slug === 'about' ? 'AboutPage' : p.group === 'site' ? 'WebPage' : ['WebPage', 'LearningResource'],
      '@id': `${url}#page`,
      name: p.h1,
      url,
      description: p.description,
      inLanguage: 'en',
      isAccessibleForFree: true,
      image: OG_IMAGE,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
      author: creatorLd,
    };
    if (p.figure) {
      const img = { '@type': 'ImageObject', url: `${SITE_URL}${figurePath(p)}`, caption: p.figure.caption, width: 640, height: 400 };
      page.image = [img, OG_IMAGE];
      page.primaryImageOfPage = img;
    }
    if (p.learnMore) page.citation = p.learnMore.map((l) => ({ '@type': 'CreativeWork', name: l.name, url: l.url }));
    if (p.listGroup) {
      const items = GUIDES.filter((g) => g.group === p.listGroup && !g.listGroup);
      page.mainEntity = {
        '@type': 'ItemList',
        itemListElement: items.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.label, url: canonicalUrl(g) })),
      };
    } else if (p.group === 'site') {
      page.dateModified = pageUpdated(p);
    } else {
      page.learningResourceType = 'Interactive tool';
      page.educationalLevel = 'High school, College';
      page.about = { '@type': 'Thing', name: p.label };
      page.teaches = p.lead;
      page.dateModified = pageUpdated(p);
    }
    return [page, faq, breadcrumbLd];
  }

  const app = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: p.id === 'graphing' ? `${SITE_NAME} Graphing Calculator` : `${SITE_NAME} ${p.label}`,
    url,
    description: p.description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    inLanguage: 'en',
    image: OG_IMAGE,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: p.features,
    creator: creatorLd,
  };
  const out: object[] = [app, faq];
  if (p.path === '/') {
    // Site name + logo: what Google shows above the URL in results.
    out.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: ['Plotline Calculator', 'Try Plotline', 'tryplotline'],
      url: `${SITE_URL}/`,
      description: 'Free online graphing, scientific, basic and matrix calculators.',
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
    });
    out.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/pwa-512x512.png`, width: 512, height: 512 },
      founder: creatorLd,
      email: CREATOR.email,
      contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: CREATOR.email },
    });
  } else {
    out.push(breadcrumbLd);
  }
  return out;
}

/** <head> tags for one page (title, description, canonical, social cards, JSON-LD). */
export function headHtml(p: SitePage): string {
  const url = canonicalUrl(p);
  const ld = jsonLd(p)
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`)
    .join('\n    ');
  return `<title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.description)}" />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="application-name" content="${SITE_NAME}" />
    <meta property="og:type" content="${isGuide(p) ? 'article' : 'website'}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${esc(p.title)}" />
    <meta property="og:description" content="${esc(p.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Plotline: free graphing, scientific and matrix calculator" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(p.title)}" />
    <meta name="twitter:description" content="${esc(p.description)}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />
    ${ld}`;
}

const linkList = (pages: SitePage[]): string =>
  `<ul class="seo-links">${pages
    .map((o) => `<li><a href="${o.path}">${esc(o.label)}</a> – ${esc(firstSentence(o.description))}</li>`)
    .join('')}</ul>`;

const faqHtml = (faq: FaqItem[]): string =>
  faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n    ');

const crumbsHtml = (p: SitePage): string => {
  const c = breadcrumbs(p);
  if (c.length < 2) return '';
  return `<nav class="seo-crumbs" aria-label="Breadcrumb">${c
    .map((x, i) =>
      i === c.length - 1
        ? `<span aria-current="page">${esc(x.name)}</span>`
        : `<a href="${x.url.replace(SITE_URL, '') || '/'}">${esc(x.name)}</a>`,
    )
    .join(' <span aria-hidden="true">›</span> ')}</nav>`;
};

const NOTE = `<p class="seo-note">${SITE_NAME} is an independent project and is not affiliated with Desmos, Texas Instruments or Casio.</p>`;

/**
 * The facts the structured data states, written out for people to read too.
 * Search engines and AI assistants weight what is visible on the page far more
 * than the same values hidden in JSON-LD, so both say the same thing.
 */
function glanceHtml(p: SitePage): string {
  const guide = isGuide(p);
  const kind = guide && p.group === 'site' ? 'Page' : guide ? 'Interactive guide with a calculator' : 'Online calculator';
  const rows: [string, string][] = [
    ['What it is', p.description],
    ['Type', kind],
  ];
  if (!(guide && p.group === 'site')) rows.push(['Level', 'High school and college']);
  rows.push(
    ['Price', 'Free, with no account or sign-up'],
    ['Works offline', 'Yes, after the first visit; installs as an app'],
    ['Made by', `${CREATOR.name} (${CREATOR.email})`],
    ['Last updated', new Date(`${pageUpdated(p)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })],
  );
  return `<section><h2>At a glance</h2><table><tbody>${rows
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('')}</tbody></table></section>`;
}

/** Visible, crawlable article shown below the calculator. */
export function contentHtml(p: SitePage): string {
  if (isGuide(p)) {
    const related = p.related.map((s) => GUIDES.find((g) => g.slug === s)).filter((g): g is GuidePage => !!g);
    const list = p.listGroup ? GUIDES.filter((g) => g.group === p.listGroup && !g.listGroup) : [];
    const facts = p.facts.length
      ? `<section><h2>Key facts</h2><table><tbody>${p.facts
          .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)
          .join('')}</tbody></table></section>`
      : '';
    return `<div class="seo-inner">
  ${crumbsHtml(p)}
  <h1>${esc(p.h1)}</h1>
  <p class="seo-lead">${esc(p.lead)}</p>
  ${
    p.figure
      ? `<figure class="seo-figure"><img src="${figurePath(p)}" alt="${esc(p.figure.alt)}" width="640" height="400" loading="lazy" decoding="async"><figcaption>${esc(p.figure.caption)}</figcaption></figure>`
      : ''
  }
  ${glanceHtml(p)}
  ${list.length ? `<section><h2>All graphs</h2>${linkList(list)}</section>` : ''}
  ${facts}
  ${
    p.table
      ? `<section><h2>${esc(p.table.h2)}</h2><div class="seo-table"><table><thead><tr>${p.table.head
          .map((c) => `<th scope="col">${esc(c)}</th>`)
          .join('')}</tr></thead><tbody>${p.table.rows
          .map((r) => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('')}</tr>`)
          .join('')}</tbody></table></div></section>`
      : ''
  }
  ${p.sections.map((s) => `<section><h2>${esc(s.h2)}</h2>${s.p.map((t) => `<p>${esc(t)}</p>`).join('')}</section>`).join('\n  ')}
  ${
    p.steps.length
      ? `<section><h2>How to use it in Plotline</h2><ol>${p.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>`
      : ''
  }
  <section>
    <h2>Frequently asked questions</h2>
    ${faqHtml(p.faq)}
  </section>
  ${
    p.learnMore
      ? `<section><h2>Learn more</h2><ul>${p.learnMore
          .map((l) => `<li><a href="${l.url}" rel="noopener" target="_blank">${esc(l.name)}</a></li>`)
          .join('')}</ul></section>`
      : ''
  }
  ${related.length ? `<section><h2>Related</h2>${linkList(related)}</section>` : ''}
  <section>
    <h2>Free calculators</h2>
    ${linkList(PAGES)}
  </section>
  ${NOTE}
</div>`;
  }

  const guides = guidesFor(p.id);
  const library = p.id === 'graphing' ? pageByPath('/graphs') : undefined;
  return `<div class="seo-inner">
  ${crumbsHtml(p)}
  <h1>${esc(p.h1)}</h1>
  <p class="seo-lead">${esc(p.lead)}</p>
  ${glanceHtml(p)}
  <section>
    <h2>How to use the ${esc(p.label.toLowerCase())}</h2>
    <ol>${p.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
  </section>
  <section>
    <h2>What you can do</h2>
    <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  </section>
  <section>
    <h2>Examples</h2>
    <table><thead><tr><th>Type this</th><th>You get</th></tr></thead><tbody>${p.examples
      .map((e) => `<tr><td><code>${esc(e.input)}</code></td><td>${esc(e.result)}</td></tr>`)
      .join('')}</tbody></table>
  </section>
  ${
    guides.length
      ? `<section><h2>${p.id === 'graphing' ? 'Popular graphs' : 'Popular tools'}</h2>${linkList(guides)}${
          library ? `<p><a href="${library.path}">Browse the full graph library →</a></p>` : ''
        }</section>`
      : ''
  }
  <section>
    <h2>Frequently asked questions</h2>
    ${faqHtml(p.faq)}
  </section>
  <section>
    <h2>More free calculators</h2>
    ${linkList(PAGES.filter((o) => o.path !== p.path))}
  </section>
  ${NOTE}
</div>`;
}
