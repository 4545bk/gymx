/**
 * GymX HTTPS Mobile Scanner Server
 * 
 * Generates a self-signed certificate using openssl (from Git for Windows)
 * and serves a QR scanner page over HTTPS so phone cameras work.
 * 
 * Usage: node scripts/https-scanner.js
 * Then open: https://YOUR_IP:3443  on your phone
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ─── Get LAN IP ─────────────────────────────────────────────
function getLanIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

// ─── Generate Certificate using OpenSSL ─────────────────────
function generateCerts() {
  const certsDir = path.join(__dirname, '..', 'dev-certs');
  const keyFile = path.join(certsDir, 'key.pem');
  const certFile = path.join(certsDir, 'cert.pem');

  // Reuse existing certs if they exist and are recent
  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    const age = Date.now() - fs.statSync(certFile).mtimeMs;
    if (age < 30 * 24 * 60 * 60 * 1000) { // < 30 days old
      console.log('♻️  Reusing existing dev certificates');
      return {
        key: fs.readFileSync(keyFile, 'utf8'),
        cert: fs.readFileSync(certFile, 'utf8'),
      };
    }
  }

  if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

  // Try multiple openssl paths
  const opensslPaths = [
    'openssl',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'usr', 'bin', 'openssl.exe'),
  ];

  let opensslCmd = null;
  for (const p of opensslPaths) {
    try {
      execSync(`"${p}" version`, { stdio: 'pipe' });
      opensslCmd = `"${p}"`;
      break;
    } catch (e) { continue; }
  }

  if (!opensslCmd) {
    console.error('❌ OpenSSL not found! Please install Git for Windows:');
    console.error('   https://git-scm.com/download/win');
    console.error('   (Git includes OpenSSL which is needed to generate HTTPS certificates)');
    process.exit(1);
  }

  const lanIP = getLanIP();
  console.log(`🔐 Generating certificate for ${lanIP} using OpenSSL...`);

  // Create OpenSSL config for SAN (Subject Alternative Name)
  const configFile = path.join(certsDir, 'openssl.cnf');
  fs.writeFileSync(configFile, `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
CN = GymX Dev Scanner

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = ${lanIP}
IP.2 = 127.0.0.1
DNS.1 = localhost
`);

  try {
    execSync(
      `${opensslCmd} req -x509 -newkey rsa:2048 -keyout "${keyFile}" -out "${certFile}" ` +
      `-days 365 -nodes -config "${configFile}"`,
      { stdio: 'pipe' }
    );
    console.log('✅ Certificate generated successfully');
    // Clean up config
    try { fs.unlinkSync(configFile); } catch (e) {}
  } catch (err) {
    console.error('❌ Failed to generate certificate:', err.message);
    process.exit(1);
  }

  return {
    key: fs.readFileSync(keyFile, 'utf8'),
    cert: fs.readFileSync(certFile, 'utf8'),
  };
}

// ─── Scanner HTML Page ──────────────────────────────────────
function getScannerHTML(apiBase) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>GymX Scanner</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a0a1a; color: #e2e8f0; min-height: 100vh;
    display: flex; flex-direction: column;
  }
  .header {
    padding: 1rem; text-align: center; border-bottom: 1px solid #2d2d4a;
    background: #111128;
  }
  .header h1 { font-size: 1.3rem; color: #10b981; font-weight: 800; }
  .stats { font-size: 0.75rem; color: #888; margin-top: 0.25rem; }
  .stats .ok { color: #22c55e; } .stats .no { color: #ef4444; }
  .content { flex: 1; display: flex; flex-direction: column; align-items: center;
    padding: 1rem; gap: 1rem; }
  .camera-box { width: 100%; max-width: 400px; position: relative; border-radius: 16px;
    overflow: hidden; border: 2px solid #10b981; background: #000; }
  .camera-box video { width: 100%; display: block; }
  .scan-overlay { position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; pointer-events: none; }
  .scan-frame { width: 200px; height: 200px; position: relative; }
  .scan-line { position: absolute; left: 5%; right: 5%; height: 3px; background: #10b981;
    box-shadow: 0 0 12px #10b981; animation: scanLine 2s ease-in-out infinite; }
  .corner { position: absolute; width: 25px; height: 25px; border-color: #10b981;
    border-style: solid; }
  .corner.tl { top:0;left:0; border-width: 4px 0 0 4px; }
  .corner.tr { top:0;right:0; border-width: 4px 4px 0 0; }
  .corner.bl { bottom:0;left:0; border-width: 0 0 4px 4px; }
  .corner.br { bottom:0;right:0; border-width: 0 4px 4px 0; }
  .cam-btn { padding: 2rem; background: #111128; border: 2px dashed #2d2d4a;
    border-radius: 16px; cursor: pointer; text-align: center; width: 100%;
    max-width: 400px; color: #a0aec0; }
  .cam-btn:active { background: #1a1a3a; }
  .result { width: 100%; max-width: 400px; text-align: center; padding: 1.5rem;
    border-radius: 16px; animation: pop 350ms cubic-bezier(0.175,0.885,0.32,1.275); }
  .result.ok { border: 3px solid #22c55e; background: rgba(34,197,94,0.1); }
  .result.no { border: 3px solid #ef4444; background: rgba(239,68,68,0.1); }
  .result .icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .result .name { font-size: 1.3rem; font-weight: 800; margin-bottom: 0.375rem; }
  .badge { display: inline-block; padding: 0.25rem 1rem; border-radius: 999px;
    font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: white; }
  .badge.ok { background: #22c55e; } .badge.no { background: #ef4444; }
  .result .msg { margin-top: 0.5rem; font-size: 0.8rem; color: #888; }
  .divider { width: 100%; max-width: 400px; display: flex; align-items: center; gap: 0.75rem; }
  .divider .line { flex: 1; height: 1px; background: #2d2d4a; }
  .divider span { font-size: 0.7rem; color: #666; text-transform: uppercase;
    letter-spacing: 0.08em; }
  .manual { width: 100%; max-width: 400px; display: flex; gap: 0.375rem; }
  .manual input { flex: 1; padding: 0.875rem; background: #111128;
    border: 2px solid #2d2d4a; border-radius: 10px; color: #e2e8f0;
    font-family: monospace; font-size: 1rem; outline: none; }
  .manual input:focus { border-color: #10b981; }
  .manual button { padding: 0.875rem 1.25rem;
    background: linear-gradient(135deg, #059669, #10b981);
    color: white; border: none; border-radius: 10px; font-weight: 700;
    font-size: 0.9rem; cursor: pointer; }
  .manual button:disabled { opacity: 0.4; }
  .controls { position: absolute; bottom: 0.75rem; left: 0; right: 0;
    display: flex; justify-content: center; gap: 0.5rem; }
  .controls button { padding: 0.5rem 0.75rem; background: rgba(0,0,0,0.6);
    color: white; border: none; border-radius: 8px; font-size: 0.75rem; cursor: pointer; }
  .controls .stop { background: rgba(220,38,38,0.7); }
  .info { width: 100%; max-width: 400px; padding: 0.75rem; background: #111128;
    border-radius: 10px; border: 1px solid #2d2d4a; font-size: 0.75rem;
    color: #888; line-height: 1.6; }
  @keyframes scanLine { 0%{top:5%;opacity:.5} 50%{top:90%;opacity:1} 100%{top:5%;opacity:.5} }
  @keyframes pop { 0%{opacity:0;transform:scale(.85)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
</style>
</head>
<body>
<div class="header">
  <h1>📱 GymX Scanner</h1>
  <div class="stats">
    <span class="ok">✓ <span id="okC">0</span></span> &nbsp;
    <span class="no">✗ <span id="noC">0</span></span> &nbsp; 🔒 HTTPS
  </div>
</div>
<div class="content">
  <div id="rBox"></div>
  <div id="camArea">
    <button class="cam-btn" onclick="startCam()">
      <div style="font-size:3rem">📷</div>
      <div style="font-weight:700;font-size:1.05rem;margin-top:.5rem">Tap to Start Scanner</div>
      <div style="font-size:.8rem;color:#666;margin-top:.25rem">iPhone & Android supported</div>
    </button>
  </div>
  <div class="divider"><div class="line"></div><span>or enter manually</span><div class="line"></div></div>
  <div class="manual">
    <input id="mInput" placeholder="MBR-XXXXXXXX" autocomplete="off"
      onkeydown="if(event.key==='Enter')doScan(this.value)">
    <button onclick="doScan(document.getElementById('mInput').value)">Scan</button>
  </div>
  <div class="info">
    <strong style="color:#a0aec0">📋 How to test:</strong><br>
    1. On computer → Members page → click QR icon on a member<br>
    2. Note the member ID (e.g. MBR-5F9E0005)<br>
    3. Type it above and tap Scan, OR point camera at QR
  </div>
</div>
<canvas id="cv" style="display:none"></canvas>
<script>
const API='${apiBase}', KEY='gymx-scanner-api-key-2026-c9f5e1d7b3a8f4c0e6d2b9a5c1f7e3d8';
let str=null,sl=null,cd=false,oc=0,nc=0,det=null,native=false,nativeFails=0;
if('BarcodeDetector' in window){try{det=new BarcodeDetector({formats:['qr_code']});native=true;}catch(e){}}
(function(){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';s.onerror=function(){const s2=document.createElement('script');s2.src='https://unpkg.com/jsqr@1.4.0/dist/jsQR.min.js';document.head.appendChild(s2);};document.head.appendChild(s);})();
function snd(t){try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);g.gain.value=.1;if(t==='ok'){o.frequency.value=880;o.type='sine';}else{o.frequency.value=220;o.type='square';}g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.4);o.start();o.stop(c.currentTime+.4);}catch(e){}}
async function doScan(mid){
  const id=(mid||'').trim().toUpperCase();
  if(!id||cd)return; cd=true;
  document.getElementById('mInput').value='';
  const dl={'invalid-format':'Invalid QR 🚫','unknown-id':'Unknown Member ❓','expired':'Expired ⏰','suspended':'Suspended 🔒','frozen':'Frozen ❄️','wrong-day':'Not Today 📅','duplicate':'Already In 🔄','error':'Error ⚠️'};
  try{
    const res=await fetch(API+'/checkin',{method:'POST',headers:{'Content-Type':'application/json','x-scanner-key':KEY},body:JSON.stringify({memberId:id})});
    const d=await res.json(),r=d.data,ok=r.result==='granted';
    if(ok){oc++;snd('ok');}else{nc++;snd('no');}
    document.getElementById('okC').textContent=oc;
    document.getElementById('noC').textContent=nc;
    try{if(navigator.vibrate)navigator.vibrate(ok?[100]:[100,50,100]);}catch(e){}
    document.getElementById('rBox').innerHTML='<div class="result '+(ok?'ok':'no')+'">'+
      '<div class="icon">'+(ok?'✅':'❌')+'</div>'+
      '<div class="name">'+(r.member?.fullName||'Unknown')+'</div>'+
      '<div class="badge '+(ok?'ok':'no')+'">'+(ok?'✓ ACCESS GRANTED':(dl[r.denyReason]||'Denied'))+'</div>'+
      (r.message?'<div class="msg">'+r.message+'</div>':'')+'</div>';
    setTimeout(()=>{document.getElementById('rBox').innerHTML='';cd=false;},3500);
  }catch(e){
    document.getElementById('rBox').innerHTML='<div class="result no"><div class="icon">⚠️</div><div class="name">Network Error</div><div class="msg">Check WiFi</div></div>';
    setTimeout(()=>{document.getElementById('rBox').innerHTML='';cd=false;},3500);snd('no');
  }
}
async function startCam(){
  try{
    str=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}});
    document.getElementById('camArea').innerHTML='<div class="camera-box"><video id="vid" playsinline muted autoplay></video><div class="scan-overlay"><div class="scan-frame"><div class="scan-line"></div><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div></div></div><div class="controls"><button onclick="flipCam()">🔄 Flip</button><button class="stop" onclick="stopCam()">Stop</button></div></div>';
    const v=document.getElementById('vid');v.srcObject=str;await v.play();
    const cv=document.getElementById('cv'),cx=cv.getContext('2d',{willReadFrequently:true});
    nativeFails=0;
    const scan=async()=>{
      if(!str||v.readyState!==v.HAVE_ENOUGH_DATA){sl=requestAnimationFrame(scan);return;}
      if(!cd){
        let found=false;
        if(native&&det&&nativeFails<150){try{const c=await det.detect(v);if(c.length>0&&c[0].rawValue){found=true;nativeFails=0;doScan(c[0].rawValue);}else{nativeFails++;}}catch(e){native=false;}}
        if(!found&&window.jsQR){cv.width=v.videoWidth;cv.height=v.videoHeight;cx.drawImage(v,0,0);const img=cx.getImageData(0,0,cv.width,cv.height);const c=window.jsQR(img.data,img.width,img.height,{inversionAttempts:'dontInvert'});if(c&&c.data)doScan(c.data);}
      }
      sl=requestAnimationFrame(scan);
    };
    sl=requestAnimationFrame(scan);
  }catch(e){alert('Camera error: '+e.message+'\\n\\nMake sure you allowed camera permission.');}
}
function stopCam(){if(sl)cancelAnimationFrame(sl);if(str)str.getTracks().forEach(t=>t.stop());str=null;document.getElementById('camArea').innerHTML='<button class="cam-btn" onclick="startCam()"><div style="font-size:3rem">📷</div><div style="font-weight:700;font-size:1.05rem;margin-top:.5rem">Tap to Start Scanner</div></button>';}
let facing='environment';
function flipCam(){stopCam();facing=facing==='environment'?'user':'environment';setTimeout(startCam,300);}
</script>
</body></html>`;
}

// ─── Main ───────────────────────────────────────────────────
const lanIP = getLanIP();
const PORT = 3443;

console.log('');
const { cert, key } = generateCerts();

const server = https.createServer({ cert, key }, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(getScannerHTML(`http://${lanIP}:5000/api/v1`));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('──────────────────────────────────────────────────');
  console.log('📱  GymX Mobile Scanner (HTTPS)');
  console.log('');
  console.log(`  Open on your PHONE:`);
  console.log(`  👉  https://${lanIP}:${PORT}`);
  console.log('');
  console.log('  Accept the security warning, then tap Start Scanner');
  console.log('──────────────────────────────────────────────────');
  console.log('');
});
