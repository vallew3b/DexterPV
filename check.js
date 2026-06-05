const SUPABASE_URL = 'https://qlinfgsqpzyhioqygevv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaW5mZ3NxcHp5aGlvcXlnZXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNTY1NzcsImV4cCI6MjA5MjczMjU3N30.4AitjCtqVVNur8AV7FoA7Dp1mPoln8Ceazm4gpdJxT0';

async function check() {
    const payload = {
        cliente_nombre: "Test User",
        detalles_pedido: [{producto_id: 1, cantidad: 1, precio: 10}],
        total: 10,
        estado: 'pendiente',
        comercio_id: 105
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/pedidos_web`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    if (!res.ok) {
        const err = await res.text();
        console.error("Error:", err);
    } else {
        const data = await res.json();
        console.log("Inserted:", data);
    }
}
check();
