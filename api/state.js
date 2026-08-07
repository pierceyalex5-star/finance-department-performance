const { getState } = require('./_store');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const state = await getState();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(state);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
