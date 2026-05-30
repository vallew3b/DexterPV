# Documentación del Proyecto: DexterPV (Mora Console)

## Visión General
**DexterPV** (también conocido como **Mora Console** para el entorno de Superadministrador) es una aplicación de escritorio SaaS (Software as a Service) multi-tenant diseñada para la gestión de puntos de venta (POS) y control de inventarios. Está orientada a negocios locales y PyMES, ofreciendo herramientas para ventas, manejo de stock, control de gastos operativos (OPEX) y análisis financiero.

## Arquitectura y Stack Tecnológico
El proyecto está construido como una aplicación de escritorio híbrida utilizando tecnologías web empaquetadas:

*   **Frontend**: HTML5, CSS3 (Vanilla) y JavaScript (Vanilla).
*   **Contenedor de Escritorio**: **Electron** (`main.js` y `preload.js`), empaquetado con `electron-builder`.
*   **Base de Datos / Backend as a Service**: **Supabase** (PostgreSQL) para la autenticación y el almacenamiento de datos (`supabaseClient.js`).
*   **Librerías Adicionales**:
    *   `Chart.js`: Para visualización de datos y gráficos de ventas.
    *   `html2pdf.js`: Para la generación de reportes financieros en PDF.
    *   `pg` (node-postgres): Utilizado en el proceso principal de Electron para ejecutar scripts SQL maestros (`dexter_schema.sql`) y aprovisionar nuevas bases de datos de clientes (tenants).

## Estructura del Proyecto

*   **`main.js`**: Archivo principal de Electron. Crea la ventana, configura el aislamiento de contexto y maneja los eventos IPC (Inter-Process Communication), como la función `provision-database` para crear el esquema de nuevos clientes.
*   **`preload.js`**: Puente seguro entre el proceso principal de Node/Electron y el proceso de renderizado (frontend). Expone APIs específicas (`window.electronAPI`).
*   **`index.html`**: Pantalla de inicio de sesión. Conecta con Supabase Auth para validar credenciales y maneja la redirección.
*   **`dashboard.html`**: Estructura principal de la aplicación. Contiene todas las secciones (Dashboard, POS, Inventario, Finanzas, Perfil) ocultas o mostradas dinámicamente según la navegación.
*   **`app.js`**: Controlador principal de la lógica de negocio del frontend. Maneja la navegación, el control de acceso basado en roles (Superadmin, Administrador, Vendedor), el carrito de compras, filtrado de inventarios y cálculos financieros.
*   **`styles.css`**: Archivo principal de estilos, implementando un diseño moderno tipo "Glassmorphism".
*   **`supabaseClient.js`**: Capa de abstracción de base de datos. Inicializa el cliente de Supabase y contiene las consultas a las tablas.
*   **`dexter_schema.sql`**: Script SQL maestro utilizado para aprovisionar las tablas y políticas de seguridad (RLS) para nuevos comercios registrados.

## Módulos y Funcionalidades Principales

1.  **SaaS Mora Console (Superadmin)**
    *   Exclusivo para el usuario `superadmin`.
    *   Permite registrar nuevos "inquilinos" (tenants/comercios).
    *   Al registrar, ejecuta `dexter_schema.sql` mediante `pg` para preparar la base de datos del cliente de forma aislada.
    *   Manejo de suscripciones, licenciamiento y días restantes.

2.  **Dashboard (Inicio)**
    *   Métricas clave: Ventas de hoy, ganancias netas, valor total del inventario, cantidad de productos.
    *   Gráfica de ventas de los últimos 6 meses.
    *   Historial de ventas diarias detallado.

3.  **Punto de Venta (POS)**
    *   Catálogo de productos con búsqueda en tiempo real y filtrado por categorías.
    *   Selector de variantes integrado (talla, color) con validación de stock.
    *   Carrito de compras dinámico.
    *   Soporte para aplicación de descuentos manuales por producto.

4.  **Gestión de Inventario**
    *   Listado completo de productos con indicadores de stock.
    *   Formulario avanzado para agregar/editar productos.
    *   Matriz dinámica de variantes (Talla, Color, Stock).
    *   Soporte para múltiples imágenes por producto con previsualización.

5.  **Gastos y OPEX**
    *   Registro de egresos operativos (Renta, Marketing, Nómina, etc.).
    *   Listado histórico de gastos y visualización en gráficos de pastel.

6.  **Finanzas y Reportes**
    *   Cálculo en vivo de la Utilidad Neta (Ingresos Brutos - Costos de Mercancía [COGS] - Gastos Operativos [OPEX]).
    *   Módulo de reportes para generar PDFs con los estados financieros mensuales.

7.  **Sistema de Suscripciones (Bloqueo Premium)**
    *   Verificación al inicio de sesión de los días restantes de la licencia del comercio.
    *   Si la suscripción expira, la aplicación se bloquea automáticamente mostrando una "Pantalla Candado", impidiendo el acceso a los módulos hasta que se renueve.

## Seguridad y Permisos
El sistema implementa Control de Acceso Basado en Roles (RBAC) del lado del cliente:
*   **Superadmin**: Acceso total al panel SaaS. No ve la operación diaria de los clientes.
*   **Administrador (Dueño)**: Acceso a todo su entorno de comercio (Finanzas, Reportes, Inventario).
*   **Vendedor**: Acceso restringido únicamente al módulo de Punto de Venta (POS) e Inventario (solo vista). No puede ver métricas financieras ni agregar gastos.

Adicionalmente, se utiliza Row Level Security (RLS) en Supabase para asegurar que cada comercio solo pueda acceder a su propia información.
