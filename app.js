/**
 * app.js
 * Controlador principal de la interfaz de DexterPV
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificación de Autenticación y Bloqueo de Suscripción
    const userStr = sessionStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userStr);
    const isSuperadmin = user.rol === 'superadmin';
    let isSubscriptionActive = true;

    if (!isSuperadmin) {
        if (user.comercio) {
            const fechaVenc = new Date(user.comercio.fecha_vencimiento);
            const hoy = new Date();

            // Calcular días restantes (ignorando horas)
            const diffTime = fechaVenc.getTime() - hoy.getTime();
            const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            user.diasRestantes = diasRestantes;

            if (user.comercio.estado_suscripcion !== 'activo' || fechaVenc < hoy) {
                isSubscriptionActive = false;
            } else if (diasRestantes <= 5) {
                setTimeout(() => {
                    showToast('Suscripción por Expirar', `Te quedan ${diasRestantes} días de suscripción. Renueva pronto.`, 'warning');
                }, 2000);
            }
        } else {
            isSubscriptionActive = false;
        }
    }

    // Configuración visual basada en el usuario
    document.getElementById('userNameSidebar').textContent = user.nombre;
    const parts = user.nombre.split(' ');
    let initials = 'US';
    if (parts.length >= 2) initials = (parts[0][0] + parts[1][0]).toUpperCase();
    else if (parts.length === 1 && parts[0].length > 0) initials = parts[0].substring(0, 2).toUpperCase();
    document.getElementById('userInitialSidebar').textContent = initials;

    if (isSuperadmin) {
        document.getElementById('userRoleSidebar').textContent = 'Superadministrador';
        document.querySelector('.brand-title-sidebar').textContent = 'MORA CONSOLE';
    } else {
        document.getElementById('userRoleSidebar').textContent = user.rol === 'vendedor' ? 'Vendedor' : 'Administrador';
        if (user.comercio) {
            document.querySelector('.brand-title-sidebar').textContent = user.comercio.nombre.toUpperCase();
        }
        if (user.comercio_id) {
            document.getElementById('userTenantIdSidebar').textContent = `ID Cliente: #${user.comercio_id}`;
        }
    }

    // Lógica de Bloqueo por Suscripción y Roles
    if (!isSubscriptionActive) {
        document.querySelectorAll('.sidebar-menu-wrapper .menu-group').forEach(el => el.style.display = 'none');
        document.querySelector('.top-bar-right').style.display = 'none';

        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
            sec.style.display = 'none';
        });

        const lockedSec = document.getElementById('locked-subscription');
        if (lockedSec) {
            lockedSec.classList.add('active');
            lockedSec.style.display = 'flex'; // Flex for centered card

            if (user.comercio) {
                document.getElementById('lockedCommerceName').textContent = `COMERCIO: ${user.comercio.nombre.toUpperCase()}`;
            }
        }
        document.getElementById('lockedLogoutBtn')?.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'index.html';
        });

        return;
    }

    // Ocultar opciones para vendedores
    if (user.rol === 'vendedor') {
        document.querySelectorAll('a[data-section="inicio"]').forEach(el => el.parentElement.style.display = 'none');
        document.querySelectorAll('a[data-section="agregar"]').forEach(el => el.parentElement.style.display = 'none');
        document.querySelectorAll('a[data-section="gastos"]').forEach(el => el.parentElement.style.display = 'none');
        document.querySelectorAll('a[data-section="reportes"]').forEach(el => el.parentElement.style.display = 'none');
        document.querySelectorAll('a[data-section="finanzas"]').forEach(el => el.parentElement.style.display = 'none');
        document.querySelectorAll('a[data-section="personal"]').forEach(el => el.parentElement.style.display = 'none');
    }

    // 2. Configurar Menús y Permisos
    if (isSuperadmin) {
        document.getElementById('superadmin-menu-group').style.display = 'block';
        document.getElementById('standard-menu-group').style.display = 'none';
        navigateToSection('superadmin-panel');
    } else {
        if (user.rol === 'vendedor') {
            // Ocultar inicio, agregar y gastos para vendedores
            document.querySelectorAll('a[data-section="inicio"], a[data-section="agregar"], a[data-section="gastos"]').forEach(el => el.parentElement.style.display = 'none');
            navigateToSection('ventas'); // Default para vendedor
        } else {
            navigateToSection('inicio'); // Default para administrador
        }
    }

    // Eventos de Navegación Sidebar
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            if (section === 'agregar' && document.getElementById('editProductId')?.value) {
                document.getElementById('productoForm').reset();
                document.getElementById('editProductId').value = '';
                variantesEditor = [];
                renderVariantesEditor();
                document.getElementById('formProductoTitle').innerHTML = '<i class="fa-solid fa-square-plus"></i> Registrar Nuevo Producto';
                document.getElementById('btnCancelarEdicion').style.display = 'none';
                const formBtn = document.querySelector('#productoForm button[type="submit"]');
                if (formBtn) formBtn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Producto';
                for (let i = 1; i <= 4; i++) removeImagePreview(i);
            }
            navigateToSection(section);
            // Cerrar sidebar en móviles automáticamente
            document.querySelector('.sidebar').classList.remove('active');
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    document.getElementById('menuToggleBtn').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });

    const privacyToggleBtn = document.getElementById('privacyToggleBtn');
    if (privacyToggleBtn) {
        privacyToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('privacy-mode');
            const icon = document.getElementById('privacyIcon');
            if (document.body.classList.contains('privacy-mode')) {
                icon.textContent = '🙈';
                document.querySelectorAll('.metric-value').forEach(el => el.classList.add('blurred-amount'));
            } else {
                icon.textContent = '👁️';
                document.querySelectorAll('.metric-value').forEach(el => el.classList.remove('blurred-amount'));
            }
        });
    }

    // 3. Funciones de Carga de Datos y Secciones
    function navigateToSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        document.querySelectorAll('.sidebar-menu a').forEach(l => {
            if (l.getAttribute('data-section') === sectionId) l.classList.add('active');
            else l.classList.remove('active');
        });

        const titles = {
            'inicio': 'Dashboard Principal',
            'ventas': 'Punto de Venta (POS)',
            'historial': 'Historial de Ventas',
            'inventario': 'Control de Inventario',
            'agregar': 'Gestión de Productos',
            'gastos': 'Inversiones y OPEX',
            'reportes': 'Reportes Financieros',
            'finanzas': 'Contabilidad y Flujo de Caja',
            'perfil': 'Perfil de Negocio',
            'superadmin-panel': 'SaaS Mora Console',
            'superadmin-agregar': 'Registrar Cliente',
            'superadmin-personal': 'Gestión de Personal'
        };
        document.getElementById('sectionTitle').textContent = titles[sectionId] || '';

        // Cargar datos según sección
        if (sectionId === 'inicio') loadDashboardData();
        else if (sectionId === 'ventas') {
            const isMobile = window.innerWidth <= 1024;
            loadPOSCatalog(isMobile ? 'ESCANER' : 'TODAS');
        }
        else if (sectionId === 'historial') {
            const hoyStr = new Date().toISOString().split('T')[0];
            document.getElementById('fechaHistorial').value = hoyStr;
            loadHistorialVentas(hoyStr, hoyStr);
        }
        else if (sectionId === 'inventario') loadInventarioTable();
        else if (sectionId === 'gastos') loadGastosTable();
        else if (sectionId === 'pedidos-web') loadPedidosWebTable();
        else if (sectionId === 'superadmin-panel') loadSuperadminData();
        else if (sectionId === 'agregar') loadFormCategorias();
        else if (sectionId === 'perfil') loadPerfilData();
        else if (sectionId === 'finanzas') loadFinanzasData();
        else if (sectionId === 'superadmin-personal') loadSuperadminPersonalData();
    }

    // =========================================================
    // LÓGICA GLOBAL DE ESCÁNER DE CÓDIGO DE BARRAS
    // =========================================================
    let barcodeBuffer = '';
    let barcodeTimer = null;

    function showCustomConfirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            if (!modal) return resolve(confirm(message)); // Fallback si no existe el modal

            document.getElementById('customConfirmTitle').innerHTML = title;
            document.getElementById('customConfirmMessage').innerHTML = message;

            const btnAceptar = document.getElementById('btnCustomConfirmAceptar');
            const btnCancelar = document.getElementById('btnCustomConfirmCancelar');

            const handleAceptar = () => {
                modal.classList.remove('active');
                btnAceptar.removeEventListener('click', handleAceptar);
                btnCancelar.removeEventListener('click', handleCancelar);
                resolve(true);
            };

            const handleCancelar = () => {
                modal.classList.remove('active');
                btnAceptar.removeEventListener('click', handleAceptar);
                btnCancelar.removeEventListener('click', handleCancelar);
                resolve(false);
            };

            btnAceptar.addEventListener('click', handleAceptar);
            btnCancelar.addEventListener('click', handleCancelar);

            modal.classList.add('active');
        });
    }

    document.addEventListener('keydown', async (e) => {
        // Ignorar si el foco está en un textarea para evitar borrar o saltar líneas sin querer
        if (e.target.tagName === 'TEXTAREA') return;

        if (e.key.length === 1) {
            barcodeBuffer += e.key;
            if (barcodeTimer) clearTimeout(barcodeTimer);
            // Si el tiempo entre teclas es mayor a 50ms, es escritura humana
            barcodeTimer = setTimeout(() => {
                barcodeBuffer = '';
            }, 50);
        } else if (e.key === 'Enter' && barcodeBuffer.length >= 3) {
            e.preventDefault(); // Evitar submit de forms accidentales
            const scannedCode = barcodeBuffer;
            barcodeBuffer = '';

            const activeSection = document.querySelector('.content-section.active');
            if (!activeSection) return;

            if (activeSection.id === 'ventas') {
                let varianteMatcheada = null;
                let productoMatcheado = null;

                // 1. Buscar en variantes hijas primero
                for (const prod of currentPOSProducts) {
                    if (prod.variantes && prod.variantes.length > 0) {
                        const v = prod.variantes.find(v => v.codigo_barras === scannedCode);
                        if (v) {
                            productoMatcheado = prod;
                            varianteMatcheada = v;
                            break;
                        }
                    }
                }

                if (productoMatcheado && varianteMatcheada) {
                    // Match directo con una variante!
                    if (varianteMatcheada.stock > 0) {
                        addToCart(productoMatcheado.id, varianteMatcheada.id);
                    } else {
                        showToast('Sin Stock', 'Esta talla/variante no tiene stock.', 'warning');
                    }
                    const searchBar = document.getElementById('buscarProducto');
                    if (searchBar) searchBar.value = '';
                } else {
                    // 2. Buscar en producto principal
                    const p = currentPOSProducts.find(x => x.codigo_barras === scannedCode || x.codigo === scannedCode);
                    if (p) {
                        const variantesDisponibles = (p.variantes || []).filter(v => v.stock > 0);
                        if (variantesDisponibles.length === 1) {
                            addToCart(p.id, variantesDisponibles[0].id);
                        } else {
                            openVariantSelector(p.id);
                        }
                        const searchBar = document.getElementById('buscarProducto');
                        if (searchBar) searchBar.value = '';
                    } else {
                        showToast('No Encontrado', 'El producto escaneado no está en el catálogo actual.', 'warning');
                    }
                }
            } else if (activeSection.id === 'agregar') {
                // Buscar si ya existe el producto (primero en cache local)
                let p = null;
                if (typeof inventarioProductosCache !== 'undefined' && inventarioProductosCache.length > 0) {
                    p = inventarioProductosCache.find(x => x.codigo_barras === scannedCode || x.codigo === scannedCode);
                }
                // Si no está en cache, buscar directamente a la base de datos para estar seguros
                if (!p) {
                    const todos = await window.electronAPI.getProductos();
                    p = todos.find(x => x.codigo_barras === scannedCode || x.codigo === scannedCode);
                }

                if (p) {
                    openQuickUpdateModal(p);
                } else {
                    const inputCB = document.getElementById('codigo_barras');
                    if (inputCB) {
                        inputCB.value = scannedCode;
                        showToast('Escáner', 'Nuevo código listo. Completa los datos para guardarlo.', 'info');
                    }
                }
            } else if (activeSection.id === 'inventario') {
                const searchInv = document.getElementById('buscarInventario');
                if (searchInv) {
                    searchInv.value = scannedCode;
                    searchInv.dispatchEvent(new Event('input'));
                }
            }
        }
    });

    async function loadFinanzasData() {
        if (isSuperadmin || !user.comercio) return;

        try {
            document.getElementById('finanzasCapital').textContent = 'Calculando...';
            document.getElementById('finanzasIngresos').textContent = 'Calculando...';
            document.getElementById('finanzasCogs').textContent = 'Calculando...';
            document.getElementById('finanzasOpex').textContent = 'Calculando...';
            document.getElementById('finanzasUtilidad').textContent = 'Calculando...';

            // Obtener datos
            const productos = await window.electronAPI.getProductos();
            const ventas = await window.electronAPI.getVentas(); // Por defecto trae todas si no pasamos rango
            const gastos = await window.electronAPI.getGastos();

            let capitalInvertido = 0;
            let ingresosBrutos = 0;
            let cogsTotal = 0; // Costo de Mercancía Vendida
            let opexTotal = 0; // Gastos Operativos

            // 1. Capital en Inventario
            const prodMap = new Map();
            productos.forEach(p => {
                prodMap.set(p.id, p);
                capitalInvertido += ((p.precioInventario || 0) * (p.stock || 0));
            });

            // 2. Ingresos Brutos y COGS
            ventas.forEach(v => {
                ingresosBrutos += (v.total || 0);
                const p = prodMap.get(v.producto_id);
                if (p) {
                    cogsTotal += ((p.precioInventario || 0) * v.cantidad);
                }
            });

            // 3. Gastos OPEX
            gastos.forEach(g => {
                opexTotal += (g.monto || 0);
            });

            // 4. Utilidad Neta
            const utilidadNeta = ingresosBrutos - cogsTotal - opexTotal;

            // Formatear
            const money = (val) => '$' + parseFloat(val).toFixed(2);

            document.getElementById('finanzasCapital').textContent = money(capitalInvertido);
            document.getElementById('finanzasIngresos').textContent = money(ingresosBrutos);
            document.getElementById('finanzasCogs').textContent = money(cogsTotal);
            document.getElementById('finanzasOpex').textContent = money(opexTotal);

            const utilEl = document.getElementById('finanzasUtilidad');
            utilEl.textContent = money(utilidadNeta);
            if (utilidadNeta < 0) {
                utilEl.style.color = 'var(--danger)';
            } else {
                utilEl.style.color = 'var(--primary-emerald)';
            }

        } catch (error) {
            console.error('Error al cargar datos financieros:', error);
            showToast('Error', 'No se pudieron calcular los datos financieros', 'error');
        }
    }

    function loadPerfilData() {
        if (isSuperadmin || !user.comercio) return;

        let planNombre = user.comercio.plan.replace('_', ' ').toUpperCase();
        document.getElementById('perfilPlan').textContent = planNombre;

        let dias = user.diasRestantes || 0;
        const diasEl = document.getElementById('perfilDiasRestantes');
        diasEl.textContent = dias > 0 ? dias : 0;

        if (dias <= 5) {
            diasEl.style.color = 'var(--danger)';
            document.getElementById('perfilRenovacionAlerta').style.display = 'block';
        } else {
            diasEl.style.color = 'var(--text-primary)';
            document.getElementById('perfilRenovacionAlerta').style.display = 'none';
        }

        const fecha = new Date(user.comercio.fecha_vencimiento);
        document.getElementById('perfilFechaVenc').textContent = fecha.toLocaleDateString();
    }

    let globalCategoriasForm = [];

    window.renderCategoriasSugeridas = (filtro = '') => {
        const suggContainer = document.getElementById('categoriasSugeridas');
        if (!suggContainer) return;

        let filtradas = globalCategoriasForm;
        if (filtro) {
            filtradas = filtradas.filter(c => c.toLowerCase().includes(filtro.toLowerCase()));
        }

        suggContainer.innerHTML = filtradas.slice(0, 15).map(c =>
            `<span class="badge" style="background:var(--bg-glass); cursor:pointer; padding:6px 10px; font-size:12px; border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary);" onclick="document.getElementById('categoria').value='${c}'; document.getElementById('categoria').dispatchEvent(new Event('input'))">${c}</span>`
        ).join('');
    };

    async function loadFormCategorias() {
        if (isSuperadmin) return;
        try {
            const todosLosProductos = await window.electronAPI.getProductos();
            globalCategoriasForm = [...new Set(todosLosProductos.map(p => p.categoria).filter(c => c))];

            const datalist = document.getElementById('categoriasList');
            if (datalist) {
                datalist.innerHTML = globalCategoriasForm.map(c => `<option value="${c}">`).join('');
            }
            window.renderCategoriasSugeridas('');
        } catch (e) {
            console.error('Error al cargar categorías form', e);
        }
    }

    function showToast(title, message, type = 'success') {
        const container = document.getElementById('toastContainer');
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
        }, 3000);
    }

    // =========================================================
    // INICIO: DASHBOARD
    // =========================================================
    let ventasChartInstance = null;

    async function loadDashboardData() {
        if (isSuperadmin || user.rol === 'vendedor') return;
        try {
            const stats = await window.electronAPI.getEstadisticas();
            document.getElementById('statVentasHoy').textContent = `$${stats.ventasHoy.toFixed(2)}`;
            const statDev = document.getElementById('statDevolucionesHoy');
            if (statDev) statDev.textContent = `$${(stats.devolucionesHoy || 0).toFixed(2)}`;
            document.getElementById('statGanancias').textContent = `$${stats.gananciasTotales.toFixed(2)}`;
            document.getElementById('statInventarioTotal').textContent = `$${stats.inventarioTotal.toFixed(2)}`;
            document.getElementById('statTotalProductos').textContent = stats.totalProductos;

            // Renderizar Gráfica
            if (stats.grafico) {
                const ctx = document.getElementById('ventasChart').getContext('2d');
                if (ventasChartInstance) ventasChartInstance.destroy();

                ventasChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: stats.grafico.labels,
                        datasets: [{
                            label: 'Ventas Totales ($)',
                            data: stats.grafico.data,
                            borderColor: '#b85c40',
                            backgroundColor: 'rgba(184, 92, 64, 0.1)',
                            borderWidth: 2,
                            pointBackgroundColor: '#b85c40',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function (value) {
                                        return '$' + value;
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // Historial por defecto hoy
            const hoyStr = new Date().toISOString().split('T')[0];
            document.getElementById('fechaHistorial').value = hoyStr;
            await loadHistorialVentas(hoyStr, hoyStr);
        } catch (e) {
            console.error(e);
        }
    }

    document.getElementById('btnBuscarHistorial')?.addEventListener('click', async () => {
        const fecha = document.getElementById('fechaHistorial').value;
        if (fecha) await loadHistorialVentas(fecha, fecha);
    });

    async function loadHistorialVentas(start, end) {
        const tbody = document.getElementById('ventasTableBody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando historial...</td></tr>';

        const ventas = await window.electronAPI.getVentas(start, end);
        const productos = await window.electronAPI.getProductos();
        const prodMap = new Map(productos.map(p => [p.id, p]));

        if (ventas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No hay ventas registradas en esta fecha.</td></tr>';
            return;
        }

        tbody.innerHTML = ventas.map(v => {
            const p = prodMap.get(v.producto_id);
            const date = new Date(v.fecha);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const isDevolucion = v.cantidad < 0;
            const trStyle = isDevolucion ? 'background: rgba(239, 68, 68, 0.05);' : '';
            const actionBtn = isDevolucion ?
                `<span class="badge" style="background:rgba(239,68,68,0.1); color:var(--danger-red);">Devolución</span>` :
                `<button class="btn btn-danger btn-small" onclick="anularVenta(${v.id}, ${v.producto_id}, '${p ? p.nombre.replace(/'/g, "\\'") : 'Producto Eliminado'}', ${v.cantidad})" title="Anular venta y devolver dinero"><i class="fa-solid fa-rotate-left"></i> Anular</button>`;

            return `
                <tr style="${trStyle}">
                    <td>${date.toLocaleDateString()} <span style="color:var(--text-muted); font-size:11px;">${timeStr}</span></td>
                    <td><span class="badge" style="background:rgba(255,255,255,0.05);">${p ? p.codigo : 'N/A'}</span></td>
                    <td style="font-weight:600; ${isDevolucion ? 'color:var(--danger-red);' : ''}">${p ? p.nombre : 'Producto Eliminado'}</td>
                    <td style="${isDevolucion ? 'color:var(--danger-red);' : ''}">${v.cantidad} un.</td>
                    <td style="color:var(--primary-emerald);">$${v.precio_unitario.toFixed(2)}</td>
                    <td style="font-weight:700; ${isDevolucion ? 'color:var(--danger-red);' : ''}">$${(v.total || (v.cantidad * v.precio_unitario)).toFixed(2)}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join('');
    }

    window.anularVenta = async (ventaId, productoId, productoNombre, cantidad) => {
        let p = null;
        if (typeof inventarioProductosCache !== 'undefined') {
            p = inventarioProductosCache.find(x => x.id == productoId);
        }
        if (!p) {
            p = await window.electronAPI.getProducto(productoId);
        }

        if (!p) {
            const confirmar = await showCustomConfirm(
                '<i class="fa-solid fa-triangle-exclamation"></i> Anular Venta',
                `¿Anular la venta de <strong>"${productoNombre}"</strong>?<br><br>El producto ya no existe en tu inventario, por lo que solo se eliminará el registro financiero.`
            );
            if (confirmar) {
                const res = await window.electronAPI.returnVenta(ventaId, null, 0);
                if (res.success) {
                    showToast('Venta Anulada', 'La venta ha sido anulada financieramente.', 'info');
                    const fecha = document.getElementById('fechaHistorial').value;
                    if (fecha) loadHistorialVentas(fecha, fecha);
                } else showToast('Error', 'No se pudo anular: ' + res.error, 'error');
            }
            return;
        }

        document.getElementById('rvVentaId').value = ventaId;
        document.getElementById('rvMaxCantidad').value = cantidad;
        document.getElementById('rvCantidadAnular').value = cantidad === 1 ? 1 : '';
        document.getElementById('rvCantidadAnular').max = cantidad;
        document.getElementById('rvProductName').textContent = productoNombre;
        document.getElementById('rvQuantity').textContent = cantidad;
        // Guardamos el precioInventario en un dataset temporal
        document.getElementById('rvProductName').dataset.precioInventario = p.precioInventario || p.precio_inventario || 0;

        const select = document.getElementById('rvSelectVariante');
        select.innerHTML = `<option value="">-- No reponer stock (solo anular venta) --</option>`;
        if (p.variantes && p.variantes.length > 0) {
            p.variantes.forEach(v => {
                select.innerHTML += `<option value="${v.id}">${v.talla} / ${v.color} (Stock actual: ${v.stock})</option>`;
            });
        }

        document.getElementById('returnVariantModal').classList.add('active');
    };

    window.closeReturnVariantModal = () => {
        document.getElementById('returnVariantModal').classList.remove('active');
    };

    document.getElementById('btnConfirmReturnVariant')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button') || document.getElementById('btnConfirmReturnVariant');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

        try {
            const ventaId = document.getElementById('rvVentaId').value;
            const maxCantidad = parseInt(document.getElementById('rvMaxCantidad').value) || 0;
            let cantidadAnular = parseInt(document.getElementById('rvCantidadAnular').value) || 0;
            const varianteId = document.getElementById('rvSelectVariante').value;

            if (cantidadAnular < 1) cantidadAnular = 1;
            if (cantidadAnular > maxCantidad) cantidadAnular = maxCantidad;

            const productoNombre = document.getElementById('rvProductName').textContent;
            const precioInventario = parseFloat(document.getElementById('rvProductName').dataset.precioInventario) || 0;

            const res = await window.electronAPI.returnVenta(ventaId, varianteId, cantidadAnular, precioInventario, productoNombre);
            if (res.success) {
                if (varianteId) showToast('Venta Anulada', `Venta anulada y stock devuelto exitosamente.`, 'success');
                else showToast('Venta Anulada', `Venta anulada (sin devolución de stock).`, 'info');

                closeReturnVariantModal();
                const fecha = document.getElementById('fechaHistorial').value;
                if (fecha) loadHistorialVentas(fecha, fecha);
                if (document.getElementById('inventario') && document.getElementById('inventario').classList.contains('active')) {
                    loadInventarioTable();
                }
            } else {
                showToast('Error', 'No se pudo anular: ' + res.error, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    });

    // =========================================================
    // PUNTO DE VENTA (POS) Y CARRITO
    // =========================================================
    let cart = [];
    let currentPOSProducts = [];

    async function loadPOSCatalog(category = 'TODAS', searchTerm = '') {
        const grid = document.getElementById('productosGrid');
        grid.innerHTML = '<div style="color:var(--text-muted); padding:20px;">Cargando catálogo...</div>';

        let todosLosProductos = await window.electronAPI.getProductos();

        // ==========================================
        // GENERACIÓN DINÁMICA DE CATEGORÍAS
        // ==========================================
        const uniqueCategories = [...new Set(todosLosProductos.map(p => p.categoria).filter(c => c))];

        // 1. Actualizar el Datalist del formulario "Agregar Producto" (Por si agregan desde el modal)
        loadFormCategorias();

        // 2. Actualizar las pestañas del POS
        const tabsContainer = document.getElementById('categoriasTabsVenta');
        if (tabsContainer) {
            let tabsHTML = `<button class="tab-btn ${category === 'TODAS' ? 'active' : ''}" data-categoria-venta="TODAS">TODAS</button>`;
            if (window.innerWidth <= 1024) {
                tabsHTML += `<button class="tab-btn ${category === 'ESCANER' ? 'active' : ''}" data-categoria-venta="ESCANER" style="color:var(--primary-emerald);"><i class="fa-solid fa-barcode"></i> ESCÁNER</button>`;
            }
            tabsHTML += uniqueCategories.map(c => `
                <button class="tab-btn ${category === c ? 'active' : ''}" data-categoria-venta="${c}">${c.toUpperCase()}</button>
            `).join('');
            tabsContainer.innerHTML = tabsHTML;

            // Re-asignar eventos a los nuevos botones
            document.querySelectorAll('#categoriasTabsVenta .tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selectedCat = e.target.getAttribute('data-categoria-venta');
                    loadPOSCatalog(selectedCat, document.getElementById('buscarProducto').value);
                });
            });
        }
        // ==========================================

        let productosFiltrados = todosLosProductos;

        if (category !== 'TODAS') {
            if (category === 'ESCANER') {
                productosFiltrados = [];
            } else {
                productosFiltrados = productosFiltrados.filter(p => p.categoria === category);
            }
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            let baseList = category === 'ESCANER' ? todosLosProductos : productosFiltrados;
            productosFiltrados = baseList.filter(p =>
                p.nombre.toLowerCase().includes(term) ||
                p.codigo.toLowerCase().includes(term) ||
                (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term)) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(term))
            );
        }

        // Ordenar productos: con stock primero, sin stock (fantasmas) al final
        productosFiltrados.sort((a, b) => {
            const stockA = a.stock || 0;
            const stockB = b.stock || 0;
            if (stockA > 0 && stockB <= 0) return -1;
            if (stockA <= 0 && stockB > 0) return 1;
            return 0;
        });

        currentPOSProducts = productosFiltrados;

        if (productosFiltrados.length === 0) {
            if (category === 'ESCANER' && !searchTerm) {
                grid.innerHTML = '<div style="color:var(--text-muted); padding:40px 20px; text-align:center; width:100%;"><i class="fa-solid fa-barcode" style="font-size:32px; margin-bottom:10px; opacity:0.5;"></i><br>Modo Escáner.<br>Busca o escanea un producto para agregarlo.</div>';
            } else {
                grid.innerHTML = '<div style="color:var(--text-muted); padding:20px; text-align:center; width:100%;">No se encontraron productos disponibles.</div>';
            }
            return;
        }

        grid.innerHTML = productosFiltrados.map(p => {
            const stockTotal = p.stock || 0;
            const hasStock = stockTotal > 0;
            const initial = p.nombre.substring(0, 2).toUpperCase();
            const imgHtml = p.imagen_url
                ? `<div class="producto-card-img" style="background-image: url('${p.imagen_url}'); background-size: cover; background-position: center; color: transparent;"></div>`
                : `<div class="producto-card-img">${initial}</div>`;

            return `
                <div class="producto-card glass-panel ${!hasStock ? 'sin-stock' : ''}" onclick="openVariantSelector(${p.id})">
                    ${imgHtml}
                    <div class="producto-card-name" title="${p.nombre}">${p.nombre}</div>
                    <div class="producto-card-price">$${(p.precioVenta || 0).toFixed(2)}</div>
                    <div class="producto-card-stock ${stockTotal <= 5 ? 'bajo' : ''}">Stock: ${stockTotal}</div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('buscarProducto')?.addEventListener('input', (e) => {
        const activeCat = document.querySelector('#categoriasTabsVenta .tab-btn.active').getAttribute('data-categoria-venta');
        loadPOSCatalog(activeCat, e.target.value);
    });

    // Modal de Variantes POS
    window.openVariantSelector = (productId) => {
        const p = currentPOSProducts.find(x => x.id === productId);
        if (!p) return;

        document.getElementById('variantSelectProductName').textContent = p.nombre;
        const tbody = document.getElementById('variantSelectorBody');

        if (!p.variantes || p.variantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Este producto no tiene variantes registradas.</td></tr>';
        } else {
            const variantesDisponibles = p.variantes.filter(v => v.stock > 0);
            if (variantesDisponibles.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger);">Sin stock en todas las variantes.</td></tr>';
            } else {
                tbody.innerHTML = variantesDisponibles.map(v => `
                    <tr>
                        <td style="font-weight:600;">${v.talla}</td>
                        <td>${v.color}</td>
                        <td><span class="badge badge-success">${v.stock} un.</span></td>
                        <td>
                            <button class="btn btn-primary btn-small" onclick="addToCart(${p.id}, ${v.id})">
                                <i class="fa-solid fa-plus"></i> Añadir
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        document.getElementById('variantSelectorModal').classList.add('active');
    };

    window.closeVariantModal = () => {
        document.getElementById('variantSelectorModal').classList.remove('active');
    };

    window.addToCart = (productId, variantId) => {
        const p = currentPOSProducts.find(x => x.id === productId);
        const v = p.variantes.find(x => x.id === variantId);

        if (!p || !v || v.stock <= 0) return;

        const existingItem = cart.find(item => item.variant_id === variantId);

        if (existingItem) {
            if (existingItem.cantidad < v.stock) {
                existingItem.cantidad++;
            } else {
                showToast('Stock insuficiente', 'No hay más unidades de esta variante.', 'warning');
                return;
            }
        } else {
            cart.push({
                product_id: p.id,
                variant_id: v.id,
                nombre: p.nombre,
                talla: v.talla,
                color: v.color,
                precio_unitario: p.precioVenta,
                cantidad: 1,
                max_stock: v.stock
            });
        }

        closeVariantModal();
        updateCartUI();
        showToast('Añadido', `${p.nombre} agregado al carrito.`);
    };

    function updateCartUI() {
        const list = document.getElementById('carritoItems');
        if (cart.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding: 40px 20px; color:var(--text-muted);">El carrito está vacío</div>';
            document.getElementById('subtotal').textContent = '$0.00';
            document.getElementById('total').textContent = '$0.00';
            return;
        }

        let total = 0;
        list.innerHTML = cart.map((item, index) => {
            const sub = item.cantidad * item.precio_unitario;
            total += sub;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.nombre}</div>
                        <div class="cart-item-detail">${item.talla} | ${item.color}</div>
                        <div style="font-size:12px; color:var(--primary-emerald); margin-top:4px; cursor:pointer;" onclick="openDescuentoModal(${index})">
                            <i class="fa-solid fa-tag"></i> $${item.precio_unitario.toFixed(2)} c/u
                        </div>
                    </div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateCartQty(${index}, -1)">-</button>
                        <div class="qty-val">${item.cantidad}</div>
                        <button class="qty-btn" onclick="updateCartQty(${index}, 1)">+</button>
                    </div>
                    <div class="cart-item-total">$${sub.toFixed(2)}</div>
                </div>
            `;
        }).join('');

        document.getElementById('subtotal').textContent = `$${total.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }

    window.updateCartQty = (index, delta) => {
        const item = cart[index];
        const newQty = item.cantidad + delta;

        if (newQty <= 0) {
            cart.splice(index, 1);
        } else if (newQty > item.max_stock) {
            showToast('Límite de stock', 'No puedes añadir más unidades de las disponibles.', 'warning');
        } else {
            item.cantidad = newQty;
        }
        updateCartUI();
    };

    document.getElementById('limpiarCarrito')?.addEventListener('click', () => {
        cart = [];
        updateCartUI();
    });

    document.getElementById('procesarVenta')?.addEventListener('click', async (e) => {
        if (cart.length === 0) {
            showToast('Carrito vacío', 'Añade productos antes de procesar.', 'warning');
            return;
        }

        const btn = e.target.closest('button') || document.getElementById('procesarVenta');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

        try {
            const ventasPayload = cart.map(item => ({
                producto_id: item.product_id,
                variante_id: item.variant_id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario
            }));

            const res = await window.electronAPI.addVentaMultiple(ventasPayload);
            if (res.success) {
                showToast('¡Venta Procesada!', 'La transacción se registró con éxito y el stock fue actualizado.', 'success');
                cart = [];
                updateCartUI();
                loadPOSCatalog(); // Refrescar catálogo para nuevo stock
            } else {
                showToast('Error', 'No se pudo procesar la venta.', 'error');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    });

    // Descuentos en carrito
    let currentDiscountIndex = -1;
    window.openDescuentoModal = (index) => {
        currentDiscountIndex = index;
        const item = cart[index];
        document.getElementById('descuentoMensaje').innerHTML = `Aplicando descuento a: <strong style="color:var(--text-primary);">${item.nombre}</strong><br>Precio Original: $${item.precio_unitario.toFixed(2)}`;
        document.getElementById('descuentoInputVal').value = item.precio_unitario.toFixed(2);
        document.getElementById('descuentoModal').classList.add('active');
    };

    window.cerrarModalDescuento = () => {
        document.getElementById('descuentoModal').classList.remove('active');
        currentDiscountIndex = -1;
    };

    document.getElementById('btnDescuentoAceptar')?.addEventListener('click', () => {
        if (currentDiscountIndex === -1) return;
        const nuevoPrecio = parseFloat(document.getElementById('descuentoInputVal').value);
        if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
            showToast('Error', 'Ingresa un precio válido.', 'error');
            return;
        }

        cart[currentDiscountIndex].precio_unitario = nuevoPrecio;
        updateCartUI();
        cerrarModalDescuento();
        showToast('Descuento Aplicado', 'El precio unitario ha sido actualizado.', 'success');
    });


    // =========================================================
    // INVENTARIO TABLA
    // =========================================================
    let currentInventarioCategoria = 'TODAS';
    let currentInventarioSearch = '';
    let inventarioProductosCache = [];

    async function loadInventarioTable() {
        const tbody = document.getElementById('inventarioTableBody');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Cargando inventario...</td></tr>';

        // Solo recargar de la base de datos si es llamado por actualizar o primera vez
        // (Para simplificar, recargaremos siempre y usaremos cache para filtrado rápido)
        inventarioProductosCache = await window.electronAPI.getProductos();

        renderInventarioCategorias();
        renderInventarioFiltros();
    }

    function renderInventarioCategorias() {
        const categoriasContainer = document.getElementById('categoriasTabsInventario');
        if (!categoriasContainer) return;

        const categoriasSet = new Set(inventarioProductosCache.map(p => p.categoria?.toUpperCase()).filter(Boolean));
        const categoriasArr = Array.from(categoriasSet).sort();

        let html = `<button class="tab-btn ${currentInventarioCategoria === 'TODAS' ? 'active' : ''}" data-categoria-inv="TODAS">TODAS</button>`;
        html += `<button class="tab-btn ${currentInventarioCategoria === 'SIN STOCK' ? 'active' : ''}" data-categoria-inv="SIN STOCK" style="color:var(--danger); border-color:var(--danger-glass);">SIN STOCK</button>`;
        html += `<button class="tab-btn ${currentInventarioCategoria === 'STOCK < 3' ? 'active' : ''}" data-categoria-inv="STOCK < 3" style="color:var(--warning); border-color:rgba(245, 158, 11, 0.2);">STOCK < 3</button>`;

        categoriasArr.forEach(c => {
            html += `<button class="tab-btn ${currentInventarioCategoria === c ? 'active' : ''}" data-categoria-inv="${c}">${c}</button>`;
        });

        categoriasContainer.innerHTML = html;

        // Add event listeners
        categoriasContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                categoriasContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentInventarioCategoria = e.target.getAttribute('data-categoria-inv');
                renderInventarioFiltros();
            });
        });
    }

    document.getElementById('buscarInventario')?.addEventListener('input', (e) => {
        currentInventarioSearch = e.target.value.toLowerCase().trim();
        renderInventarioFiltros();
    });

    function renderInventarioFiltros() {
        const tbody = document.getElementById('inventarioTableBody');

        let filtered = inventarioProductosCache;

        // Filtro Búsqueda
        if (currentInventarioSearch) {
            filtered = filtered.filter(p =>
                (p.nombre && p.nombre.toLowerCase().includes(currentInventarioSearch)) ||
                (p.codigo && p.codigo.toLowerCase().includes(currentInventarioSearch)) ||
                (p.codigo_barras && p.codigo_barras.toLowerCase().includes(currentInventarioSearch)) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(currentInventarioSearch))
            );
        }

        // Filtro Categoría
        if (currentInventarioCategoria === 'SIN STOCK') {
            filtered = filtered.filter(p => p.stock <= 0);
        } else if (currentInventarioCategoria === 'STOCK < 3') {
            filtered = filtered.filter(p => p.stock < 3);
        } else if (currentInventarioCategoria !== 'TODAS') {
            filtered = filtered.filter(p => p.categoria && p.categoria.toUpperCase() === currentInventarioCategoria);
        }

        // Calcular Estadísticas Globales (basadas en todo el inventario o filtrado, a elección. Mejor globales de lo filtrado)
        let totalArticulos = 0;
        let valorTotal = 0;
        let sinStockCount = 0;

        inventarioProductosCache.forEach(p => {
            if (p.stock <= 0) sinStockCount++;
        });

        filtered.forEach(p => {
            totalArticulos += p.stock;
            valorTotal += (p.stock * (p.precioInventario || 0));
        });

        const statArticulos = document.getElementById('statInventarioArticulos');
        const statValor = document.getElementById('statInventarioValor');
        const statSinStock = document.getElementById('statInventarioSinStock');

        if (statArticulos) statArticulos.textContent = totalArticulos;
        if (statValor) statValor.textContent = `$${valorTotal.toFixed(2)}`;
        if (statSinStock) statSinStock.textContent = sinStockCount;

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No se encontraron productos.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const variantesHTML = (p.variantes || []).map(v =>
                `<span style="display:inline-block; margin:2px; font-size:10px; padding:2px 6px; background:var(--emerald-glass); border-radius:4px; border:1px solid var(--border-emerald); color:var(--primary-emerald);">${v.talla} ${v.color} (${v.stock})</span>`
            ).join('');

            const fotosArray = [p.imagen_url, p.imagen_url_2, p.imagen_url_3, p.imagen_url_4].filter(u => u);
            const fotosParam = fotosArray.join(',');

            return `
                <tr>
                    <td><span class="badge" style="background:rgba(255,255,255,0.05);">${p.codigo}</span></td>
                    <td style="font-weight:600;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${p.imagen_url
                    ? `<div style="position:relative; width:36px; height:36px; cursor:zoom-in;" onclick="verFoto('${fotosParam}')" title="Clic para expandir">
                              <img src="${p.imagen_url}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border:1px solid rgba(0,0,0,0.1);">
                              ${fotosArray.length > 1 ? `<span style="position:absolute; bottom:-4px; right:-4px; background:var(--primary-emerald); color:white; font-size:9px; font-weight:bold; padding:2px 4px; border-radius:4px;">+${fotosArray.length - 1}</span>` : ''}
                           </div>`
                    : `<div style="width:36px; height:36px; border-radius:6px; background:var(--bg-glass); display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--text-muted); border:1px solid rgba(0,0,0,0.1);">${p.nombre.substring(0, 2).toUpperCase()}</div>`}
                            <span>${p.nombre}</span>
                        </div>
                    </td>
                    <td>${p.categoria}</td>
                    <td><div style="display:flex; flex-wrap:wrap; gap:4px; max-width:280px;">${variantesHTML || '<span style="color:var(--text-muted);">Sin variantes</span>'}</div></td>
                    <td><span class="badge ${p.stock <= 0 ? 'badge-danger' : 'badge-success'}">${p.stock} un.</span></td>
                    <td style="color:var(--text-muted);">$${(p.precioInventario || 0).toFixed(2)}</td>
                    <td style="color:var(--primary-emerald); font-weight:700;">$${(p.precioVenta || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn btn-secondary btn-small" onclick="editarProducto(${p.id})" title="Editar" style="margin-right:4px;">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="eliminarProducto(${p.id})" title="Eliminar" style="color:var(--danger); border-color:var(--danger-glass);">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.verFoto = (urlsStr) => {
        const urls = urlsStr.split(',').filter(u => u.trim() !== '');
        if (urls.length === 0) return;
        let currentIndex = 0;

        let modal = document.getElementById('visorFotoModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'visorFotoModal';
            modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s ease;';
            modal.innerHTML = `
                <div style="position:relative; width:90%; max-width:800px; display:flex; align-items:center; justify-content:center;">
                    <button id="visorBtnPrev" style="position:absolute; left:-50px; background:transparent; border:none; color:white; font-size:40px; cursor:pointer; padding:10px; transition:transform 0.2s; z-index:100000;">&#10094;</button>
                    <img id="visorFotoImg" src="" style="max-width:100%; max-height:80vh; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.5); transform:scale(0.8); transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    <button id="visorBtnNext" style="position:absolute; right:-50px; background:transparent; border:none; color:white; font-size:40px; cursor:pointer; padding:10px; transition:transform 0.2s; z-index:100000;">&#10095;</button>
                </div>
                <div id="visorDots" style="margin-top:20px; display:flex; gap:10px; z-index:100000;"></div>
                <button id="visorBtnClose" style="position:absolute; top:20px; right:30px; background:transparent; border:none; color:white; font-size:40px; cursor:pointer; z-index:100000;">&times;</button>
            `;
            document.body.appendChild(modal);

            document.getElementById('visorBtnClose').onclick = () => {
                modal.style.opacity = '0';
                document.getElementById('visorFotoImg').style.transform = 'scale(0.8)';
                setTimeout(() => modal.style.display = 'none', 300);
            };

            modal.onclick = (e) => {
                if (e.target === modal) document.getElementById('visorBtnClose').click();
            };
        }

        const imgEl = document.getElementById('visorFotoImg');
        const prevBtn = document.getElementById('visorBtnPrev');
        const nextBtn = document.getElementById('visorBtnNext');
        const dotsEl = document.getElementById('visorDots');

        const updateView = () => {
            imgEl.src = urls[currentIndex];
            const hasMultiple = urls.length > 1;
            prevBtn.style.display = hasMultiple ? 'block' : 'none';
            nextBtn.style.display = hasMultiple ? 'block' : 'none';

            dotsEl.innerHTML = urls.map((u, i) =>
                `<div style="width:12px; height:12px; border-radius:50%; background:${i === currentIndex ? 'white' : 'rgba(255,255,255,0.3)'}; cursor:pointer; transition:background 0.3s;" onclick="event.stopPropagation(); window.visorGoTo(${i})"></div>`
            ).join('');
        };

        window.visorGoTo = (i) => { currentIndex = i; updateView(); };
        prevBtn.onclick = (e) => { e.stopPropagation(); currentIndex = (currentIndex > 0) ? currentIndex - 1 : urls.length - 1; updateView(); };
        nextBtn.onclick = (e) => { e.stopPropagation(); currentIndex = (currentIndex < urls.length - 1) ? currentIndex + 1 : 0; updateView(); };

        updateView();

        modal.style.display = 'flex';
        void modal.offsetWidth;
        modal.style.opacity = '1';
        imgEl.style.transform = 'scale(1)';
    };

    document.getElementById('refreshInventario')?.addEventListener('click', loadInventarioTable);

    window.eliminarProducto = async (id) => {
        if (confirm('¿Estás seguro de eliminar este producto y todo su stock? Esta acción no se puede deshacer.')) {
            await window.electronAPI.deleteProducto(id);
            showToast('Eliminado', 'Producto borrado de la base de datos.', 'info');
            loadInventarioTable();
        }
    };


    // =========================================================
    // AGREGAR / EDITAR PRODUCTOS Y VARIANTES
    // =========================================================
    let variantesEditor = [{ talla: '', color: '', stock: 0 }];

    function renderVariantesEditor() {
        const list = document.getElementById('variantesList');
        if (variantesEditor.length === 0) {
            variantesEditor = [{ talla: '', color: '', stock: 0 }];
        }

        list.innerHTML = variantesEditor.map((v, index) => `
            <div class="variant-row">
                <input type="text" class="variant-input" value="${v.talla}" placeholder="Ej: UNITALLA / L" onchange="updateVar(${index}, 'talla', this.value)" style="color:var(--text-primary);" required>
                <input type="text" class="variant-input" value="${v.color}" placeholder="Ej: (Opcional)" onchange="updateVar(${index}, 'color', this.value)" style="color:var(--text-primary);">
                <input type="number" class="variant-input" value="${v.stock}" placeholder="0" min="0" onchange="updateVar(${index}, 'stock', this.value)" style="color:var(--text-primary);" required>
                <button type="button" class="btn btn-secondary btn-small" onclick="removeVar(${index})" style="color:var(--danger); height:100%; border:1px solid rgba(239, 68, 68, 0.2); visibility: ${variantesEditor.length > 1 ? 'visible' : 'hidden'};"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
    }

    // Llamar una vez al iniciar para que aparezca la matriz vacía
    renderVariantesEditor();

    window.updateVar = (index, field, val) => {
        variantesEditor[index][field] = field === 'stock' ? parseInt(val) || 0 : val;
    };

    window.removeVar = (index) => {
        if (variantesEditor.length <= 1) return;
        variantesEditor.splice(index, 1);
        renderVariantesEditor();
    };

    document.getElementById('btnAgregarVariante')?.addEventListener('click', () => {
        variantesEditor.push({ talla: '', color: '', stock: 0 });
        renderVariantesEditor();
    });

    // Función para comprimir imagen (Client-Side)
    async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                            type: 'image/webp',
                            lastModified: Date.now()
                        });
                        resolve(newFile);
                    }, 'image/webp', quality);
                };
            };
        });
    }

    window.previewImage = (input, index) => {
        const file = input.files[0];
        const preview = document.getElementById(`imagenPreview${index}`);
        const removeBtn = document.getElementById(`btnRemoveImg${index}`);

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                removeBtn.style.display = 'flex';
            }
            reader.readAsDataURL(file);
        } else if (!input.dataset.existingUrl) {
            preview.style.display = 'none';
            removeBtn.style.display = 'none';
            preview.src = '';
        } else {
            preview.src = input.dataset.existingUrl;
            preview.style.display = 'block';
            removeBtn.style.display = 'flex';
        }
    };

    window.removeImagePreview = (index) => {
        const input = document.getElementById(`imagenFile${index}`);
        input.value = '';
        delete input.dataset.existingUrl;
        const preview = document.getElementById(`imagenPreview${index}`);
        preview.src = '';
        preview.style.display = 'none';
        document.getElementById(`btnRemoveImg${index}`).style.display = 'none';
    };

    async function generarCodigoInterno(categoriaName) {
        if (!categoriaName) return '';
        let prefix = categoriaName.charAt(0).toUpperCase();
        const todos = await window.electronAPI.getProductos();
        const productosCategoria = todos.filter(p => p.categoria && p.categoria.toUpperCase() === categoriaName.toUpperCase());
        return prefix + (productosCategoria.length + 1);
    }

    document.getElementById('categoria')?.addEventListener('input', async (e) => {
        const val = e.target.value.trim();

        if (window.renderCategoriasSugeridas) {
            window.renderCategoriasSugeridas(val);
        }

        const editId = document.getElementById('editProductId').value;
        if (!editId && val) { // Solo auto-generar si estamos creando un nuevo producto
            const nuevoCodigo = await generarCodigoInterno(val);
            document.getElementById('codigo').value = nuevoCodigo;
        } else if (!editId && !val) {
            document.getElementById('codigo').value = '';
        }
    });

    document.getElementById('productoForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editProductId').value;
        let codigoVal = document.getElementById('codigo').value.trim();
        const codigoBarrasVal = document.getElementById('codigo_barras').value.trim();
        const categoriaSeleccionada = document.getElementById('categoria').value.trim().toUpperCase();

        if (!codigoVal && !id) {
            // Asegurarnos de que el código no vaya vacío en creación
            codigoVal = await generarCodigoInterno(categoriaSeleccionada);
            document.getElementById('codigo').value = codigoVal;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
            // Manejar Subida de Imágenes (Hasta 4)
            let finalImageUrls = [null, null, null, null];

            for (let i = 1; i <= 4; i++) {
                const fileInput = document.getElementById(`imagenFile${i}`);
                if (fileInput) {
                    if (fileInput.files.length > 0) {
                        // Comprimir antes de subir
                        showToast('Info', `Comprimiendo foto ${i}...`, 'info');
                        const compressedFile = await compressImage(fileInput.files[0]);

                        showToast('Info', `Subiendo foto ${i}...`, 'info');
                        const uploadRes = await window.dexterDB.uploadImage(compressedFile, user.comercio_id);
                        if (uploadRes.success) {
                            finalImageUrls[i - 1] = uploadRes.url;
                        } else {
                            showToast('Error', `Fallo al subir foto ${i}: ` + uploadRes.error, 'error');
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Producto';
                            return;
                        }
                    } else if (fileInput.dataset.existingUrl) {
                        finalImageUrls[i - 1] = fileInput.dataset.existingUrl;
                    }
                }
            }

            const productoData = {
                categoria: document.getElementById('categoria').value,
                codigo: codigoVal,
                codigo_barras: codigoBarrasVal,
                nombre: document.getElementById('nombre').value,
                descripcion: document.getElementById('descripcion').value,
                imagenUrl: finalImageUrls[0],
                imagenUrl2: finalImageUrls[1],
                imagenUrl3: finalImageUrls[2],
                imagenUrl4: finalImageUrls[3],
                precioInventario: parseFloat(document.getElementById('precioInventario').value),
                precioVenta: parseFloat(document.getElementById('precioVenta').value),
                variantes: variantesEditor
            };

            if (id) {
                // Modo Edición
                const res = await window.electronAPI.updateProducto(id, productoData);
                if (res.success) {
                    showToast('Actualizado', 'Producto guardado con éxito.');
                    document.getElementById('productoForm').reset();
                    document.getElementById('editProductId').value = '';
                    variantesEditor = [];
                    renderVariantesEditor();
                    document.getElementById('formProductoTitle').innerHTML = '<i class="fa-solid fa-square-plus"></i> Registrar Nuevo Producto';
                    document.getElementById('btnCancelarEdicion').style.display = 'none';
                    navigateToSection('inventario');
                } else {
                    showToast('Error', res.error, 'error');
                }
            } else {
                // Modo Creación
                const res = await window.electronAPI.addProducto(productoData);
                if (res.success) {
                    showToast('Agregado', 'Producto registrado con éxito.');
                    document.getElementById('productoForm').reset();
                    if (document.getElementById('imagenFile1')) {
                        for (let i = 1; i <= 4; i++) removeImagePreview(i);
                    }
                    variantesEditor = [];
                    renderVariantesEditor();
                } else {
                    showToast('Error', res.error, 'error');
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Error', 'Excepción al guardar', 'error');
        } finally {
            btn.disabled = false;
            const currentId = document.getElementById('editProductId').value;
            btn.innerHTML = currentId ? '<i class="fa-solid fa-save"></i> Actualizar Producto' : '<i class="fa-solid fa-save"></i> Guardar Producto';
        }
    });

    window.editarProducto = async (id) => {
        const prod = await window.electronAPI.getProducto(id);
        if (!prod) return;

        document.getElementById('editProductId').value = prod.id;
        document.getElementById('categoria').value = prod.categoria || '';
        document.getElementById('codigo').value = prod.codigo;
        document.getElementById('codigo_barras').value = prod.codigo_barras || '';
        document.getElementById('nombre').value = prod.nombre;
        document.getElementById('descripcion').value = prod.descripcion || '';

        // Manejar edición de imagen (Limpiar file inputs y mostrar previews si hay URLs previas)
        const urls = [prod.imagen_url, prod.imagen_url_2, prod.imagen_url_3, prod.imagen_url_4];
        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById(`imagenFile${i}`);
            const preview = document.getElementById(`imagenPreview${i}`);
            const removeBtn = document.getElementById(`btnRemoveImg${i}`);

            if (input) input.value = '';

            if (urls[i - 1] && preview && removeBtn) {
                preview.src = urls[i - 1];
                preview.style.display = 'block';
                removeBtn.style.display = 'flex';
                if (input) input.dataset.existingUrl = urls[i - 1];
            } else if (preview && removeBtn) {
                preview.style.display = 'none';
                removeBtn.style.display = 'none';
                if (input) delete input.dataset.existingUrl;
            }
        }

        document.getElementById('precioInventario').value = prod.precioInventario || 0;
        document.getElementById('precioVenta').value = prod.precioVenta || 0;

        variantesEditor = (prod.variantes || []).map(v => ({ talla: v.talla, color: v.color, stock: v.stock }));
        renderVariantesEditor();

        document.getElementById('formProductoTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar Producto';
        document.getElementById('btnCancelarEdicion').style.display = 'block';
        const formBtn = document.querySelector('#productoForm button[type="submit"]');
        if (formBtn) formBtn.innerHTML = '<i class="fa-solid fa-save"></i> Actualizar Producto';

        navigateToSection('agregar');
    };

    document.getElementById('btnCancelarEdicion')?.addEventListener('click', () => {
        document.getElementById('productoForm').reset();
        document.getElementById('editProductId').value = '';
        variantesEditor = [];
        renderVariantesEditor();
        document.getElementById('formProductoTitle').innerHTML = '<i class="fa-solid fa-square-plus"></i> Registrar Nuevo Producto';
        document.getElementById('btnCancelarEdicion').style.display = 'none';
        const formBtn = document.querySelector('#productoForm button[type="submit"]');
        if (formBtn) formBtn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Producto';
        for (let i = 1; i <= 4; i++) removeImagePreview(i);
    });


    // =========================================================
    // GASTOS (OPEX)
    // =========================================================
    let gastosChartInstance = null;

    async function loadGastosTable() {
        const tbody = document.getElementById('gastosTableBody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando gastos...</td></tr>';

        let fechaInicio = null;
        let fechaFin = null;
        const filtroMes = document.getElementById('filtroGastosMes')?.value;

        if (filtroMes) {
            const [year, month] = filtroMes.split('-');
            fechaInicio = `${year}-${month}-01`;
            fechaFin = new Date(year, month, 0).toISOString().split('T')[0];
        }

        const gastos = await window.electronAPI.getGastos(fechaInicio, fechaFin);
        let total = 0;

        if (gastos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay egresos registrados.</td></tr>';
            document.getElementById('statGastosTotal').textContent = '$0.00';
            return;
        }

        tbody.innerHTML = gastos.map(g => {
            total += g.monto;
            const d = new Date(g.fecha).toLocaleDateString();
            return `
                <tr>
                    <td>${d}</td>
                    <td><span class="badge" style="background:rgba(255,255,255,0.05);">${g.categoria}</span></td>
                    <td style="font-weight:600;">${g.concepto}</td>
                    <td style="color:var(--danger); font-weight:700;">$${g.monto.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-secondary btn-small" onclick="eliminarGasto(${g.id})" style="color:var(--danger);">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('statGastosTotal').textContent = `$${total.toFixed(2)}`;

        // Renderizar gráfica
        const catMap = {};
        gastos.forEach(g => {
            if (!catMap[g.categoria]) catMap[g.categoria] = 0;
            catMap[g.categoria] += g.monto;
        });

        const ctx = document.getElementById('gastosChart');
        if (ctx) {
            if (gastosChartInstance) {
                gastosChartInstance.destroy();
            }

            gastosChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(catMap),
                    datasets: [{
                        data: Object.values(catMap),
                        backgroundColor: [
                            '#ef4444', '#f97316', '#f59e0b', '#84cc16',
                            '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#e2e8f0' } }
                    }
                }
            });
        }
    }

    document.getElementById('filtroGastosMes')?.addEventListener('change', () => {
        loadGastosTable();
    });

    document.getElementById('formGasto')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            concepto: document.getElementById('gastoConcepto').value,
            monto: document.getElementById('gastoMonto').value,
            categoria: document.getElementById('gastoCategoria').value,
            fecha: document.getElementById('gastoFecha').value
        };

        const res = await window.electronAPI.addGasto(data);
        if (res.success) {
            showToast('Guardado', 'Gasto registrado correctamente.', 'success');
            document.getElementById('formGasto').reset();
            loadGastosTable();
        } else {
            showToast('Error', 'No se pudo guardar el gasto', 'error');
        }
    });

    window.eliminarGasto = async (id) => {
        if (confirm('¿Eliminar este registro de gasto?')) {
            await window.electronAPI.deleteGasto(id);
            loadGastosTable();
        }
    };

    // =========================================================
    // REPORTES MENSUALES (PDF)
    // =========================================================
    document.getElementById('btnGenerarReportePDF')?.addEventListener('click', async () => {
        const mesInput = document.getElementById('reporteMesInput').value;
        if (!mesInput) {
            showToast('Alerta', 'Por favor selecciona un mes y año.', 'warning');
            return;
        }

        const btn = document.getElementById('btnGenerarReportePDF');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        try {
            // mesInput formato: "YYYY-MM"
            const year = mesInput.split('-')[0];
            const month = mesInput.split('-')[1];

            // Rango del mes
            const startDate = `${year}-${month}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Último día del mes

            // Obtener ventas
            const ventas = await window.dexterDB.getVentas(startDate, endDate, user.comercio_id);

            // Obtener gastos
            const gastos = await window.dexterDB.getGastos(startDate, endDate, user.comercio_id);

            // Obtener productos (para sacar el costo de las ventas y la ganancia)
            const productos = await window.dexterDB.getProductos(user.comercio_id);
            const prodMap = new Map(productos.map(p => [p.id, p]));

            // Cálculos
            let totalVentasBrutas = 0;
            let totalCostoVentas = 0;
            let totalGastos = 0;

            ventas.forEach(v => {
                totalVentasBrutas += (v.total || 0);
                const p = prodMap.get(v.producto_id);
                if (p) {
                    totalCostoVentas += ((p.precioInventario || 0) * v.cantidad);
                }
            });

            gastos.forEach(g => {
                totalGastos += (g.monto || 0);
            });

            const utilidadNeta = totalVentasBrutas - totalCostoVentas - totalGastos;

            // Formateadores
            const money = (val) => '$' + val.toFixed(2);

            // Construir HTML oculto para el PDF
            const pdfContainer = document.createElement('div');
            pdfContainer.style.padding = '20px';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            pdfContainer.style.color = '#333';
            pdfContainer.style.background = '#fff';
            pdfContainer.style.width = '700px';

            const comercioNombre = user.comercio ? user.comercio.nombre.toUpperCase() : 'COMERCIO';

            pdfContainer.innerHTML = `
                <div style="text-align:center; border-bottom: 2px solid #22c55e; padding-bottom:20px; margin-bottom:30px;">
                    <h1 style="margin:0; color:#1a1a1a; font-size:28px;">${comercioNombre}</h1>
                    <h3 style="margin:10px 0 0 0; color:#666;">Reporte Financiero Mensual</h3>
                    <p style="margin:5px 0 0 0; color:#888;">Período: ${month}/${year}</p>
                </div>
                
                <div style="display:flex; justify-content:space-between; margin-bottom:40px;">
                    <div style="background:#f3f4f6; padding:15px; border-radius:8px; width:30%; text-align:center;">
                        <div style="font-size:12px; color:#666; font-weight:bold;">VENTAS BRUTAS</div>
                        <div style="font-size:24px; color:#1a1a1a; font-weight:bold; margin-top:5px;">${money(totalVentasBrutas)}</div>
                    </div>
                    <div style="background:#fef2f2; padding:15px; border-radius:8px; width:30%; text-align:center;">
                        <div style="font-size:12px; color:#dc2626; font-weight:bold;">TOTAL GASTOS (OPEX)</div>
                        <div style="font-size:24px; color:#dc2626; font-weight:bold; margin-top:5px;">${money(totalGastos)}</div>
                    </div>
                    <div style="background:#f0fdf4; padding:15px; border-radius:8px; width:30%; text-align:center;">
                        <div style="font-size:12px; color:#16a34a; font-weight:bold;">UTILIDAD NETA</div>
                        <div style="font-size:24px; color:#16a34a; font-weight:bold; margin-top:5px;">${money(utilidadNeta)}</div>
                    </div>
                </div>

                <h4 style="margin-bottom:15px; color:#1a1a1a; border-bottom:1px solid #eee; padding-bottom:5px;">Resumen de Ventas</h4>
                ${ventas.length > 0 ? `
                <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:14px;">
                    <thead>
                        <tr style="background:#f8fafc; color:#475569; text-align:left;">
                            <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Fecha</th>
                            <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Producto</th>
                            <th style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:center;">Cant.</th>
                            <th style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ventas.map(v => {
                const p = prodMap.get(v.producto_id);
                const nombreProd = p ? p.nombre : 'Producto Eliminado';
                return `
                            <tr>
                                <td style="padding:10px; border-bottom:1px solid #f1f5f9;">${v.fecha.split('T')[0]}</td>
                                <td style="padding:10px; border-bottom:1px solid #f1f5f9;">${nombreProd}</td>
                                <td style="padding:10px; border-bottom:1px solid #f1f5f9; text-align:center;">${v.cantidad}</td>
                                <td style="padding:10px; border-bottom:1px solid #f1f5f9; text-align:right; color:#16a34a;">+${money(v.total)}</td>
                            </tr>
                            `;
            }).join('')}
                    </tbody>
                </table>
                ` : '<p style="color:#666; font-size:14px; margin-bottom:30px;">No se registraron ventas en este mes.</p>'}

                <h4 style="margin-bottom:15px; color:#1a1a1a; border-bottom:1px solid #eee; padding-bottom:5px;">Resumen de Egresos</h4>
                ${gastos.length > 0 ? `
                <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:14px;">
                    <thead>
                        <tr style="background:#f8fafc; color:#475569; text-align:left;">
                            <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Fecha</th>
                            <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Categoría</th>
                            <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Concepto</th>
                            <th style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right;">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${gastos.map(g => `
                            <tr>
                                <td style="padding:10px; border-bottom:1px solid #f1f5f9;">${g.fecha.split('T')[0]}</td>
                                <td style="padding:10px; border-bottom:1px solid #f1f5f9;">${g.categoria}</td>
                                <td style="padding:10px; border-bottom:1px solid #f1f5f9;">${g.concepto}</td>
                                <td style="padding:10px; border-bottom:1px solid #f1f5f9; text-align:right; color:#dc2626;">-${money(g.monto)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p style="color:#666; font-size:14px; margin-bottom:30px;">No se registraron gastos en este mes.</p>'}

                <div style="margin-top:50px; text-align:center; color:#94a3b8; font-size:12px;">
                    <p>Reporte generado automáticamente por DexterPV el ${new Date().toLocaleDateString()}</p>
                </div>
            `;

            // Configurar html2pdf
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Reporte_Financiero_${comercioNombre}_${year}_${month}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' }
            };

            // Generar y descargar
            html2pdf().set(opt).from(pdfContainer).save().then(() => {
                document.getElementById('reporteStatusMsg').style.display = 'block';
                setTimeout(() => {
                    document.getElementById('reporteStatusMsg').style.display = 'none';
                }, 5000);
            });

        } catch (error) {
            console.error(error);
            showToast('Error', 'Ocurrió un problema al generar el reporte.', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // =========================================================
    // CONSOLA SUPERADMIN (SAAS TENANT CONTROL)
    // =========================================================
    async function loadSuperadminData() {
        if (!isSuperadmin) return;

        const tbody = document.getElementById('comerciosTableBody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando inquilinos...</td></tr>';

        try {
            const comercios = await window.electronAPI.getComercios();

            let activos = 0;
            let bloqueados = 0;
            const hoy = new Date();

            tbody.innerHTML = comercios.map(c => {
                const fVenc = new Date(c.fecha_vencimiento);
                const vencido = fVenc < hoy;
                const bloqueado = c.estado_suscripcion !== 'activo' || vencido;
                const diffTime = fVenc.getTime() - hoy.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (bloqueado) bloqueados++;
                else activos++;

                let estadoHtml = `<span class="badge badge-success">Activo</span>`;
                if (c.estado_suscripcion === 'suspendido') estadoHtml = `<span class="badge badge-warning">Suspendido</span>`;
                else if (vencido) estadoHtml = `<span class="badge badge-danger">Vencido</span>`;

                return `
                    <tr>
                        <td style="color:var(--text-muted);">#${c.id}</td>
                        <td style="font-weight:700; color:var(--text-primary);">${c.nombre}</td>
                        <td>${estadoHtml}</td>
                        <td style="text-transform:uppercase; font-size:11px;">${c.plan.replace('_', ' ')}</td>
                        <td>
                            ${fVenc.toLocaleDateString()}
                            ${vencido ? '<br><span style="color:var(--danger); font-size:10px;">Expirado</span>' : `<br><span style="color:var(--text-muted); font-size:11px; font-weight:600;">(Quedan ${diffDays} días)</span>`}
                        </td>
                        <td>${c.usuariosCount} cuenta(s)</td>
                        <td>
                            <div style="font-size:12px; color:var(--text-primary); font-weight:600;">${((c.productosCount * 2 + c.ventasCount * 1.5 + c.usuariosCount * 1) / 1024).toFixed(3)} MB</div>
                            <div style="font-size:10px; color:var(--text-muted);">/ 500 MB</div>
                        </td>
                        <td>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button class="btn btn-secondary btn-small" onclick="saasVerDetalles(${c.id})" title="Ver Detalles" style="color:var(--text-primary); border-color:var(--border-dark);">
                                    <i class="fa-solid fa-eye"></i> Detalles
                                </button>
                                <button class="btn btn-primary btn-small" onclick="saasRenovarPersonalizado(${c.id})" title="Añadir o restar días de licencia" style="background:var(--info); color:white; border-color:var(--info);">
                                    <i class="fa-solid fa-calendar-plus"></i> Añadir Tiempo
                                </button>
                                ${bloqueado ? `
                                    <button class="btn btn-secondary btn-small" onclick="saasActivar(${c.id})" style="color:var(--primary-emerald);">Activar</button>
                                ` : `
                                    <button class="btn btn-secondary btn-small" onclick="saasSuspender(${c.id})" style="color:var(--warning);">Suspender</button>
                                `}
                                <button class="btn btn-danger btn-small" onclick="saasVencer(${c.id})" title="Forzar Vencimiento Inmediato">
                                    <i class="fa-solid fa-skull"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            document.getElementById('statTotalComercios').textContent = comercios.length;
            document.getElementById('statComerciosActivos').textContent = activos;
            document.getElementById('statComerciosBloqueados').textContent = bloqueados;

        } catch (err) {
            console.error(err);
        }
    }

    document.getElementById('formNuevoComercio')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

        try {
            const dbString = document.getElementById('nuevoComercioDbString')?.value.trim();

            const payload = {
                nombreComercio: document.getElementById('nuevoComercioNombre').value,
                plan: document.getElementById('nuevoComercioPlan').value,
                adminNombre: document.getElementById('nuevoComercioAdminNombre').value,
                adminUsuario: document.getElementById('nuevoComercioAdminUser').value,
                adminPassword: document.getElementById('nuevoComercioAdminPass').value,
                supabaseUrl: document.getElementById('nuevoComercioSupabaseUrl')?.value.trim(),
                supabaseKey: document.getElementById('nuevoComercioSupabaseKey')?.value.trim(),
                dbConnectionString: dbString
            };

            // 1. Aprovisionamiento Automático (Solo si estamos en el .EXE)
            if (window.desktopAPI && window.desktopAPI.isElectron && dbString) {
                showToast('Info', 'Aprovisionando base de datos remota...');
                const provRes = await window.desktopAPI.provisionDatabase(dbString);
                if (!provRes.success) {
                    showToast('Error SQL', 'Fallo al inyectar script: ' + provRes.error, 'error');
                    return; // Detenemos la creación si el script falló
                }
            }

            // 2. Guardar Inquilino en Master DB
            const res = await window.electronAPI.crearComercioCompleto(payload);

            if (res.success) {
                showToast('Éxito', `SaaS Inquilino "${res.comercio.nombre}" activado y configurado.`, 'success');
                document.getElementById('formNuevoComercio').reset();
                loadSuperadminData();
            } else {
                showToast('Error', res.error, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error', 'Error inesperado', 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Activar Cuenta & SaaS';
        }
    });

    // =========================================================
    // CONSOLA SUPERADMIN (GESTIÓN DE PERSONAL)
    // =========================================================
    async function loadSuperadminPersonalData() {
        if (!isSuperadmin) return;
        const datalist = document.getElementById('comerciosList');
        const searchInput = document.getElementById('superadminSearchComercio');
        const hiddenSelect = document.getElementById('superadminSelectComercio');

        const comercios = await window.electronAPI.getComercios();

        let optionsHtml = '';
        comercios.forEach(c => {
            optionsHtml += `<option value="${c.nombre} (ID: #${c.id})" data-id="${c.id}"></option>`;
        });
        datalist.innerHTML = optionsHtml;

        // Limpiar
        searchInput.value = '';
        hiddenSelect.value = '';
        document.getElementById('superadminPersonalContainer').style.display = 'none';
    }

    document.getElementById('superadminSearchComercio')?.addEventListener('input', (e) => {
        const val = e.target.value;
        const datalist = document.getElementById('comerciosList');
        const hiddenSelect = document.getElementById('superadminSelectComercio');

        // Buscar la opción seleccionada
        const option = Array.from(datalist.options).find(opt => opt.value === val);
        if (option) {
            hiddenSelect.value = option.getAttribute('data-id');
            hiddenSelect.dispatchEvent(new Event('change'));
        } else {
            hiddenSelect.value = '';
            document.getElementById('superadminPersonalContainer').style.display = 'none';
        }
    });

    document.getElementById('superadminSelectComercio')?.addEventListener('change', async (e) => {
        const comercioId = e.target.value;
        const container = document.getElementById('superadminPersonalContainer');
        const tbody = document.getElementById('superadminPersonalTableBody');

        if (!comercioId) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'grid';
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando personal...</td></tr>';

        const usuarios = await window.electronAPI.getUsuarios(comercioId);

        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Este cliente no tiene cuentas adicionales.</td></tr>';
            return;
        }

        tbody.innerHTML = usuarios.map(u => {
            let rolHtml = '';
            let btnActionHtml = '';

            if (u.rol === 'superadmin') return ''; // No mostrar al superadmin en la lista

            if (u.rol === 'admin') {
                rolHtml = '<span class="badge badge-success">Administrador Principal</span>';
                btnActionHtml = '<span style="font-size:12px; color:var(--text-muted);">-</span>'; // El admin principal no se desactiva aquí
            } else if (u.rol === 'inactivo') {
                rolHtml = '<span class="badge badge-danger">Desactivado</span>';
                btnActionHtml = `
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-primary btn-small" onclick="saToggleUserRole(${u.id}, '${u.rol}', ${comercioId})">Reactivar</button>
                        <button class="btn btn-secondary btn-small" style="color:var(--danger); border-color:var(--danger);" onclick="saDeleteUser(${u.id}, ${comercioId})" title="Eliminar Permanentemente"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            } else {
                rolHtml = '<span class="badge badge-warning">Vendedor</span>';
                btnActionHtml = `
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-secondary btn-small" style="color:var(--danger);" onclick="saToggleUserRole(${u.id}, '${u.rol}', ${comercioId})">Desactivar</button>
                        <button class="btn btn-secondary btn-small" style="color:var(--danger); border-color:var(--danger);" onclick="saDeleteUser(${u.id}, ${comercioId})" title="Eliminar Permanentemente"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            }

            // Ocultar contraseña inicialmente (se puede revelar con clic)
            const passHtml = `<span style="font-family:monospace; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="this.textContent = this.textContent === '••••••••' ? '${u.password}' : '••••••••'" title="Clic para revelar/ocultar">••••••••</span>`;

            return `
                <tr>
                    <td style="font-weight:600;">${u.nombre}</td>
                    <td><span style="background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; font-family:monospace;">${u.usuario}</span></td>
                    <td>${passHtml}</td>
                    <td>${rolHtml}</td>
                    <td>${btnActionHtml}</td>
                </tr>
            `;
        }).join('');
    });

    window.saToggleUserRole = async (id, currentRole, comercioId) => {
        let nuevoRol = currentRole === 'inactivo' ? 'vendedor' : 'inactivo';
        if (nuevoRol === 'inactivo' && !confirm('¿Estás seguro de desactivar esta cuenta?')) return;

        const res = await window.electronAPI.updateUsuarioRol(id, nuevoRol);
        if (res.success) {
            showToast('Actualizado', 'Rol de usuario actualizado.', 'success');
            // Simular el change del select para recargar
            document.getElementById('superadminSelectComercio').dispatchEvent(new Event('change'));
        } else {
            showToast('Error', res.error, 'error');
        }
    };

    window.saDeleteUser = async (id, comercioId) => {
        if (!confirm('¿Estás SEGURO de eliminar PERMANENTEMENTE a este trabajador? Esta acción no se puede deshacer.')) return;

        const res = await window.electronAPI.deleteUsuario(id);
        if (res.success) {
            showToast('Eliminado', 'Trabajador eliminado permanentemente.', 'info');
            document.getElementById('superadminSelectComercio').dispatchEvent(new Event('change'));
        } else {
            showToast('Error', res.error, 'error');
        }
    };

    document.getElementById('formSuperadminNuevoPersonal')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const comercioId = document.getElementById('superadminSelectComercio').value;
        if (!comercioId) return showToast('Error', 'Selecciona un comercio primero.', 'error');

        const data = {
            nombre: document.getElementById('saPersonalNombre').value,
            usuario: document.getElementById('saPersonalUsuario').value,
            password: document.getElementById('saPersonalPass').value,
            rol: document.getElementById('saPersonalRol').value,
            comercio_id: comercioId
        };

        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;

        const res = await window.electronAPI.addUsuario(data);
        btnSubmit.disabled = false;

        if (res.success) {
            showToast('Registrado', 'Empleado registrado correctamente.', 'success');
            document.getElementById('formSuperadminNuevoPersonal').reset();
            document.getElementById('superadminSelectComercio').dispatchEvent(new Event('change'));
        } else {
            showToast('Error', res.error, 'error');
        }
    });

    // Controladores de Licencia Globales
    window.saasRenovar = async (id, dias) => {
        if (confirm(`¿Renovar suscripción sumando ${dias} días al comercio?`)) {
            await window.electronAPI.renovarComercio(id, dias);
            showToast('Renovado', `Licencia extendida ${dias} días.`);
            loadSuperadminData();
        }
    };
    let tenantEnRenovacion = null;

    window.cerrarRenovarModal = () => {
        const modal = document.getElementById('renovarLicenciaModal');
        if (modal) modal.classList.remove('active');
        tenantEnRenovacion = null;
    };

    window.saasRenovarPersonalizado = (id) => {
        tenantEnRenovacion = id;
        document.getElementById('renovarDiasInput').value = '';
        const modal = document.getElementById('renovarLicenciaModal');
        if (modal) modal.classList.add('active');
    };

    document.getElementById('btnConfirmarRenovacion')?.addEventListener('click', async () => {
        if (!tenantEnRenovacion) return;

        const diasStr = document.getElementById('renovarDiasInput').value;
        const dias = parseInt(diasStr);

        if (isNaN(dias) || dias === 0) {
            showToast('Error', 'Ingresa una cantidad válida de días diferente de 0.', 'error');
            return;
        }

        const btn = document.getElementById('btnConfirmarRenovacion');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';

        try {
            await window.electronAPI.renovarComercio(tenantEnRenovacion, dias);
            showToast('Modificado', `Se han actualizado ${dias} día(s) de licencia.`);
            cerrarRenovarModal();
            loadSuperadminData();
        } catch (err) {
            console.error(err);
            showToast('Error', 'Fallo al modificar licencia', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Confirmar Cambios';
        }
    });
    window.saasSuspender = async (id) => {
        if (confirm('¿Suspender el acceso a este comercio inmediatamente? Aparecerá la pantalla de candado.')) {
            await window.electronAPI.suspenderComercio(id);
            showToast('Suspendido', 'Comercio bloqueado temporalmente.', 'warning');
            loadSuperadminData();
        }
    };
    window.saasActivar = async (id) => {
        await window.electronAPI.activarComercio(id);
        showToast('Activado', 'Acceso restaurado.', 'success');
        loadSuperadminData();
    };
    window.saasVencer = async (id) => {
        if (confirm('¿Forzar el vencimiento de la licencia al día de ayer? Esto bloqueará el acceso al instante.')) {
            await window.electronAPI.vencerComercio(id);
            showToast('Vencido', 'La licencia ha expirado forzosamente.', 'error');
            loadSuperadminData();
        }
    };

    // Modal de Detalles de Inquilino
    window.saasVerDetalles = async (id) => {
        const modal = document.getElementById('detallesComercioModal');
        const loader = document.getElementById('detallesLoader');
        const contenido = document.getElementById('detallesContenido');

        modal.classList.add('active');
        loader.style.display = 'block';
        contenido.style.display = 'none';

        const res = await window.electronAPI.getComercioDetalles(id);

        if (!res.success) {
            showToast('Error', 'No se pudieron cargar los detalles: ' + res.error, 'error');
            modal.classList.remove('active');
            return;
        }

        const data = res.data;
        const adminUser = (data.usuarios && data.usuarios.length > 0) ? data.usuarios[0] : null;

        // Llenar datos de Comercio
        document.getElementById('detComercioNombre').textContent = data.nombre;
        document.getElementById('detComercioId').textContent = '#' + data.id;
        document.getElementById('detComercioPlan').textContent = data.plan.replace('_', ' ');
        document.getElementById('detComercioVencimiento').textContent = new Date(data.fecha_vencimiento).toLocaleDateString();

        // Llenar datos de Conexión
        document.getElementById('detSupabaseUrl').textContent = data.supabase_url || 'N/A';
        document.getElementById('detDbString').textContent = data.db_connection_string || 'N/A';

        // Llenar datos de Admin
        if (adminUser) {
            document.getElementById('detAdminNombre').textContent = adminUser.nombre;
            document.getElementById('detAdminUsuario').textContent = adminUser.usuario;
            // Guardamos el password en un dataset para el toggle
            const pwdEl = document.getElementById('detAdminPassword');
            pwdEl.dataset.pwd = adminUser.password;
            pwdEl.textContent = '••••••••';
        } else {
            document.getElementById('detAdminNombre').textContent = 'N/A';
            document.getElementById('detAdminUsuario').textContent = 'N/A';
            document.getElementById('detAdminPassword').textContent = 'N/A';
            document.getElementById('detAdminPassword').dataset.pwd = '';
        }

        loader.style.display = 'none';
        contenido.style.display = 'block';

        // Set delete button onclick
        const btnEliminar = document.getElementById('btnEliminarInquilino');
        if (btnEliminar) {
            btnEliminar.setAttribute('onclick', `saasEliminarPermanente(${data.id}, '${data.nombre.replace(/'/g, "\\'")}')`);
        }
    };

    window.cerrarDetallesModal = () => {
        document.getElementById('detallesComercioModal').classList.remove('active');
    };

    window.toggleDetPassword = () => {
        const el = document.getElementById('detAdminPassword');
        const realPwd = el.dataset.pwd;
        if (!realPwd) return;

        if (el.textContent === '••••••••') {
            el.textContent = realPwd;
        } else {
            el.textContent = '••••••••';
        }
    };

    window.saasEliminarPermanente = async (id, nombre) => {
        if (confirm(`⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás absolutamente seguro de eliminar a "${nombre}"?\nEsta acción borrará el inquilino, su usuario administrador y no se puede deshacer.`)) {
            const res = await window.electronAPI.deleteComercioCompleto(id);
            if (res.success) {
                showToast('Eliminado', `El inquilino ${nombre} fue borrado del sistema.`, 'info');
                cerrarDetallesModal();
                loadSuperadminData();
            } else {
                showToast('Error', 'No se pudo eliminar: ' + res.error, 'error');
            }
        }
    };

    // Funciones para el Modal de Actualización Rápida (Escaner)
    window.openQuickUpdateModal = (product) => {
        document.getElementById('quProductId').value = product.id;
        document.getElementById('quProductName').textContent = product.nombre;
        document.getElementById('quCurrentStock').textContent = product.stock;
        document.getElementById('quStockAdjust').value = '';
        document.getElementById('quPrice').value = product.precioVenta || product.precio_venta || 0;
        document.getElementById('quickUpdateProductModal').classList.add('active');
        setTimeout(() => document.getElementById('quStockAdjust').focus(), 100);
    };

    window.closeQuickUpdateModal = () => {
        document.getElementById('quickUpdateProductModal').classList.remove('active');
    };

    document.getElementById('btnQuickUpdateAceptar')?.addEventListener('click', async () => {
        const pId = document.getElementById('quProductId').value;
        let p = null;
        if (typeof inventarioProductosCache !== 'undefined') {
            p = inventarioProductosCache.find(x => x.id == pId);
        }
        if (!p) p = await window.electronAPI.getProducto(pId);
        if (!p) return;

        const adjust = parseInt(document.getElementById('quStockAdjust').value) || 0;
        const newPrice = parseFloat(document.getElementById('quPrice').value);

        if (!isNaN(newPrice)) p.precioVenta = newPrice;

        if (!p.variantes) p.variantes = [];
        if (p.variantes.length === 0) {
            p.variantes.push({ talla: 'Única', color: 'Único', stock: Math.max(0, p.stock + adjust) });
        } else {
            p.variantes[0].stock = Math.max(0, p.variantes[0].stock + adjust);
        }

        const res = await window.electronAPI.updateProducto(pId, p);
        if (res.success) {
            showToast('Actualizado', `Stock y precio de ${p.nombre} actualizados.`, 'success');
            closeQuickUpdateModal();
            const inputCB = document.getElementById('codigo_barras');
            if (inputCB) {
                inputCB.value = '';
                inputCB.focus();
            }
            if (document.getElementById('inventario') && document.getElementById('inventario').classList.contains('active')) {
                loadInventarioTable();
            }
        } else {
            showToast('Error', 'No se pudo actualizar: ' + res.error, 'error');
        }
    });

    // =========================================================
    // PEDIDOS WEB
    // ==========================================
    window.loadPedidosWebTable = async () => {
        const tbody = document.getElementById('pedidosWebTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando pedidos...</td></tr>';

        const pedidos = await window.electronAPI.getPedidosWeb();

        if (!pedidos || pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay pedidos registrados en la tienda en línea.</td></tr>';
            return;
        }

        window.currentPedidosWeb = pedidos;

        tbody.innerHTML = pedidos.map(p => {
            let badgeClass = 'badge-warning'; // pendiente
            if (p.estado === 'confirmado') badgeClass = 'badge-success';
            if (p.estado === 'anulado') badgeClass = 'badge-danger';

            const fecha = new Date(p.fecha).toLocaleString();

            return `
                <tr>
                    <td>${fecha}</td>
                    <td style="font-weight:600;">${p.cliente_nombre}</td>
                    <td style="color:var(--primary-emerald); font-weight:700;">$${p.total.toFixed(2)}</td>
                    <td><span class="badge ${badgeClass}">${p.estado.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-small" onclick="verDetallesPedidoWeb(${p.id})">
                            <i class="fa-solid fa-eye"></i> Detalles
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    document.getElementById('btnRefreshPedidosWeb')?.addEventListener('click', loadPedidosWebTable);

    window.verDetallesPedidoWeb = (id) => {
        const pedido = window.currentPedidosWeb.find(p => p.id === id);
        if (!pedido) return;

        document.getElementById('pedidoWebCliente').textContent = pedido.cliente_nombre;
        document.getElementById('pedidoWebFecha').textContent = new Date(pedido.fecha).toLocaleString();
        document.getElementById('pedidoWebTotal').textContent = `$${pedido.total.toFixed(2)}`;

        const badge = document.getElementById('pedidoWebEstado');
        badge.textContent = pedido.estado.toUpperCase();
        badge.className = 'badge';
        if (pedido.estado === 'pendiente') badge.classList.add('badge-warning');
        if (pedido.estado === 'confirmado') badge.classList.add('badge-success');
        if (pedido.estado === 'anulado') badge.classList.add('badge-danger');

        const list = document.getElementById('pedidoWebArticulosList');
        if (pedido.detalles_pedido && pedido.detalles_pedido.length > 0) {
            list.innerHTML = pedido.detalles_pedido.map(item => {
                const imgHtml = item.imagen_url
                    ? `<img src="${item.imagen_url}" alt="${item.nombre}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px;">`
                    : `<div style="width: 40px; height: 40px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-right: 10px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-image" style="color: var(--text-muted);"></i></div>`;

                return `
                <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom:8px; padding:8px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px;">
                    <div style="display:flex; align-items: center;">
                        ${imgHtml}
                        <div>
                            <div style="font-weight:600;">${item.cantidad}x ${item.nombre}</div>
                            ${item.variante ? `<div style="font-size:12px; color:var(--text-muted);">${item.variante}</div>` : ''}
                        </div>
                    </div>
                    <div style="color:var(--primary-emerald); font-weight: 600;">$${(item.cantidad * item.precio).toFixed(2)}</div>
                </div>
            `}).join('');
        } else {
            list.innerHTML = '<div style="color:var(--text-muted);">Sin detalles.</div>';
        }

        const footer = document.querySelector('#detallesPedidoWebModal .modal-footer');
        if (pedido.estado === 'pendiente') {
            footer.innerHTML = `
                <button class="btn btn-secondary" onclick="closePedidoWebModal()">Cerrar</button>
                <button class="btn btn-primary" onclick="confirmarPedidoWeb(${pedido.id})" style="background-color: var(--primary-emerald); border-color: var(--primary-emerald);">
                    <i class="fa-solid fa-check"></i> Confirmar y Descontar Stock
                </button>
                <button class="btn btn-secondary" onclick="anularPedidoWeb(${pedido.id})" style="color: var(--danger); border-color: var(--danger-glass);">
                    <i class="fa-solid fa-ban"></i> Anular Pedido
                </button>
            `;
        } else {
            footer.innerHTML = `<button class="btn btn-secondary" onclick="closePedidoWebModal()">Cerrar</button>`;
        }

        document.getElementById('detallesPedidoWebModal').classList.add('active');
    };

    window.closePedidoWebModal = () => {
        document.getElementById('detallesPedidoWebModal').classList.remove('active');
    };

    window.confirmarPedidoWeb = async (id) => {
        if (!confirm('¿Deseas confirmar el pedido? Esto registrará la venta y descontará el stock.')) return;

        const pedido = window.currentPedidosWeb.find(p => p.id === id);
        if (!pedido) return;

        const ventasArray = pedido.detalles_pedido.map(item => ({
            producto_id: item.producto_id,
            variante_id: item.variante_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio
        }));

        try {
            const resVenta = await window.electronAPI.addVentaMultiple(ventasArray);
            if (resVenta.success) {
                const resPedido = await window.electronAPI.actualizarEstadoPedidoWeb(id, 'confirmado');
                if (resPedido.success) {
                    showToast('Confirmado', 'Pedido procesado y stock descontado.', 'success');
                    closePedidoWebModal();
                    loadPedidosWebTable();
                } else {
                    showToast('Aviso', 'Venta registrada pero falló actualizar estado del pedido.', 'warning');
                }
            } else {
                showToast('Error', 'No se pudo procesar la venta: ' + resVenta.error, 'error');
            }
        } catch (err) {
            showToast('Error', 'Error al confirmar: ' + err.message, 'error');
        }
    };

    window.anularPedidoWeb = async (id) => {
        if (!confirm('¿Deseas anular este pedido? El stock NO se descontará.')) return;
        try {
            const res = await window.electronAPI.actualizarEstadoPedidoWeb(id, 'anulado');
            if (res.success) {
                showToast('Anulado', 'El pedido ha sido anulado.', 'info');
                closePedidoWebModal();
                loadPedidosWebTable();
            } else {
                showToast('Error', res.error, 'error');
            }
        } catch (err) {
            showToast('Error', err.message, 'error');
        }
    };

});
