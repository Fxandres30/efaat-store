/**
 * seedCatalog.js — migra data/categories.js y data/products.js (el
 * seed real, sin duplicar su contenido a mano) hacia Supabase:
 * categories → drops → products → product_variants, en ese orden por
 * las FK. Usa el cliente administrativo del backend — nunca corre en
 * el navegador, nunca usa la publishable key.
 *
 * Idempotente por diseño: upsert por slug/sku (columnas ya UNIQUE en
 * la migración 0001 — no se tocó el schema). drops no tiene llave
 * natural, así que se le da un uuid DETERMINÍSTICO derivado de su id
 * de seed ("drop-01" → siempre el mismo uuid) — nunca aleatorio entre
 * corridas.
 *
 * Modo por defecto: dry run (solo cuenta y muestra, no escribe).
 * Para escribir de verdad: `node scripts/seedCatalog.js --commit`.
 *
 * Nota sobre inventario inicial: el stock de cada variante SÍ se
 * migra (es parte del catálogo). Se registra además en
 * stock_movements con type='manual_adjustment' — no existe un tipo
 * "carga inicial" en el modelo (y esta fase no autoriza tocar el
 * schema), así que se reutiliza el tipo existente más cercano,
 * dejando el motivo explícito en el campo `reason`. NO se crean
 * inventory_reservations ni orders — nada de eso aplica a un seed de
 * catálogo.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../..');
const commit = process.argv.includes('--commit');

function deterministicUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), '5' + h.slice(13, 16),
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20), h.slice(20, 32)].join('-');
}

// Evalúa los archivos REALES de data/ (no una copia a mano) en un
// sandbox con un `window` falso, y lee lo que ellos mismos asignan.
function loadSeed() {
  const sandbox = { window: {}, Math, Date, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, 'data/categories.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(projectRoot, 'data/products.js'), 'utf8'), sandbox);
  return {
    categories: sandbox.window.EFAAT_CATEGORIES,
    products: sandbox.window.EFAAT_PRODUCTS,
    drops: sandbox.window.EFAAT_DROPS,
  };
}

const categoryToRow = (c) => ({ name: c.name, slug: c.slug, image: c.image, active: c.active });

const dropToRow = (d) => ({
  id: deterministicUuid('drop:' + d.id),
  name: d.name, description: d.description,
  start_at: new Date(d.startDate).toISOString(),
  end_at: new Date(d.endDate).toISOString(),
  limited_stock: d.limitedStock, status: d.status,
});

const productToRow = (p, categoryIdBySlug, dropIdBySeedId) => ({
  sku: p.sku, name: p.name, description: p.description,
  category_id: categoryIdBySlug.get(p.category),
  drop_id: p.dropId ? dropIdBySeedId.get(p.dropId) : null,
  brand: p.brand, price: p.price, compare_price: p.comparePrice, discount: p.discount,
  images: p.images, colors: p.colors, sizes: p.sizes,
  featured: p.featured, is_new: p.new, best_seller: p.bestSeller, on_drop: p.onDrop,
  rating: p.rating, reviews_count: p.reviewsCount, tags: p.tags, active: p.active,
  created_at: new Date(p.createdAt).toISOString(),
});

const variantToRow = (v, productId) => ({
  product_id: productId, size: String(v.size), color: v.color, color_hex: v.colorHex,
  sku: v.sku, stock: v.stock, price: v.price,
});

async function run() {
  const { categories, products, drops } = loadSeed();
  const variantsFlat = products.flatMap((p) => p.variants);

  console.log('--- validación en seco ---');
  console.log('categorías en el seed:', categories.length);
  console.log('drops en el seed:', drops.length);
  console.log('productos en el seed:', products.length);
  console.log('variantes en el seed:', variantsFlat.length);

  if (!commit) {
    console.log('\nDry run — no se escribió nada en Supabase. Ejecutá con --commit para aplicar.');
    return;
  }

  const categoryRows = categories.map(categoryToRow);
  const { data: savedCategories, error: catErr } = await supabaseAdmin
    .from('categories').upsert(categoryRows, { onConflict: 'slug' }).select('id, slug');
  if (catErr) throw new Error('categories: ' + catErr.message);
  const categoryIdBySlug = new Map(savedCategories.map((c) => [c.slug, c.id]));

  const dropRows = drops.map(dropToRow);
  const dropIdBySeedId = new Map();
  if (dropRows.length) {
    const { error: dropErr } = await supabaseAdmin.from('drops').upsert(dropRows, { onConflict: 'id' });
    if (dropErr) throw new Error('drops: ' + dropErr.message);
    drops.forEach((d, i) => dropIdBySeedId.set(d.id, dropRows[i].id));
  }

  const productRows = products.map((p) => productToRow(p, categoryIdBySlug, dropIdBySeedId));
  const { data: savedProducts, error: prodErr } = await supabaseAdmin
    .from('products').upsert(productRows, { onConflict: 'sku' }).select('id, sku');
  if (prodErr) throw new Error('products: ' + prodErr.message);
  const productIdBySku = new Map(savedProducts.map((p) => [p.sku, p.id]));

  let variantCount = 0;
  let movementsLogged = 0;
  for (const p of products) {
    const productId = productIdBySku.get(p.sku);
    for (const v of p.variants) {
      const row = variantToRow(v, productId);
      const { data: existing } = await supabaseAdmin
        .from('product_variants').select('id, stock').eq('sku', v.sku).maybeSingle();

      const { data: saved, error: varErr } = await supabaseAdmin
        .from('product_variants').upsert(row, { onConflict: 'sku' }).select('id, stock').single();
      if (varErr) throw new Error('product_variants (' + v.sku + '): ' + varErr.message);
      variantCount++;

      const previousStock = existing ? existing.stock : 0;
      const delta = saved.stock - previousStock;
      if (delta !== 0) {
        const { error: movErr } = await supabaseAdmin.from('stock_movements').insert({
          variant_id: saved.id,
          quantity: Math.abs(delta),
          type: 'manual_adjustment',
          created_by: null,
          reason: existing
            ? `Reseed de catálogo: stock ajustado de ${previousStock} a ${saved.stock} (data/products.js).`
            : 'Carga inicial de catálogo (data/products.js) — stock de partida.',
        });
        if (movErr) throw new Error('stock_movements (' + v.sku + '): ' + movErr.message);
        movementsLogged++;
      }
    }
  }

  console.log('\n--- resultado ---');
  console.log('categorías:', savedCategories.length);
  console.log('drops:', dropRows.length);
  console.log('productos:', savedProducts.length);
  console.log('variantes procesadas:', variantCount);
  console.log('movimientos de stock registrados:', movementsLogged);
}

run().catch((err) => {
  console.error('\n[seedCatalog] ERROR:', err.message);
  process.exit(1);
});
