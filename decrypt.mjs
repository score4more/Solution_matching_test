// Recovers the plaintext click dummy from the encrypted index.html -> source/index.src.html
// Usage: node decrypt.mjs        (prompts for the password; or set env SM_PASSWORD)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import readline from 'node:readline';

function ask(q) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); };
    rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); res(a); });
  });
}

const pw = process.env.SM_PASSWORD || await ask('Password: ');
const gate = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const D = JSON.parse(gate.match(/const D=(\{.*?\});/s)[1].replace(/(\w+):/g, '"$1":'));
const u8 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));

try {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: u8(D.salt), iterations: D.iter, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8(D.iv) }, key, u8(D.ct));
  mkdirSync(new URL('./source/', import.meta.url), { recursive: true });
  writeFileSync(new URL('./source/index.src.html', import.meta.url), Buffer.from(plain));
  console.log('Wrote source/index.src.html');
} catch {
  console.error('Wrong password, or index.html is not an encrypted build.');
  process.exit(1);
}
