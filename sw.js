const CACHE='pow-v2';
const ASSETS=[
  './','./index.html','./styles.css','./game.js','./manifest.webmanifest','./art/lotus.svg','./art/chakra.svg','./art/om.svg','./art/arjuna.svg','./art/krishna.svg','./art/chariot.svg','./art/meditate.svg','./audio/bell_epic.wav','./audio/hum_epic.wav','./audio/swoosh.wav'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match('./index.html'))));});
