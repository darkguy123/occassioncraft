#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const serverSecretsPath = resolve(root, 'src/lib/payment-server-secrets.ts');
const publicConfigPath = resolve(root, 'src/lib/payment-public-config.ts');
const appHostingPath = resolve(root, 'apphosting.yaml');

function readText(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }
  return readFileSync(path, 'utf8');
}

function extractConst(source, name) {
  const regex = new RegExp(`const\\s+${name}\\s*=\\s*['\"]([^'\"]+)['\"]`);
  const match = source.match(regex);
  if (!match?.[1]) {
    throw new Error(`Could not find ${name} in source.`);
  }
  return match[1];
}

function runFirebaseSet(secretName, value, projectId) {
  const result = spawnSync(
    'firebase',
    ['apphosting:secrets:set', secretName, '--project', projectId],
    {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: `${value}\n`,
      encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to set secret ${secretName}.`);
  }
}

function runFirebaseGrant(secretName, projectId) {
  const result = spawnSync(
    'firebase',
    ['apphosting:secrets:grantaccess', secretName, '--project', projectId],
    {
      stdio: 'inherit',
      encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to grant secret access for ${secretName}.`);
  }
}

function upsertAppHostingManagedBlock() {
  const start = '# BEGIN managed-payment-secrets';
  const end = '# END managed-payment-secrets';

  const block = [
    start,
    'env:',
    '  - variable: PAYSTACK_SECRET_KEY',
    '    secret: PAYSTACK_SECRET_KEY',
    '  - variable: KORAPAY_SECRET_KEY',
    '    secret: KORAPAY_SECRET_KEY',
    '  - variable: NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
    '    secret: NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
    '  - variable: NEXT_PUBLIC_KORAPAY_PUBLIC_KEY',
    '    secret: NEXT_PUBLIC_KORAPAY_PUBLIC_KEY',
    end,
    '',
  ].join('\n');

  const current = readText(appHostingPath);
  if (current.includes(start) && current.includes(end)) {
    const updated = current.replace(new RegExp(`${start}[\\s\\S]*?${end}\\n?`, 'm'), block);
    writeFileSync(appHostingPath, updated, 'utf8');
    return;
  }

  const withTrailingNewline = current.endsWith('\n') ? current : `${current}\n`;
  writeFileSync(appHostingPath, `${withTrailingNewline}\n${block}`, 'utf8');
}

function parseProjectId() {
  const arg = process.argv.find((a) => a.startsWith('--project='));
  const value = arg ? arg.split('=')[1] : process.env.FIREBASE_PROJECT_ID;
  if (!value) {
    throw new Error('Provide --project=<firebase-project-id> or set FIREBASE_PROJECT_ID.');
  }
  return value;
}

function main() {
  const projectId = parseProjectId();
  const serverSecretsSource = readText(serverSecretsPath);
  const publicConfigSource = readText(publicConfigPath);

  const secrets = [
    ['PAYSTACK_SECRET_KEY', extractConst(serverSecretsSource, 'HARDCODED_PAYSTACK_SECRET_KEY')],
    ['KORAPAY_SECRET_KEY', extractConst(serverSecretsSource, 'HARDCODED_KORAPAY_SECRET_KEY')],
    ['NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY', extractConst(publicConfigSource, 'HARDCODED_PAYSTACK_PUBLIC_KEY')],
    ['NEXT_PUBLIC_KORAPAY_PUBLIC_KEY', extractConst(publicConfigSource, 'HARDCODED_KORAPAY_PUBLIC_KEY')],
  ];

  for (const [name, value] of secrets) {
    runFirebaseSet(name, value, projectId);
    runFirebaseGrant(name, projectId);
  }

  upsertAppHostingManagedBlock();

  console.log('Payment secrets were pushed to Firebase App Hosting and apphosting.yaml was updated.');
  console.log('Commit apphosting.yaml, then trigger a new rollout.');
}

main();
