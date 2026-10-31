// Long-tail landing pages ("guides"). Each targets one thing students search
// for (e.g. "sine graph", "inverse matrix calculator", "log calculator"), opens
// the matching calculator already loaded with that problem (`preset`), and
// explains it with key facts and FAQs. Plain data only: no browser imports, so
// the build can pre-render every page into static HTML.
import type { FaqItem, PageId } from './pages';

export type GuideGroup = 'graphs' | 'matrix' | 'scientific' | 'basic' | 'site';

export interface GuidePage {
  slug: string;
  /** URL path, e.g. "/graphs/sine". */
  path: string;
  /** Built file in dist/ (served with clean URLs). */
  file: string;
  /** Which calculator opens on this page. */
  calc: PageId;
  group: GuideGroup;
  title: string;
  description: string;
  h1: string;
  /** Direct one-sentence answer (featured snippets / AI answers). */
  lead: string;
  /** Short name for breadcrumbs and link lists. */
  label: string;
  /** "Key facts" table rows. */
  facts: [string, string][];
  /** Explanation sections (plain text paragraphs). */
  sections: { h2: string; p: string[] }[];
  /** How to use it in Plotline. */
  steps: string[];
  faq: FaqItem[];
  /** Slugs of related guides to link to. */
  related: string[];
  /** Calculator state loaded when the page opens (same shape as a saved state). */
  preset?: unknown;
  /** Render a link list of this group (library pages). */
  listGroup?: GuideGroup;
  /** Illustration of the preset graph, rendered at build time (graph guides). */
  figure?: { alt: string; caption: string };
  /** Trusted references for further reading. */
  learnMore?: { name: string; url: string }[];
  /** A table with its own heading (comparison pages). */
  table?: { h2: string; head: string[]; rows: string[][] };
  /** Opens scrolled to the text instead of the calculator (About, Privacy). */
  textPage?: boolean;
  /** Date this page changed, when it differs from the other guides. */
  updated?: string;
}

// ---- preset helpers ---------------------------------------------------------
const graph = (...latex: string[]): object => ({
  version: 1,
  expressions: latex.map((l, i) => ({ id: `p${i + 1}`, latex: l })),
});
const graphIn = (vp: [number, number, number, number], ...latex: string[]): object => ({
  ...graph(...latex),
  viewport: { xmin: vp[0], xmax: vp[1], ymin: vp[2], ymax: vp[3] },
});
const sci = (input: string, angleMode: 'deg' | 'rad' = 'rad'): object => ({ version: 1, angleMode, history: [], input });
const mat = (matrices: Record<string, string[][]>, input: string): object => ({
  version: 1,
  matrices: Object.entries(matrices).map(([name, rows]) => ({ name, rows })),
  history: [{ input }],
});

const FREE: FaqItem = {
  q: 'Is it free?',
  a: 'Yes. Plotline is completely free, needs no sign-up, works on phones and computers, and can be installed as an app that works offline.',
};

const graphSteps = (what: string): string[] => [
  `The graph of ${what} is already loaded above. Edit the equation in the list to change it.`,
  'Drag the graph to move around, scroll or pinch to zoom, and tap the crosshair to reset the view.',
  'Hover over or tap the curve to read the coordinates of any point.',
  'Press Enter to add another equation and compare graphs in different colors.',
];

