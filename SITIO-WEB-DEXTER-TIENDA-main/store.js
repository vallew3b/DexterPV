/**
 * store.js
 * Lógica principal del catálogo de e-commerce "SITIO-WEB-DEXTER-TIENDA"
 * Conexión viva a Supabase y catálogo offline de respaldo ultra premium
 */

const SUPABASE_URL = 'https://qlinfgsqpzyhioqygevv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaW5mZ3NxcHp5aGlvcXlnZXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNTY1NzcsImV4cCI6MjA5MjczMjU3N30.4AitjCtqVVNur8AV7FoA7Dp1mPoln8Ceazm4gpdJxT0';

let supabaseClient = null;
let allProducts = [];
let filteredProducts = [];
let cart = [];
let activeCategory = 'TODAS';
let searchQuery = '';
let selectedCardSizes = {};

// Teléfono WhatsApp por defecto (Configurable)
const WHATSAPP_PHONE = '521234567890'; // Reemplazar con el número real de la tienda

// Respaldo de productos Premium si no conecta a Supabase o no hay datos
const FALLBACK_PRODUCTS = [
    {
        id: 9901,
        nombre: "Chaqueta Bomber Terracota",
        descripcion: "Chaqueta acolchada impermeable con detalles premium en color terracota de temporada. Forro interno térmico.",
        precioVenta: 89.99,
        categoria: "ROPA",
        stock: 24,
        imagen_url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop",
        variantes: [
            { id: 901, talla: "S", color: "Terracota", stock: 5 },
            { id: 902, talla: "M", color: "Terracota", stock: 8 },
            { id: 903, talla: "L", color: "Terracota", stock: 7 },
            { id: 904, talla: "XL", color: "Terracota", stock: 4 }
        ]
    },
    {
        id: 9902,
        nombre: "Tenis Nike Air Max Retro",
        descripcion: "Tenis de colección con suela amortiguadora de aire de alto confort y diseño vintage urbano premium.",
        precioVenta: 139.99,
        categoria: "CALZADO",
        stock: 15,
        imagen_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
        variantes: [
            { id: 905, talla: "US 8", color: "Rojo/Negro", stock: 3 },
            { id: 906, talla: "US 9", color: "Rojo/Negro", stock: 5 },
            { id: 907, talla: "US 10", color: "Rojo/Negro", stock: 4 },
            { id: 908, talla: "US 11", color: "Rojo/Negro", stock: 3 }
        ]
    },
    {
        id: 9903,
        nombre: "Gorra Mora Classic",
        descripcion: "Gorra de béisbol con logo Mora bordado en relieve dorado. Ajustable y ultra resistente.",
        precioVenta: 29.99,
        categoria: "ACCESORIOS",
        stock: 45,
        imagen_url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop",
        variantes: [
            { id: 909, talla: "Única", color: "Negro/Oro", stock: 25 },
            { id: 910, talla: "Única", color: "Blanco/Oro", stock: 20 }
        ]
    },
    {
        id: 9904,
        nombre: "Camiseta Algodón Orgánico",
        descripcion: "Camiseta básica de algodón orgánico hilado en anillo de máxima frescura y tacto súper suave.",
        precioVenta: 24.99,
        categoria: "ROPA",
        stock: 50,
        imagen_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
        variantes: [
            { id: 911, talla: "M", color: "Negro Carbono", stock: 15 },
            { id: 912, talla: "L", color: "Negro Carbono", stock: 20 },
            { id: 913, talla: "M", color: "Blanco Crudo", stock: 10 },
            { id: 914, talla: "L", color: "Blanco Crudo", stock: 5 }
        ]
    },
    {
        id: 9905,
        nombre: "Botas de Piel Clásicas",
        descripcion: "Botas artesanales de piel genuina curtida al aceite con costuras reforzadas y suela todoterreno.",
        precioVenta: 159.99,
        categoria: "CALZADO",
        stock: 12,
        imagen_url: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=600&auto=format&fit=crop",
        variantes: [
            { id: 915, talla: "US 8.5", color: "Marrón Hojarasca", stock: 4 },
            { id: 916, talla: "US 9.5", color: "Marrón Hojarasca", stock: 5 },
            { id: 917, talla: "US 10.5", color: "Marrón Hojarasca", stock: 3 }
        ]
    },
    {
        id: 9906,
        nombre: "Reloj Minimalista Mora",
        descripcion: "Reloj analógico de cuarzo con correa de cuero italiano y carátula minimalista negra en caja dorada.",
        precioVenta: 99.99,
        categoria: "ACCESORIOS",
        stock: 8,
        imagen_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
        variantes: [
            { id: 918, talla: "Única", color: "Negro/Oro", stock: 8 }
        ]
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar Supabase si está disponible
    initSupabase();
    
    // 2. Cargar productos
    await fetchProducts();
    
    // 3. Configurar Eventos UI
    setupEvents();
    
    // 4. Renderizar Interfaz
    renderCategories();
    renderCatalog();
    updateCartUI();
});

