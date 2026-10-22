const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const referenceCode = process.argv[2];
if (!referenceCode) throw new Error('Usage: node check_db.js <reference_code>');

async function check() {
  const { data: order } = await supabase.from('orders').select('id, reference_code, status, delivery_driver_id, driver_last_lat, driver_last_lng').eq('reference_code', referenceCode).single();

  console.log('Order:', order);

  if (order && order.delivery_driver_id) {
    const { data: loc } = await supabase.from('driver_locations').select('*').eq('driver_id', order.delivery_driver_id).single();
    console.log('Driver location:', loc);
  }
}
check();
