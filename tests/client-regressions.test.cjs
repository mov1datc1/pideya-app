const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load the actual TypeScript modules without adding a test framework to the mobile bundle.
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../src', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), name + '.ts')), mocks);
    return require(name);
  }, module, module.exports);
  return module.exports;
}

test('coordinates reject missing/invalid API values before reaching the native map', () => {
  const { toCoordinate } = load('utils/coordinates.ts');
  for (const pair of [[null, -103], [undefined, 20], ['x', -103], [Infinity, 1], [91, 1], [20, 181], [0, 0], ['', 20], [true, 20]]) assert.equal(toCoordinate(...pair), null);
  assert.deepEqual(toCoordinate('20.67', '-103.34'), { latitude: 20.67, longitude: -103.34 });
  assert.deepEqual(toCoordinate(0, -78), { latitude: 0, longitude: -78 });
});

test('pharmacy always asks, restaurants omit substitutions, groceries keep chosen preferences', () => {
  const { orderPickingPreferences } = load('utils/pickingPreferences.ts');
  const preferences = { on_unavailable: 'substitute', on_less_quantity: 'accept_available' };
  assert.equal(orderPickingPreferences('prepared', preferences), undefined);
  assert.deepEqual(orderPickingPreferences('picked', preferences), { on_unavailable: 'remove', on_less_quantity: 'accept_available' });
  assert.equal(orderPickingPreferences('picked', { ...preferences, on_less_quantity: 'remove' }).on_less_quantity, 'remove');
  assert.deepEqual(orderPickingPreferences('pharmacy', preferences), { on_unavailable: 'ask_me', on_less_quantity: 'ask_me' });
  assert.equal(preferences.on_unavailable, 'substitute');
});

test('picking and adjusted orders stay active; terminal statuses do not', () => {
  const { ACTIVE_ORDER_STATUSES, ORDER_STATUS_LABELS } = load('utils/orderStatus.ts');
  for (const status of ['PENDING', 'ACCEPTED', 'PICKING', 'ADJUSTED', 'ON_THE_WAY']) {
    assert.ok(ACTIVE_ORDER_STATUSES.includes(status));
    assert.ok(ORDER_STATUS_LABELS[status]);
  }
  for (const status of ['DELIVERED', 'CANCELLED', 'REJECTED']) assert.ok(!ACTIVE_ORDER_STATUSES.includes(status));
});

test('legacy missing totals cannot crash order cards', () => {
  const { formatPrice } = load('utils/formatPrice.ts');
  assert.equal(formatPrice(null), '—');
  assert.equal(formatPrice(undefined), '—');
  assert.equal(formatPrice(NaN), '—');
  assert.equal(formatPrice(120), '$120');
  assert.equal(formatPrice('120'), '$120');
});

function pickingService(type, flow) {
  const queries = [];
  const supabase = { from(table) {
    queries.push(table);
    return { select() { return this; }, eq() { return this; }, async single() { return { data: table === 'restaurants' ? { type } : { flow_type: flow } }; } };
  } };
  return { ...load('services/picking.ts', { './supabase': { supabase } }), queries };
}
test('a restaurant never inherits pharmacy or grocery settings from bad category metadata', async () => {
  const service = pickingService(' Restaurantes ', 'picked');
  assert.equal(await service.getFlowTypeForRestaurant('restaurant'), 'prepared');
  assert.deepEqual(service.queries, ['restaurants']);
  assert.equal(await pickingService('Frutería', 'picked').getFlowTypeForRestaurant('fruit'), 'picked');
  assert.equal(await pickingService('Farmacia', 'pharmacy').getFlowTypeForRestaurant('pharmacy'), 'pharmacy');
  await assert.rejects(() => pickingService(null, null).getFlowTypeForRestaurant('missing', true), /tipo de establecimiento/);
});

