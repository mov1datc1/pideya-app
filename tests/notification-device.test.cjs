const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/notificationDevice.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const tick = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function fixture(store = new Map()) {
  const calls = []; const listeners = {};
  const storage = { getItem: async k => store.get(k) ?? null, setItem: async (k, v) => store.set(k, v), removeItem: async k => store.delete(k) };
  const notifications = {
    AndroidImportance: { HIGH: 4 },
    setNotificationChannelAsync: async () => { calls.push('channel'); },
    getPermissionsAsync: async () => ({ status: 'undetermined' }),
    requestPermissionsAsync: async () => { calls.push('permission'); return { status: 'granted' }; },
    getExpoPushTokenAsync: async options => { calls.push(options); return { data: 'ExpoPushToken[test]' }; },
    addPushTokenListener: fn => { listeners.token = fn; return { remove() {} }; },
  };
  const mocks = {
    '@react-native-async-storage/async-storage': { default: storage },
    'react-native': { Platform: { OS: 'android' }, AppState: { addEventListener: (_, fn) => { listeners.resume = fn; return { remove() {} }; } } },
    'expo-notifications': notifications, 'expo-device': { isDevice: true },
    'expo-constants': { default: { easConfig: { projectId: 'project' } } },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'process', code)(name => mocks[name], module, module.exports, { env: { EXPO_PUBLIC_NOTIFICATION_V2: 'true' } });
  return { ...module.exports, calls, listeners, store };
}
test('foreground duplicates serialize and remain suppressed after a new process', async () => {
  const f = fixture();
  assert.deepEqual(await Promise.all([f.shouldDisplayEvent({ eventId: 'same' }), f.shouldDisplayEvent({ eventId: 'same' })]), [true, false]);
  assert.equal(await fixture(f.store).shouldDisplayEvent({ eventId: 'same' }), false);
});
test('corrupt stored dedup history cannot hide legitimate notifications', async () => {
  const f = fixture(new Map([['@pideya_displayed_events', '{}']]));
  assert.equal(await f.shouldDisplayEvent({ eventId: 'new' }), true);
});
test('missing or changed auth identity never registers an endpoint for the wrong account', async () => {
  const f = fixture(); let writes = 0;
  const db = { auth: { getUser: async () => ({ data: { user: { id: 'other' } } }) }, rpc: async () => { writes++; return { data: 'endpoint' }; } };
  f.watchNotificationDevice(db, 'client', null);
  const stop = f.watchNotificationDevice(db, 'client', 'expected');
  await tick(); stop(); assert.equal(writes, 0);
});
test('Android channel precedes permission; token rotation uses the emitted native token', async () => {
  const f = fixture(); let writes = 0;
  const db = { auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) }, rpc: async () => { writes++; return { data: 'endpoint' }; } };
  const stop = f.watchNotificationDevice(db, 'client', 'user'); await tick();
  assert.ok(f.calls.indexOf('channel') < f.calls.indexOf('permission')); assert.equal(writes, 1);
  f.listeners.token({ type: 'android', data: 'rotated-native-token' }); await tick();
  assert.equal(writes, 2);
  assert.equal(f.calls.filter(x => typeof x === 'object').at(-1).devicePushToken.data, 'rotated-native-token'); stop();
});
test('registration failure is retried on resume instead of marked permanently successful', async () => {
  const f = fixture(); let attempts = 0;
  const db = { auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) }, rpc: async () => ++attempts === 1 ? { error: new Error('offline') } : { data: 'endpoint' } };
  const stop = f.watchNotificationDevice(db, 'client', 'user'); await tick();
  f.listeners.resume('active'); await tick(); assert.equal(attempts, 2); stop();
});
