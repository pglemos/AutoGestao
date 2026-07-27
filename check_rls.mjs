import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbhcmzzgwjdgkctlfvbo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiaGNtenpnd2pkZ2tjdGxmdmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTQyNTIsImV4cCI6MjA4NzUzMDI1Mn0.-k8W4LXVKId5EBe1t0PqfJYfOYjl-5IEp0-JdpxN6Po';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiaGNtenpnd2pkZ2tjdGxmdmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1NDI1MiwiZXhwIjoyMDg3NTMwMjUyfQ.XMgPD1xn75n4pDQJf6Q9e7bheFxi9_enelcKocWsfpQ';

const CARRUM_STORE_ID = 'b8a534f3-637b-4756-bc97-c9bacf48bffb';

async function testRLS() {
  // Test with service_role (bypass RLS) - first check dono can view LOJAS
  console.log('=== Testing with anon key as authenticated user ===\n');
  
  // Step 1: Sign in as orleansqueiroz
  // We need to use signInWithPassword but we don't have the password.
  // Instead, let's create a session using the service_role client.
  
  // Actually, let me try to use the auth admin API to generate a token for this user
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
  
  // Check the auth.users table for this user
  const { data: authUser, error: authErr } = await adminClient.auth.admin.getUserById('7552cfb4-4502-4f91-a123-b07aeebca4a3');
  console.log('Auth User Lookup:');
  if (authErr) console.error('Error:', authErr);
  else console.log('User exists in auth.users:', authUser.user?.email);

  // Let's try signing in with email + password
  // The password would be needed... Let me skip this and just test with RPC
  
  // Test: call the tem_papel_loja function via SQL query
  const { data: papelData, error: papelErr } = await adminClient.rpc('tem_papel_loja', {
    p_loja_id: CARRUM_STORE_ID,
    p_papeis: ['dono', 'gerente'],
    uid: '7552cfb4-4502-4f91-a123-b07aeebca4a3'
  });
  console.log('\ntem_papel_loja for orleansqueiroz on Carrum as dono/gerente:', papelData);
  if (papelErr) console.error('Error:', papelErr);

  // Test the useStores query (lojas table)
  const { data: storesAnon, error: storesAnonErr } = await adminClient
    .from('lojas')
    .select('id, name, active')
    .in('id', [CARRUM_STORE_ID]);
  console.log('\nlojas query:', storesAnon?.length, 'stores');
  if (storesAnonErr) console.error('Error:', storesAnonErr);

  // Test fetchMemberships query
  const { data: membData, error: membErr } = await adminClient
    .from('vinculos_loja')
    .select('id, user_id, store_id, role, is_active, ended_at, store:lojas(id, name, active)')
    .eq('user_id', '7552cfb4-4502-4f91-a123-b07aeebca4a3')
    .eq('is_active', true);
  console.log('\nOwner memberships:', membData?.length, 'records');
  if (membErr) console.error('Error:', membErr);
  else membData?.forEach(m => console.log(`  role=${m.role} store=${m.store?.name} store.active=${m.store?.active}`));

  // Check the store.active for Carrum
  const carrumMembership = membData?.find(m => m.store_id === CARRUM_STORE_ID);
  console.log('\nCarrum membership for owner:');
  console.log(JSON.stringify(carrumMembership, null, 2));
  
  if (carrumMembership && !carrumMembership.store?.active) {
    console.log('PROBLEM: Carrum store is not active in the membership store relation!');
  }

  // Test: what about the stores the owner can see?
  const { data: ownerStores, error: storeErr } = await adminClient
    .from('lojas')
    .select('id, name, active');
  console.log('\nAll stores query:', ownerStores?.length, 'total stores');
  if (storeErr) console.error('Error:', storeErr);
  else {
    const activeCount = ownerStores?.filter(s => s.active).length;
    const inactiveCount = ownerStores?.filter(s => !s.active).length;
    console.log(`Active: ${activeCount}, Inactive: ${inactiveCount}`);
    // Check if Carrum is in the list
    const carrumInList = ownerStores?.find(s => s.id === CARRUM_STORE_ID);
    console.log('Carrum in all stores:', carrumInList ? JSON.stringify(carrumInList) : 'NOT FOUND');
  }
}

testRLS().catch(console.error);
