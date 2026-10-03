/* Plantilla de worker. La compilación inserta SOLO recursos estáticos verificados. */
const CONFIG = {"build":"e5dca6026f60c2655c09","version":"0.4.1","environment":"production","namespace":"SONNE_APP_production_ff633cba0449_","base":"/sonne-finance/","resources":[{"path":"assets/Backups-CWYBZDH2.js","sha256":"7161cc361653d7a082761082bebb57f834ceaa5a0f7de796e03b0b59c55b2d5e"},{"path":"assets/Historial-bGbhri-d.js","sha256":"d807f8b25b28d4ec459286d24ed2dec512cd4d5da7792d72ac391a21917fccd4"},{"path":"assets/Plan-C9Blg4iK.js","sha256":"8c89d25d6c9b01309b192f9c9501802ac8cafc02276c17b78faa9e351315e0c3"},{"path":"assets/Simulador-CzM6mLRf.js","sha256":"64a8005f69795147ee917f822c497a33600dbc434090abc295e3df48fe85777d"},{"path":"assets/index-D0bto7yz.js","sha256":"fba11a65beb2cc1bc2afa1ebca962c915062434f8d4e0de72474284f85069521"},{"path":"assets/index-DRvbQA45.css","sha256":"87906fcae36791d43b47c5e015d1420cf7ad4bfeb08319050570a6b8b4f402bc"},{"path":"assets/shared-BSvBsTId.js","sha256":"0810a8e06a7cfb1339f6ec3de6986b9dc9c603e8e40c1e6d14dc39c53957425b"},{"path":"icons/apple-180.png","sha256":"fd62a8cf2ee367a9852eebff3ac7defbf3e937c45b51e4be351e27af8ec7f857"},{"path":"icons/icon-192.png","sha256":"bcb99822e81a8079f7cf3c04c4eefab76c8f5fc9ef30148d77b367b090b3b17a"},{"path":"icons/icon-512.png","sha256":"c83371e1e685bacb76403a142550948541260daa1f4d5948a2d1945659f31307"},{"path":"icons/maskable-512.png","sha256":"1bfa28dd912ffd5c2d143b481080b7ff03ef7400f2f89c85dcda64da087b2717"},{"path":"icons/sun.svg","sha256":"178c1023c2e2be0011328cdbc65e7583613623451b3464cb6c9d4f5c01c56068"},{"path":"index.html","sha256":"42eafdc70eddd4ec80199e3a6839d75ac327d416f95ade5bf1bce248e3c318a2"},{"path":"manifest.webmanifest","sha256":"3bb8f69fc5305921683fd48d6ea20a3f37cd6321a8f829c04a72cac67f12cd1e"}]};
const scope = new URL(self.registration.scope);
const namespace = CONFIG.namespace;
const cacheName = namespace + CONFIG.build;
const resources = CONFIG.resources.map(r => ({ ...r, url: new URL(r.path, scope).href }));
const own = url => url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html');
const send = (event, value) => event.ports[0]?.postMessage(value);
async function digest(response) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await response.arrayBuffer()))].map(b => b.toString(16).padStart(2,'0')).join(''); }
async function verified(cache) {
  for (const resource of resources) { const response = await cache.match(resource.url); if (!response || await digest(response) !== resource.sha256) return false; }
  return true;
}
async function install() {
  // Descarga y comprueba TODO antes de escribir. Una instalación fallida nunca
  // modifica la caché de una versión activa ni IndexedDB.
  const responses = [];
  for (const resource of resources) {
    const response = await fetch(resource.url, { cache:'no-store', credentials:'omit', redirect:'error' });
    if (!response.ok || response.type === 'opaque' || await digest(response.clone()) !== resource.sha256) throw new Error('Recurso incompleto o incompatible: ' + resource.path);
    responses.push(response);
  }
  const cache = await caches.open(cacheName);
  try { for (let i=0; i<resources.length; i++) await cache.put(resources[i].url, responses[i]); }
  catch(error) { await caches.delete(cacheName); throw error; }
}
self.addEventListener('install', event => event.waitUntil(install()));
// No skipWaiting en instalación, ni borrado de cachés antiguas al activar.
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;
  const navigation = request.mode === 'navigate' && own(url);
  const resource = resources.find(r => r.url === url.href);
  const oldAsset = url.pathname.startsWith(scope.pathname+'assets/') && !url.search;
  if (!navigation && !resource && !oldAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(navigation ? new URL('index.html',scope).href : request);
    if (hit) return hit;
    // Pestaña antigua: conservar y consultar SOLO las cachés de este entorno/ruta.
    if (oldAsset) for (const name of (await caches.keys()).filter(n=>n.startsWith(namespace) && n!==cacheName)) { const previous = await (await caches.open(name)).match(request); if(previous) return previous; }
    return fetch(request);
  })());
});
self.addEventListener('message', event => {
  const source = event.source;
  if (!source || !own(new URL(source.url))) return;
  const data = event.data;
  if (data?.type === 'STATUS') event.waitUntil((async()=>send(event,{type:'STATUS',build:CONFIG.build,version:CONFIG.version,environment:CONFIG.environment,ready:await verified(await caches.open(cacheName)),count:resources.length}))());
  if (data?.type === 'ACTIVATE') event.waitUntil((async()=>{
    if (data.build !== CONFIG.build) return send(event,{ok:false,error:'La actualización ha cambiado. Comprueba de nuevo.'});
    if (!await verified(await caches.open(cacheName))) return send(event,{ok:false,error:'La actualización no está completa. Se conserva la versión actual.'});
    const tabs = (await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(c=>own(new URL(c.url)));
    if (tabs.length !== 1 || tabs[0].id !== source.id) return send(event,{ok:false,error:'Cierra las otras pestañas o ventanas de SONNE en esta ruta y vuelve a intentarlo.'});
    send(event,{ok:true}); await self.skipWaiting();
  })());
});