export const GUIDES: GuidePage[] = [
  // ======================= GRAPHS =======================
  {
    slug: 'graphs', path: '/graphs', file: 'graphs.html', calc: 'graphing', group: 'graphs',
    title: 'Graph Library – Interactive Graphs of Common Functions | Plotline',
    description:
      'Interactive graphs of linear, quadratic, cubic, absolute value, square root, exponential, log, trig and polar functions. Open any graph and edit it.',
    h1: 'Graph Library: Interactive Graphs of Common Functions',
    lead:
      'Pick a function below to open its graph in Plotline’s free graphing calculator, with the key facts (intercepts, asymptotes, period, domain and range) explained.',
    label: 'Graph Library',
    facts: [],
    sections: [
      {
        h2: 'How to use the graph library',
        p: [
          'Every page opens the graphing calculator with the function already plotted, so you can move, zoom and edit it straight away.',
          'Each guide lists the key facts for that family of functions and shows how changing the numbers in the equation transforms the graph.',
        ],
      },
    ],
    steps: [
      'Choose a function from the list below.',
      'The graph opens ready to explore; edit the equation or drag the sliders.',
      'Use Save to keep your graph or Share to send it to a friend.',
    ],
    faq: [
      {
        q: 'Which graphs can I open here?',
        a: 'Linear equations, parabolas, cubic functions, absolute value, square root, reciprocal (1/x), exponential, logarithm, sine, cosine, tangent, circles, inequalities and polar rose curves.',
      },
      FREE,
    ],
    related: [],
    listGroup: 'graphs',
  },
  {
    slug: 'linear-equation', path: '/graphs/linear-equation', file: 'graphs/linear-equation.html', calc: 'graphing', group: 'graphs',
    title: 'Linear Equation Grapher – Graph y = mx + b Online | Plotline',
    description:
      'Graph linear equations y = mx + b online. Drag sliders for the slope m and y-intercept b and see how the line changes. Free, no sign-up.',
    h1: 'Graph a Linear Equation (y = mx + b)',
    lead:
      'A linear equation y = mx + b graphs as a straight line with slope m (rise over run) that crosses the y-axis at b; drag the sliders for m and b to see it change.',
    label: 'Linear equation',
    facts: [
      ['Slope-intercept form', 'y = mx + b'],
      ['Slope', 'm = rise ÷ run = (y₂ − y₁) ÷ (x₂ − x₁)'],
      ['y-intercept', '(0, b)'],
      ['x-intercept', '(−b ÷ m, 0) when m ≠ 0'],
      ['Domain and range', 'All real numbers (range is just b when m = 0)'],
    ],
    sections: [
      {
        h2: 'What the slope and intercept do',
        p: [
          'The slope m says how steep the line is: for every 1 step right, the line goes up m steps. A positive slope rises from left to right, a negative slope falls, and m = 0 gives a horizontal line.',
          'The y-intercept b moves the whole line up or down without changing its steepness.',
        ],
      },
      {
        h2: 'Parallel and perpendicular lines',
        p: [
          'Parallel lines have the same slope, such as y = 2x + 1 and y = 2x − 3. Perpendicular lines have slopes that multiply to −1, such as y = 2x and y = −½x.',
        ],
      },
    ],
    steps: graphSteps('y = mx + b with sliders for m and b'),
    faq: [
      {
        q: 'How do I graph y = 2x + 1?',
        a: 'Type y = 2x + 1 into Plotline. The line crosses the y-axis at 1 and rises 2 units for every 1 unit to the right.',
      },
      {
        q: 'How do I find the slope from two points?',
        a: 'Divide the change in y by the change in x: m = (y₂ − y₁) ÷ (x₂ − x₁). For (1, 3) and (3, 7) the slope is (7 − 3) ÷ (3 − 1) = 2.',
      },
      FREE,
    ],
    related: ['parabola', 'absolute-value', 'inequality'],
    preset: graph('m=2', 'b=1', 'y=mx+b'),
  },
  {
    slug: 'parabola', path: '/graphs/parabola', file: 'graphs/parabola.html', calc: 'graphing', group: 'graphs',
    title: 'Parabola Grapher – Graph Quadratic Functions Online | Plotline',
    description:
      'Graph quadratic functions y = ax² + bx + c online. Find the vertex, roots and axis of symmetry, and drag sliders for a, b and c. Free.',
    h1: 'Graph a Quadratic Function (Parabola)',
    lead:
      'A quadratic y = ax² + bx + c graphs as a U-shaped parabola with its vertex at x = −b ÷ 2a; it opens upward when a > 0 and downward when a < 0.',
    label: 'Parabola (quadratic)',
    facts: [
      ['Standard form', 'y = ax² + bx + c'],
      ['Vertex', 'x = −b ÷ (2a), then substitute to find y'],
      ['Axis of symmetry', 'The vertical line x = −b ÷ (2a)'],
      ['Roots (x-intercepts)', 'x = (−b ± √(b² − 4ac)) ÷ (2a)'],
      ['y-intercept', '(0, c)'],
      ['Example: y = x² − 4', 'Vertex (0, −4), roots x = −2 and x = 2'],
    ],
    sections: [
      {
        h2: 'Reading the discriminant',
        p: [
          'The discriminant b² − 4ac tells you how many times the parabola crosses the x-axis: two real roots if it is positive, one (the vertex touches the axis) if it is zero, and none if it is negative.',
        ],
      },
      {
        h2: 'Vertex form',
        p: [
          'Written as y = a(x − h)² + k, the vertex is simply (h, k). Changing h slides the parabola left and right, k moves it up and down, and a makes it narrower or wider.',
        ],
      },
    ],
    steps: graphSteps('y = ax² + bx + c with sliders for a, b and c'),
    faq: [
      {
        q: 'How do I find the vertex of a parabola?',
        a: 'For y = ax² + bx + c, the vertex is at x = −b ÷ (2a). Substitute that x back into the equation to get y. For y = x² − 6x + 5, x = 3 and y = −4, so the vertex is (3, −4).',
      },
      {
        q: 'How do I graph y = x²?',
        a: 'Type y = x^2 into Plotline. It is a parabola with its vertex at the origin, passing through (1, 1), (2, 4) and (−2, 4).',
      },
      FREE,
    ],
    related: ['linear-equation', 'cubic-function', 'square-root'],
    preset: graph('a=1', 'b=0', 'c=-4', 'y=ax^2+bx+c'),
  },
  {
    slug: 'cubic-function', path: '/graphs/cubic-function', file: 'graphs/cubic-function.html', calc: 'graphing', group: 'graphs',
    title: 'Cubic Function Grapher – Graph y = x³ Online | Plotline',
    description:
      'Graph cubic functions online and find their roots, turning points and inflection point. Example: y = x³ − 3x. Free graphing calculator.',
    h1: 'Graph a Cubic Function',
    lead:
      'A cubic function such as y = x³ − 3x has an S-shaped graph with up to three roots and up to two turning points; for y = x³ − 3x they are at (−1, 2) and (1, −2).',
    label: 'Cubic function',
    facts: [
      ['General form', 'y = ax³ + bx² + cx + d'],
      ['Roots', 'Up to 3 real roots (at least 1)'],
      ['Turning points', 'Up to 2, where the slope 3ax² + 2bx + c = 0'],
      ['Example: y = x³ − 3x', 'Roots 0 and ±√3 ≈ ±1.732; local max (−1, 2); local min (1, −2)'],
      ['End behavior (a > 0)', 'Falls to −∞ on the left, rises to +∞ on the right'],
    ],
    sections: [
      {
        h2: 'Shape of a cubic',
        p: [
          'y = x³ always increases and flattens out at the origin, its inflection point. Adding an x term, as in y = x³ − 3x, creates a hill and a valley before the curve continues upward.',
          'A negative leading coefficient flips the graph: it rises on the left and falls on the right.',
        ],
      },
    ],
    steps: graphSteps('y = x³ − 3x together with y = x³'),
    faq: [
      {
        q: 'How many roots can a cubic have?',
        a: 'A cubic always has at least one real root and at most three. y = x³ − 3x has three: x = −√3, 0 and √3.',
      },
      FREE,
    ],
    related: ['parabola', 'linear-equation', 'reciprocal-function'],
    preset: graph('y=x^3-3x', 'y=x^3'),
  },
  {
    slug: 'absolute-value', path: '/graphs/absolute-value', file: 'graphs/absolute-value.html', calc: 'graphing', group: 'graphs',
    title: 'Absolute Value Graph – Graph y = |x| Online | Plotline',
    description:
      'Graph absolute value functions online. See the V-shape of y = |x| and move the vertex with sliders in y = |x − h| + k. Free graphing calculator.',
    h1: 'Graph an Absolute Value Function',
    lead:
      'The graph of y = |x| is a V-shape with its vertex at the origin; y = |x − h| + k is the same V moved so its vertex is at (h, k).',
    label: 'Absolute value',
    facts: [
      ['Parent function', 'y = |x|'],
      ['Vertex of y = a|x − h| + k', '(h, k)'],
      ['Slopes of the two sides', '+a on the right, −a on the left'],
      ['Domain', 'All real numbers'],
      ['Range of y = |x|', 'y ≥ 0'],
    ],
    sections: [
      {
        h2: 'Why the graph is a V',
        p: [
          '|x| leaves positive numbers unchanged and turns negative numbers positive, so the left half of the line y = x is reflected above the x-axis.',
        ],
      },
    ],
    steps: graphSteps('y = |x| and y = |x − h| + k with sliders for h and k'),
    faq: [
      {
        q: 'How do I type absolute value?',
        a: 'Type the vertical bar key | around the expression, for example y = |x − 2|, or use the |a| key on Plotline’s keypad.',
      },
      FREE,
    ],
    related: ['linear-equation', 'parabola', 'inequality'],
    preset: graph('y=\\left|x\\right|', 'h=2', 'k=1', 'y=\\left|x-h\\right|+k'),
  },
  {
    slug: 'square-root', path: '/graphs/square-root', file: 'graphs/square-root.html', calc: 'graphing', group: 'graphs',
    title: 'Square Root Function Graph – Graph y = √x | Plotline',
    description:
      'Graph y = √x online and learn its domain, range and key points (0,0), (1,1), (4,2), (9,3). Compare it with y = x². Free graphing calculator.',
    h1: 'Graph the Square Root Function',
    lead:
      'The graph of y = √x starts at the origin and curves gently upward through (1, 1), (4, 2) and (9, 3); it only exists for x ≥ 0.',
    label: 'Square root function',
    facts: [
      ['Domain', 'x ≥ 0'],
      ['Range', 'y ≥ 0'],
      ['Key points', '(0, 0), (1, 1), (4, 2), (9, 3)'],
      ['Inverse of', 'y = x² for x ≥ 0 (mirror image in the line y = x)'],
    ],
    sections: [
      {
        h2: 'Shifting the square root graph',
        p: [
          'y = √(x − h) + k starts at the point (h, k) instead of the origin. A minus sign outside, y = −√x, flips the curve below the x-axis.',
        ],
      },
    ],
    steps: graphSteps('y = √x together with y = x² for comparison'),
    faq: [
      {
        q: 'Why does y = √x stop at x = 0?',
        a: 'The square root of a negative number is not a real number, so the graph has no points for x < 0.',
      },
      FREE,
    ],
    related: ['parabola', 'logarithm', 'reciprocal-function'],
    preset: graphIn([-3, 12, -2, 6], 'y=\\sqrt{x}', 'y=x^2'),
  },
  {
    slug: 'reciprocal-function', path: '/graphs/reciprocal-function', file: 'graphs/reciprocal-function.html', calc: 'graphing', group: 'graphs',
    title: 'Graph of 1/x – Reciprocal Function and Asymptotes | Plotline',
    description:
      'Graph y = 1/x online and see its two branches and asymptotes at x = 0 and y = 0. Learn the domain, range and transformations. Free.',
    h1: 'Graph of y = 1/x (Reciprocal Function)',
    lead:
      'The graph of y = 1/x is a hyperbola with two branches, in the first and third quadrants, that approach the asymptotes x = 0 and y = 0 but never touch them.',
    label: 'Reciprocal function (1/x)',
    facts: [
      ['Vertical asymptote', 'x = 0'],
      ['Horizontal asymptote', 'y = 0'],
      ['Domain', 'All real numbers except 0'],
      ['Range', 'All real numbers except 0'],
      ['Symmetry', 'Odd function: rotational symmetry about the origin'],
    ],
    sections: [
      {
        h2: 'Transformations',
        p: [
          'y = a ÷ (x − h) + k moves the asymptotes to x = h and y = k. A negative a flips the branches into the second and fourth quadrants.',
        ],
      },
    ],
    steps: graphSteps('y = 1/x'),
    faq: [
      {
        q: 'Why is there a gap at x = 0?',
        a: 'Division by zero is undefined, so y = 1/x has no value at x = 0. As x gets close to 0 the graph shoots up or down toward the asymptote.',
      },
      FREE,
    ],
    related: ['exponential-function', 'logarithm', 'cubic-function'],
    preset: graph('y=\\frac{1}{x}'),
  },
  {
    slug: 'exponential-function', path: '/graphs/exponential-function', file: 'graphs/exponential-function.html', calc: 'graphing', group: 'graphs',
    title: 'Exponential Function Grapher – Graph y = 2ˣ and eˣ | Plotline',
    description:
      'Graph exponential functions like y = 2ˣ and y = eˣ online. See the y-intercept (0, 1), the asymptote y = 0, growth and decay. Free.',
    h1: 'Graph an Exponential Function',
    lead:
      'An exponential function y = bˣ (b > 1) passes through (0, 1), rises faster and faster to the right, and approaches the horizontal asymptote y = 0 on the left.',
    label: 'Exponential function',
    facts: [
      ['y-intercept', '(0, 1) for every base b'],
      ['Horizontal asymptote', 'y = 0'],
      ['Growth vs decay', 'Growth if b > 1; decay if 0 < b < 1'],
      ['Domain / range', 'All real numbers / y > 0'],
      ['Example: y = 2ˣ', 'Passes (−1, 0.5), (0, 1), (1, 2), (3, 8)'],
    ],
    sections: [
      {
        h2: 'The number e',
        p: [
          'e ≈ 2.718 is the natural base. y = eˣ is the only exponential whose slope at every point equals its own height, which is why it appears in growth, interest and calculus.',
        ],
      },
    ],
    steps: graphSteps('y = 2ˣ and y = eˣ'),
    faq: [
      {
        q: 'What is the inverse of an exponential function?',
        a: 'The logarithm. y = log_b(x) is the mirror image of y = bˣ in the line y = x; for example ln(x) is the inverse of eˣ.',
      },
      FREE,
    ],
    related: ['logarithm', 'reciprocal-function', 'parabola'],
    preset: graphIn([-6, 6, -2, 10], 'y=2^x', 'y=e^{x}'),
  },
  {
    slug: 'logarithm', path: '/graphs/logarithm', file: 'graphs/logarithm.html', calc: 'graphing', group: 'graphs',
    title: 'Logarithm Graph – Graph ln(x) and log(x) Online | Plotline',
    description:
      'Graph y = ln(x) and y = log(x) online. See the x-intercept (1, 0), the vertical asymptote x = 0 and the domain x > 0. Free graphing calculator.',
    h1: 'Graph a Logarithmic Function',
    lead:
      'The graph of y = log_b(x) crosses the x-axis at (1, 0), rises slowly to the right, and has a vertical asymptote at x = 0, because logarithms are only defined for x > 0.',
    label: 'Logarithm',
    facts: [
      ['x-intercept', '(1, 0) for every base'],
      ['Vertical asymptote', 'x = 0'],
      ['Domain / range', 'x > 0 / all real numbers'],
      ['Key points', 'ln: (1, 0) and (e, 1); log₁₀: (1, 0) and (10, 1)'],
      ['Inverse of', 'The exponential y = bˣ'],
    ],
    sections: [
      {
        h2: 'ln versus log',
        p: [
          'ln(x) is the natural logarithm, base e ≈ 2.718. log(x) usually means base 10. Any base can be written with either: log_b(x) = ln(x) ÷ ln(b).',
        ],
      },
    ],
    steps: graphSteps('y = ln(x) and y = log(x)'),
    faq: [
      {
        q: 'Why is log(0) undefined?',
        a: 'No power of a positive base equals 0, so log(0) has no value. The graph approaches the asymptote x = 0 but never reaches it.',
      },
      FREE,
    ],
    related: ['exponential-function', 'square-root', 'log-calculator'],
    preset: graphIn([-1, 12, -4, 4], 'y=\\ln\\left(x\\right)', 'y=\\log\\left(x\\right)'),
  },
  {
    slug: 'sine', path: '/graphs/sine', file: 'graphs/sine.html', calc: 'graphing', group: 'graphs',
    title: 'Sine Graph – Graph y = sin(x) Online with Sliders | Plotline',
    description:
      'Graph y = sin(x) online. Learn the period 2π, amplitude and phase shift, and drag sliders in y = a·sin(bx) to see them change. Free.',
    h1: 'Graph of y = sin(x)',
    lead:
      'The sine graph is a smooth wave that repeats every 2π (period), stays between −1 and 1 (amplitude 1), and crosses zero at every multiple of π.',
    label: 'Sine graph',
    facts: [
      ['Period', '2π ≈ 6.283 (360°)'],
      ['Amplitude', '1'],
      ['Range', '−1 ≤ y ≤ 1'],
      ['Zeros', 'x = 0, ±π, ±2π, …'],
      ['Maximum', '1 at x = π/2 + 2πn'],
      ['y = A·sin(Bx + C) + D', 'Amplitude |A|, period 2π ÷ |B|, vertical shift D'],
    ],
    sections: [
      {
        h2: 'Amplitude and period',
        p: [
          'In y = a·sin(bx), a stretches the wave vertically (a = 3 swings between −3 and 3) and b squeezes it horizontally, so the period becomes 2π ÷ b. Drag the sliders above to see both effects.',
        ],
      },
    ],
    steps: graphSteps('y = a·sin(bx) with sliders for a and b'),
    faq: [
      {
        q: 'What is the period of sin(2x)?',
        a: 'The period is 2π ÷ 2 = π, so the wave repeats twice as often as sin(x).',
      },
      {
        q: 'Does the calculator use degrees or radians?',
        a: 'The graphing calculator uses radians for the x-axis, so one full sine wave spans 0 to 2π ≈ 6.28.',
      },
      FREE,
    ],
    related: ['cosine', 'tangent', 'polar-rose'],
    preset: graphIn([-7, 7, -4, 4], 'a=1', 'b=1', 'y=a\\sin\\left(bx\\right)'),
  },
  {
    slug: 'cosine', path: '/graphs/cosine', file: 'graphs/cosine.html', calc: 'graphing', group: 'graphs',
    title: 'Cosine Graph – Graph y = cos(x) Online | Plotline',
    description:
      'Graph y = cos(x) online and compare it with sin(x). Period 2π, amplitude 1, maximum at x = 0, zeros at π/2 + πn. Free graphing calculator.',
    h1: 'Graph of y = cos(x)',
    lead:
      'The cosine graph is the sine wave shifted left by π/2: it starts at its maximum (0, 1), repeats every 2π, and crosses zero at π/2, 3π/2 and so on.',
    label: 'Cosine graph',
    facts: [
      ['Period', '2π (360°)'],
      ['Amplitude', '1'],
      ['Starts at', 'Its maximum, (0, 1)'],
      ['Zeros', 'x = π/2 + πn'],
      ['Relation to sine', 'cos(x) = sin(x + π/2)'],
      ['Symmetry', 'Even function: mirror image in the y-axis'],
    ],
    sections: [
      {
        h2: 'Sine and cosine together',
        p: [
          'Both waves are loaded above so you can see that cosine reaches each peak a quarter of a period (π/2) before sine does.',
        ],
      },
    ],
    steps: graphSteps('y = cos(x) together with y = sin(x)'),
    faq: [
      {
        q: 'Is cosine an even or odd function?',
        a: 'Even: cos(−x) = cos(x), so the graph is symmetric about the y-axis. Sine is odd.',
      },
      FREE,
    ],
    related: ['sine', 'tangent', 'trig-calculator'],
    preset: graphIn([-7, 7, -3, 3], 'y=\\cos\\left(x\\right)', 'y=\\sin\\left(x\\right)'),
  },
  {
    slug: 'tangent', path: '/graphs/tangent', file: 'graphs/tangent.html', calc: 'graphing', group: 'graphs',
    title: 'Tangent Graph – Graph y = tan(x) and Its Asymptotes | Plotline',
    description:
      'Graph y = tan(x) online. Period π, zeros at πn and vertical asymptotes at π/2 + πn. See every branch of the tangent graph. Free.',
    h1: 'Graph of y = tan(x)',
    lead:
      'The tangent graph repeats every π, passes through the origin, and has vertical asymptotes at x = π/2 + πn where cos(x) = 0 and tan(x) is undefined.',
    label: 'Tangent graph',
    facts: [
      ['Period', 'π (180°)'],
      ['Zeros', 'x = πn'],
      ['Vertical asymptotes', 'x = π/2 + πn'],
      ['Range', 'All real numbers'],
      ['Definition', 'tan(x) = sin(x) ÷ cos(x)'],
    ],
    sections: [
      {
        h2: 'Why tangent has asymptotes',
        p: [
          'tan(x) = sin(x) ÷ cos(x), so wherever cos(x) = 0 the value blows up to +∞ or −∞. Plotline breaks the curve at each asymptote instead of drawing false vertical lines.',
        ],
      },
    ],
    steps: graphSteps('y = tan(x)'),
    faq: [
      {
        q: 'What is the period of tan(x)?',
        a: 'π (180°), half the period of sine and cosine.',
      },
      FREE,
    ],
    related: ['sine', 'cosine', 'reciprocal-function'],
    preset: graphIn([-7, 7, -6, 6], 'y=\\tan\\left(x\\right)'),
  },
  {
    slug: 'circle', path: '/graphs/circle', file: 'graphs/circle.html', calc: 'graphing', group: 'graphs',
    title: 'Circle Grapher – Graph x² + y² = r² Online | Plotline',
    description:
      'Graph circles online from their equation. x² + y² = r² is centered at the origin; (x − h)² + (y − k)² = r² is centered at (h, k). Free.',
    h1: 'Graph a Circle from Its Equation',
    lead:
      'The equation (x − h)² + (y − k)² = r² graphs a circle with center (h, k) and radius r; x² + y² = 16 is a circle of radius 4 centered at the origin.',
    label: 'Circle',
    facts: [
      ['Center at origin', 'x² + y² = r²'],
      ['General center', '(x − h)² + (y − k)² = r², center (h, k)'],
      ['Radius', 'r = √(right-hand side)'],
      ['Example', '(x − 2)² + (y − 1)² = 4: center (2, 1), radius 2'],
    ],
    sections: [
      {
        h2: 'Graphing equations that are not functions',
        p: [
          'A circle fails the vertical line test, so it cannot be written as y = f(x). Plotline graphs any equation in x and y directly, so you can type the circle exactly as it is written.',
        ],
      },
    ],
    steps: graphSteps('x² + y² = 16 and (x − 2)² + (y − 1)² = 4'),
    faq: [
      {
        q: 'How do I find the radius from the equation?',
        a: 'Take the square root of the number on the right. For x² + y² = 25 the radius is √25 = 5.',
      },
      FREE,
    ],
    related: ['parabola', 'inequality', 'polar-rose'],
    preset: graph('x^2+y^2=16', '\\left(x-2\\right)^2+\\left(y-1\\right)^2=4'),
  },
  {
    slug: 'inequality', path: '/graphs/inequality', file: 'graphs/inequality.html', calc: 'graphing', group: 'graphs',
    title: 'Inequality Grapher – Graph and Shade Inequalities | Plotline',
    description:
      'Graph inequalities online with shaded regions. Dashed boundary for < and >, solid for ≤ and ≥. See where systems of inequalities overlap. Free.',
    h1: 'Graph Inequalities with Shading',
    lead:
      'To graph an inequality, draw its boundary curve (dashed for < or >, solid for ≤ or ≥) and shade the side where the inequality is true; Plotline does both automatically.',
    label: 'Inequality',
    facts: [
      ['y > f(x)', 'Shade above the curve, dashed boundary'],
      ['y ≥ f(x)', 'Shade above the curve, solid boundary'],
      ['y < f(x)', 'Shade below the curve, dashed boundary'],
      ['System of inequalities', 'The solution is where the shaded regions overlap'],
    ],
    sections: [
      {
        h2: 'Checking a point',
        p: [
          'To check which side to shade, substitute a test point such as (0, 0). For y > x² − 3, 0 > −3 is true, so the region containing the origin is shaded.',
        ],
      },
    ],
    steps: graphSteps('y > x² − 3 and y < x + 3, a system of two inequalities'),
    faq: [
      {
        q: 'How do I type ≥ or ≤?',
        a: 'Type >= or <=, or use the ≥ and ≤ keys on the keypad.',
      },
      FREE,
    ],
    related: ['linear-equation', 'parabola', 'circle'],
    preset: graph('y>x^2-3', 'y<x+3'),
  },
  {
    slug: 'polar-rose', path: '/graphs/polar-rose', file: 'graphs/polar-rose.html', calc: 'graphing', group: 'graphs',
    title: 'Polar Graphing Calculator – Graph r = sin(nθ) Roses | Plotline',
    description:
      'Graph polar equations online, like the rose curve r = 3 sin(4θ). Learn how many petals a rose has. Free polar graphing calculator.',
    h1: 'Polar Graphs: Rose Curves r = a·sin(nθ)',
    lead:
      'A rose curve r = a·sin(nθ) has n petals when n is odd and 2n petals when n is even, each of length a; r = 3 sin(4θ) has 8 petals of length 3.',
    label: 'Polar rose',
    facts: [
      ['Petals (n odd)', 'n'],
      ['Petals (n even)', '2n'],
      ['Petal length', '|a|'],
      ['Polar to Cartesian', 'x = r·cos(θ), y = r·sin(θ)'],
    ],
    sections: [
      {
        h2: 'Typing polar equations',
        p: [
          'Start the equation with r = and use θ (type "theta" or use the θ key). Plotline sweeps θ from 0 to 2π to draw the whole curve.',
        ],
      },
    ],
    steps: graphSteps('r = 3 sin(4θ)'),
    faq: [
      {
        q: 'How many petals does r = 2 sin(3θ) have?',
        a: '3 petals, because n = 3 is odd. Each petal has length 2.',
      },
      FREE,
    ],
    related: ['sine', 'circle', 'cosine'],
    preset: graph('r=3\\sin\\left(4\\theta\\right)'),
  },

  // ======================= MATRIX =======================
  {
    slug: 'determinant-calculator', path: '/determinant-calculator', file: 'determinant-calculator.html', calc: 'matrix', group: 'matrix',
    title: 'Determinant Calculator – 2×2, 3×3 and Larger | Plotline',
    description:
      'Free determinant calculator for 2×2, 3×3 and larger matrices up to 10×10, with exact fraction answers. Learn the ad − bc formula.',
    h1: 'Determinant Calculator',
    lead:
      'The determinant of a 2×2 matrix [[a, b], [c, d]] is ad − bc; for example det([[4, 7], [2, 6]]) = 4·6 − 7·2 = 10. Enter any square matrix up to 10×10 below.',
    label: 'Determinant calculator',
    facts: [
      ['2×2 formula', 'det([[a, b], [c, d]]) = ad − bc'],
      ['3×3 and larger', 'Cofactor expansion or row reduction'],
      ['det = 0', 'The matrix is singular (no inverse)'],
      ['Product rule', 'det(AB) = det(A)·det(B)'],
      ['Transpose', 'det(Aᵀ) = det(A)'],
    ],
    sections: [
      {
        h2: 'What the determinant means',
        p: [
          'Geometrically, the determinant is the factor by which the matrix scales area (2×2) or volume (3×3). A negative determinant means the orientation is flipped, and zero means space is flattened, which is why such a matrix cannot be inverted.',
        ],
      },
    ],
    steps: [
      'Matrix A is already filled in with an example and det(A) is calculated.',
      'Edit the cells (fractions like 1/3 are fine) or change the size with the rows and cols steppers.',
      'Type det(A) and press Enter for any other matrix.',
    ],
    faq: [
      {
        q: 'How do I find the determinant of a 3×3 matrix?',
        a: 'Set matrix A to 3 rows and 3 columns, type the entries, then enter det(A). By hand, expand along the first row: a(ei − fh) − b(di − fg) + c(dh − eg).',
      },
      FREE,
    ],
    related: ['inverse-matrix-calculator', 'rref-calculator', 'system-of-equations-solver'],
    preset: mat({ A: [['4', '7'], ['2', '6']] }, 'det(A)'),
  },
  {
    slug: 'inverse-matrix-calculator', path: '/inverse-matrix-calculator', file: 'inverse-matrix-calculator.html', calc: 'matrix', group: 'matrix',
    title: 'Inverse Matrix Calculator – Exact Fractions | Plotline',
    description:
      'Find the inverse of a 2×2, 3×3 or larger matrix online with exact fraction answers. Shows when a matrix has no inverse. Free, no sign-up.',
    h1: 'Inverse Matrix Calculator',
    lead:
      'A square matrix has an inverse only when its determinant is not zero; for a 2×2 matrix [[a, b], [c, d]] the inverse is 1/(ad − bc) · [[d, −b], [−c, a]].',
    label: 'Inverse matrix calculator',
    facts: [
      ['2×2 inverse', '(1 ÷ (ad − bc)) · [[d, −b], [−c, a]]'],
      ['Exists when', 'det(A) ≠ 0'],
      ['Check', 'A · A⁻¹ = I (identity matrix)'],
      ['Example', '[[4, 7], [2, 6]]⁻¹ = [[3/5, −7/10], [−1/5, 2/5]]'],
      ['Larger matrices', 'Gauss–Jordan: row-reduce [A | I] to [I | A⁻¹]'],
    ],
    sections: [
      {
        h2: 'Why answers are fractions',
        p: [
          'Inverses usually involve dividing by the determinant, so Plotline keeps exact fractions such as 3/5 instead of rounded decimals. That makes it easy to check homework answers.',
        ],
      },
    ],
    steps: [
      'Matrix A is filled in with an example and A⁻¹ is calculated.',
      'Change the entries or the size; type A^-1 or inv(A) and press Enter.',
      'Tap a result matrix to save it as a new matrix and keep working with it.',
    ],
    faq: [
      {
        q: 'Why does my matrix have no inverse?',
        a: 'Its determinant is 0 (the matrix is singular). This happens when one row is a multiple or combination of the others.',
      },
      FREE,
    ],
    related: ['determinant-calculator', 'system-of-equations-solver', 'matrix-multiplication-calculator'],
    preset: mat({ A: [['4', '7'], ['2', '6']] }, 'A^-1'),
  },
  {
    slug: 'rref-calculator', path: '/rref-calculator', file: 'rref-calculator.html', calc: 'matrix', group: 'matrix',
    title: 'RREF Calculator – Reduced Row Echelon Form | Plotline',
    description:
      'Free RREF calculator: reduce any matrix to reduced row echelon form with exact fractions. Find rank and solve linear systems. No sign-up.',
    h1: 'RREF Calculator (Reduced Row Echelon Form)',
    lead:
      'A matrix is in reduced row echelon form when every nonzero row starts with a leading 1, each leading 1 is the only nonzero entry in its column, and leading 1s move right as you go down.',
    label: 'RREF calculator',
    facts: [
      ['Leading entries', 'Every nonzero row starts with a 1'],
      ['Pivot columns', 'All other entries are 0'],
      ['Order', 'Each leading 1 is to the right of the one above; zero rows at the bottom'],
      ['Rank', 'Number of nonzero rows in the RREF'],
      ['Example', 'rref([[1, 2, 3], [2, 5, 8]]) = [[1, 0, −1], [0, 1, 2]]'],
    ],
    sections: [
      {
        h2: 'Solving systems with RREF',
        p: [
          'Write a system as an augmented matrix, with the coefficients followed by the constants, and reduce it. In the example, [[1, 2, 3], [2, 5, 8]] stands for x + 2y = 3 and 2x + 5y = 8, and the RREF reads x = −1, y = 2.',
        ],
      },
    ],
    steps: [
      'Matrix A is filled in with an example and rref(A) is calculated.',
      'Enter your own matrix (augmented matrices are fine) and type rref(A).',
      'Use rank(A) to count independent rows.',
    ],
    faq: [
      {
        q: 'What is the difference between REF and RREF?',
        a: 'Row echelon form (REF) only needs zeros below each pivot. Reduced row echelon form also needs zeros above each pivot, and every pivot equal to 1. RREF is unique for each matrix.',
      },
      FREE,
    ],
    related: ['system-of-equations-solver', 'determinant-calculator', 'inverse-matrix-calculator'],
    preset: mat({ A: [['1', '2', '3'], ['2', '5', '8']] }, 'rref(A)'),
  },
  {
    slug: 'matrix-multiplication-calculator', path: '/matrix-multiplication-calculator', file: 'matrix-multiplication-calculator.html', calc: 'matrix', group: 'matrix',
    title: 'Matrix Multiplication Calculator – Multiply Matrices | Plotline',
    description:
      'Multiply matrices online and see the row-times-column rule. Works for any sizes that match (m×n times n×p). Exact fractions. Free.',
    h1: 'Matrix Multiplication Calculator',
    lead:
      'To multiply matrices, each entry of the product is a row of the first matrix times a column of the second; an m×n matrix times an n×p matrix gives an m×p matrix.',
    label: 'Matrix multiplication',
    facts: [
      ['Size rule', '(m×n)·(n×p) = m×p; inner sizes must match'],
      ['Entry (i, j)', 'Row i of A · column j of B'],
      ['Order matters', 'AB is usually not equal to BA'],
      ['Example', '[[1, 2], [3, 4]]·[[5, 6], [7, 8]] = [[19, 22], [43, 50]]'],
    ],
    sections: [
      {
        h2: 'Worked example',
        p: [
          'The top-left entry of the example is row 1 of A times column 1 of B: 1·5 + 2·7 = 19. The other entries follow the same pattern.',
        ],
      },
    ],
    steps: [
      'Matrices A and B are filled in and A*B is calculated.',
      'Change the entries or sizes; type A*B (or A B) and press Enter.',
      'Try B*A to see that the order changes the answer.',
    ],
    faq: [
      {
        q: 'Why do I get “dimensions don’t match”?',
        a: 'The number of columns in the first matrix must equal the number of rows in the second. A 2×3 matrix can multiply a 3×2 matrix, but not a 2×2.',
      },
      FREE,
    ],
    related: ['inverse-matrix-calculator', 'determinant-calculator', 'rref-calculator'],
    preset: mat({ A: [['1', '2'], ['3', '4']], B: [['5', '6'], ['7', '8']] }, 'A*B'),
  },
  {
    slug: 'system-of-equations-solver', path: '/system-of-equations-solver', file: 'system-of-equations-solver.html', calc: 'matrix', group: 'matrix',
    title: 'System of Equations Solver – Matrix Method | Plotline',
    description:
      'Solve systems of linear equations with matrices: write Ax = b and compute x = A⁻¹b. Exact fraction answers, 2 to 10 unknowns. Free.',
    h1: 'Solve a System of Linear Equations with Matrices',
    lead:
      'Write the system as A·x = b, where A holds the coefficients and b the constants; if det(A) ≠ 0 the unique solution is x = A⁻¹·b.',
    label: 'System of equations solver',
    facts: [
      ['Matrix form', 'A·x = b'],
      ['Solution', 'x = A⁻¹·b when det(A) ≠ 0'],
      ['Example', '2x + y = 5 and x + 3y = 10 give x = 1, y = 3'],
      ['No unique solution', 'If det(A) = 0, use rref on the augmented matrix [A | b]'],
    ],
    sections: [
      {
        h2: 'Setting up the matrices',
        p: [
          'For 2x + y = 5 and x + 3y = 10, A = [[2, 1], [1, 3]] holds the coefficients and B = [[5], [10]] the right-hand sides. inv(A)*B returns [[1], [3]], so x = 1 and y = 3.',
        ],
      },
    ],
    steps: [
      'A (coefficients) and B (constants, one column) are filled in, and inv(A)*B is solved.',
      'Change the numbers for your own system; add rows and columns for more unknowns.',
      'If the answer says the matrix is singular, try rref on the augmented matrix instead.',
    ],
    faq: [
      {
        q: 'Can it solve 3 equations with 3 unknowns?',
        a: 'Yes. Make A 3×3 and B 3×1, then enter inv(A)*B. Plotline handles up to 10 unknowns with exact fractions.',
      },
      FREE,
    ],
    related: ['inverse-matrix-calculator', 'rref-calculator', 'determinant-calculator'],
    preset: mat({ A: [['2', '1'], ['1', '3']], B: [['5'], ['10']] }, 'inv(A)*B'),
  },

  // ======================= SCIENTIFIC =======================
  {
    slug: 'log-calculator', path: '/log-calculator', file: 'log-calculator.html', calc: 'scientific', group: 'scientific',
    title: 'Log Calculator – Log Base 2, 10, e and Any Base | Plotline',
    description:
      'Free log calculator: find log base 10, natural log ln, log base 2 or any base. Learn the change-of-base rule. Answers update as you type.',
    h1: 'Log Calculator (Any Base)',
    lead:
      'log_b(x) is the power you raise b to in order to get x; for example log₂(64) = 6 because 2⁶ = 64. Use the log_b key for any base, ln for base e and log for base 10.',
    label: 'Log calculator',
    facts: [
      ['Definition', 'log_b(x) = y means bʸ = x'],
      ['Change of base', 'log_b(x) = ln(x) ÷ ln(b)'],
      ['Special values', 'log_b(1) = 0 and log_b(b) = 1'],
      ['Product / quotient', 'log(xy) = log x + log y; log(x/y) = log x − log y'],
      ['Domain', 'x > 0'],
    ],
    sections: [
      {
        h2: 'Common examples',
        p: ['log₁₀(1000) = 3, ln(e²) = 2, log₂(1024) = 10 and log₅(125) = 3.'],
      },
    ],
    steps: [
      'log₂(64) is already entered; its answer shows next to the input.',
      'Use log_b for any base, ln for base e and log for base 10.',
      'Press = to keep the answer in the history, then use ans in the next calculation.',
    ],
    faq: [
      {
        q: 'What is log base 2 of 8?',
        a: '3, because 2³ = 8.',
      },
      {
        q: 'What is the difference between log and ln?',
        a: 'log usually means base 10, and ln means base e ≈ 2.718 (the natural logarithm).',
      },
      FREE,
    ],
    related: ['logarithm', 'square-root-calculator', 'exponential-function'],
    preset: sci('\\log_{2}\\left(64\\right)'),
  },
  {
    slug: 'square-root-calculator', path: '/square-root-calculator', file: 'square-root-calculator.html', calc: 'scientific', group: 'scientific',
    title: 'Square Root Calculator – Square, Cube and nth Roots | Plotline',
    description:
      'Free square root calculator, plus cube roots and nth roots. √144 = 12, ∛27 = 3, √2 ≈ 1.414213562. Answers update as you type.',
    h1: 'Square Root Calculator',
    lead:
      'The square root of x is the number that multiplied by itself gives x; √144 = 12 because 12 × 12 = 144. Use 2nd + √ for cube roots.',
    label: 'Square root calculator',
    facts: [
      ['Definition', '√x · √x = x (for x ≥ 0)'],
      ['Perfect squares', '√4 = 2, √9 = 3, √16 = 4, √25 = 5, √100 = 10'],
      ['√2', '≈ 1.414213562'],
      ['Cube root', '∛27 = 3 and ∛(−8) = −2'],
      ['As a power', '√x = x^(1/2); the nth root of x = x^(1/n)'],
    ],
    sections: [
      {
        h2: 'Simplifying square roots',
        p: ['Split out perfect-square factors: √72 = √(36 × 2) = 6√2 ≈ 8.485.'],
      },
    ],
    steps: [
      '√144 is already entered; its answer shows next to the input.',
      'Tap √ for square roots, or 2nd then ∛ for cube roots.',
      'Press = to keep the answer in the history.',
    ],
    faq: [
      {
        q: 'Can I take the square root of a negative number?',
        a: 'Not as a real number: √(−4) is undefined in the reals. Cube roots of negatives are fine, though: ∛(−8) = −2.',
      },
      FREE,
    ],
    related: ['log-calculator', 'square-root', 'factorial-calculator'],
    preset: sci('\\sqrt{144}'),
  },
  {
    slug: 'trig-calculator', path: '/trig-calculator', file: 'trig-calculator.html', calc: 'scientific', group: 'scientific',
    title: 'Sin Cos Tan Calculator – Degrees and Radians | Plotline',
    description:
      'Free sin, cos and tan calculator in degrees or radians, with inverse trig. Includes the table of exact values for 0°, 30°, 45°, 60° and 90°.',
    h1: 'Sin, Cos and Tan Calculator',
    lead:
      'Enter an angle to get its sine, cosine or tangent in degrees or radians; for example sin(30°) = 0.5, cos(60°) = 0.5 and tan(45°) = 1.',
    label: 'Sin cos tan calculator',
    facts: [
      ['sin 0°, 30°, 45°, 60°, 90°', '0, 1/2, √2/2, √3/2, 1'],
      ['cos 0°, 30°, 45°, 60°, 90°', '1, √3/2, √2/2, 1/2, 0'],
      ['tan 0°, 30°, 45°, 60°', '0, √3/3, 1, √3 (tan 90° is undefined)'],
      ['Degrees to radians', 'radians = degrees × π ÷ 180'],
      ['Pythagorean identity', 'sin²θ + cos²θ = 1'],
    ],
    sections: [
      {
        h2: 'Degrees or radians?',
        p: [
          'Check the mode before calculating: sin(30) is 0.5 in degrees but about −0.988 in radians. The rad/deg key switches the mode, and this page starts in degrees.',
        ],
      },
    ],
    steps: [
      'sin(30) in degrees is already entered; its answer shows next to the input.',
      'Tap rad/deg to switch angle units.',
      'Tap 2nd for inverse functions: sin⁻¹, cos⁻¹ and tan⁻¹.',
    ],
    faq: [
      {
        q: 'Why does my calculator say sin(30) = −0.988?',
        a: 'It is in radian mode. Switch to degrees and sin(30°) = 0.5.',
      },
      FREE,
    ],
    related: ['sine', 'cosine', 'tangent'],
    preset: sci('\\sin\\left(30\\right)', 'deg'),
  },
  {
    slug: 'factorial-calculator', path: '/factorial-calculator', file: 'factorial-calculator.html', calc: 'scientific', group: 'scientific',
    title: 'Factorial Calculator – n! and Combinations | Plotline',
    description:
      'Free factorial calculator: n! = n × (n − 1) × … × 1. 0! = 1, 5! = 120, 10! = 3,628,800. Also combinations nCr. Instant answers.',
    h1: 'Factorial Calculator (n!)',
    lead:
      'n factorial (n!) is the product of all whole numbers from 1 to n; 5! = 5 × 4 × 3 × 2 × 1 = 120, and 0! is defined as 1.',
    label: 'Factorial calculator',
    facts: [
      ['Definition', 'n! = n × (n − 1) × … × 2 × 1'],
      ['Special case', '0! = 1'],
      ['Values', '5! = 120, 10! = 3,628,800, 20! ≈ 2.43 × 10¹⁸'],
      ['Combinations', 'nCr = n! ÷ (r! (n − r)!)'],
      ['Permutations', 'nPr = n! ÷ (n − r)!'],
    ],
    sections: [
      {
        h2: 'Where factorials are used',
        p: [
          'Factorials count arrangements: 5 books can be arranged on a shelf in 5! = 120 ways. They also appear in combinations, probability and series.',
        ],
      },
    ],
    steps: [
      '10! is already entered; its answer shows next to the input.',
      'Type a number followed by the n! key.',
      'For combinations use the nCr function on the graphing keypad, or the formula above.',
    ],
    faq: [
      {
        q: 'Why is 0! equal to 1?',
        a: 'There is exactly one way to arrange zero objects, and defining 0! = 1 keeps formulas such as nCr = n! ÷ (r!(n − r)!) working for r = 0 and r = n.',
      },
      FREE,
    ],
    related: ['square-root-calculator', 'log-calculator', 'percentage-calculator'],
    preset: sci('10!'),
  },

  // ======================= BASIC =======================
  {
    slug: 'percentage-calculator', path: '/percentage-calculator', file: 'percentage-calculator.html', calc: 'four-function', group: 'basic',
    title: 'Percentage Calculator – Percent of a Number, Discounts | Plotline',
    description:
      'Free percentage calculator: find a percent of a number, discounts, tips and percentage change. 15% of 240 = 36. Big keys, works on phones.',
    h1: 'Percentage Calculator',
    lead:
      'To find x% of a number, multiply by x ÷ 100; 15% of 240 = 0.15 × 240 = 36. Type 15% × 240 in the calculator below.',
    label: 'Percentage calculator',
    facts: [
      ['x% of y', 'x ÷ 100 × y'],
      ['Discount', 'price − price × discount%'],
      ['Percentage change', '(new − old) ÷ old × 100'],
      ['What percent is a of b?', 'a ÷ b × 100'],
      ['Examples', '15% of 240 = 36; 25% off 800 = 600'],
    ],
    sections: [
      {
        h2: 'Percentage increase and decrease',
        p: [
          'If a price rises from 80 to 100, the change is (100 − 80) ÷ 80 × 100 = 25%. If it falls from 100 to 80, the change is −20%, because the starting value is different.',
        ],
      },
    ],
    steps: [
      '15% × 240 is already entered; its answer shows next to the input.',
      'Use the % key: 20% × 80 = 16.',
      'For a discount, type the price minus the percentage of it: 800 − 800 × 25% = 600.',
    ],
    faq: [
      {
        q: 'How do I calculate a tip?',
        a: 'Multiply the bill by the tip percentage: a 15% tip on 60 is 15% × 60 = 9.',
      },
      FREE,
    ],
    related: ['factorial-calculator', 'square-root-calculator', 'log-calculator'],
    preset: sci('15\\%\\times240'),
  },

  // ======================= ABOUT THE SITE =======================
  {
    slug: 'desmos-alternative', path: '/desmos-alternative', file: 'desmos-alternative.html', calc: 'graphing', group: 'site',
    title: 'Desmos Alternative – Free Online Graphing Calculator | Plotline',
    description:
      'Looking for a Desmos alternative? Plotline is a free graphing, scientific and matrix calculator with no sign-up. See what it does and where Desmos does more.',
    h1: 'A Free Desmos Alternative: Plotline Compared',
    lead:
      'Plotline is a free alternative to Desmos for everyday graphing and calculation: it plots equations, inequalities and polar curves with sliders, needs no account, and works offline, but it has no 3D, geometry or classroom tools.',
    label: 'Desmos alternative',
    facts: [],
    table: {
      h2: 'Plotline and Desmos side by side',
      head: ['Feature', 'Plotline', 'Desmos'],
      rows: [
        ['Price', 'Free', 'Free'],
        ['Graphing equations, inequalities, polar and parametric curves', 'Yes', 'Yes'],
        ['Sliders', 'Yes', 'Yes'],
        ['Scientific, four-function and matrix calculators', 'Yes', 'Yes'],
        ['Saving graphs', 'In your browser, no account', 'With a free account'],
        ['Sharing a graph', 'By link', 'By link'],
        ['Install and offline use', 'Installs from the browser and works offline', 'Mobile apps'],
        ['3D graphing and geometry', 'Not available', 'Available'],
        ['Tables and regressions', 'Not available', 'Available'],
        ['Classroom activities', 'Not available', 'Available'],
        ['Exam use', 'Not designed for exams', 'Test mode, and built into the digital SAT'],
      ],
    },
    sections: [
      {
        h2: 'When Plotline is a good fit',
        p: [
          'Plotline suits students who want to open a calculator and start straight away. There is nothing to sign up for, saved graphs stay in your own browser, and the on-screen keypad and one-click examples help if you have never used a graphing calculator before.',
          'Every calculator and guide also works after the first visit without an internet connection, and the site can be installed on a phone or computer like an app.',
        ],
      },
      {
        h2: 'When Desmos is the better choice',
        p: [
          'Use Desmos if you need 3D graphs, geometry constructions, data tables or regressions, or if your teacher runs class activities on it. If you are preparing for an exam that includes Desmos, practice on Desmos itself so that you know the exact tool you will use on test day.',
        ],
      },
    ],
    steps: [],
    faq: [
      {
        q: 'Is Plotline the same as Desmos?',
        a: 'No. Plotline is an independent project with its own design and code. It is not affiliated with or endorsed by Desmos.',
      },
      {
        q: 'Do I need an account to save my graphs?',
        a: 'No. Plotline saves graphs in your browser on your device. To move them to another device, export them as a file or share a link.',
      },
      {
        q: 'Can I use Plotline in an exam?',
        a: 'Plotline is not designed or approved for exams. Check your exam rules, which often require a specific calculator.',
      },
      FREE,
    ],
    related: ['graphs', 'sine', 'parabola'],
    updated: '2026-11-01',
  },
  {
    slug: 'about', path: '/about', file: 'about.html', calc: 'graphing', group: 'site',
    title: 'About Plotline – Free Calculators Made by Aalok',
    description:
      'Plotline is an independent project by Aalok: free graphing, scientific, basic and matrix calculators for students, with no sign-up. Learn why it exists.',
    h1: 'About Plotline',
    lead:
      'Plotline is an independent project made by Aalok: a free set of graphing, scientific, basic and matrix calculators that anyone can use in a browser without signing up.',
    label: 'About',
    facts: [],
    sections: [
      {
        h2: 'Why Plotline exists',
        p: [
          'Plotline was built to be easy for someone using a graphing calculator for the first time. Each calculator has a keypad for typing math, and worked examples are one click away, so you can start from something that works and change it.',
        ],
      },
      {
        h2: 'How it works',
        p: [
          'The calculators run in your browser, so there is no account and nothing to install. Graphs you save stay on your device, and the site can be installed as an app that works offline.',
          'Each guide opens the matching calculator with its example already loaded. The example answers are checked by automated tests against Plotline’s own math engine, and each guide links to further reading.',
        ],
      },
      {
        h2: 'Contact',
        p: ['Questions, ideas, or found a mistake? Email aalok.builds@gmail.com.'],
      },
    ],
    steps: [],
    faq: [
      {
        q: 'Who made Plotline?',
        a: 'Plotline is an independent project made by Aalok. You can reach Aalok at aalok.builds@gmail.com.',
      },
      {
        q: 'Is Plotline connected to Desmos, Texas Instruments or Casio?',
        a: 'No. Plotline is independent and is not affiliated with any of them.',
      },
      FREE,
    ],
    related: ['desmos-alternative', 'privacy'],
    textPage: true,
    updated: '2026-11-01',
  },
  {
    slug: 'privacy', path: '/privacy', file: 'privacy.html', calc: 'graphing', group: 'site',
    title: 'Privacy Policy | Plotline',
    description:
      'How Plotline handles your data: no accounts, graphs saved only on your device, and analytics from Google Analytics and Vercel to count visits.',
    h1: 'Privacy Policy',
    lead:
      'Plotline has no accounts and does not ask for your name or email; saved graphs stay on your device, and analytics tools count visits so we can see how the site is used.',
    label: 'Privacy',
    facts: [],
    sections: [
      {
        h2: 'Your calculations and saved graphs',
        p: [
          'Calculations run in your browser. When you press Save, the graph is stored in your browser’s local storage on your device, and Plotline does not upload it. Clearing your site data for tryplotline.xyz removes it.',
          'A share link contains your graph inside the link itself, so anyone who has the link can open that graph.',
        ],
      },
      {
        h2: 'Analytics',
        p: [
          'Plotline uses Google Analytics to understand how visitors use the site, such as which pages are viewed and roughly where visitors come from. Google Analytics uses cookies and its data is processed by Google under its own privacy policy. You can opt out with Google’s browser add-on at tools.google.com/dlpage/gaoptout.',
          'Plotline also uses Vercel Web Analytics and Speed Insights to count visits and measure page speed.',
        ],
      },
      {
        h2: 'Hosting',
        p: [
          'The site is hosted by Vercel, which handles the requests your browser makes to load it, and these may be logged for security and reliability.',
        ],
      },
      {
        h2: 'Offline use',
        p: ['Plotline keeps a copy of the site in your browser so that it works offline. This copy contains the site’s own files, not personal data.'],
      },
      {
        h2: 'Contact',
        p: [
          'If you email Plotline, your address and message are used only to reply. For any privacy question or request, email aalok.builds@gmail.com.',
          'Last updated: November 1, 2026.',
        ],
      },
    ],
    steps: [],
    faq: [
      {
        q: 'Do I need to give Plotline any personal information?',
        a: 'No. There is no sign-up, and the calculators work without giving your name or email.',
      },
      {
        q: 'Are my saved graphs uploaded?',
        a: 'No. Saved graphs stay in your browser on your device unless you choose to share or export them.',
      },
    ],
    related: ['about'],
    textPage: true,
    updated: '2026-11-01',
  },
];

