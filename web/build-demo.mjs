/* Bundles dist/ into one double-clickable HTML file.

   The demo has to survive being emailed to a centre director: no server, no
   build step, no relative fetches. Everything except the Google Fonts link
   and the Anthropic API call is inlined. Re-run after any change to the app:
     npm run build && node build-demo.mjs                                   */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';

/* One file out of the build: the centre demo. The head office side stays in
   the application — a role away, in Centre setup — but nothing that ships as
   a file opens on it. A demo that shows a centre director screens belonging
   to head office invites a question nobody wanted asked. */
const BUILDS = [
  { side: 'centre', out: '../docs/kadia-demo-centre.html', label: 'Centre' },
];

const assets = await readdir(join(DIST, 'assets'));
const jsName = assets.find((f) => f.endsWith('.js'));
const cssName = assets.find((f) => f.endsWith('.css'));

const [html, js, css, jpeg, favicon, fontCss] = await Promise.all([
  readFile(join(DIST, 'index.html'), 'utf8'),
  readFile(join(DIST, 'assets', jsName), 'utf8'),
  readFile(join(DIST, 'assets', cssName), 'utf8'),
  readFile(join(DIST, 'home-bg.jpeg')),
  readFile(join(DIST, 'favicon.svg'), 'utf8'),
  readFile('fonts/geist-inline.css', 'utf8'),
]);

const jpegUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
const faviconUri = `data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}`;

/* The CSS references the image by absolute path; point it at the data URI. */
const cssInline = css.replaceAll('/home-bg.jpeg', jpegUri);

const base = html
  .replace(
    new RegExp(`<script type="module"[^>]*src="/assets/${jsName}"[^>]*></script>`),
    () => `<script type="module">\n${js}\n</script>`,
  )
  .replace(
    new RegExp(`<link rel="stylesheet"[^>]*href="/assets/${cssName}"[^>]*>`),
    () => `<style>\n${cssInline}\n</style>`,
  )
  .replace('href="/favicon.svg"', `href="${faviconUri}"`)
  /* Swap the Google Fonts stylesheet for the inlined faces, and drop the
     preconnects with it — the finished file makes no network request at all. */
  .replace(
    /<link rel="preconnect"[^>]*>\s*/g,
    '',
  )
  .replace(
    /<link href="https:\/\/fonts\.googleapis\.com[^>]*>/,
    `<style>\n${fontCss}\n</style>`,
  );

if (base.includes('fonts.googleapis.com') || base.includes('fonts.gstatic.com')) {
  throw new Error('A font stylesheet reference survived — the demo would need the network.');
}

if (base.includes('/assets/')) {
  throw new Error('An asset reference survived inlining — the demo would break offline.');
}

for (const build of BUILDS) {
  /* The side is set before the application module runs, because the store
     picks its opening role from it on the first render. */
  const side =
    build.side === 'both'
      ? ''
      : `<script>window.__KADIA_SIDE__=${JSON.stringify(build.side)}</script>\n    `;

  const out = base.replace(
    '<div id="root"></div>',
    `${side}<noscript>
      <p style="font:16px/1.5 system-ui;color:#e6e7d9;background:#0e1216;padding:40px;margin:0">
        This demonstration needs JavaScript. Everything in it runs in your
        browser — nothing is uploaded and no data leaves this page.
      </p>
    </noscript>
    <div id="root"></div>`,
  );

  if (build.side !== 'both' && !out.includes('window.__KADIA_SIDE__')) {
    throw new Error(`${build.out}: the side was not written into the file.`);
  }

  await writeFile(build.out, out);
  const kb = Math.round(Buffer.byteLength(out) / 1024);
  console.log(`wrote ${build.out} — ${kb} KB · ${build.label}`);
}
