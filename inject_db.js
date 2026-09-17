const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.argv[2];

if (!connectionString) {
  console.log('\n======================================================');
  console.log('  DEXTER PV - INYECTOR DE BASE DE DATOS (CLI)');
  console.log('======================================================\n');
  console.log('Uso:');
  console.log('  node inject_db.js "<connection_string>"\n');
  console.log('Ejemplo:');
  console.log('  node inject_db.js "postgresql://postgres.ref:pass@aws-0-region.pooler.supabase.com:6543/postgres"\n');
  process.exit(1);
}

async function run() {
  const sqlPath = path.join(__dirname, 'dexter_schema.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error('No se encontró el archivo dexter_schema.sql en el directorio.');
  }

  const sqlScript = fs.readFileSync(sqlPath, 'utf8');

  console.log('Conectando a la base de datos de Supabase...');
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Conexión exitosa. Inyectando esquema maestro (dexter_schema.sql)...');

  await client.query(sqlScript);

  console.log('¡ÉXITO! La base de datos ha sido aprovisionada con todas las tablas, vistas, buckets y políticas RLS.');
  await client.end();
}

run().catch(err => {
  console.error('\n[ERROR INYECTANDO BASE DE DATOS]:', err.message);
  process.exit(1);
});