test('Directions handles permission failures, malformed responses and network errors without an invented ETA', async () => {
  const originalFetch = global.fetch;
  const { getDirectionsRoute } = load('services/directions.ts', { 'expo-constants': { default: { expoConfig: { android: { config: { googleMaps: { apiKey: 'test' } } } } } } });
  try {
    global.fetch = async () => ({ ok: true, json: async () => ({ status: 'REQUEST_DENIED' }) });
    assert.equal(await getDirectionsRoute(20, -103, 21, -104), null);
    global.fetch = async () => ({ ok: true, json: async () => ({ status: 'OK', routes: [{}] }) });
    assert.equal(await getDirectionsRoute(20, -103, 21, -104), null);
    global.fetch = async () => { throw new Error('offline'); };
    assert.equal(await getDirectionsRoute(20, -103, 21, -104), null);
    global.fetch = async () => { throw new Error('must not fetch invalid coordinates'); };
    assert.equal(await getDirectionsRoute(NaN, -103, 21, -104), null);
  } finally { global.fetch = originalFetch; }
});

test('Directions decodes road geometry and keeps server distance/time', async () => {
  const originalFetch = global.fetch;
  const { getDirectionsRoute } = load('services/directions.ts', { 'expo-constants': { default: { expoConfig: { android: { config: { googleMaps: { apiKey: 'test' } } } } } } });
  try {
    global.fetch = async () => ({ ok: true, json: async () => ({ status: 'OK', routes: [{ overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }, legs: [{ duration: { text: '12 min', value: 720 }, distance: { text: '3 km', value: 3000 } }] }] }) });
    const result = await getDirectionsRoute(38.5, -120.2, 43.252, -126.453);
    assert.deepEqual(result.coordinates, [{ latitude: 38.5, longitude: -120.2 }, { latitude: 40.7, longitude: -120.95 }, { latitude: 43.252, longitude: -126.453 }]);
    assert.equal(result.durationSeconds, 720);
    assert.equal(result.distanceMeters, 3000);
  } finally { global.fetch = originalFetch; }
});

test('tracking chooses the latest valid location for this driver and this order', () => {
  const { latestDriverLocation } = load('utils/driverLocation.ts');
  const order = { id: 'one', delivery_driver_id: 'driver', driver_last_lat: 20, driver_last_lng: -103, driver_location_updated_at: '2026-10-04T12:00:00Z' };
  const newer = { driver_id: 'driver', order_id: 'one', lat: 21, lng: -104, updated_at: '2026-10-04T12:01:00Z' };
  assert.equal(latestDriverLocation(order, newer).latitude, 21);
  assert.equal(latestDriverLocation(order, { ...newer, driver_id: 'other' }).latitude, 20);
  assert.equal(latestDriverLocation(order, { ...newer, order_id: 'other' }).latitude, 20);
  assert.equal(latestDriverLocation(order, { ...newer, lat: NaN }).latitude, 20);
  assert.equal(latestDriverLocation(order, { ...newer, updated_at: '2026-10-04T11:00:00Z' }).latitude, 20);
  assert.equal(latestDriverLocation(null, newer), null);
});

test('Tiendas follows grocery preferences even with legacy pharmacy metadata', async () => {
  assert.equal(await pickingService('Tiendas', 'pharmacy').getFlowTypeForRestaurant('store'), 'picked');
});