// ---- illustrations and further reading --------------------------------------
const FIGURES: Record<string, GuidePage['figure']> = {
  'linear-equation': {
    alt: 'Graph of the straight line y = 2x + 1, rising from left to right and crossing the y-axis at 1.',
    caption: 'y = 2x + 1: slope 2, y-intercept 1.',
  },
  parabola: {
    alt: 'Graph of the parabola y = x² − 4, opening upward with its vertex at (0, −4) and crossing the x-axis at −2 and 2.',
    caption: 'y = x² − 4: vertex (0, −4), roots x = −2 and x = 2.',
  },
  'cubic-function': {
    alt: 'Graphs of y = x³ − 3x, with a local maximum at (−1, 2) and a local minimum at (1, −2), and of y = x³ for comparison.',
    caption: 'y = x³ − 3x (purple) and y = x³ (red).',
  },
  'absolute-value': {
    alt: 'Graph of the V-shaped y = |x| with its corner at the origin, and of y = |x − 2| + 1 shifted right 2 and up 1.',
    caption: 'y = |x| (purple) and y = |x − 2| + 1 (red), vertex (2, 1).',
  },
  'square-root': {
    alt: 'Graph of y = √x starting at the origin and curving slowly upward to the right, next to the parabola y = x².',
    caption: 'y = √x (purple) and y = x² (red).',
  },
  'reciprocal-function': {
    alt: 'Graph of the hyperbola y = 1/x in the first and third quadrants, with asymptotes along both axes.',
    caption: 'y = 1/x: asymptotes x = 0 and y = 0.',
  },
  'exponential-function': {
    alt: 'Graphs of the exponential curves y = 2ˣ and y = eˣ, both passing through (0, 1) and rising steeply to the right.',
    caption: 'y = 2ˣ (purple) and y = eˣ (red), both through (0, 1).',
  },
  logarithm: {
    alt: 'Graphs of y = ln x and y = log x, both crossing the x-axis at (1, 0) and approaching the y-axis as an asymptote.',
    caption: 'y = ln x (purple) and y = log₁₀ x (red), both through (1, 0).',
  },
  sine: {
    alt: 'Graph of the sine wave y = sin x oscillating between −1 and 1 with period 2π.',
    caption: 'y = sin x: amplitude 1, period 2π.',
  },
  cosine: {
    alt: 'Graphs of y = cos x, starting at its maximum of 1 at x = 0, and y = sin x, the same wave shifted by π/2.',
    caption: 'y = cos x (purple) and y = sin x (red).',
  },
  tangent: {
    alt: 'Graph of y = tan x with repeating rising branches separated by vertical asymptotes at x = ±π/2.',
    caption: 'y = tan x: period π, asymptotes at x = π/2 + kπ.',
  },
  circle: {
    alt: 'Graph of the circle x² + y² = 16 of radius 4 centered at the origin, and a smaller circle of radius 2 centered at (2, 1).',
    caption: 'x² + y² = 16 (purple) and (x − 2)² + (y − 1)² = 4 (red).',
  },
  inequality: {
    alt: 'Shaded region above the parabola y = x² − 3 overlapping the shaded region below the dashed line y = x + 3.',
    caption: 'y > x² − 3 (purple) and y < x + 3 (red); dashed lines are not included.',
  },
  'polar-rose': {
    alt: 'Polar rose r = 3 sin(4θ) with eight petals of length 3 around the origin.',
    caption: 'r = 3 sin(4θ): an 8-petal rose.',
  },
};

