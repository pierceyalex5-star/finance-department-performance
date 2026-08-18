import app from './executive-assistant.js';

export default {
  async fetch(request, env, executionCtx) {
    const response = await app.fetch(request, env, executionCtx);
    const url = new URL(request.url);
    if (request.method !== 'GET' || !['/', '/index.html'].includes(url.pathname)) return response;
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.includes('text/html')) return response;

    let html = await response.text();
    if (!html.includes('/executive-ui.js')) {
      html = html.replace('</body>', '<script src="/executive-ui.js?v=20260818-1"></script></body>');
    }
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store, max-age=0');
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