test('opening multiple order tabs: reproduce old Supabase exception and verify isolated subscriptions', async () => {
  const { RealtimeClient } = require('@supabase/realtime-js');
  const { realtimeChannelName } = load('utils/realtimeChannel.ts');
  const client = new RealtimeClient('ws://localhost/realtime', { params: { apikey: 'test' }, timeout: 10 });
  client.connect = () => {}; // Real channel lifecycle, no network or customer data.
  const filter = { event: '*', schema: 'public', table: 'orders', filter: 'client_phone=eq.test' };
  try {
    client.channel('old-shared-channel').on('postgres_changes', filter, () => {}).subscribe();
    assert.throws(() => client.channel('old-shared-channel').on('postgres_changes', filter, () => {}).subscribe(), /cannot add.*after.*subscribe/);
    const mounted = [];
    assert.doesNotThrow(() => {
      for (const screen of ['Home', 'Orders', 'Tracking']) mounted.push(client.channel(realtimeChannelName('client-orders', 'test')).on('postgres_changes', filter, () => {}).subscribe());
    });
    assert.equal(new Set(mounted.map(c => c.topic)).size, 3);
    await client.removeChannel(mounted[1]);
    assert.ok(client.getChannels().includes(mounted[0]));
    assert.ok(client.getChannels().includes(mounted[2]));
  } finally { await client.removeAllChannels(); }
});

test('first-order progress resumes safely, advances by achieved action and never goes backwards', () => {
  const { nextGuideStage, readGuideProgress } = load('utils/firstOrderGuide.ts');
  assert.deepEqual(readGuideProgress(null), { stage: 'location', hidden: false });
  assert.deepEqual(readGuideProgress('corrupt'), { stage: 'location', hidden: false });
  assert.equal(nextGuideStage('location', 'category'), 'category');
  assert.equal(nextGuideStage('cart', 'products'), 'cart');
  assert.equal(nextGuideStage('checkout', 'done'), 'done');
  assert.equal(nextGuideStage('done', 'category'), 'done');
  assert.deepEqual(readGuideProgress('{"stage":"checkout","hidden":true}'), { stage: 'checkout', hidden: true });
});

test('catalog coverage requires actual coordinates and honors each establishment radius', () => {
  const { deliversTo, matchesCategory } = load('utils/deliveryCoverage.ts');
  const restaurant = { lat: 20.8167, lng: -102.7633, delivery_radius_km: 5 };
  assert.equal(deliversTo(restaurant, 20.82, -102.76), true);
  assert.equal(deliversTo(restaurant, 20.67, -103.34), false);
  assert.equal(deliversTo(restaurant, 0, 0), false);
  assert.equal(deliversTo({ ...restaurant, lat: null }, 20.82, -102.76), false);
  assert.equal(deliversTo({ ...restaurant, delivery_radius_km: 0 }, 20.82, -102.76), false);
  assert.equal(matchesCategory('Tiendas', 'Restaurantes'), false);
  assert.equal(matchesCategory('Cremería', 'Restaurantes'), false);
  assert.equal(matchesCategory(' restaurantes ', 'Restaurantes'), true);
});

function addressStore(initial = {}, cloud = []) {
  const data = new Map(Object.entries(initial));
  const account = { id: 'user-a', failWrites: false };
  const storage = { async getItem(key) { return data.get(key) ?? null; }, async setItem(key, value) { data.set(key, value); }, async removeItem(key) { data.delete(key); } };
  const supabase = {
    auth: { async getSession() { return { data: { session: account.id ? { user: { id: account.id } } : null } }; } },
    from() {
      const filters = []; let deleting = false;
      return {
        select() { return this; }, delete() { deleting = true; return this; }, eq(k,v) { filters.push([k,v]); return this; }, order() { return this; },
        then(resolve) {
          const matches = row => row.user_id === account.id && filters.every(([k,v]) => row[k] === v);
          const rows = cloud.filter(matches);
          if (deleting) for (let i=cloud.length-1;i>=0;i--) if(matches(cloud[i])) cloud.splice(i,1);
          return Promise.resolve({data: rows.map(r=>({...r})),error:null}).then(resolve);
        },
      };
    },
    async rpc(name,args) {
      if(account.failWrites) return {error:new Error('server unavailable')};
      if(name==='set_default_client_address') {
        const row=cloud.find(a=>a.id===args.p_id && a.user_id===account.id);
        if(!row) return {error:new Error('Dirección no encontrada')};
        cloud.forEach(a=>{if(a.user_id===account.id)a.is_default=a.id===row.id;});
        return {data:null};
      }
      const value={...args.p_address,user_id:account.id,id:args.p_address.id || `cloud-${cloud.length+1}`,created_at:'2026-10-04'};
      if(value.is_default) cloud.forEach(a=>{if(a.user_id===account.id)a.is_default=false;});
      const index=cloud.findIndex(a=>a.id===value.id);
      if(index>=0) cloud[index]=value; else cloud.push(value);
      return {data:{...value},error:null};
    },
  };
  const service = load('services/addresses.ts', { '@react-native-async-storage/async-storage': { default: storage }, './supabase': { supabase } });
  return { service, account, data, cloud };
}

