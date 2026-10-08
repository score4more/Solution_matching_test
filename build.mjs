// Encrypts source/index.src.html -> index.html (password gate + AES-256-GCM ciphertext).
// Usage: node build.mjs        (prompts for the password; or set env SM_PASSWORD)
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

const ITER = 600000;
const b64 = (u8) => Buffer.from(u8).toString('base64');

function ask(q) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); };
    rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); res(a); });
  });
}

let pw = process.env.SM_PASSWORD;
if (!pw) {
  pw = await ask('Password: ');
  if (pw !== await ask('Repeat password: ')) { console.error('Passwords do not match.'); process.exit(1); }
}
if (pw.length < 12) { console.error('Use at least 12 characters (a passphrase of several words).'); process.exit(1); }

const plain = readFileSync(new URL('./source/index.src.html', import.meta.url));
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base,
  { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));

const gate = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Solution Matching &ndash; protected</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#eef2f0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#17262c}
  form{background:#fff;padding:32px;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.08);width:min(340px,86vw)}
  h1{font-size:18px;margin:0 0 6px} p{margin:0 0 18px;font-size:14px;color:#5b6b70}
  input,button{width:100%;box-sizing:border-box;padding:11px 12px;font-size:15px;border-radius:8px;border:1px solid #d5dedb}
  button{margin-top:10px;background:#17262c;color:#fff;border:0;cursor:pointer} button:disabled{opacity:.6}
  #err{color:#b3261e;font-size:13px;margin-top:10px;min-height:16px}
</style></head><body>
<form id="f"><h1>Solution Matching</h1><p>This click dummy is password protected.</p>
<input id="pw" type="password" placeholder="Password" autocomplete="current-password" autofocus>
<button id="b">Open</button><div id="err"></div></form>
<script>
const D={salt:"${b64(salt)}",iv:"${b64(iv)}",iter:${ITER},ct:"${b64(ct)}"};
const u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
document.getElementById('f').addEventListener('submit',async e=>{
  e.preventDefault();
  const b=document.getElementById('b'),err=document.getElementById('err');
  b.disabled=true;err.textContent='';
  try{
    const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(document.getElementById('pw').value),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:u8(D.salt),iterations:D.iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
    const html=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:u8(D.iv)},key,u8(D.ct)));
    document.open();document.write(html);document.close();
  }catch(x){err.textContent='Wrong password.';b.disabled=false;}
});
</script></body></html>`;
writeFileSync(new URL('./index.html', import.meta.url), gate);
console.log('Wrote index.html (' + Math.round(gate.length / 1024) + ' KB, encrypted).');
