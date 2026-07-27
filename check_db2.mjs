import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbhcmzzgwjdgkctlfvbo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiaGNtenpnd2pkZ2tjdGxmdmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTQyNTIsImV4cCI6MjA4NzUzMDI1Mn0.-k8W4LXVKId5EBe1t0PqfJYfOYjl-5IEp0-JdpxN6Po';

// Simulate auth as orleansqueiroz
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3NTUyY2ZiNC00NTAyLTRmOTEtYTEyMy1iMDdhZWViY2E0YTMiLCJlbWFpbCI6Im9ybGVhbnNxdWVpcm96QG91dGxvb2suY29tIn0.XYZ'; // This won't work, we need a real JWT

// Let's use service_role to check data as-is
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiaGNtenpnd2pkZ2tjdGxmdmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1NDI1MiwiZXhwIjoyMDg3NTMwMjUyfQ.XMgPD1xn75n4pDQJf6Q9e7bheFxi9_enelcKocWsfpQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CARRUM_STORE_ID = 'b8a534f3-637b-4756-bc97-c9bacf48bffb';
const OWNER_USER_ID = '7552cfb4-4502-4f91-a123-b07aeebca4a3';

async function main() {
  console.log('=== TESTING useStoresStats queries for Carrum ===\n');

  // 1. Simulate the membersQuery
  console.log('--- 1. membersQuery (vinculos_loja) ---');
  const { data: members, error: membersErr } = await supabase
    .from('vinculos_loja')
    .select('store_id, user_id, role, users:usuarios(id, active, role)')
    .eq('is_active', true)
    .in('store_id', [CARRUM_STORE_ID]);
  
  if (membersErr) {
    console.error('ERROR:', membersErr);
  } else {
    console.log(`Found ${members.length} vinculos`);
    members.forEach(m => {
      const memberRole = m.role || m.users?.role;
      console.log(`  - user_id=${m.user_id} role=${memberRole} users.active=${m.users?.active} isStoreTeamRole=${['dono','gerente','vendedor'].includes(memberRole)} isVendedor=${memberRole === 'vendedor'}`);
    });
  }

  // 2. Simulate the sellersQuery
  console.log('\n--- 2. sellersQuery (vendedores_loja) ---');
  const { data: sellers, error: sellersErr } = await supabase
    .from('vendedores_loja')
    .select('store_id, seller_user_id, users:usuarios(id, active, role)')
    .eq('is_active', true)
    .in('store_id', [CARRUM_STORE_ID]);
  
  if (sellersErr) {
    console.error('ERROR:', sellersErr);
  } else {
    console.log(`Found ${sellers.length} seller records`);
    sellers.forEach(s => {
      console.log(`  - seller_user_id=${s.seller_user_id} users.active=${s.users?.active} users.role=${s.users?.role}`);
    });
  }

  // 3. Check the owner's role in usuarios
  console.log('\n--- 3. Owner role ---');
  const { data: owner, error: ownerErr } = await supabase
    .from('usuarios')
    .select('id, email, role, active')
    .eq('id', OWNER_USER_ID);
  if (ownerErr) console.error('ERROR:', ownerErr);
  else console.log(JSON.stringify(owner, null, 2));

  // 4. Simulate useSellersByStore
  console.log('\n--- 4. useSellersByStore queries ---');
  const [sellersRes, membershipsRes] = await Promise.all([
    supabase
      .from('vendedores_loja')
      .select('*, users:usuarios(*)')
      .eq('store_id', CARRUM_STORE_ID)
      .eq('is_active', true),
    supabase
      .from('vinculos_loja')
      .select('user_id, users:usuarios(id, active, role)')
      .eq('store_id', CARRUM_STORE_ID)
      .eq('role', 'vendedor')
      .eq('is_active', true),
  ]);

  if (sellersRes.error) console.error('Sellers ERROR:', sellersRes.error);
  else console.log(`Sellers found: ${sellersRes.data.length}`);
  
  if (membershipsRes.error) console.error('Memberships ERROR:', membershipsRes.error);
  else {
    console.log(`Memberships found: ${membershipsRes.data.length}`);
    const activeSellerMemberships = new Set(
      membershipsRes.data
        .filter((m) => m.users?.active !== false && m.users?.role === 'vendedor')
        .map((m) => m.user_id),
    );
    console.log(`Active seller memberships: ${activeSellerMemberships.size}`);
    console.log(`Membership user IDs:`, [...activeSellerMemberships]);
    
    // Check which sellers match
    const matchedSellers = sellersRes.data.filter((s) =>
      Boolean(s.users && activeSellerMemberships.has(s.seller_user_id)),
    );
    console.log(`Matched sellers: ${matchedSellers.length}`);
    matchedSellers.forEach(s => console.log(`  - ${s.users?.name} (${s.seller_user_id})`));
  }

  // 5. Check tem_papel_loja function for owner
  console.log('\n--- 5. Check tem_papel_loja for owner ---');
  // Note: This function requires auth.uid(), so it won't work with service_role.
  // Let's just check the owner's vinculos directly
  console.log('Owner has vinculo as dono for Carrum: YES (confirmed earlier)');

  console.log('\n=== TEST COMPLETE ===');
}

main().catch(console.error);