const testAddress = { user_id: 'user-a', label: 'Casa', address_text: 'Calle 1, número 2', reference: null, latitude: 20.8167, longitude: -102.7633, is_default: true, is_pin_location: true };

test('first location is persisted, selected as default and isolated between accounts', async () => {
  const { service, account, cloud } = addressStore();
  const casa = await service.addAddress(testAddress);
  assert.equal((await service.getDefaultAddress()).id, casa.id);
  const secondPhone = addressStore({}, cloud);
  assert.equal((await secondPhone.service.getDefaultAddress()).id, casa.id);
  const trabajo = await service.addAddress({ ...testAddress, label: 'Trabajo' });
  assert.equal((await service.getDefaultAddress()).id, trabajo.id);
  assert.equal((await service.getAddresses()).filter(a => a.is_default).length, 1);
  account.id = 'user-b';
  assert.deepEqual(await service.getAddresses(), []);
  await assert.rejects(() => service.setDefaultAddress(casa.id), /no encontrada/);
  account.id = 'user-a';
  assert.equal((await service.getDefaultAddress()).id, trabajo.id);
  await service.deleteAddress(trabajo.id);
  assert.equal((await service.getDefaultAddress()).id, casa.id);
});

test('legacy location migration never guesses ownership from a name or imports another account', async () => {
  const owned = { ...testAddress, id: 'owned', created_at: '2026-10-04' };
  const legacy = [owned, { ...owned, id: 'other', user_id: 'user-b' }, { ...owned, id: 'name', user_id: 'Jonathan' }];
  const { service } = addressStore({ '@pideya/addresses': JSON.stringify(legacy) });
  assert.deepEqual((await service.getAddresses()).map(a => a.id), ['owned']);
});

test('failed saves, invalid pins and missing session cannot complete location setup', async () => {
  const { service, account } = addressStore({ '@pideya/addresses/user-a': '[]' });
  await assert.rejects(() => service.addAddress({ ...testAddress, latitude: 0, longitude: 0 }), /Confirma/);
  await assert.rejects(() => service.addAddress({ ...testAddress, address_text: ' ' }), /Confirma/);
  account.failWrites = true;
  await assert.rejects(() => service.addAddress(testAddress), /server unavailable/);
  assert.equal(await service.getDefaultAddress(), null);
  account.failWrites = false;
  account.id = '';
  await assert.rejects(() => service.addAddress(testAddress), /Inicia sesión/);
});

test('order creation uses authenticated identity and history supports account lookup and pagination', async () => {
  const calls = [];
  const chain = {
    select(value) { calls.push(['select',value]); return this; }, insert(value) { calls.push(['insert',value]); return this; },
    eq() { return this; }, or(value) { calls.push(['or',value]); return this; }, order() { return this; },
    range(from,to) { calls.push(['range',from,to]); return this; }, single() { return this; },
    then(resolve) { return Promise.resolve({data:[],error:null}).then(resolve); },
  };
  const supabase = { auth: { async getSession() { return {data:{session:{user:{id:'account-uuid'}}}}; } }, from() { return chain; } };
  const service = load('services/orders.ts', { './supabase': { supabase }, './technicalIncidents': { reportCheckoutFailure() {} } });
  await service.createOrder({restaurant_id:'shop',client_phone:'+523780000000'});
  assert.equal(calls.find(c=>c[0]==='insert')[1].client_user_id,'account-uuid');
  await service.getOrderHistory('+523780000000',50);
  assert.deepEqual(calls.find(c=>c[0]==='range'),['range',50,99]);
  assert.match(calls.find(c=>c[0]==='or')[1],/client_user_id.eq.account-uuid/);
  assert.match(calls.find(c=>c[0]==='or')[1],/client_user_id.is.null/);
});

