export const config = { runtime: 'edge' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function kv(cmd) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  if (req.method === 'GET') {
    const raw = await kv(['GET', 'site_data']);
    const data = raw ? JSON.parse(raw) : null;
    return new Response(JSON.stringify(data || {}), { headers: cors });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const raw = await kv(['GET', 'site_data']);
    const existing = raw ? JSON.parse(raw) : {};

    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        existing[k] = { ...(existing[k] || {}), ...v };
      } else {
        existing[k] = v;
      }
    }

    await kv(['SET', 'site_data', JSON.stringify(existing)]);
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
}