// Inicializar cliente Supabase
function initSupabase() {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("Supabase inicializado correctamente.");
        } else {
            console.log("Supabase CDN no disponible. Cargando en modo local/offline de demostración.");
        }
    } catch (e) {
        console.error("Error inicializando Supabase:", e);
    }
}

// Cargar productos de base de datos o fallback
async function fetchProducts() {
    // Obtener id de comercio por URL opcional (ej: ?store=1)
    const urlParams = new URLSearchParams(window.location.search);
    // Por defecto filtramos por el comercio 105 (PRUEBA SUPER BASE - Tienda de Ropa)
    const storeId = urlParams.get('store') || urlParams.get('comercio') || '105';

    if (supabaseClient) {
        try {
            let query = supabaseClient.from('productos').select('*, variantes(*)');
            if (storeId) {
                query = query.eq('comercio_id', parseInt(storeId));
            }
            const { data, error } = await query;
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                allProducts = data.map(p => {
                    const stockTotal = (p.variantes || []).reduce((sum, v) => sum + v.stock, 0);
                    return {
                        id: p.id,
                        nombre: p.nombre,
                        descripcion: p.descripcion || 'Sin descripción disponible.',
                        precioVenta: p.precio_venta,
                        categoria: p.categoria || 'GENERAL',
                        stock: stockTotal,
                        imagen_url: p.imagen_url || null,
                        imagen_url_2: p.imagen_url_2 || null,
                        imagen_url_3: p.imagen_url_3 || null,
                        imagen_url_4: p.imagen_url_4 || null,
                        variantes: p.variantes || []
                    };
                });
                // FILTRADO GLOBAL DE AGOTADOS: Los artículos agotados no se muestran en el sitio web
                allProducts = allProducts.filter(p => p.stock > 0);
                console.log(`Cargados ${allProducts.length} productos reales desde Supabase.`);
                // Se eliminó la notificación del catálogo en vivo por solicitud del usuario
                return;
            }
        } catch (e) {
            console.error("Error leyendo Supabase, usando respaldo:", e);
        }
    }
    
    // Carga de respaldo (demostración)
    allProducts = [...FALLBACK_PRODUCTS];
    // FILTRADO GLOBAL DE AGOTADOS: Los artículos agotados no se muestran en el sitio web
    allProducts = allProducts.filter(p => p.stock > 0);
    console.log("Cargado catálogo de respaldo offline.");
}

// Configurar los eventos interactivos
function setupEvents() {
    // Transición de barra superior al hacer scroll
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Abrir/Cerrar carrito
    const cartBtn = document.getElementById('cartBtn');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartDrawer = document.getElementById('cartDrawer');

    const openCart = () => {
        cartOverlay.classList.add('active');
        cartDrawer.classList.add('active');
    };

    const closeCart = () => {
        cartOverlay.classList.remove('active');
        cartDrawer.classList.remove('active');
    };

    cartBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Búsqueda en catálogo
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterCatalog();
    });

    // Cerrar Selector de Variantes Modal
    document.getElementById('closeModalBtn').addEventListener('click', closeVariantModal);
    document.getElementById('variantModalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'variantModalOverlay') closeVariantModal();
    });

    // Cerrar Modal de Detalles
    document.getElementById('closeDetailModalBtn').addEventListener('click', closeDetailModal);
    document.getElementById('detailModalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'detailModalOverlay') closeDetailModal();
    });

    // Checkout / Envío a WhatsApp
    document.getElementById('checkoutBtn').addEventListener('click', processOrder);
}