test('one remaining pizza size replaces base price; cheap sizes never become extras', () => {
  const { classifyOptions } = load('utils/menuOptions.ts');
  const single = { id: 's', price: 149, option_type: 'size', available: true };
  assert.deepEqual(classifyOptions([single], 149).sizes, [single]);
  assert.equal(classifyOptions([{...single, price: 5}], 149).sizes.length, 1);
  assert.equal(classifyOptions([{...single, available:false}], 149).sizes.length, 0);
  assert.equal(classifyOptions([{...single, option_type:'extra', price:0}], 149).extras.length, 1);
});
test('cart identity preserves pizza toppings and kitchen notes, independent of extra selection order', () => {
  const { cartLineKey } = load('utils/menuOptions.ts');
  const base = { menu_item: {id:'pizza',name:'Pizza (Mediana)',price:199}, notes:'', quantity:1, selected_options:[] };
  const cheese={id:'cheese',price:25}, pepperoni={id:'pepperoni',price:30};
  assert.notEqual(cartLineKey(base), cartLineKey({...base,selected_options:[cheese]}));
  assert.notEqual(cartLineKey(base), cartLineKey({...base,notes:'Sin cebolla'}));
  assert.equal(cartLineKey({...base,selected_options:[cheese,pepperoni]}),cartLineKey({...base,selected_options:[pepperoni,cheese],quantity:3}));
});

test('tracking freshness rejects unknown and future times, expires after 90 seconds', () => {
  const { locationFreshness } = load('utils/trackingPresentation.ts');
  const now = Date.parse('2026-10-23T18:00:00Z');
  for (const value of [null, 'bad', new Date(now + 120000).toISOString(), new Date(now - 91000).toISOString()]) assert.equal(locationFreshness(value, now).stale, true);
  assert.equal(locationFreshness(new Date(now - 90000).toISOString(), now).stale, false);
  assert.match(locationFreshness(new Date(now - 120000).toISOString(), now).label, /2 min/);
});

test('motorcycle animates only short fresh movements, never reconnect jumps', () => {
  const { markerAnimationDuration } = load('utils/trackingPresentation.ts');
  const now = Date.parse('2026-10-23T18:00:00Z');
  const stamp = new Date(now).toISOString();
  const previous = new Date(now - 10000).toISOString();
  const from = { latitude: 20.7, longitude: -102.3 };
  const near = { latitude: 20.7001, longitude: -102.3 };
  assert.equal(markerAnimationDuration(from, near, previous, stamp, now), 1500);
  assert.equal(markerAnimationDuration(from, { latitude: 20.8, longitude: -102.3 }, previous, stamp, now), 0);
  assert.equal(markerAnimationDuration(from, near, new Date(now - 120000).toISOString(), stamp, now), 0);
  assert.equal(markerAnimationDuration(from, near, previous, stamp, now + 120000), 0);
  assert.equal(markerAnimationDuration(from, near, stamp, previous, now), 0);
});

