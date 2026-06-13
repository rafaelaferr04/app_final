export default async function handler(req, res) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug.join('/') : (req.query.slug || '');
  const url = `https://api.anthropic.com/${slug}`;

  const forwardHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
  };
  if (req.headers['anthropic-beta']) {
    forwardHeaders['anthropic-beta'] = req.headers['anthropic-beta'];
  }

  const response = await fetch(url, {
    method: req.method,
    headers: forwardHeaders,
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
