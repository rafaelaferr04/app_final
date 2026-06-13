export default async function handler(req, res) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug.join('/') : (req.query.slug || '');
  const url = `https://api.groq.com/${slug}`;

  const response = await fetch(url, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
