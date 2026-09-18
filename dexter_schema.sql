-- =========================================================================================
-- DEXTER PV - SCRIPT MAESTRO DE BASE DE DATOS (MULTI-TENANT / TENANT INDIVIDUAL)
-- Este script se ejecutará automáticamente por el .EXE en cada nueva base de datos.
-- =========================================================================================

-- 1. TABLA COMERCIOS (Si es base dedicada, solo tendrá 1 registro, pero mantenemos la estructura)
CREATE TABLE public.comercios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT '1_mes',
    estado_suscripcion VARCHAR(50) NOT NULL DEFAULT 'activo',
    fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
    supabase_url TEXT,
    supabase_key TEXT,
    db_connection_string TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA USUARIOS
CREATE TABLE public.usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'admin',
    comercio_id INTEGER REFERENCES public.comercios(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA PRODUCTOS
CREATE TABLE public.productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL,
    codigo_barras TEXT,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    imagen_url_2 TEXT,
    imagen_url_3 TEXT,
    imagen_url_4 TEXT,
    precio_inventario DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    precio_venta DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    categoria VARCHAR(100) NOT NULL DEFAULT 'Otros',
    comercio_id INTEGER NOT NULL REFERENCES public.comercios(id) ON DELETE CASCADE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA VARIANTES
CREATE TABLE public.variantes (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    talla VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0
);

-- 5. TABLA VENTAS
CREATE TABLE public.ventas (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comercio_id INTEGER NOT NULL REFERENCES public.comercios(id) ON DELETE CASCADE,
    ticket_codigo VARCHAR(50)
);

-- 6. TABLA GASTOS
CREATE TABLE public.gastos (
    id SERIAL PRIMARY KEY,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    categoria VARCHAR(100) NOT NULL DEFAULT 'Otros',
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comercio_id INTEGER NOT NULL REFERENCES public.comercios(id) ON DELETE CASCADE
);

-- =========================================================================================
-- CONFIGURACIÓN AUTOMÁTICA DE SUPABASE STORAGE (FOTOS DE PRODUCTOS)
-- =========================================================================================

-- Insertar el Bucket 'productos' si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- Borrar políticas viejas si existieran para evitar errores al re-correr el script
DROP POLICY IF EXISTS "Permitir subida de fotos publicas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualizar fotos publicas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir borrar fotos publicas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura de fotos publicas" ON storage.objects;

-- Política: Cualquiera puede subir fotos al bucket 'productos'
CREATE POLICY "Permitir subida de fotos publicas" 
ON storage.objects FOR INSERT TO public 
WITH CHECK (bucket_id = 'productos');

-- Política: Cualquiera puede actualizar fotos en el bucket 'productos'
CREATE POLICY "Permitir actualizar fotos publicas" 
ON storage.objects FOR UPDATE TO public 
USING (bucket_id = 'productos');

-- Política: Cualquiera puede borrar fotos en el bucket 'productos'
CREATE POLICY "Permitir borrar fotos publicas" 
ON storage.objects FOR DELETE TO public 
USING (bucket_id = 'productos');

-- Política: Cualquiera puede leer fotos en el bucket 'productos'
CREATE POLICY "Permitir lectura de fotos publicas" 
ON storage.objects FOR SELECT TO public 
USING (bucket_id = 'productos');

-- =========================================================================================
-- DATOS SEMILLA INICIALES OBLIGATORIOS (SUPERADMIN)
-- =========================================================================================
INSERT INTO public.usuarios (usuario, password, nombre, rol, comercio_id) 
VALUES ('admin', '1234', 'Superadmin Propietario', 'superadmin', NULL)
ON CONFLICT (usuario) DO NOTHING;

-- 7. TABLA PEDIDOS WEB
CREATE TABLE public.pedidos_web (
    id SERIAL PRIMARY KEY,
    cliente_nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(50),
    direccion_envio TEXT,
    cp VARCHAR(20),
    detalles_pedido JSONB NOT NULL,
    subtotal_articulos DECIMAL(12, 2) DEFAULT 0.00,
    monto_envio DECIMAL(12, 2) DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL,
    metodo_envio VARCHAR(150),
    paqueteria VARCHAR(100),
    numero_rastreo VARCHAR(100),
    metodo_pago VARCHAR(100) DEFAULT 'WhatsApp / Por Acordar',
    folio_pago VARCHAR(100),
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- pendiente, aprobado, enviado, anulado
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comercio_id INTEGER REFERENCES public.comercios(id) ON DELETE CASCADE
);

-- MIGRACIÓN / ACTUALIZACIÓN SI LA TABLA YA EXISTE:
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS direccion_envio TEXT;
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS cp VARCHAR(20);
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS subtotal_articulos DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS monto_envio DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS metodo_envio VARCHAR(150);
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS paqueteria VARCHAR(100);
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS numero_rastreo VARCHAR(100);
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(100) DEFAULT 'WhatsApp / Por Acordar';
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS folio_pago VARCHAR(100);
ALTER TABLE public.pedidos_web ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Quitar el candado de seguridad (RLS) para que la tienda (usuario anónimo) pueda guardar pedidos libremente
ALTER TABLE public.pedidos_web DISABLE ROW LEVEL SECURITY;

-- 8. TABLA CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nombre_completo TEXT,
    telefono TEXT,
    email TEXT,
    comercio_id INTEGER REFERENCES public.comercios(id) ON DELETE CASCADE,
    direccion TEXT,
    ciudad TEXT,
    cp TEXT,
    referencias TEXT
);

-- Quitar el candado de seguridad (RLS) para la tabla clientes
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;

