import fs from 'fs';
import crypto from 'crypto';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const jwk = crypto.createPublicKey(publicKey).export({ format: 'jwk' });

const output = `JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"

JWKS='${JSON.stringify({ keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid: 'my-key-id' }] })}'`;

fs.writeFileSync('keys.txt', output);
console.log('Keys generated to keys.txt');