// Renderizar dinámicamente las pestañas de categorías
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    const categories = ['TODAS', ...new Set(allProducts.map(p => p.categoria.toUpperCase()))];
    
    container.innerHTML = categories.map(cat => `
        <button class="category-tab ${activeCategory === cat ? 'active' : ''}" data-category="${cat}">
            ${cat}
        </button>
    `).join('');
    
    // Eventos de categorías
    container.querySelectorAll('.category-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            container.querySelectorAll('.category-tab').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeCategory = e.target.getAttribute('data-category');
            filterCatalog();
        });
    });
}

// Filtrar catálogo por búsqueda y categoría
function filterCatalog() {
    filteredProducts = allProducts;
    
    if (activeCategory !== 'TODAS') {
        filteredProducts = filteredProducts.filter(p => p.categoria.toUpperCase() === activeCategory);
    }
    
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p => 
            p.nombre.toLowerCase().includes(searchQuery) ||
            p.descripcion.toLowerCase().includes(searchQuery)
        );
    }
    
    renderCatalog();
}

// Renderizar cuadrícula del catálogo
function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    
    const targets = searchQuery || activeCategory !== 'TODAS' ? filteredProducts : allProducts;
    
    if (targets.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-face-frown" style="font-size: 40px; margin-bottom: 12px; color: var(--accent);"></i>
                <p>No se encontraron productos disponibles en esta sección.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = targets.map(p => {
        const hasStock = p.stock > 0;
        const mainImg = p.imagen_url 
            ? `<img src="${p.imagen_url}" alt="${p.nombre}" class="product-image">`
            : `<div class="product-image-fallback"><i class="fa-solid fa-layer-group"></i></div>`;
            
        const badge = hasStock 
            ? `<span class="product-badge badge-tag">${p.categoria}</span>`
            : `<span class="product-badge badge-out-of-stock">Agotado</span>`;

        // Extraer tallas únicas de las variantes en stock
        const uniqueSizes = p.variantes && p.variantes.length > 0 
            ? [...new Set(p.variantes.filter(v => v.stock > 0).map(v => v.talla).filter(Boolean))]
            : [];

        let sizesHTML = '';
        if (uniqueSizes.length > 0) {
            sizesHTML = `
                <div style="margin-top: 12px; margin-bottom: 8px;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Tallas Disponibles:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${uniqueSizes.map(size => {
                            const isActive = selectedCardSizes[p.id] === size;
                            return `
                                <button class="size-pill-btn ${isActive ? 'active' : ''}" onclick="selectCardSize(event, ${p.id}, '${size}')" data-product-id="${p.id}" data-size="${size}">
                                    ${size}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="product-card">
                <div class="product-image-container product-clickable" onclick="openDetailModal(${p.id})">
                    ${badge}
                    ${mainImg}
                </div>
                <div class="product-info">
                    <div class="product-category">${p.categoria}</div>
                    <div class="product-title product-clickable" onclick="openDetailModal(${p.id})" title="${p.nombre}">${p.nombre}</div>
                    <div class="product-desc product-clickable" onclick="openDetailModal(${p.id})">${p.descripcion}</div>
                    
                    ${sizesHTML}
                    
                    <button class="btn-detail-link" onclick="openDetailModal(${p.id})">
                        <i class="fa-solid fa-eye"></i> Ver Detalle
                    </button>
                    
                    <div class="product-footer">
                        <div class="product-price">$${p.precioVenta.toFixed(2)}</div>
                        <button class="btn-add-cart" onclick="handleAddToCart(${p.id})" ${!hasStock ? 'disabled' : ''}>
                            <i class="fa-solid fa-cart-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Manejar clic en "Añadir a carrito" desde la tarjeta principal
window.handleAddToCart = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (product.variantes && product.variantes.length > 0) {
        const selectedSize = selectedCardSizes[productId];
        if (!selectedSize) {
            showToast("Elige una talla", "Por favor, selecciona una talla antes de añadir al carrito.", "error");
            
            // Animación de vibración en las píldoras de talla de este producto
            document.querySelectorAll(`.size-pill-btn[data-product-id="${productId}"]`).forEach(btn => {
                btn.classList.add('shake-animation');
                setTimeout(() => btn.classList.remove('shake-animation'), 500);
            });
            return;
        }
        
        // Buscar variante disponible que coincida con la talla seleccionada
        const matchedVariant = product.variantes.find(v => v.talla === selectedSize && v.stock > 0);
        if (matchedVariant) {
            addToCart(product, matchedVariant);
        } else {
            showToast("Agotado", "La talla seleccionada no tiene stock disponible.", "error");
        }
    } else {
        // Si no tiene variantes, agregar directamente
        addToCart(product, null);
    }
};

// Seleccionar talla desde la tarjeta de producto
window.selectCardSize = (event, productId, size) => {
    event.stopPropagation(); // Prevenir que el clic en la talla abra el modal de detalles
    
    selectedCardSizes[productId] = size;
    
    // Desactivar otros botones de talla en esta tarjeta
    document.querySelectorAll(`.size-pill-btn[data-product-id="${productId}"]`).forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activar el botón clicado
    event.target.classList.add('active');
};

// Abrir modal de selección de variantes
function openVariantModal(product) {
    const overlay = document.getElementById('variantModalOverlay');
    const title = document.getElementById('variantModalTitle');
    const tbody = document.getElementById('variantModalBody');
    
    title.textContent = `Variantes de ${product.nombre}`;
    
    const stockVariants = product.variantes.filter(v => v.stock > 0);
    
    if (stockVariants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Sin unidades en stock</td></tr>';
    } else {
        tbody.innerHTML = stockVariants.map(v => `
            <tr>
                <td style="font-weight:700; color:var(--text-primary);">${v.talla || 'N/A'}</td>
                <td>${v.color || 'N/A'}</td>
                <td><span style="font-size:12px; font-weight:600; padding:2px 8px; border-radius:4px; background:var(--success-glow); color:var(--success);">${v.stock} un.</span></td>
                <td>
                    <button class="btn btn-primary btn-small" style="padding: 4px 10px; border-radius: 6px; font-size:11px;" onclick="addToCartFromModal(${product.id}, ${v.id})">
                        <i class="fa-solid fa-plus"></i> Seleccionar
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    overlay.classList.add('active');
}

function closeVariantModal() {
    document.getElementById('variantModalOverlay').classList.remove('active');
}

// Añadir al carrito desde el modal
window.addToCartFromModal = (productId, variantId) => {
    const product = allProducts.find(p => p.id === productId);
    const variant = product.variantes.find(v => v.id === variantId);
    if (product && variant) {
        addToCart(product, variant);
        closeVariantModal();
    }
};

// Añadir al carrito core
function addToCart(product, variant = null) {
    const variantKey = variant ? variant.id : 'default';
    const existingItem = cart.find(item => item.product_id === product.id && item.variant_id === variantKey);
    
    const maxStock = variant ? variant.stock : product.stock;
    
    if (existingItem) {
        if (existingItem.cantidad < maxStock) {
            existingItem.cantidad++;
            showToast("Añadido", `Se aumentó la cantidad de ${product.nombre} en el carrito.`);
        } else {
            showToast("Sin Stock", `Alcanzaste el límite de unidades disponibles para este producto.`, "error");
            return;
        }
    } else {
        cart.push({
            product_id: product.id,
            variant_id: variantKey,
            nombre: product.nombre,
            descripcion: product.descripcion,
            talla: variant ? variant.talla : '',
            color: variant ? variant.color : '',
            precioUnitario: product.precioVenta,
            cantidad: 1,
            max_stock: maxStock,
            imagen_url: product.imagen_url
        });
        showToast("Carrito", `${product.nombre} se agregó a tus compras.`);
    }
    
    updateCartUI();
}

// Actualizar cantidad en carrito
window.updateCartQty = (index, delta) => {
    const item = cart[index];
    const newQty = item.cantidad + delta;
    
    if (newQty <= 0) {
        cart.splice(index, 1);
        showToast("Eliminado", `${item.nombre} eliminado del carrito.`);
    } else if (newQty > item.max_stock) {
        showToast("Límite de Stock", "No hay más existencias de esta variante.", "error");
    } else {
        item.cantidad = newQty;
    }
    
    updateCartUI();
};

// Remover completamente del carrito
window.removeFromCart = (index) => {
    const item = cart[index];
    cart.splice(index, 1);
    showToast("Eliminado", `${item.nombre} removido del carrito.`);
    updateCartUI();
};

// Sincronizar UI del carrito
function updateCartUI() {
    const cartList = document.getElementById('cartItemsList');
    const totalCountEl = document.getElementById('cartTotalCount');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryTotal = document.getElementById('summaryTotal');
    
    // Contador total del trigger
    const totalQty = cart.reduce((sum, item) => sum + item.cantidad, 0);
    totalCountEl.textContent = totalQty;
    
    if (cart.length === 0) {
        cartList.innerHTML = `
            <div class="cart-empty-state">
                <i class="fa-solid fa-basket-shopping cart-empty-icon"></i>
                <p>Tu carrito está completamente vacío.</p>
            </div>
        `;
        summarySubtotal.textContent = "$0.00";
        summaryTotal.textContent = "$0.00";
        return;
    }
    
    let total = 0;
    cartList.innerHTML = cart.map((item, index) => {
        const itemTotal = item.cantidad * item.precioUnitario;
        total += itemTotal;
        
        const imgHtml = item.imagen_url
            ? `<img src="${item.imagen_url}" alt="${item.nombre}" class="cart-item-image">`
            : `<div class="cart-item-image" style="display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.1);"><i class="fa-solid fa-image" style="color:var(--text-muted);"></i></div>`;
            
        const variantText = item.talla || item.color 
            ? `${item.talla ? 'Talla: ' + item.talla : ''} ${item.color ? '| Color: ' + item.color : ''}`
            : 'Estándar';

        return `
            <div class="cart-drawer-item">
                ${imgHtml}
                <div class="cart-item-info">
                    <div class="cart-item-name" title="${item.nombre}">${item.nombre}</div>
                    <div class="cart-item-variant">${variantText}</div>
                    <div class="cart-item-controls">
                        <button class="qty-control-btn" onclick="updateCartQty(${index}, -1)">-</button>
                        <div class="qty-display">${item.cantidad}</div>
                        <button class="qty-control-btn" onclick="updateCartQty(${index}, 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-price-block">
                    <div class="cart-item-total-price">$${itemTotal.toFixed(2)}</div>
                    <div style="font-size:10px; color:var(--text-muted);">$${item.precioUnitario.toFixed(2)} c/u</div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})" title="Quitar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    }).join('');
    
    summarySubtotal.textContent = `$${total.toFixed(2)}`;
    summaryTotal.textContent = `$${total.toFixed(2)}`;
}

// Procesar pedido y enviar a WhatsApp
function processOrder() {
    if (cart.length === 0) {
        showToast("Carrito vacío", "Añade productos antes de finalizar.", "error");
        return;
    }
    
    // Preguntar nombre del cliente de manera interactiva
    const clientName = prompt("Ingresa tu nombre completo para el pedido:") || "Cliente Web";
    
    let total = 0;
    let orderDetail = "";
    
    cart.forEach(item => {
        const itemTotal = item.cantidad * item.precioUnitario;
        total += itemTotal;
        
        const variantText = item.talla || item.color 
            ? `(${item.talla ? 'Talla: ' + item.talla : ''} ${item.color ? '| Color: ' + item.color : ''})`
            : '';
            
        orderDetail += `• *${item.cantidad}x ${item.nombre}* ${variantText} - _$${itemTotal.toFixed(2)}_\n`;
    });
    
    // Compilar el mensaje de WhatsApp altamente premium
    const message = 
`*NUEVO PEDIDO DESDE DEXTER TIENDA* 🛒
----------------------------------
👤 *Cliente:* ${clientName}
📅 *Fecha:* ${new Date().toLocaleDateString()}

📦 *Resumen de Compra:*
${orderDetail}
----------------------------------
💰 *Total Neto a Pagar:* *$${total.toFixed(2)}*

*Instrucciones de Compra:*
_Por favor, confírmame el stock disponible y los métodos de pago (transferencia, efectivo o depósito). Gracias._`;

    const encodedMessage = encodeURIComponent(message);
    const waLink = `https://wa.me/${WHATSAPP_PHONE}?text=${encodedMessage}`;
    
    // Abrir WhatsApp
    window.open(waLink, '_blank');
    
    // Feedback visual y limpiar carrito
    showToast("¡Pedido Enviado!", "Redireccionando a WhatsApp con el desglose de tu carrito...", "success");
    
    cart = [];
    updateCartUI();
    
    // Cerrar carrito
    document.getElementById('cartOverlay').classList.remove('active');
    document.getElementById('cartDrawer').classList.remove('active');
}

// Crear Toasts dinámicos y bonitos
function showToast(title, message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==================================================
// LÓGICA DE DETALLES DEL PRODUCTO Y GALERÍA (VER DETALLE)
// ==================================================

// Abrir Modal de Detalles con Galería de Imágenes
window.openDetailModal = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const overlay = document.getElementById('detailModalOverlay');
    document.getElementById('detailModalTitle').textContent = `Detalles de ${product.nombre}`;
    document.getElementById('detailProductName').textContent = product.nombre;
    document.getElementById('detailCategory').textContent = product.categoria;
    document.getElementById('detailProductPrice').textContent = `$${product.precioVenta.toFixed(2)}`;
    document.getElementById('detailDescription').textContent = product.descripcion;
    
    // Cargar Imágenes en la Galería
    const mainImg = document.getElementById('detailMainImage');
    mainImg.src = product.imagen_url || 'https://via.placeholder.com/600';
    
    const thumbsContainer = document.getElementById('detailThumbnails');
    const imagesArray = [product.imagen_url, product.imagen_url_2, product.imagen_url_3, product.imagen_url_4].filter(url => url);
    
    if (imagesArray.length <= 1) {
        thumbsContainer.innerHTML = '';
        thumbsContainer.style.display = 'none';
    } else {
        thumbsContainer.style.display = 'flex';
        thumbsContainer.innerHTML = imagesArray.map((url, i) => `
            <button class="thumbnail-btn ${i === 0 ? 'active' : ''}" onclick="changeDetailMainImage(this, '${url}')">
                <img src="${url}" alt="Thumbnail ${i+1}" class="thumbnail-img">
            </button>
        `).join('');
    }
    
    // Cargar Variantes en el Modal de Detalles
    const tbody = document.getElementById('detailVariantBody');
    const stockVariants = product.variantes.filter(v => v.stock > 0);
    
    if (stockVariants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Sin stock disponible</td></tr>';
    } else {
        tbody.innerHTML = stockVariants.map(v => `
            <tr>
                <td style="font-weight:700; color:var(--text-primary);">${v.talla || 'N/A'}</td>
                <td>${v.color || 'N/A'}</td>
                <td><span style="font-size:12px; font-weight:600; padding:2px 8px; border-radius:4px; background:var(--success-glow); color:var(--success);">${v.stock} un.</span></td>
                <td>
                    <button class="btn btn-primary btn-small" style="padding: 4px 10px; border-radius: 6px; font-size:11px;" onclick="addToCartFromDetails(${product.id}, ${v.id})">
                        <i class="fa-solid fa-plus"></i> Añadir
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    overlay.classList.add('active');
};

// Cambiar Imagen Principal
window.changeDetailMainImage = (btn, url) => {
    document.querySelectorAll('.thumbnail-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('detailMainImage').src = url;
};

// Cerrar Modal de Detalles
window.closeDetailModal = () => {
    document.getElementById('detailModalOverlay').classList.remove('active');
};

// Agregar al carrito desde detalles
window.addToCartFromDetails = (productId, variantId) => {
    const product = allProducts.find(p => p.id === productId);
    const variant = product.variantes.find(v => v.id === variantId);
    if (product && variant) {
        addToCart(product, variant);
        // Opcional: no cerrar detalles para permitir seguir viendo, solo dar feedback
    }
};
