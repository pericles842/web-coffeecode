// Vercel serverless function: lista las identidades visuales de Drive.
// Estructura esperada: carpeta raíz > proyecto > portafolio > imágenes (01-..., 02-...).
// La API key vive solo en variables de entorno y nunca llega al navegador.
const DRIVE = 'https://www.googleapis.com/drive/v3/files';

// La primera conexión a Drive a veces se queda colgada (arranque en frío):
// cortamos a los 5 s y reintentamos, igual que con 429 y errores 5xx.
async function list(q, fields, key) {
  const params = new URLSearchParams({ q, fields, orderBy: 'name', pageSize: '200', key });
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${DRIVE}?${params}`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) return (await r.json()).files || [];
      lastError = new Error(`Drive ${r.status}`);
      if (r.status !== 429 && r.status < 500) break;
    } catch (e) {
      lastError = e;
    }
    await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
  }
  throw lastError;
}

// Última respuesta buena, reutilizada mientras la instancia siga viva.
let cache = null;
const CACHE_MS = 5 * 60 * 1000;

// Nombre de la subcarpeta de cada proyecto cuyas imágenes se muestran en la web.
const PORTFOLIO_FOLDER = 'portafolio';

async function portfolioImages(projectId, key) {
  const subfolders = await list(
    `'${projectId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    'files(id,name)',
    key
  );
  const portfolio = subfolders.find((f) => f.name.trim().toLowerCase() === PORTFOLIO_FOLDER);
  if (!portfolio) return [];
  return list(
    `'${portfolio.id}' in parents and mimeType contains 'image/' and trashed = false`,
    'files(id,name)',
    key
  );
}

// Ordena por nombre (01-, 02-, ...) y deja de primera la portada: la foto que
// empieza por "01"; si hay varias, la primera por nombre.
function orderWithCover(images) {
  const sorted = [...images].sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  const startsWith01 = sorted.filter((f) => /^0*1(?![0-9])/.test(f.name.trim()));
  const cover = startsWith01[0];
  return cover ? [cover, ...sorted.filter((f) => f !== cover)] : sorted;
}

module.exports = async function handler(req, res) {
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!key || !folderId) {
    return res.status(500).json({ error: 'Faltan variables de entorno de Google Drive' });
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cache.data);
  }

  try {
    const folders = await list(
      `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      'files(id,name)',
      key
    );

    const proyectos = await Promise.all(
      folders.map(async (folder) => {
        const images = await portfolioImages(folder.id, key);
        return {
          id: folder.id,
          name: folder.name,
          images: orderWithCover(images).map((f) => ({
            id: f.id,
            name: f.name.replace(/[.][^.]+$/, ''),
            thumb: `/api/imagen?id=${f.id}&w=600`,
            full: `/api/imagen?id=${f.id}&w=1600`,
          })),
        };
      })
    );

    const data = proyectos.filter((p) => p.images.length);
    cache = { at: Date.now(), data };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (e) {
    // Si Drive falla pero tenemos una respuesta anterior, la servimos
    if (cache) return res.status(200).json(cache.data);
    return res.status(502).json({ error: 'Error al consultar Google Drive' });
  }
};