test('checkout uses business delivery tariffs and validates coverage rather than fixed $25', () => {
  const { deliveryPrice } = load('utils/deliveryPricing.ts');
  const b = { lat: 20.7, lng: -102.35, delivery_radius_km: 30, delivery_fee_0_10: '50.00', delivery_fee_10_15: 60, delivery_fee_15_20: 70, delivery_fee_20_30: 80 };
  const latitude = km => b.lat + km / 6371 * 180 / Math.PI;
  assert.equal(deliveryPrice(b, 'delivery', b.lat, b.lng), 50);
  for (const [km, fee] of [[9.99,50],[10.01,60],[14.99,60],[15.01,70],[19.99,70],[20.01,80]]) assert.equal(deliveryPrice(b, 'delivery', latitude(km), b.lng), fee);
  assert.equal(deliveryPrice({ ...b, delivery_fee_0_10: 0 }, 'delivery', b.lat, b.lng), 0);
  assert.equal(deliveryPrice(b, 'pickup', 0, 0), 0);
  assert.throws(() => deliveryPrice(b, 'delivery', latitude(31), b.lng), /fuera de cobertura/);
  assert.throws(() => deliveryPrice(b, 'delivery', 0, 0), /Ubicación/);
  assert.throws(() => deliveryPrice(null, 'delivery', b.lat, b.lng), /tarifa/);
});

test('checkout shows actionable price errors without disclosing database internals', () => {
  const { parseAppError } = load('utils/errorHandler.ts');
  const reason = 'Los precios o cargos cambiaron; revisa el carrito antes de confirmar';
  assert.equal(parseAppError({ message: reason, code: 'P0001' }, 'Error'), reason);
  assert.equal(parseAppError({ message: 'El domicilio está fuera de cobertura' }, 'Error'), 'El domicilio está fuera de cobertura');
  assert.doesNotMatch(parseAppError({ message: 'permission denied for secret_table' }, 'Error'), /secret_table/);
});


test('technical incident classification never includes customer details', () => {
 const { technicalErrorCode } = load('utils/technicalErrorCode.ts');
 assert.equal(technicalErrorCode({message:'Los precios o cargos cambiaron; revisa el carrito antes de confirmar'}), 'CHECKOUT_PRICE_CHANGED');
 assert.equal(technicalErrorCode({message:'private address token@example.com',code:'arbitrary'}), 'CHECKOUT_UNEXPECTED');
 assert.equal(technicalErrorCode({message:'permission denied',code:'42501'}), 'ACCESS_DENIED');
});

test('incident reporting excludes sensitive payload and survives telemetry outages', async () => {
  let captured;
  const supabase={rpc(name,params){captured={name,params};return {async abortSignal(signal){assert.equal(signal.aborted,false);throw Error('offline');}};}};
  const service=load('services/technicalIncidents.ts',{
    'expo-crypto':{randomUUID:()=> 'incident-id'},
    'expo-application':{nativeApplicationVersion:'1.3.2',nativeBuildVersion:'33'},
    'expo-constants':{default:{expoConfig:{}}},
    './supabase':{supabase},
  });
  await assert.doesNotReject(()=>service.reportCheckoutFailure({message:'SQL secret address token',details:'private'},'shop'));
  assert.equal(captured.name,'report_technical_incident');
  assert.equal(captured.params.p_code,'CHECKOUT_UNEXPECTED');
  assert.equal(captured.params.p_build,'33');
  assert.equal(JSON.stringify(captured).includes('secret'),false);
  assert.equal('user_id' in captured.params,false);
});

test('preparing and ready orders remain active until a terminal status', () => {
 const {ACTIVE_ORDER_STATUSES, ORDER_STATUS_LABELS}=load('utils/orderStatus.ts');
 for(const status of ['PENDING','ACCEPTED','PREPARING','PICKING','ADJUSTED','READY','ON_THE_WAY']) assert.equal(ACTIVE_ORDER_STATUSES.includes(status),true,status);
 for(const status of ['DELIVERED','REJECTED','CANCELLED']) assert.equal(ACTIVE_ORDER_STATUSES.includes(status),false,status);
 assert.match(ORDER_STATUS_LABELS.READY,/Listo/);
 assert.notEqual(ORDER_STATUS_LABELS.READY,ORDER_STATUS_LABELS.DELIVERED);
});
