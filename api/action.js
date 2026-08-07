const { mutateState } = require('./_store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const action = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const state = await mutateState(action);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(state);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
