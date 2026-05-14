#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const serverSecretsPath = resolve(root, 'src/lib/payment-server-secrets.ts');
const publicConfigPath = resolve(root, 'src/lib/payment-public-config.ts');

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Expected pattern not found for ${label}.`);
  }
  return source.replace(search, replacement);
}

function main() {
  let serverSource = readFileSync(serverSecretsPath, 'utf8');
  let publicSource = readFileSync(publicConfigPath, 'utf8');

  serverSource = replaceOnce(
    serverSource,
    "const HARDCODED_PAYSTACK_SECRET_KEY = 'sk_live_1889a3ecb770bb0b0480183bd08e2b76f691ff8f';",
    "const HARDCODED_PAYSTACK_SECRET_KEY = '';",
    'PAYSTACK secret'
  );

  serverSource = replaceOnce(
    serverSource,
    "const HARDCODED_KORAPAY_SECRET_KEY = 'sk_live_soSJnnV3P6g9Ey88rxFeryaCfUWyTAgDhthjyxo9';",
    "const HARDCODED_KORAPAY_SECRET_KEY = '';",
    'KORAPAY secret'
  );

  publicSource = replaceOnce(
    publicSource,
    "export const HARDCODED_PAYSTACK_PUBLIC_KEY = 'pk_live_2b2908cd72c948b9dda38b1ad9e85e00d1c46304';",
    "export const HARDCODED_PAYSTACK_PUBLIC_KEY = '';",
    'PAYSTACK public key'
  );

  publicSource = replaceOnce(
    publicSource,
    "export const HARDCODED_KORAPAY_PUBLIC_KEY = 'pk_live_w1sXEJFS5Qoj1wjwDiaLdV3u4uGVjpVkn8Vr9RNo';",
    "export const HARDCODED_KORAPAY_PUBLIC_KEY = '';",
    'KORAPAY public key'
  );

  writeFileSync(serverSecretsPath, serverSource, 'utf8');
  writeFileSync(publicConfigPath, publicSource, 'utf8');

  console.log('Hardcoded payment keys removed. App now requires env/deployment secrets.');
}

main();
