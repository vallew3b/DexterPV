const fs = require('fs');
let code = fs.readFileSync('d:\\DexterPV\\supabaseClient.js', 'utf8');

// 1. Setup dual instances
code = code.replace(
    '  let supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;',
    `  let centralSupabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  let tenantSupabase = null;

  try {
    const loggedUser = JSON.parse(sessionStorage.getItem('user'));
    if (loggedUser && loggedUser.comercio && loggedUser.comercio.supabase_url && loggedUser.comercio.supabase_key) {
        tenantSupabase = window.supabase.createClient(loggedUser.comercio.supabase_url, loggedUser.comercio.supabase_key);
    }
  } catch(e) { console.error(e); }

  function getBusinessDB() {
      return tenantSupabase || centralSupabase;
  }`
);

// 2. login
code = code.replace('if (!supabase)', 'if (!centralSupabase)');
code = code.replace(
    `const { data: usuarios, error } = await supabase
        .from('usuarios')`,
    `const { data: usuarios, error } = await centralSupabase
        .from('usuarios')`
);
code = code.replace(
    `await supabase
                .from('comercios')`,
    `await centralSupabase
                .from('comercios')`
);
code = code.replace(
    `      return {
        success: true,
        user: {`,
    `      if (comercioInfo && comercioInfo.supabase_url && comercioInfo.supabase_key) {
        tenantSupabase = window.supabase.createClient(comercioInfo.supabase_url, comercioInfo.supabase_key);
      } else {
        tenantSupabase = null;
      }

      return {
        success: true,
        user: {`
);

// 3. Business logic (replace supabase. with getBusinessDB().)
const businessReplacements = [
    "supabase.from('productos')",
    "supabase.storage",
    "supabase.from('variantes')",
    "supabase.from('ventas')",
    "supabase.from('gastos')"
];
businessReplacements.forEach(str => {
    code = code.split(str).join(str.replace('supabase', 'getBusinessDB()'));
});

// 4. Admin logic (replace supabase. with centralSupabase.)
const adminReplacements = [
    `supabase
        .from('comercios')`,
    `supabase
        .from('usuarios')`,
    "supabase.from('comercios')",
    "supabase.from('usuarios')"
];
adminReplacements.forEach(str => {
    code = code.split(str).join(str.replace('supabase', 'centralSupabase'));
});

fs.writeFileSync('d:\\DexterPV\\supabaseClient.js', code);
console.log('Refactoring complete!');
