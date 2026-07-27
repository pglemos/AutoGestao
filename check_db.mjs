import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbhcmzzgwjdgkctlfvbo.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiaGNtenpnd2pkZ2tjdGxmdmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1NDI1MiwiZXhwIjoyMDg3NTMwMjUyfQ.XMgPD1xn75n4pDQJf6Q9e7bheFxi9_enelcKocWsfpQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  // 1. Find Carrum store
  const { data: stores, error: storeErr } = await supabase
    .from('lojas')
    .select('*')
    .ilike('name', '%carrum%');
  console.log('=== CARRUM STORES ===');
  if (storeErr) console.error('Error:', storeErr);
  else console.log(JSON.stringify(stores, null, 2));

  // 2. Find owner user
  const { data: users, error: userErr } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('email', 'orleansqueiroz%');
  console.log('\n=== OWNER USER (orleansqueiroz) ===');
  if (userErr) console.error('Error:', userErr);
  else console.log(JSON.stringify(users, null, 2));

  if (stores && stores.length > 0) {
    const storeId = stores[0].id;
    
    // 3. Check vinculos_loja for this store
    const { data: vinculos, error: vinErr } = await supabase
      .from('vinculos_loja')
      .select('*, users:usuarios(id, email, name, role, active)')
      .eq('store_id', storeId);
    console.log(`\n=== VINCULOS_LOJA for store ${storeId} ===`);
    if (vinErr) console.error('Error:', vinErr);
    else console.log(JSON.stringify(vinculos, null, 2));

    // 4. Check vendedores_loja for this store
    const { data: vendedores, error: vendErr } = await supabase
      .from('vendedores_loja')
      .select('*, users:usuarios(id, email, name, role, active)')
      .eq('store_id', storeId);
    console.log(`\n=== VENDEDORES_LOJA for store ${storeId} ===`);
    if (vendErr) console.error('Error:', vendErr);
    else console.log(JSON.stringify(vendedores, null, 2));

    // 5. Check if owner has vinculo for this store
    if (users && users.length > 0) {
      const userId = users[0].id;
      const { data: ownerVinculos, error: ownVinErr } = await supabase
        .from('vinculos_loja')
        .select('*')
        .eq('user_id', userId)
        .eq('store_id', storeId);
      console.log(`\n=== OWNER VINCULO for Carrum ===`);
      if (ownVinErr) console.error('Error:', ownVinErr);
      else console.log(JSON.stringify(ownerVinculos, null, 2));
      
      // 6. Check ALL vinculos for this owner
      const { data: allVinculos, error: allVinErr } = await supabase
        .from('vinculos_loja')
        .select('*, store:lojas(id, name, active)')
        .eq('user_id', userId);
      console.log(`\n=== ALL VINCULOS for owner ===`);
      if (allVinErr) console.error('Error:', allVinErr);
      else console.log(JSON.stringify(allVinculos, null, 2));
    }
  }
}

main().catch(console.error);
