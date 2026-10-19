#!/usr/bin/env node
// Turns a password into the value for ADMIN_PASSWORD_HASH.
// Usage: npm run hash-password            (asks for the password, hidden)
//        npm run hash-password -- 'secret' (non-interactive, e.g. for CI)
import { scrypt, randomBytes } from 'node:crypto';
import readline from 'node:readline';

const N = 16384, R = 8, P = 1, KEYLEN = 64;

function hash(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join(':')),
    ),
  );
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : '*');
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = process.argv[2] ?? (await ask('New admin password: '));
if (!password || password.length < 12) {
  console.error('Use at least 12 characters. A short sentence works well.');
  process.exit(1);
}
console.log('\nADMIN_PASSWORD_HASH value (paste into Vercel):\n');
console.log(await hash(password));
console.log('\nSESSION_SECRET suggestion (paste into Vercel too):\n');
console.log(randomBytes(32).toString('base64url'));
