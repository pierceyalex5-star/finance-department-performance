const { getState } = require('./_store');

module.exports = async function handler(req, res) {
  try {
    const state = await getState();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Connection', 'keep-alive');
    res.status(200).send(`retry: 5000\ndata: ${JSON.stringify({ version: state.version || 0, updatedAt: state.updatedAt || null })}\n\n`);
  } catch (e) {
    res.status(500).send(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  }
};
