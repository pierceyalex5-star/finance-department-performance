import app from './executive-assistant.js';

export default {
  async fetch(request, env, executionCtx) {
    const response = await app.fetch(request, env, executionCtx);
    if (!response.ok || request.method !== 'GET') return response;

    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '/index.html') return response;

    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    let text = await response.text();
    if (!text.includes('id="view-today"')) {
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      return new Response(text, { status: response.status, statusText: response.statusText, headers });
    }

    if (!text.includes('/executive-ui.js')) {
      const assistantScript = '<script src="/assistant.js"></script>';
      if (text.includes(assistantScript)) {
        text = text.replace(assistantScript, '<script src="/executive-ui.js"></script>' + assistantScript);
      } else {
        text = text.replace('</body>', '<script src="/executive-ui.js"></script></body>');
      }
    }

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store');
    return new Response(text, { status: response.status, statusText: response.statusText, headers });
  }
};
