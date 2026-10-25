# Plotline

Free online calculators: **[Graphing](https://tryplotline.xyz/)**, **[Scientific](https://tryplotline.xyz/scientific-calculator)**, **[Basic](https://tryplotline.xyz/basic-calculator)** and **[Matrix](https://tryplotline.xyz/matrix-calculator)**, with local Save, "My graphs" and share links. Works offline and installs as an app.

**Live site: [tryplotline.xyz](https://tryplotline.xyz/)** · [Graph library](https://tryplotline.xyz/graphs) · [Inverse matrix calculator](https://tryplotline.xyz/inverse-matrix-calculator) · [RREF calculator](https://tryplotline.xyz/rref-calculator) · [Log calculator](https://tryplotline.xyz/log-calculator)

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173. Use `npm run build` for a static build in `dist/`, and `npm test` for unit tests.

## Layout

- `src/shell`: top bar, calculator tabs, routes (`/`, `/scientific-calculator`, `/basic-calculator`, `/matrix-calculator`; old `#/…` links still work)
- `src/seo`: page titles, descriptions, guides, FAQs and structured data; pre-rendered into each page at build time (see `vite.config.ts`), plus `sitemap.xml`. `public/robots.txt` and `public/llms.txt` are for search engines and AI assistants
- `src/math`: LaTeX parser, compiler and multi-line analysis (shared by graphing, scientific and four-function)
- `src/graphing`: expression cards, sliders, keypad with examples, canvas renderer (adaptive sampling, marching squares, shading)
- `src/scientific`, `src/fourfunction`: keypad calculators with history and `ans`
- `src/matrix`: exact-fraction linear algebra and matrix UI
- `src/storage`: Save (localStorage), My graphs, JSON export/import, share links
