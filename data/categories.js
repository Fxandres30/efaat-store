/**
 * categories.js — SEED de categorías, no fuente de verdad. Ya NO se
 * carga en el navegador (Supabase es la única fuente real, ver
 * js/repositories/categoryRepository.js) — solo lo lee
 * backend/scripts/seedCatalog.js para la siembra inicial. Nuevas
 * categorías se crean desde /admin/categories.
 */
window.EFAAT_CATEGORIES = [
  {
    id: 'tenis',
    name: 'Tenis',
    slug: 'tenis',
    image: 'https://picsum.photos/seed/efaat-cat-tenis/900/560',
    active: true,
  },
  {
    id: 'gorras',
    name: 'Gorras',
    slug: 'gorras',
    image: 'https://picsum.photos/seed/efaat-cat-gorras/900/560',
    active: true,
  },
];

window.EFAAT_BRANDS = [
  'Nike', 'Adidas', 'Puma', 'New Balance', 'Vans', 'Converse',
  'Jordan', 'New Era', "'47", 'Champion', 'Reebok'
];
