/**
 * Map preview images live under assets/maps/{gameFolder}/{mapSlug}.webp
 * (e.g. mw2/highrise.webp). Unknown games fall back to the legacy flat path.
 */

export function slugifyMapName(mapName: string): string {
  return mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
}

const KNOWN_FOLDERS: { match: (k: string) => boolean; folder: string }[] = [
  {
    match: (k) =>
      k === 'modern warfare 2' || k === 'mw2',
    folder: 'mw2',
  },
  {
    match: (k) =>
      k === 'black ops 2' || k === 'bo2',
    folder: 'bo2',
  },
  {
    match: (k) =>
      k === 'mw 2019' ||
      k === 'mw2019' ||
      k === 'modern warfare 2019',
    folder: 'mw2019',
  },
];

/** Resolves API display name or route slug to assets/maps subfolder name. */
export function mapsFolderForGame(gameKey: string): string | null {
  const k = gameKey.trim().toLowerCase();
  for (const row of KNOWN_FOLDERS) {
    if (row.match(k)) return row.folder;
  }
  return null;
}

export function mapImageUrl(gameKey: string, mapName: string): string {
  const folder = mapsFolderForGame(gameKey);
  const file = slugifyMapName(mapName);
  if (folder) {
    return `assets/maps/${folder}/${file}.webp`;
  }
  return `assets/maps/${file}.webp`;
}
