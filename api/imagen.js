// Proxy con caché de imágenes de Drive: /api/imagen?id=<fileId>&w=600
// Evita que el navegador pida decenas de imágenes directo a Google (error 429)
// y deja que el CDN de Vercel las guarde.
const WIDTHS = [300, 600, 1000, 1600];

// Google a veces responde 403/404/5xx de forma intermitente a peticiones desde
// servidores. Probamos dos endpoints y reintentamos con espera creciente.
function sources(id, w) {
  return [
    `https://lh3.googleusercontent.com/d/${id}=w${w}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`,
  ];
}

async function fetchImage(id, w) {
  const urls = sources(id, w);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(urls[attempt % urls.length], { signal: AbortSignal.timeout(8000) });
      const type = r.headers.get('content-type') || '';
      if (r.ok && type.startsWith('image/')) return r;
    } catch (e) { /* timeout o error de red: reintentamos */ }
    await new Promise((res) => setTimeout(res, 300 * (attempt + 1)));
  }
  return null;
}

module.exports = async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const id = params.get('id') || '';
  const w = WIDTHS.includes(Number(params.get('w'))) ? Number(params.get('w')) : 600;

  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
    res.statusCode = 400;
    return res.end('id inválido');
  }

  const upstream = await fetchImage(id, w);
  if (!upstream) {
    // Sin caché: que el siguiente intento vuelva a consultar a Google
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    return res.end('Imagen no disponible');
  }

  const body = Buffer.from(await upstream.arrayBuffer());
  res.statusCode = 200;
  res.setHeader('Content-Type', upstream.headers.get('content-type'));
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
  return res.end(body);
};
