// Vercel serverless function: lista las identidades visuales de Drive.
// Estructura esperada: carpeta raíz > proyecto > portafolio > imágenes (01-..., 02-...).
// La API key vive solo en variables de entorno y nunca llega al navegador.
const DRIVE = 'https://www.googleapis.com/drive/v3/files';

async function list(q, fields, key) {
  const params = new URLSearchParams({ q, fields, orderBy: 'name', pageSize: '200', key });
  const r = await fetch(`${DRIVE}?${params}`);
  if (!r.ok) throw new Error(`Drive ${r.status}`);
  return (await r.json()).files || [];
}

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

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(proyectos.filter((p) => p.images.length));
  } catch (e) {
    return res.status(502).json({ error: 'Error al consultar Google Drive' });
  }
};
