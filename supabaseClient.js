/**
 * supabaseClient.js
 * Capa de datos REAL para DexterPV usando Supabase
 */

const SUPABASE_URL = 'https://qlinfgsqpzyhioqygevv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaW5mZ3NxcHp5aGlvcXlnZXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNTY1NzcsImV4cCI6MjA5MjczMjU3N30.4AitjCtqVVNur8AV7FoA7Dp1mPoln8Ceazm4gpdJxT0';

// Nos aseguramos de que window.dexterDB SIEMPRE sea un objeto
window.dexterDB = {};

try {
  let centralSupabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  let tenantSupabase = null;

  try {
    const loggedUser = JSON.parse(sessionStorage.getItem('user'));
    if (loggedUser && loggedUser.comercio && loggedUser.comercio.supabase_url && loggedUser.comercio.supabase_key) {
        tenantSupabase = window.supabase.createClient(loggedUser.comercio.supabase_url, loggedUser.comercio.supabase_key);
    }
  } catch(e) { console.error(e); }

  function getBusinessDB() {
      return tenantSupabase || centralSupabase;
  }

  function getActiveComercioId(explicitComercioId) {
    if (explicitComercioId) return explicitComercioId;
    try {
      const loggedUser = JSON.parse(sessionStorage.getItem('user'));
      if (loggedUser) return loggedUser.comercio_id;
    } catch (e) { console.error(e); }
    return null;
  }

  window.dexterDB.login = async (usuario, password) => {
    try {
      if (!centralSupabase) return { success: false, error: 'Supabase no cargó en el navegador (posible bloqueo por extensión).' };
      const { data: usuarios, error } = await centralSupabase
        .from('usuarios')
        .select('*, comercio:comercios(*)')
        .eq('usuario', usuario)
        .eq('password', password);
        
      if (error) {
        console.error("Supabase Error:", error);
        return { success: false, error: 'Error DB: ' + error.message + ' (Detalles: ' + error.details + ')' };
      }
      if (!usuarios || usuarios.length === 0) {
        return { success: false, error: 'Credenciales inválidas.' };
      }

      const userFound = usuarios[0];

      if (userFound.rol === 'inactivo') {
        return { success: false, error: 'Cuenta de empleado desactivada. Contacta al administrador.' };
      }

      const comercioInfo = userFound.comercio;

      // ==========================================
      // LÓGICA DE AUTO-SUSPENSIÓN POR FECHA
      // ==========================================
      if (userFound.rol !== 'superadmin' && comercioInfo) {
        const fechaVencimiento = new Date(comercioInfo.fecha_vencimiento);
        const hoy = new Date();
        
        // Si la fecha actual ya superó la fecha de vencimiento y no está vencido en DB, lo actualizamos.
        if (hoy > fechaVencimiento && comercioInfo.estado_suscripcion === 'activo') {
            await centralSupabase
                .from('comercios')
                .update({ estado_suscripcion: 'vencido' })
                .eq('id', comercioInfo.id);
                
            comercioInfo.estado_suscripcion = 'vencido';
        }
      }

      return {
        success: true,
        user: {
          id: userFound.id,
          usuario: userFound.usuario,
          nombre: userFound.nombre,
          rol: userFound.rol,
          comercio_id: userFound.comercio_id,
          comercio: comercioInfo
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  window.dexterDB.getProductos = async (comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      let query = centralSupabase.from('productos').select('*, variantes(*)');
      if (targetId) query = query.eq('comercio_id', targetId);
      const { data, error } = await query;
      if (error) throw error;
      return data.map(p => {
        const stockTotal = (p.variantes || []).reduce((sum, v) => sum + v.stock, 0);
        return {
          id: p.id, codigo: p.codigo, codigo_barras: p.codigo_barras, nombre: p.nombre, descripcion: p.descripcion,
          precioInventario: p.precio_inventario, precioVenta: p.precio_venta,
          stock: stockTotal, variantes: p.variantes || [], categoria: p.categoria, comercio_id: p.comercio_id,
          imagen_url: p.imagen_url, imagen_url_2: p.imagen_url_2, imagen_url_3: p.imagen_url_3, imagen_url_4: p.imagen_url_4
        };
      });
    } catch (err) { return []; }
  };

  window.dexterDB.getProducto = async (id) => {
    try {
      const { data, error } = await centralSupabase.from('productos').select('*, variantes(*)').eq('id', id).single();
      if (error) throw error;
      const stockTotal = (data.variantes || []).reduce((sum, v) => sum + v.stock, 0);
      return {
        id: data.id, codigo: data.codigo, codigo_barras: data.codigo_barras, nombre: data.nombre, descripcion: data.descripcion,
        precioInventario: data.precio_inventario, precioVenta: data.precio_venta,
        stock: stockTotal, variantes: data.variantes || [], categoria: data.categoria, comercio_id: data.comercio_id,
        imagen_url: data.imagen_url, imagen_url_2: data.imagen_url_2, imagen_url_3: data.imagen_url_3, imagen_url_4: data.imagen_url_4
      };
    } catch (err) { return null; }
  };

  // Subida de Archivos (Imágenes) a Supabase Storage
  window.dexterDB.uploadImage = async (file, comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      if (!targetId) return { success: false, error: 'Comercio no especificado.' };
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${targetId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await centralSupabase.storage
        .from('productos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;
      
      const { data: publicUrlData } = centralSupabase.storage
        .from('productos')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrlData.publicUrl };
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      return { success: false, error: err.message };
    }
  };

  window.dexterDB.addProducto = async (producto, comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      if (!targetId) return { success: false, error: 'Comercio no especificado.' };
      const prodPayload = {
        codigo: producto.codigo, codigo_barras: producto.codigo_barras, nombre: producto.nombre, descripcion: producto.descripcion,
        precio_inventario: producto.precioInventario, precio_venta: producto.precioVenta,
        categoria: producto.categoria, comercio_id: targetId, 
        imagen_url: producto.imagenUrl, imagen_url_2: producto.imagenUrl2, imagen_url_3: producto.imagenUrl3, imagen_url_4: producto.imagenUrl4
      };
      const { data: prodData, error: prodErr } = await centralSupabase.from('productos').insert([prodPayload]).select().single();
      if (prodErr) throw prodErr;
      if (producto.variantes && producto.variantes.length > 0) {
        const varPayload = producto.variantes.map(v => ({
          producto_id: prodData.id, sku: v.sku || `${prodData.codigo}-${v.talla}-${v.color}`,
          talla: v.talla, color: v.color, stock: v.stock
        }));
        await centralSupabase.from('variantes').insert(varPayload);
      }
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.updateProducto = async (id, producto) => {
    try {
      const prodPayload = {
        codigo: producto.codigo, codigo_barras: producto.codigo_barras, nombre: producto.nombre, descripcion: producto.descripcion,
        precio_inventario: producto.precioInventario, precio_venta: producto.precioVenta, categoria: producto.categoria,
        imagen_url: producto.imagenUrl, imagen_url_2: producto.imagenUrl2, imagen_url_3: producto.imagenUrl3, imagen_url_4: producto.imagenUrl4
      };
      const { error: prodErr } = await centralSupabase.from('productos').update(prodPayload).eq('id', id);
      if (prodErr) throw prodErr;
      await centralSupabase.from('variantes').delete().eq('producto_id', id);
      if (producto.variantes && producto.variantes.length > 0) {
        const varPayload = producto.variantes.map(v => ({
          producto_id: id, sku: v.sku || `${prodPayload.codigo}-${v.talla}-${v.color}`,
          talla: v.talla, color: v.color, stock: v.stock
        }));
        await centralSupabase.from('variantes').insert(varPayload);
      }
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.deleteProducto = async (id) => {
    try {
      const { error } = await centralSupabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.addVentaMultiple = async (ventasArray, comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      if (!targetId) return { success: false, error: 'Comercio no especificado.' };
      const fecha = new Date().toISOString();
      const ventasPayload = ventasArray.map(item => ({
        producto_id: item.producto_id, cantidad: item.cantidad, precio_unitario: item.precio_unitario,
        total: item.cantidad * item.precio_unitario, fecha: fecha, comercio_id: targetId
      }));
      const { error: vErr } = await centralSupabase.from('ventas').insert(ventasPayload);
      if (vErr) throw vErr;
      for (const item of ventasArray) {
        if (item.variante_id) {
          const { data: vData } = await centralSupabase.from('variantes').select('stock').eq('id', item.variante_id).single();
          if (vData) {
            await centralSupabase.from('variantes').update({ stock: Math.max(0, vData.stock - item.cantidad) }).eq('id', item.variante_id);
          }
        }
      }
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.getVentas = async (fechaInicio, fechaFin, comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      let query = centralSupabase.from('ventas').select('*');
      if (targetId) query = query.eq('comercio_id', targetId);
      if (fechaInicio && fechaFin) query = query.gte('fecha', fechaInicio + 'T00:00:00').lte('fecha', fechaFin + 'T23:59:59');
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) { return []; }
  };

  window.dexterDB.getEstadisticas = async (comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      const productos = await window.dexterDB.getProductos(targetId);
      const ventas = await window.dexterDB.getVentas(null, null, targetId);
      const totalProductos = productos.length;
      const inventarioTotal = productos.reduce((sum, p) => sum + ((p.precioInventario || 0) * (p.stock || 0)), 0);
      let gananciasTotales = 0;
      const prodMap = new Map(productos.map(p => [p.id, p]));
      ventas.forEach(v => {
        const p = prodMap.get(v.producto_id);
        if (p) gananciasTotales += ((v.precio_unitario - (p.precioInventario || 0)) * v.cantidad);
      });
      const hoyStr = new Date().toISOString().split('T')[0];
      const ventasHoy = ventas.filter(v => v.fecha.split('T')[0] === hoyStr).reduce((sum, v) => sum + (v.total || 0), 0);
      
      // Gráfica últimos 6 meses
      const grafico = { labels: [], data: [] };
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${year}-${month}`;
        
        const label = d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
        const suma = ventas.filter(v => v.fecha.startsWith(monthPrefix)).reduce((sum, v) => sum + (v.total || 0), 0);
        
        grafico.labels.push(label);
        grafico.data.push(parseFloat(suma.toFixed(2)));
      }

      return {
        totalProductos, inventarioTotal: parseFloat(inventarioTotal.toFixed(2)),
        gananciasTotales: parseFloat(gananciasTotales.toFixed(2)), ventasHoy: parseFloat(ventasHoy.toFixed(2)),
        grafico
      };
    } catch (err) { return { totalProductos:0, inventarioTotal:0, gananciasTotales:0, ventasHoy:0, grafico: {labels:[], data:[]} }; }
  };

  window.dexterDB.getGastos = async (fechaInicio = null, fechaFin = null, comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      let query = centralSupabase.from('gastos').select('*');
      if (targetId) query = query.eq('comercio_id', targetId);
      if (fechaInicio && fechaFin) query = query.gte('fecha', fechaInicio + 'T00:00:00').lte('fecha', fechaFin + 'T23:59:59');
      const { data, error } = await query.order('fecha', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) { return []; }
  };

  window.dexterDB.addGasto = async (gasto, comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      if (!targetId) return { success: false, error: 'Comercio no especificado.' };
      const nuevo = { concepto: gasto.concepto, monto: parseFloat(gasto.monto), categoria: gasto.categoria, fecha: gasto.fecha || new Date().toISOString(), comercio_id: targetId };
      const { error } = await centralSupabase.from('gastos').insert([nuevo]);
      if (error) throw error;
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.deleteGasto = async (id) => {
    try {
      const { error } = await centralSupabase.from('gastos').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.getComercios = async () => {
    try {
      const { data, error } = await centralSupabase
        .from('comercios')
        .select(`
          *,
          usuarios(count),
          productos(count),
          ventas(count)
        `)
        .order('id', { ascending: true });
        
      if (error) {
        console.error("Supabase Error:", error);
        return [];
      }

      // AUTO-SUSPENSIÓN MASIVA (Actualiza la BD para asegurar consistencia)
      const hoy = new Date();
      const actualizaciones = [];

      const comerciosMap = data.map(c => {
        const fVenc = new Date(c.fecha_vencimiento);
        
        // Si la fecha pasó y en DB sigue "activo", lo preparamos para actualizar
        if (fVenc < hoy && c.estado_suscripcion === 'activo') {
            actualizaciones.push(
                centralSupabase.from('comercios').update({ estado_suscripcion: 'vencido' }).eq('id', c.id)
            );
            c.estado_suscripcion = 'vencido';
        }

        return {
          ...c,
          usuariosCount: (c.usuarios && c.usuarios[0]) ? c.usuarios[0].count : 0,
          productosCount: (c.productos && c.productos[0]) ? c.productos[0].count : 0,
          ventasCount: (c.ventas && c.ventas[0]) ? c.ventas[0].count : 0
        };
      });

      // Ejecutar actualizaciones en background (sin bloquear el renderizado)
      if (actualizaciones.length > 0) {
          Promise.all(actualizaciones).catch(err => console.error("Error auto-suspendiendo", err));
      }

      return comerciosMap;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  window.dexterDB.getComercioDetalles = async (comercioId) => {
    try {
      const { data, error } = await centralSupabase
        .from('comercios')
        .select(`
          *,
          usuarios(*)
        `)
        .eq('id', comercioId)
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  window.dexterDB.addComercio = async (nombre, plan, fechaVencimiento, supabaseUrl, supabaseKey, dbConnectionString) => {
    try {
      const { data, error } = await centralSupabase.from('comercios').insert([{
        nombre, plan: plan || '1_mes', estado_suscripcion: 'activo',
        fecha_vencimiento: fechaVencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        supabase_url: supabaseUrl || null,
        supabase_key: supabaseKey || null,
        db_connection_string: dbConnectionString || null
      }]).select().single();
      if (error) throw error;
      return { success: true, comercio: data };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.updateSuscripcion = async (comercioId, estado, plan, fechaVencimiento) => {
    try {
      const updateData = {};
      if (estado) updateData.estado_suscripcion = estado;
      if (plan) updateData.plan = plan;
      if (fechaVencimiento) updateData.fecha_vencimiento = fechaVencimiento;
      const { data, error } = await centralSupabase.from('comercios').update(updateData).eq('id', comercioId).select().single();
      if (error) throw error;
      try {
        const loggedUser = JSON.parse(sessionStorage.getItem('user'));
        if (loggedUser && loggedUser.comercio_id === parseInt(comercioId)) {
          loggedUser.comercio = data;
          sessionStorage.setItem('user', JSON.stringify(loggedUser));
        }
      } catch (e) {}
      return { success: true, comercio: data };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.crearUsuarioComercio = async (usuario, password, nombre, rol, comercioId) => {
    try {
      const { data, error } = await centralSupabase.from('usuarios').insert([{
        usuario, password, nombre, rol: rol || 'admin', comercio_id: comercioId
      }]).select().single();
      if (error) throw error;
      return { success: true, usuario: data };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.crearComercioCompleto = async ({ nombreComercio, plan, adminNombre, adminUsuario, adminPassword, supabaseUrl, supabaseKey, dbConnectionString }) => {
    try {
      let dias = plan === '6_meses' ? 180 : (plan === '1_ano' ? 365 : (plan === 'gratis' ? 7 : 30));
      const fechaVencimiento = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
      const resComercio = await window.dexterDB.addComercio(nombreComercio, plan, fechaVencimiento, supabaseUrl, supabaseKey, dbConnectionString);
      if (!resComercio.success) return resComercio;
      const resUsuario = await window.dexterDB.crearUsuarioComercio(adminUsuario, adminPassword, adminNombre, 'admin', resComercio.comercio.id);
      if (!resUsuario.success) {
        await centralSupabase.from('comercios').delete().eq('id', resComercio.comercio.id);
        return { success: false, error: resUsuario.error };
      }
      return { success: true, comercio: resComercio.comercio, usuario: resUsuario.usuario };
    } catch (err) { return { success: false, error: err.message }; }
  };

  window.dexterDB.deleteComercioCompleto = async (comercioId) => {
    try {
      // Borrar usuarios del comercio primero (por si no hay cascada)
      await centralSupabase.from('usuarios').delete().eq('comercio_id', comercioId);
      // Borrar el comercio (esto debería borrar en cascada productos, ventas, etc., si está bien configurada la BD)
      const { error } = await centralSupabase.from('comercios').delete().eq('id', comercioId);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  window.dexterDB.renovarComercio = async (comercioId, dias) => {
    try {
      const { data, error } = await centralSupabase.from('comercios').select('fecha_vencimiento').eq('id', comercioId).single();
      if (error || !data) throw error;
      let fechaActual = new Date(data.fecha_vencimiento);
      if (fechaActual < new Date()) fechaActual = new Date();
      const nuevaFecha = new Date(fechaActual.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();
      return await window.dexterDB.updateSuscripcion(comercioId, 'activo', null, nuevaFecha);
    } catch (e) { return { success: false, error: e.message }; }
  };

  window.dexterDB.suspenderComercio = async (comercioId) => { return await window.dexterDB.updateSuscripcion(comercioId, 'suspendido', null, null); };
  window.dexterDB.activarComercio = async (comercioId) => { return await window.dexterDB.updateSuscripcion(comercioId, 'activo', null, null); };
  window.dexterDB.vencerComercio = async (comercioId) => { return await window.dexterDB.updateSuscripcion(comercioId, 'vencido', null, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); };

  // ==========================================
  // GESTIÓN DE PERSONAL (EMPLEADOS)
  // ==========================================
  window.dexterDB.getUsuarios = async (comercioId) => {
    try {
      const targetId = getActiveComercioId(comercioId);
      if (!targetId) return [];
      const { data, error } = await centralSupabase
        .from('usuarios')
        .select('*')
        .eq('comercio_id', targetId)
        .order('id', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  window.dexterDB.addUsuario = async (data) => {
    try {
      const targetId = getActiveComercioId(data.comercio_id);
      if (!targetId) return { success: false, error: 'Comercio no especificado.' };
      const { error } = await centralSupabase
        .from('usuarios')
        .insert([{
          nombre: data.nombre,
          usuario: data.usuario,
          password: data.password,
          rol: data.rol,
          comercio_id: targetId
        }]);
      if (error) {
        if (error.code === '23505') return { success: false, error: 'El nombre de usuario ya existe. Elige otro.' };
        throw error;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  window.dexterDB.updateUsuarioRol = async (id, nuevoRol) => {
    try {
      const { error } = await centralSupabase
        .from('usuarios')
        .update({ rol: nuevoRol })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  window.dexterDB.deleteUsuario = async (id) => {
    try {
      const { error } = await centralSupabase
        .from('usuarios')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Alias para app.js
  window.electronAPI = window.dexterDB;

} catch (globalError) {
  console.error("Error global en supabaseClient:", globalError);
}
