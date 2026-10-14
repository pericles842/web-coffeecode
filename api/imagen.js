// Proxy con caché de imágenes de Drive: /api/imagen?id=<fileId>&w=600
// Evita que el navegador pida decenas de imágenes directo a Google (error 429)
// y deja que el CDN de Vercel las guarde.
const WIDTHS = [300, 600, 1000, 1600];

module.exports = async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const id = params.get('id') || '';
  const w = WIDTHS.includes(Number(params.get('w'))) ? Number(params.get('w')) : 600;

  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) {
    res.statusCode = 400;
    return res.end('id inválido');
  }

  try {
    let upstream;
    for (let attempt = 0; attempt < 3; attempt++) {
      upstream = await fetch(`https://lh3.googleusercontent.com/d/${id}=w${w}`);
      if (upstream.status !== 429) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    if (!upstream.ok) {
      res.statusCode = upstream.status === 429 ? 503 : 404;
      return res.end('Imagen no disponible');
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    return res.end(body);
  } catch (e) {
    res.statusCode = 502;
    return res.end('Error al obtener la imagen');
  }
};
