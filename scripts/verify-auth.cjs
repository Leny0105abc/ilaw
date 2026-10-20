/* eslint-disable @typescript-eslint/no-require-imports -- Isolated PHP integration harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const {spawn, spawnSync, execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
let php = process.env.ILAW_PHP_BINARY || 'php';
if (process.platform === 'win32' && php === 'php') {
  const found = execFileSync('where.exe', ['php'], {encoding:'utf8'}).trim().split(/\r?\n/)[0];
  php = found.endsWith('.bat') ? fs.readFileSync(found,'utf8').match(/"([^"]+php\.exe)"/i)?.[1] : found;
}
if (!php) throw new Error('Set ILAW_PHP_BINARY to a PHP 8.1+ executable.');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ilaw-auth-verify-'));
const webRoot = path.join(temporary,'public_html');
const username = 'fixture-admin';
const preview = process.argv.includes('--preview');
const password = preview ? 'Local-preview-only-2026!' : `Test-only-${crypto.randomBytes(16).toString('hex')}!`;
const secret = crypto.randomBytes(32).toString('hex');
const hash = execFileSync(php,['-r','echo password_hash(getenv("ILAW_FIXTURE_PASSWORD"), PASSWORD_BCRYPT, ["cost" => 10]);'],{env:{...process.env,ILAW_FIXTURE_PASSWORD:password},encoding:'utf8'}).trim();
let child;

async function main() {
  assert.ok(fs.existsSync(path.join(root,'out/ilaw-gateway.php')), 'Build the static export before verifying auth.');
  fs.cpSync(path.join(root,'out'),webRoot,{recursive:true});
  const socket = net.createServer();
  const previewPort=preview?Number(process.env.ILAW_PREVIEW_PORT||0):0;
  if(!Number.isInteger(previewPort)||previewPort<0||previewPort>65535)throw new Error('Invalid local preview port.');
  await new Promise((resolve,reject)=>{socket.once('error',reject);socket.listen(previewPort,'127.0.0.1',resolve);});
  const port=socket.address().port;
  await new Promise(resolve=>socket.close(resolve));
  const origin=`http://127.0.0.1:${port}`;
  const env={...process.env,ILAW_APP_ENV:'development',ILAW_ADMIN_USERNAME:username,ILAW_ADMIN_PASSWORD_HASH:hash,SESSION_SECRET:secret,ILAW_SITE_ORIGIN:origin,ILAW_DEV_WEB_ROOT:webRoot};
  // Do not log credentials, request bodies, cookie values, or complete session responses.
  let logs='';
  child=spawn(php,['-S',`127.0.0.1:${port}`,'-t',webRoot,path.join(root,'server/dev-auth-router.php')],{env,stdio:['ignore','ignore','pipe'],windowsHide:true});
  child.stderr.on('data',chunk=>{logs+=String(chunk);});
  child.on('error',error=>{logs+=error.message;});
  let ready=false;
  for(let attempt=0;attempt<60;attempt++) {
    try {const response=await fetch(origin+'/login'); if(response.status===200){ready=true;break;}} catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready,`PHP test server failed to start: ${logs.slice(-2000)}`);
  if(preview) {
    console.log(`Isolated local preview: ${origin}/login (disposable fixture account; no production credentials)`);
    await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
    return;
  }
  // Exercise private-file provisioning with fixtures only, including overwrite/public-root refusal.
  const privateEnv = path.join(temporary,'ilaw-auth.env');
  const provisionArgs = [path.join(root,'server/configure-admin.php'),privateEnv];
  const provisionInput = JSON.stringify({username,password,origin:'https://ilaw.lenybuilds.com'});
  const provision = spawnSync(php,provisionArgs,{input:provisionInput,encoding:'utf8'});
  assert.equal(provision.status,0,provision.stderr);
  assert.ok(!provision.stdout.includes(password));
  const privateText = fs.readFileSync(privateEnv,'utf8');
  assert.ok(!privateText.includes(password),'The private file must contain a hash, not a plaintext password');
  const privateHash = privateText.match(/^ILAW_ADMIN_PASSWORD_HASH=(.+)$/m)[1];
  assert.ok(!provision.stdout.includes(privateHash));
  const fromFile = {...process.env};
  for(const key of ['ILAW_ADMIN_USERNAME','ILAW_ADMIN_PASSWORD_HASH','SESSION_SECRET','ILAW_SITE_ORIGIN','ILAW_APP_ENV']) delete fromFile[key];
  const provisionResult = execFileSync(php,['-r','require $argv[1]; echo json_encode(["valid"=>password_verify(stream_get_contents(STDIN), $ilawAuth["ILAW_ADMIN_PASSWORD_HASH"]),"username"=>$ilawAuth["ILAW_ADMIN_USERNAME"]==="fixture-admin","secretLength"=>strlen($ilawAuth["SESSION_SECRET"]),"secure"=>$ilawAuth["secure"]]);',path.join(webRoot,'ilaw-auth.php')],{env:fromFile,input:password,encoding:'utf8'});
  assert.deepEqual(JSON.parse(provisionResult),{valid:true,username:true,secretLength:64,secure:true});
  assert.equal(spawnSync(php,provisionArgs,{input:provisionInput,encoding:'utf8'}).status,1,'Never overwrite existing credentials');
  assert.equal(spawnSync(php,[provisionArgs[0],path.join(webRoot,'ilaw-auth.env')],{input:provisionInput,encoding:'utf8'}).status,1,'Never provision credentials into public_html');
  assert.equal(fs.existsSync(path.join(webRoot,'ilaw-auth.env')),false);
  fs.unlinkSync(privateEnv);
  const jar=new Map();
  async function request(route,options={}) {
    const headers={...options.headers};
    if(jar.size) headers.Cookie=Array.from(jar,([key,value])=>`${key}=${value}`).join('; ');
    const response=await fetch(origin+route,{redirect:'manual',...options,headers});
    for(const cookie of response.headers.getSetCookie()) {
      const [pair]=cookie.split(';'); const at=pair.indexOf('=');
      if(at>=0) jar.set(pair.slice(0,at),pair.slice(at+1));
    }
    // Drain even status-only checks (notably the large PDF worker). Leaving a
    // paused body unread can trigger Undici's Parser.finish assertion on close.
    const body=await response.arrayBuffer();
    return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
  }
  async function token() {
    const response=await request('/login');
    assert.equal(response.status,200);
    const html=await response.text();
    assert.ok(!html.includes(password) && !html.includes(hash) && !html.includes(secret) && !html.includes(username));
    assert.ok(!/Create Account|Sign Up|Forgot Password|User Management/.test(html));
    assert.match(response.headers.get('content-security-policy'),/form-action 'self'/);
    return html.match(/name="csrf_token" value="([a-f0-9]+)"/)[1];
  }
  async function login(user= username, pass=password, remember=false, csrf=undefined) {
    csrf=csrf||await token();
    return request('/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:user,password:pass,remember:remember?'1':'0',csrf_token:csrf})});
  }
  for(const route of ['/','/dashboard','/assessment','/settings','/powerpoint','/powerpoints','/index.html','/index.txt','/_next/static/chunks/missing.js','/old-backup/index.html']) {
    const response=await request(route);
    assert.equal(response.status,303,`${route} must be protected`); assert.equal(response.headers.get('location'),'/login');
  }
  assert.equal((await request('/api/session.php')).status,401);
  assert.equal((await request('/api/assessment.php')).status,401);
  assert.equal((await request('/api/cot-library.php')).status,401);
  const csrf=await token();
  const anonymousSession=jar.get('ilawSession');
  assert.equal((await login(username,password,false,'invalid')).status,403);
  let response=await request('/login',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username,password,csrf_token:csrf})});
  assert.equal(response.status,403);
  response=await login('wrong-user',password);
  assert.equal(response.status,401); assert.match(await response.text(),/Invalid username or password\./);
  response=await login(username,'wrong-password');
  assert.equal(response.status,401); assert.match(await response.text(),/Invalid username or password\./);
  response=await login(); assert.equal(response.status,303); assert.equal(response.headers.get('location'),'/');
  assert.notEqual(jar.get('ilawSession'),anonymousSession,'Successful login must rotate the session ID');
  const cookie=response.headers.getSetCookie().at(-1);
  assert.match(cookie,/HttpOnly/i); assert.match(cookie,/SameSite=Lax/i); assert.ok(!/expires=|Max-Age=/i.test(cookie),'Unchecked Remember Me must use a browser-session cookie');
  let state=await (await request('/api/session.php')).json();
  // COT library remains private, CSRF-protected, versioned and atomically updated.
  for(const route of ['/cot','/cot-lessons','/cot-indicators','/cot/pdf.worker.min.mjs'])assert.equal((await request(route)).status,200);
  let cotResponse=await request('/api/cot-library.php');assert.equal(cotResponse.status,200);const cotLibrary=await cotResponse.json();assert.equal(cotLibrary.indicators.length,81);
  assert.equal((await request('/cot-indicator-seed.json')).status,404);assert.equal((await request('/cot-response-schema.json')).status,404);
  assert.equal((await request('/api/cot-library.php',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(cotLibrary)})).status,403);
  const cotHeaders={Origin:origin,'Content-Type':'application/json','X-ILAW-CSRF':state.csrfToken};
  assert.equal((await request('/api/cot-library.php',{method:'POST',headers:cotHeaders,body:JSON.stringify({...cotLibrary,revision:'old'})})).status,409);
  assert.equal((await request('/api/cot-library.php',{method:'POST',headers:cotHeaders,body:JSON.stringify({...cotLibrary,indicators:[...cotLibrary.indicators,{...cotLibrary.indicators[0],id:'overlapping-version'}]})})).status,400);
  cotResponse=await request('/api/cot-library.php',{method:'POST',headers:cotHeaders,body:JSON.stringify(cotLibrary)});assert.equal(cotResponse.status,200);const publishedCot=await cotResponse.json();assert.notEqual(publishedCot.revision,cotLibrary.revision);assert.deepEqual(publishedCot.indicators,cotLibrary.indicators);
  cotResponse=await request('/api/cot-library.php',{method:'POST',headers:cotHeaders,body:JSON.stringify(publishedCot)});assert.equal(cotResponse.status,200);const republishedCot=await cotResponse.json();assert.notEqual(republishedCot.revision,publishedCot.revision);assert.deepEqual(republishedCot.indicators,publishedCot.indicators);
  assert.ok(fs.existsSync(path.join(temporary,'ilaw-cot-indicators.json')));assert.ok(!fs.existsSync(path.join(webRoot,'ilaw-cot-indicators.json')));
  assert.equal(state.authenticated,true); assert.ok(state.expiresAt>Date.now()+28700*1000 && state.expiresAt<=Date.now()+28800*1000);
  assert.ok(!JSON.stringify(state).includes(hash) && !JSON.stringify(state).includes(password) && !JSON.stringify(state).includes(secret));
  for(const route of ['/','/dashboard','/lesson-plans','/assessment','/assessments','/settings','/curriculum','/index.html','/index.txt']) assert.equal((await request(route)).status,200);
  const chunks=fs.readdirSync(path.join(webRoot,'_next/static/chunks'),{recursive:true});
  const chunk=chunks.find(name=>/\.js$/.test(name));
  assert.ok(chunk,'A production client chunk must exist');
  response=await request('/_next/static/chunks/'+chunk.replace(/\\/g,'/')); assert.equal(response.status,200);
  assert.match(response.headers.get('cache-control'),/no-store/);
  // Check all client-delivered text, not PHP source, for leaked fixture secrets.
  function inspect(directory) {
    for(const item of fs.readdirSync(directory,{withFileTypes:true})) {
      const file=path.join(directory,item.name);
      if(item.isDirectory()) inspect(file);
      else if(/\.(?:html|txt|js|css|json)$/.test(item.name)) {
        const text=fs.readFileSync(file,'utf8');
        assert.ok(!text.includes(password) && !text.includes(hash) && !text.includes(secret),`Secret in ${path.relative(webRoot,file)}`);
      }
    }
  }
  inspect(webRoot);
  for(const route of ['/.env','/.htpasswd','/ilaw-auth.env','/ilaw-auth.php','/ilaw-login-view.php','/release.zip','/old-backup/index.html','/%2e%2e/ilaw-auth.env']) assert.equal((await request(route)).status,404,`Private path exposed: ${route}`);
  response=await request('/api/assessment.php',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}); assert.equal(response.status,403);
  response=await request('/api/session.php',{method:'POST',headers:{Origin:origin,'X-ILAW-CSRF':'invalid'}}); assert.equal(response.status,403);
  assert.equal((await request('/api/session.php')).status,200,'Failed CSRF must not log the user out');
  const capturedCookie=jar.get('ilawSession');
  response=await request('/api/session.php',{method:'POST',headers:{Origin:origin,'X-ILAW-CSRF':state.csrfToken}}); assert.equal(response.status,200); assert.match(response.headers.getSetCookie().at(-1),/expires=/i);
  jar.set('ilawSession',capturedCookie); assert.equal((await request('/')).status,303,'Destroyed session must not be replayable');
  response=await login(username,password,true); assert.equal(response.status,303);
  assert.match(response.headers.getSetCookie().at(-1),/expires=/i); assert.match(response.headers.getSetCookie().at(-1),/Max-Age=604800/i);
  state=await (await request('/api/session.php')).json(); assert.ok(state.expiresAt>Date.now()+604700*1000);
  assert.equal((await request('/')).status,200,'Refresh must retain the session');
  execFileSync(php,['-r','session_name("ilawSession"); session_save_path($argv[1]); session_id($argv[2]); session_start(); $_SESSION["expires_at"]=time()-1; session_write_close();',path.join(temporary,'ilaw-auth-state/sessions'),jar.get('ilawSession')],{env,stdio:'pipe'});
  assert.equal((await request('/settings')).status,303,'Expired session must be denied');
  response=await login(); assert.equal(response.status,303);
  state=await (await request('/api/session.php')).json();
  await request('/api/session.php',{method:'POST',headers:{Origin:origin,'X-ILAW-CSRF':state.csrfToken}});
  response=await login('wrong-user','wrong-password'); assert.equal(response.status,429); assert.ok(Number(response.headers.get('retry-after'))>0);
  // Unit-check production cookie settings and invalidation without a real TLS listener.
  const production={...env,ILAW_APP_ENV:'',ILAW_SITE_ORIGIN:'https://ilaw.lenybuilds.com'};
  const result=JSON.parse(execFileSync(php,['-r',
    'require $argv[1]; $_SESSION=["credential_version"=>ilaw_credential_version($ilawAuth),"expires_at"=>time()+3600,"last_seen"=>time(),"idle_seconds"=>3600]; $fresh=ilaw_authenticated($ilawAuth); $_SESSION["last_seen"]=time()-3601; $idle=ilaw_authenticated($ilawAuth); $_SESSION["last_seen"]=time(); $changed=$ilawAuth; $changed["SESSION_SECRET"]=str_repeat("z",64); echo json_encode(["fresh"=>$fresh,"idleDenied"=>!$idle,"rotationDenied"=>!ilaw_authenticated($changed),"cookie"=>session_get_cookie_params(),"strict"=>ini_get("session.use_strict_mode"),"name"=>session_name()]);',path.join(webRoot,'ilaw-auth.php')],{env:production,encoding:'utf8'}));
  assert.equal(result.fresh,true); assert.equal(result.idleDenied,true); assert.equal(result.rotationDenied,true);
  assert.equal(result.cookie.secure,true); assert.equal(result.cookie.httponly,true); assert.equal(result.cookie.samesite,'Lax'); assert.equal(result.cookie.domain,''); assert.equal(result.strict,'1'); assert.equal(result.name,'__Host-ilawSession');
  const unavailable=execFileSync(php,['-r','require $argv[1];',path.join(webRoot,'ilaw-auth.php')],{env:{...production,ILAW_ADMIN_PASSWORD_HASH:''},encoding:'utf8'});
  assert.match(unavailable,/unavailable/); assert.ok(!unavailable.includes(hash));
  console.log('PASS: isolated PHP login, wrong credentials, CSRF, exact session durations, session rotation, refresh, direct URL/assets/API protection, logout/replay, expiry, credential rotation, production cookie configuration, fail-closed setup, secret scanning and persistent rate limiting.');
  console.log('Production Apache rewrite, TLS and Hostinger cache checks remain required before activation.');
}

main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  if(child && child.exitCode===null){child.kill(); await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,3000);});}
  // This path is the exact dedicated mkdtemp result, never a project or home directory.
  const resolved=path.resolve(temporary), parent=path.resolve(os.tmpdir());
  if(path.dirname(resolved)!==parent || !path.basename(resolved).startsWith('ilaw-auth-verify-')) throw new Error('Unsafe test cleanup path');
  fs.rmSync(resolved,{recursive:true,force:true});
});
