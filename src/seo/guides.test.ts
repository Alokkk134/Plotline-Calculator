// Guide pages must load cleanly and state correct answers, and every page needs
// unique, well-sized SEO metadata and working internal links.
import { describe, expect, it } from 'vitest';
import { analyzeExpressions, evaluateLatex } from '../math';
import { safeEvaluate } from '../matrix/expr';
import { MatrixError, formatNum, parseNum, type Matrix } from '../matrix/linalg';
import { graphSvg } from './graphImage';
import { GUIDES, type GuidePage } from './guides';
import { ALL_PAGES, breadcrumbs, jsonLd, pageByPath } from './pages';

type GraphPreset = { expressions: { latex: string }[] };
type CalcPreset = { input: string; angleMode: 'deg' | 'rad' };
type MatrixPreset = { matrices: { name: string; rows: string[][] }[]; history: { input: string }[] };

const byGroup = (...groups: GuidePage['group'][]): GuidePage[] => GUIDES.filter((g) => groups.includes(g.group) && g.preset);

describe('site pages', () => {
  it('have unique paths, files, titles and descriptions', () => {
    for (const key of ['path', 'file', 'title', 'description'] as const) {
      const values = ALL_PAGES.map((p) => p[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it.each(ALL_PAGES.map((p) => [p.path, p] as const))('%s has well-sized metadata and resolves', (path, p) => {
    expect(p.title.length).toBeLessThanOrEqual(70);
    expect(p.description.length).toBeGreaterThanOrEqual(100);
    expect(p.description.length).toBeLessThanOrEqual(170);
    expect(p.faq.length).toBeGreaterThan(0);
    expect(pageByPath(path)).toBe(p);
    expect(() => JSON.stringify(jsonLd(p))).not.toThrow();
    expect(breadcrumbs(p)[0]!.name).toBe('Plotline');
  });

  it('guide links point to real guides', () => {
    for (const g of GUIDES) for (const s of g.related) expect(GUIDES.some((x) => x.slug === s), `${g.slug} → ${s}`).toBe(true);
  });
});

describe('graph guide presets', () => {
  it.each(byGroup('graphs').map((g) => [g.slug, g] as const))('%s graphs without errors', (_s, g) => {
    const exprs = (g.preset as GraphPreset).expressions;
    const lines = analyzeExpressions(exprs.map((e, i) => ({ id: String(i), latex: e.latex })), { angleMode: 'rad' });
    for (const l of lines) expect(l.analysis.kind, `${g.slug}: ${JSON.stringify(l.analysis)}`).not.toBe('error');
  });
});

describe('scientific and basic guide presets', () => {
  const expected: Record<string, number> = {
    'log-calculator': 6,
    'square-root-calculator': 12,
    'trig-calculator': 0.5,
    'factorial-calculator': 3628800,
    'percentage-calculator': 36,
  };
  it.each(byGroup('scientific', 'basic').map((g) => [g.slug, g] as const))('%s gives the answer the page states', (slug, g) => {
    const p = g.preset as CalcPreset;
    const r = evaluateLatex(p.input, { angleMode: p.angleMode, variables: { ans: 0 } });
    expect(r.ok, p.input).toBe(true);
    if (r.ok) expect(r.value).toBeCloseTo(expected[slug]!, 9);
  });
});

describe('matrix guide presets', () => {
  const expected: Record<string, string | string[][]> = {
    'determinant-calculator': '10',
    'inverse-matrix-calculator': [['3/5', '-7/10'], ['-1/5', '2/5']],
    'rref-calculator': [['1', '0', '-1'], ['0', '1', '2']],
    'matrix-multiplication-calculator': [['19', '22'], ['43', '50']],
    'system-of-equations-solver': [['1'], ['3']],
  };
  it.each(byGroup('matrix').map((g) => [g.slug, g] as const))('%s gives the answer the page states', (slug, g) => {
    const p = g.preset as MatrixPreset;
    const lookup = (name: string): Matrix => {
      const m = p.matrices.find((x) => x.name === name);
      if (!m) throw new MatrixError(`no ${name}`);
      return m.rows.map((r) => r.map((c) => parseNum(c)!));
    };
    const r = safeEvaluate(p.history[0]!.input, lookup);
    expect(r.ok, r.ok ? '' : r.error).toBe(true);
    if (!r.ok) return;
    const got = r.value.kind === 'scalar' ? formatNum(r.value.v) : r.value.m.map((row) => row.map(formatNum));
    expect(got).toEqual(expected[slug]);
  });
});

describe('guide illustrations and references', () => {
  it('every graph guide has an image with alt text that draws its curves', () => {
    for (const g of byGroup('graphs')) {
      expect(g.figure?.alt.length ?? 0, g.slug).toBeGreaterThan(40);
      const p = g.preset as GraphPreset & { viewport?: Parameters<typeof graphSvg>[1] };
      const svg = graphSvg(p.expressions.map((e) => e.latex), p.viewport);
      expect(svg.startsWith('<svg'), g.slug).toBe(true);
      // At least one curve stroke in the first palette color.
      expect(svg, g.slug).toContain('stroke="#5b4fe0" stroke-width="3"');
      expect(svg, g.slug).not.toContain('NaN');
    }
  });

  it('every guide links to further reading on Wikipedia', () => {
    for (const g of GUIDES.filter((x) => x.group !== 'site')) {
      expect(g.learnMore?.length ?? 0, g.slug).toBeGreaterThan(0);
      for (const l of g.learnMore!) expect(l.url, g.slug).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\/[A-Za-z_()]+$/);
    }
  });
});