const wiki = (name: string, page: string): { name: string; url: string } => ({
  name: `${name} (Wikipedia)`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});
const LEARN_MORE: Record<string, GuidePage['learnMore']> = {
  graphs: [wiki('Graph of a function', 'Graph_of_a_function')],
  'linear-equation': [wiki('Linear equation', 'Linear_equation'), wiki('Slope', 'Slope')],
  parabola: [wiki('Quadratic function', 'Quadratic_function'), wiki('Parabola', 'Parabola')],
  'cubic-function': [wiki('Cubic function', 'Cubic_function')],
  'absolute-value': [wiki('Absolute value', 'Absolute_value')],
  'square-root': [wiki('Square root', 'Square_root')],
  'reciprocal-function': [wiki('Multiplicative inverse', 'Multiplicative_inverse'), wiki('Hyperbola', 'Hyperbola')],
  'exponential-function': [wiki('Exponential function', 'Exponential_function')],
  logarithm: [wiki('Logarithm', 'Logarithm'), wiki('Natural logarithm', 'Natural_logarithm')],
  sine: [wiki('Sine and cosine', 'Sine_and_cosine')],
  cosine: [wiki('Sine and cosine', 'Sine_and_cosine')],
  tangent: [wiki('Trigonometric functions', 'Trigonometric_functions')],
  circle: [wiki('Circle', 'Circle')],
  inequality: [wiki('Linear inequality', 'Linear_inequality')],
  'polar-rose': [wiki('Rose (mathematics)', 'Rose_(mathematics)'), wiki('Polar coordinate system', 'Polar_coordinate_system')],
  'determinant-calculator': [wiki('Determinant', 'Determinant')],
  'inverse-matrix-calculator': [wiki('Invertible matrix', 'Invertible_matrix')],
  'rref-calculator': [wiki('Row echelon form', 'Row_echelon_form'), wiki('Gaussian elimination', 'Gaussian_elimination')],
  'matrix-multiplication-calculator': [wiki('Matrix multiplication', 'Matrix_multiplication')],
  'system-of-equations-solver': [wiki('System of linear equations', 'System_of_linear_equations')],
  'log-calculator': [wiki('Logarithm', 'Logarithm')],
  'square-root-calculator': [wiki('Square root', 'Square_root')],
  'trig-calculator': [wiki('Trigonometric functions', 'Trigonometric_functions')],
  'factorial-calculator': [wiki('Factorial', 'Factorial')],
  'percentage-calculator': [wiki('Percentage', 'Percentage')],
};

for (const g of GUIDES) {
  g.figure = FIGURES[g.slug];
  g.learnMore = LEARN_MORE[g.slug];
}

/** Published path of a guide's illustration. */
export const figurePath = (g: GuidePage): string => `/images/graphs/${g.slug}.svg`;

export const guideBySlug =(slug: string): GuidePage | undefined => GUIDES.find((g) => g.slug === slug);
