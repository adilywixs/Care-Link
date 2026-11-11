module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed. Use POST.' } });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: { message: 'GROQ_API_KEY is not configured in Vercel environment variables.' }
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: { message: 'Invalid JSON request body.' } });
    }
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: { message: 'Missing or invalid messages array.' } });
  }

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; CareLinkMVP/1.0)'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: body.messages,
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.15,
        max_tokens: typeof body.max_tokens === 'number' ? Math.min(body.max_tokens, 1024) : 480
      })
    });

    const text = await groqResponse.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      payload = { error: { message: 'Invalid upstream JSON from Groq.' } };
    }

    return res.status(groqResponse.status).json(payload);
  } catch (err) {
    return res.status(502).json({
      error: { message: 'Failed to reach Groq API upstream.', detail: err.message }
    });
  }
};
