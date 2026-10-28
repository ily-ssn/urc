import { safeUrl } from "./public.js";
// One cover per album first. Existing single-album collections fill the remaining slots.
// This is a display window; it never deletes a saved album or photograph.
export function galleryHighlights(albums = []) {
  const ordered = [...albums].sort((a, b) =>
    (Date.parse(b.payload?.galleryDate || b.updatedAt) || 0) -
    (Date.parse(a.payload?.galleryDate || a.updatedAt) || 0));
  const groups = ordered.map(album => (album.payload?.photos || [])
    .map((photo, index) => ({...photo, index, album}))
    .filter(photo => safeUrl(photo.url)));
  return [...groups.map(group => group[0]).filter(Boolean),
    ...groups.slice().reverse().flatMap(group => group.slice(1))].slice(0, 4);
}
