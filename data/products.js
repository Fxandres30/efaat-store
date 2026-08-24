/**
 * products.js (data) — genera el catálogo de demostración.
 * Los productos son objetos JS con estructura genérica + variantes reales
 * (talla × color), NO son elementos HTML fijos. Ver storage.js: esto se
 * siembra una sola vez en localStorage y desde ahí la app trabaja con la
 * "base de datos" persistida, lista para ser reemplazada por una API real.
 */
(function () {
  const COLORS = {
    negro:   { name: 'Negro',   hex: '#111111' },
    blanco:  { name: 'Blanco',  hex: '#f5f5f5' },
    rojo:    { name: 'Rojo',    hex: '#e21f2c' },
    gris:    { name: 'Gris',    hex: '#8a8a8a' },
    azul:    { name: 'Azul',    hex: '#2b4c8c' },
    beige:   { name: 'Beige',   hex: '#cbb894' },
    verde:   { name: 'Verde',   hex: '#2e5c3f' },
    vino:    { name: 'Vino',    hex: '#5c1a22' },
  };

  const TENIS_SIZES = [38, 39, 40, 41, 42, 43, 44];
  const CAP_FITS = ['Ajustable', 'Snapback', 'Talla única', 'Fitted 7 1/8', 'Fitted 7 1/4', 'Fitted 7 3/8'];

  let seedCounter = 1000;
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr, n) { return arr.slice(0, n); }
  function skuCode(str) { return str.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); }
  function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  function buildVariants(skuBase, colors, sizes, price) {
    const variants = [];
    colors.forEach((color) => {
      sizes.forEach((size) => {
        // Distribución de stock: ~15% agotado, ~20% stock bajo (1-3), resto normal (4-14)
        const roll = Math.random();
        let stock;
        if (roll < 0.15) stock = 0;
        else if (roll < 0.35) stock = rand(1, 3);
        else stock = rand(4, 14);
        variants.push({
          variantId: `${skuBase}-${skuCode(color.name)}-${String(size).replace(/\s/g, '')}`,
          size: size,
          color: color.name,
          colorHex: color.hex,
          sku: `${skuBase}-${skuCode(color.name)}-${String(size).replace(/[^A-Za-z0-9]/g, '')}`,
          stock: stock,
          price: price,
        });
      });
    });
    return variants;
  }

  function totalStock(variants) { return variants.reduce((s, v) => s + v.stock, 0); }

  function makeProduct(opts) {
    seedCounter++;
    const id = 'p' + seedCounter;
    const skuBase = skuCode(opts.brand) + '-' + skuCode(opts.name.split(' ').slice(-1)[0]) + seedCounter;
    const colors = opts.colors.map((c) => COLORS[c]);
    const sizes = opts.category === 'tenis' ? (opts.sizes || TENIS_SIZES) : (opts.sizes || CAP_FITS);
    const variants = buildVariants(skuBase, colors, sizes, opts.price);
    const discount = opts.comparePrice ? Math.round(100 - (opts.price / opts.comparePrice) * 100) : 0;
    const imgSeed = slugify(opts.brand + '-' + opts.name + '-' + seedCounter);

    return {
      id,
      sku: skuBase,
      name: opts.name,
      description: opts.description,
      category: opts.category,
      brand: opts.brand,
      price: opts.price,
      comparePrice: opts.comparePrice || null,
      discount,
      images: [1, 2, 3].map((n) => `https://picsum.photos/seed/${imgSeed}-${n}/900/900`),
      colors,
      sizes,
      variants,
      stock: totalStock(variants),
      featured: !!opts.featured,
      new: !!opts.isNew,
      bestSeller: !!opts.bestSeller,
      onDrop: !!opts.onDrop,
      dropId: opts.dropId || null,
      rating: opts.rating || +(3.8 + Math.random() * 1.2).toFixed(1),
      reviewsCount: opts.reviewsCount ?? rand(4, 210),
      tags: opts.tags || [],
      active: true,
      createdAt: opts.createdAt || Date.now() - rand(0, 60) * 86400000,
    };
  }

  const TENIS_DEFS = [
    { name: 'Air Max Pulse', brand: 'Nike', price: 459900, comparePrice: 549900, colors: ['negro', 'blanco'], featured: true, bestSeller: true, tags: ['running', 'urbano'] },
    { name: 'Air Force 1 Low', brand: 'Nike', price: 419900, colors: ['blanco', 'negro'], bestSeller: true, tags: ['clasico'] },
    { name: 'Jordan 1 Mid', brand: 'Jordan', price: 599900, comparePrice: 679900, colors: ['negro', 'rojo'], onDrop: true, dropId: 'drop-01', tags: ['basketball', 'icónico'] },
    { name: 'Ultraboost Light', brand: 'Adidas', price: 649900, colors: ['negro', 'gris'], isNew: true, tags: ['running'] },
    { name: 'Samba OG', brand: 'Adidas', price: 379900, colors: ['blanco', 'negro'], bestSeller: true, tags: ['retro'] },
    { name: 'Campus 00s', brand: 'Adidas', price: 399900, comparePrice: 459900, colors: ['beige', 'negro'], isNew: true, tags: ['retro'] },
    { name: 'RS-X Efekt', brand: 'Puma', price: 359900, colors: ['blanco', 'azul'], tags: ['chunky'] },
    { name: 'Suede Classic', brand: 'Puma', price: 289900, colors: ['vino', 'negro'], tags: ['clasico'] },
    { name: '574 Core', brand: 'New Balance', price: 349900, colors: ['gris', 'azul'], bestSeller: true, tags: ['casual'] },
    { name: '9060', brand: 'New Balance', price: 599900, comparePrice: 659900, colors: ['beige', 'gris'], isNew: true, tags: ['dad-shoe'] },
    { name: 'Old Skool', brand: 'Vans', price: 259900, colors: ['negro', 'blanco'], bestSeller: true, tags: ['skate'] },
    { name: 'Sk8-Hi', brand: 'Vans', price: 289900, colors: ['negro', 'rojo'], tags: ['skate'] },
    { name: 'Chuck 70 High', brand: 'Converse', price: 319900, colors: ['negro', 'vino'], tags: ['retro'] },
    { name: 'Run Star Motion', brand: 'Converse', price: 399900, comparePrice: 449900, colors: ['blanco', 'negro'], onDrop: true, dropId: 'drop-01', tags: ['plataforma'] },
    { name: 'Club C Legacy', brand: 'Reebok', price: 299900, colors: ['blanco', 'verde'], featured: true, tags: ['tenis-tennis'] },
  ];

  const GORRAS_DEFS = [
    { name: 'NY Yankees 9FIFTY', brand: 'New Era', price: 149900, colors: ['negro', 'blanco'], bestSeller: true, tags: ['snapback'], sizes: ['Snapback', 'Talla única'] },
    { name: 'LA Dodgers 59FIFTY', brand: 'New Era', price: 169900, colors: ['azul', 'blanco'], featured: true, tags: ['fitted'], sizes: ['Fitted 7 1/8', 'Fitted 7 1/4', 'Fitted 7 3/8'] },
    { name: 'Chicago Bulls Snapback', brand: 'New Era', price: 159900, comparePrice: 189900, colors: ['negro', 'rojo'], bestSeller: true, sizes: ['Snapback'] },
    { name: 'Essential Classic', brand: "'47", price: 119900, colors: ['negro', 'gris'], isNew: true, sizes: ['Ajustable', 'Talla única'] },
    { name: 'Clean Up Cap', brand: "'47", price: 109900, colors: ['blanco', 'azul'], sizes: ['Ajustable'] },
    { name: 'Trucker Mesh', brand: "'47", price: 99900, colors: ['negro', 'beige'], tags: ['trucker'], sizes: ['Ajustable', 'Talla única'] },
    { name: 'Court Logo Cap', brand: 'Nike', price: 129900, colors: ['negro', 'blanco'], bestSeller: true, sizes: ['Ajustable', 'Talla única'] },
    { name: 'Heritage86 Featherlight', brand: 'Nike', price: 139900, colors: ['gris', 'negro'], isNew: true, sizes: ['Ajustable'] },
    { name: 'Dri-FIT Club Cap', brand: 'Nike', price: 119900, comparePrice: 139900, colors: ['blanco', 'rojo'], sizes: ['Ajustable', 'Talla única'] },
    { name: 'Originals Trefoil', brand: 'Adidas', price: 109900, colors: ['negro', 'blanco'], bestSeller: true, sizes: ['Ajustable'] },
    { name: 'Baseball Snapback', brand: 'Adidas', price: 119900, colors: ['azul', 'blanco'], sizes: ['Snapback', 'Talla única'] },
    { name: 'Archive Cap', brand: 'Puma', price: 99900, colors: ['negro', 'rojo'], tags: ['streetwear'], sizes: ['Ajustable', 'Talla única'] },
    { name: 'Script Logo Cap', brand: 'Champion', price: 89900, colors: ['gris', 'negro'], onDrop: true, dropId: 'drop-01', sizes: ['Ajustable', 'Talla única'] },
    { name: 'Corduroy 6-Panel', brand: 'Champion', price: 104900, comparePrice: 124900, colors: ['vino', 'verde'], isNew: true, sizes: ['Ajustable'] },
    { name: 'Vector Snapback', brand: 'Reebok', price: 99900, colors: ['negro', 'blanco'], featured: true, sizes: ['Snapback', 'Talla única'] },
  ];

  const PRODUCTS = [
    ...TENIS_DEFS.map((d) => makeProduct({ ...d, category: 'tenis', description: `${d.name} de ${d.brand}. Diseño ${d.tags && d.tags.includes('retro') ? 'retro' : 'urbano'} pensado para uso diario, construido con materiales premium y una amortiguación pensada para durar. Combina con cualquier outfit de calle.` })),
    ...GORRAS_DEFS.map((d) => makeProduct({ ...d, category: 'gorras', description: `Gorra ${d.name} de ${d.brand}. Bordado de alta definición, visera curva y ajuste cómodo para todo el día. Pieza clave para completar un fit streetwear.` })),
  ];

  window.EFAAT_PRODUCTS = PRODUCTS;

  window.EFAAT_DROPS = [
    {
      id: 'drop-01',
      name: 'DROP #01 — STREET ICONS',
      description: 'Edición limitada. Solo 30 unidades por talla, no habrá reposición.',
      startDate: Date.now() - 2 * 86400000,
      endDate: Date.now() + 3 * 86400000 + 3600000,
      limitedStock: 30,
      status: 'active',
    },
  ];
})();
