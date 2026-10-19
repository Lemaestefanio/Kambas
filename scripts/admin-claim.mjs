#!/usr/bin/env node
// Run only from a trusted operator environment with Application Default Credentials.
import { readFile } from 'node:fs/promises';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const options = process.argv.slice(2);
const value = (flag) => options.includes(flag) ? options[options.indexOf(flag) + 1] : undefined;
const uid = value('--uid');
const project = value('--project');
const grant = options.includes('--grant');
const revoke = options.includes('--revoke');
const expected = JSON.parse(await readFile(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')).projectId;

if (!uid || uid.startsWith('--') || !project || project !== expected || grant === revoke) {
  console.error('Uso: node scripts/admin-claim.mjs --project <projeto-do-config> --uid <UID-verificado> --grant|--revoke');
  process.exitCode = 1;
} else {
  initializeApp({ credential: applicationDefault(), projectId: project });
  const user = await getAuth().getUser(uid);
  if (grant && (user.disabled || !user.providerData.some((provider) => provider.providerId === 'google.com'))) {
    throw new Error('Só é possível autorizar uma conta Google ativa neste painel. Confirma o UID na consola.');
  }
  const claims = { ...user.customClaims };
  if (grant) claims.admin = true;
  else delete claims.admin;
  await getAuth().setCustomUserClaims(uid, claims);
  if (revoke) await getAuth().revokeRefreshTokens(uid);
  console.log(`Permissão de administrador ${grant ? 'atribuída' : 'removida'} para o UID ${uid}.`);
  console.log('Termina a sessão e volta a entrar para renovar o token. Tokens já emitidos podem permanecer válidos até expirarem.');
}
