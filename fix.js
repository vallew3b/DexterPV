const fs = require('fs');
const path = 'd:\\CARPETAS MORA\\urban-store\\DexterPV\\supabaseClient.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the login function explicitly
content = content.replace(
    /const \{ data: usuarios, error \} = await supabase\s*\n\s*\.from\('usuarios'\)/,
    "const { data: usuarios, error } = await centralSupabase\\n        .from('usuarios')"
);
content = content.replace(
    /await supabase\s*\n\s*\.from\('comercios'\)/,
    "await centralSupabase\\n                .from('comercios')"
);

// Any remaining "supabase." that isn't centralSupabase or tenantSupabase
// Just simple replace all:
content = content.replace(/await supabase\.from/g, 'await centralSupabase.from');
content = content.replace(/let query = supabase\.from/g, 'let query = centralSupabase.from');
content = content.replace(/const \{ data, error \} = await supabase/g, 'const { data, error } = await centralSupabase');
content = content.replace(/const \{ error \} = await supabase/g, 'const { error } = await centralSupabase');
content = content.replace(/supabase\.storage/g, 'centralSupabase.storage');
content = content.replace(/supabase\.from/g, 'centralSupabase.from');

fs.writeFileSync(path, content);
console.log('Fix complete.');
