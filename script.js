
const CFG = {
    wa: '5491128334733',

    sheetCSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxRdg8EiEJSepjQH857xpFx3v5ZJt9xPQ-VEjwGLCTRiLCUd_viEU791UWGu2nvp2UPO5m4X5FcDSo/pub?gid=0&single=true&output=csv',
    currency: '$',
};

const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 70);
}, { passive: true });

const heroBg = document.getElementById('heroBg');
window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight * 1.2) {
        heroBg.style.transform = `translateY(${y * 0.38}px)`;
    }
}, { passive: true });

const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

let cart = [];

function openCart() {
    document.getElementById('cartOverlay').classList.add('open');
    document.getElementById('cartPanel').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeCart() {
    document.getElementById('cartOverlay').classList.remove('open');
    document.getElementById('cartPanel').classList.remove('open');
    document.body.style.overflow = '';
}

function addToCart(name, price, image) {
    const ex = cart.find(i => i.name === name);
    if (ex) { ex.qty++; } else { cart.push({ name, price, image, qty: 1 }); }
    renderCart();
    openCart();
}

function changeQty(name, d) {
    const item = cart.find(i => i.name === name);
    if (!item) return;
    item.qty += d;
    if (item.qty <= 0) cart = cart.filter(i => i.name !== name);
    renderCart();
}

function removeItem(name) {
    cart = cart.filter(i => i.name !== name);
    renderCart();
}

function renderCart() {
    const body = document.getElementById('cartBody');
    const badge = document.getElementById('cartBadge');
    const total = document.getElementById('cartTotal');
    const btnWa = document.getElementById('btnWa');

    const count = cart.reduce((s, i) => s + i.qty, 0);
    const sum = cart.reduce((s, i) => s + i.price * i.qty, 0);

    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    total.textContent = `${CFG.currency}${sum.toLocaleString('es-AR')}`;
    btnWa.disabled = cart.length === 0;

    if (cart.length === 0) {
        body.innerHTML = `
      <div class="cart-empty-state">
        <svg width="60" height="60" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p>Tu carrito está vacío</p>
      </div>`;
        return;
    }

    body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="ci-img" src="${item.image}" alt="${item.name}"
           onerror="this.src='https://via.placeholder.com/76x76/EDD9C2/6B3F2A?text=L'">
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${CFG.currency}${(item.price * item.qty).toLocaleString('es-AR')}</div>
        <div class="ci-controls">
          <button class="qty-btn" onclick="changeQty('${esc(item.name)}',-1)">−</button>
          <span class="ci-qty">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${esc(item.name)}',1)">+</button>
          <button class="ci-del" onclick="removeItem('${esc(item.name)}')">Eliminar</button>
        </div>
      </div>
    </div>
  `).join('');
}
function esc(s) { return s.replace(/'/g, "\\'"); }

function checkout() {
    if (!cart.length) return;
    const sum = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const lines = cart.map(i =>
        `• ${i.name} x${i.qty} — ${CFG.currency}${(i.price * i.qty).toLocaleString('es-AR')}`
    ).join('\n');

    const msg = `¡Hola! 👜 Quiero hacer el siguiente pedido:\n\n${lines}\n\n*Total: ${CFG.currency}${sum.toLocaleString('es-AR')}*\n\n¿Cómo coordino el pago y la entrega? 😊`;
    window.open(`https://wa.me/${CFG.wa}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* 
   PRODUCTS Google Sheets
   Nombre | Precio | Descripcion | Imagen1 | Imagen2 | Imagen3
 */
async function loadProducts() {
    const grid = document.getElementById('productsGrid');

    if (!CFG.sheetCSV) {
        renderProducts(demoProducts());
        return;
    }

    try {
        const res = await fetch(CFG.sheetCSV);
        const text = await res.text();
        const prods = parseSheet(text);
        renderProducts(prods.length ? prods : demoProducts());
    } catch (e) {
        console.warn('No se pudo cargar el sheet, mostrando demo.', e);
        renderProducts(demoProducts());
    }
}

function parseSheet(csv) {
    const rows = csv.trim().split('\n');
    if (rows.length < 2) return [];
    const hdrs = rows[0].split(',').map(h => h.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_'));

    return rows.slice(1).filter(r => r.trim()).map(row => {
        const vals = [];
        let cur = '', inQ = false;
        for (const ch of row) {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
            else { cur += ch; }
        }
        vals.push(cur.trim());

        const get = (...keys) => {
            for (const k of keys) {
                const i = hdrs.indexOf(k);
                if (i >= 0 && vals[i]) return vals[i].replace(/^"|"$/g, '');
            }
            return '';
        };

        const images = [get('imagen1', 'imagen', 'image1'), get('imagen2', 'image2'), get('imagen3', 'image3')]
            .filter(Boolean);

        const raw = get('precio', 'price').replace(/[^0-9.]/g, '');
        const price = parseFloat(raw) || 0;

        return { name: get('nombre', 'name'), price, desc: get('descripcion', 'description', 'desc'), images };
    }).filter(p => p.name && p.price > 0);
}

function renderProducts(prods) {
    const grid = document.getElementById('productsGrid');

    if (!prods.length) {
        grid.innerHTML = `<div class="grid-status"><p>No hay productos disponibles.</p></div>`;
        return;
    }

    grid.innerHTML = prods.map((p, idx) => {
        const imgs = p.images.length ? p.images
            : ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80'];
        const main = imgs[0];
        const dotsHtml = imgs.length > 1
            ? `<div class="img-dots">${imgs.map((_, i) =>
                `<div class="img-dot ${i === 0 ? 'on' : ''}" onclick="switchImg(${idx},${i})"></div>`
            ).join('')}</div>`
            : '';

        const imgsHtml = imgs.map((src, i) =>
            `<img src="${src}" alt="${p.name}" class="${i === 0 ? '' : 'hidden'}" id="img_${idx}_${i}" loading="lazy"
            onerror="this.src='https://via.placeholder.com/400x500/EDD9C2/6B3F2A?text=Lazo'">`
        ).join('');

        const cartData = JSON.stringify({ name: p.name, price: p.price, image: main })
            .replace(/'/g, '&#39;');

        return `
    <div class="product-card reveal" style="transition-delay:${(idx % 4) * 0.08}s">
      <div class="card-imgs" id="wrap_${idx}">
        ${imgsHtml}
        ${dotsHtml}
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        ${p.desc ? `<div class="card-desc">${p.desc}</div>` : ''}
        <div class="card-price">${CFG.currency}${p.price.toLocaleString('es-AR')} <small>ARS</small></div>
        <button class="btn-cart" onclick="addToCart('${esc(p.name)}',${p.price},'${esc(main)}')">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          Agregar al carrito
        </button>
      </div>
    </div>`;
    }).join('');

    window._imgs = prods.map(p =>
        p.images.length ? p.images : ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80']
    );

    grid.querySelectorAll('.product-card.reveal').forEach(el => revealObs.observe(el));
}

function switchImg(cardIdx, imgIdx) {
    const imgs = window._imgs[cardIdx] || [];
    imgs.forEach((_, i) => {
        const el = document.getElementById(`img_${cardIdx}_${i}`);
        if (el) el.classList.toggle('hidden', i !== imgIdx);
    });
    const wrap = document.getElementById(`wrap_${cardIdx}`);
    if (wrap) wrap.querySelectorAll('.img-dot').forEach((d, i) => d.classList.toggle('on', i === imgIdx));
}

function demoProducts() {
    return [
        {
            name: 'Clásica Camel', price: 12500, desc: 'Diseño atemporal en simil cuero camel. Cierre metálico dorado.',
            images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80']
        },
        {
            name: 'Bolso Sobre Rosa', price: 9800, desc: 'Elegante bolso sobre en rosa palo. Ideal para eventos especiales.',
            images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80']
        },
        {
            name: 'Mini Bag Negra', price: 8200, desc: 'Pequeña y práctica. Perfecta para el día a día.',
            images: ['https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80']
        },
        {
            name: 'Tote Bag Marrón', price: 14500, desc: 'Amplia y funcional. Simil cuero premium marrón.',
            images: ['https://images.unsplash.com/photo-1559563458-527698bf5295?w=600&q=80']
        },
        {
            name: 'Bandolera Nude', price: 11000, desc: 'Versátil en tono nude. Correa ajustable. Para cada ocasión.',
            images: ['https://images.unsplash.com/photo-1681747685985-a401c271156c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D']
        },
        {
            name: 'Clutch Dorado', price: 7500, desc: 'Clutch de fiesta en simil cuero dorado brillante.',
            images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80']
        },
    ];
}

loadProducts();