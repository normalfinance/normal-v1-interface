// One-time: generate the autopilot P-256 keypair. Run `node scripts/generate-autopilot-key.mjs`
// and place the two lines in the server env (public also as NEXT_PUBLIC_AUTOPILOT_PUBLIC_KEY
// for the consent ceremony). NEVER commit the private key.
import { generateP256KeyPair } from '@turnkey/crypto';
const k = generateP256KeyPair();
console.log('AUTOPILOT_API_PUBLIC_KEY=' + k.publicKey);
console.log('AUTOPILOT_API_PRIVATE_KEY=' + k.privateKey);
console.log('NEXT_PUBLIC_AUTOPILOT_PUBLIC_KEY=' + k.publicKey);
