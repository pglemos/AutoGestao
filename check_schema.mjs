import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbhcmzzgwjdgkctlfvbo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiaGNtenpnd2pkZ2tjdGxmdmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1NDI1MiwiZXhwIjoyMDg3NTMwMjUyfQ.XMgPD1xn75n4pDQJf6Q9e7bheFxi9_enelcKocWsfpQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  // Check vendedores_loja columns
  const { data: vcols, error: verr } = await supabase
    .from('vendedores_loja')
    .select('*')
    .limit(3);
  if (verr) console.error('vendedores_loja error:', verr);
  else if (vcols.length > 0) {
    console.log('vendedores_loja columns:', Object.keys(vcols[0]).join(', '));
    console.log('Sample:', JSON.stringify(vcols[0], null, 2));
  } else console.log('vendedores_loja is empty');

  // Check vinculos_loja columns
  const { data: mcols, error: merr } = await supabase
    .from('vinculos_loja')
    .select('*')
    .limit(3);
  if (merr) console.error('vinculos_loja error:', merr);
  else if (mcols.length > 0) {
    console.log('\nvinculos_loja columns:', Object.keys(mcols[0]).join(', '));
    console.log('Sample:', JSON.stringify(mcols[0], null, 2));
  } else console.log('vinculos_loja is empty');

  // Now check the specific issue: the useStoresStats joins
  // Check if vendedores_loja has a valid FK to usuarios
  const CARRUM = 'b8a534f3-637b-4756-bc97-c9bacf48bffb';
  
  // Test the EXACT query useStoresStats uses for sellers
  console.log('\n=== Exact useStoresStats sellersQuery ===');
  const { data: sq, error: sqErr } = await supabase
    .from('vendedores_loja')
    .select('store_id, seller_user_id, users:usuarios(id, active, role)')
    .eq('is_active', true)
    .in('store_id', [CARRUM]);
  if (sqErr) console.error('ERROR:', sqErr);
  else {
    console.log(`Results: ${sq.length}`);
    sq.forEach(s => console.log(`  seller=${s.seller_user_id} -> users=${JSON.stringify(s.users)}`));
  }

  // Test the EXACT query useStoresStats uses for memberships  
  console.log('\n=== Exact useStoresStats membersQuery ===');
  const { data: mq, error: mqErr } = await supabase
    .from('vinculos_loja')
    .select('store_id, user_id, role, users:usuarios(id, active, role)')
    .eq('is_active', true)
    .in('store_id', [CARRUM]);
  if (mqErr) console.error('ERROR:', mqErr);
  else {
    console.log(`Results: ${mq.length}`);
    mq.forEach(m => console.log(`  user=${m.user_id} role=${m.role} users=${JSON.stringify(m.users)}`));
  }

  // Check if there might be an issue with the is_active column in vendedores_loja
  console.log('\n=== All vendedores_loja for Carrum (no filter) ===');
  const { data: allV, error: allVErr } = await supabase
    .from('vendedores_loja')
    .select('*')
    .eq('store_id', CARRUM);
  if (allVErr) console.error('ERROR:', allVErr);
  else {
    console.log(`Total: ${allV.length}`);
    allV.forEach(v => console.log(`  seller=${v.seller_user_id} is_active=${v.is_active} ended_at=${v.ended_at}`));
  }
}

main().catch(console.error);
