// Runs only when no asset matches the path exactly (html_handling "none"), so files are served as they are named.
// Mirrors GitHub Pages: /dir/ -> /dir/index.html, /page -> /page.html, /dir -> 301 /dir/, else the 404 page.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const get = (path) => env.ASSETS.fetch(new URL(path, url.origin + '/'), request);
    const ok = async (path) => { const r = await get(path); return r.ok ? r : null; };
    const p = url.pathname;
    if (p.endsWith('/')) {
      const r = await ok(p + 'index.html'); if (r) return r;
    } else if (!/\.[a-z0-9]+$/i.test(p)) {
      const r = await ok(p + '.html'); if (r) return r;
      if (await ok(p + '/index.html')) return Response.redirect(url.origin + p + '/' + url.search, 301);
    }
    const missing = await get('/404.html');
    return new Response(missing.body, { status: 404, headers: missing.headers });
  },
};
