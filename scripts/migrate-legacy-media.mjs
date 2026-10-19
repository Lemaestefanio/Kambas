#!/usr/bin/env node
// Trusted operator utility. Default is read-only; never bundle this in the frontend.
import { mkdir, open, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { sha256, inspectCreator, replaceValues, encodeBackup } from './legacy-media-core.mjs';

function options(argv) {
  const result = { apply: false };
  const names = new Map([['--project', 'project'], ['--database', 'database'], ['--backup-dir', 'backupDir'], ['--config', 'config']]);
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === '--apply') { result.apply = true; continue; }
    if (flag === '--help') { result.help = true; continue; }
    const key = names.get(flag), value = argv[++index];
    if (!key || !value || value.startsWith('--') || result[key]) throw new Error(`Argumento inválido ou repetido: ${flag}`);
    result[key] = value;
  }
  return result;
}

async function writePrivate(path, value) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  if (sha256(await readFile(path)) !== sha256(bytes)) throw new Error('Não foi possível verificar o backup local.');
  return sha256(bytes);
}

async function main() {
  const args = options(process.argv.slice(2));
  if (args.help) {
    console.log('node scripts/migrate-legacy-media.mjs --project <id-do-config> --database <banco-do-config> --backup-dir <diretório-privado> [--apply] [--config <ficheiro>]');
    console.log('Sem --apply: lê o Firestore, cria backup e relatório; não escreve no Firebase.');
    return;
  }
  if (!args.project || !args.database || !args.backupDir) throw new Error('--project, --database e --backup-dir são obrigatórios.');
  const configPath = args.config ? resolve(args.config) : new URL('../firebase-applet-config.json', import.meta.url);
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (args.project !== config.projectId || args.database !== config.firestoreDatabaseId || args.database === '(default)' || !config.storageBucket) {
    throw new Error('O projeto, banco nomeado e bucket têm de corresponder à configuração do projeto.');
  }
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST) {
    throw new Error('Variáveis de emulador detetadas. Este utilitário destina-se ao projeto explicitamente selecionado.');
  }
  const { initializeApp, applicationDefault, deleteApp } = await import('firebase-admin/app');
  const firestoreSDK = await import('firebase-admin/firestore');
  const { getStorage, getDownloadURL } = await import('firebase-admin/storage');
  const app = initializeApp({ credential: applicationDefault(), projectId: args.project, storageBucket: config.storageBucket });
  const db = firestoreSDK.getFirestore(app, args.database);
  const bucket = getStorage(app).bucket(config.storageBucket);
  try {
    // Native snapshots retain updateTime for backup and atomic write preconditions.
    // This is a small, one-off inventory, not an application analytics query.
    const snapshot = await db.collection('creators').limit(401).get();
    if (snapshot.size > 400) throw new Error('Mais de 400 perfis: este utilitário exige uma migração revista por lotes.');
    if (snapshot.empty) throw new Error('A coleção creators está vazia; confirma o banco selecionado.');
    const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
    const runDir = join(resolve(args.backupDir), runId);
    await mkdir(runDir, { recursive: true, mode: 0o700 });
    const backupPath = join(runDir, 'creators-before.json');
    const backupHash = await writePrivate(backupPath, {
      format: 'kambas-creators-backup-v1', projectId: args.project, databaseId: args.database,
      bucket: config.storageBucket, capturedAt: new Date().toISOString(),
      documents: snapshot.docs.map((doc) => ({ path: doc.ref.path,
        updateTime: encodeBackup(doc.updateTime, firestoreSDK), data: encodeBackup(doc.data(), firestoreSDK) })),
    });
    await writePrivate(join(runDir, 'backup-sha256.json'), { file: 'creators-before.json', sha256: backupHash });
    const plans = snapshot.docs.map((doc) => ({ doc, data: doc.data(), plan: inspectCreator(doc.data(), doc.id) }));
    const report = {
      mode: args.apply ? 'apply' : 'dry-run', projectId: args.project, databaseId: args.database,
      backup: { path: backupPath, sha256: backupHash },
      documents: plans.map(({ doc, plan }) => ({ path: doc.ref.path,
        media: plan.media.map(({ path, mime, bytes, hash, extension }) => ({ path, mime, bytes: bytes.length, sha256: hash,
          destination: `public/legacy-migration/${hash}.${extension}` })),
        timestamps: plan.timestamps.map(({ path, milliseconds }) => ({ path, iso: new Date(milliseconds).toISOString() })),
        issues: plan.issues,
      })),
    };
    await writePrivate(join(runDir, 'plan.json'), report);
    const issues = report.documents.reduce((count, document) => count + document.issues.length, 0);
    const mediaCount = report.documents.reduce((count, document) => count + document.media.length, 0);
    const changed = plans.filter(({ plan }) => plan.media.length || plan.timestamps.length);
    console.log(JSON.stringify({ mode: report.mode, profiles: snapshot.size, mediaReferences: mediaCount,
      changedProfiles: changed.length, issues, backup: backupPath, report: join(runDir, 'plan.json') }, null, 2));
    if (issues) {
      console.error('Há referências locais ou dados que exigem revisão. Nenhuma escrita remota foi efetuada. Consulta plan.json.');
      process.exitCode = 2;
      return;
    }
    if (!args.apply || !changed.length) return;
    // A valid backup and clean plan exist before any Storage or Firestore mutation.
    const urls = new Map();
    let assetIndex = 0;
    for (const { plan } of changed) for (const asset of plan.media) {
      const name = `public/legacy-migration/${asset.hash}.${asset.extension}`;
      if (urls.has(name)) continue;
      const file = bucket.file(name);
      let metadata;
      try { [metadata] = await file.getMetadata(); }
      catch (error) {
        if (Number(error.code) !== 404) throw error;
        try {
          await file.save(asset.bytes, { resumable: false, validation: 'crc32c', preconditionOpts: { ifGenerationMatch: 0 },
            metadata: { contentType: asset.mime, cacheControl: 'public,max-age=31536000,immutable',
              metadata: { firebaseStorageDownloadTokens: randomUUID(), migration: 'kambas-legacy-media-v1', sha256: asset.hash } },
          });
        } catch (saveError) {
          // Another invocation may have created this identical content-addressed object.
          if (Number(saveError.code) !== 412) throw saveError;
        }
        [metadata] = await file.getMetadata();
      }
      if (metadata.contentType !== asset.mime || Number(metadata.size) !== asset.bytes.length
          || metadata.metadata?.sha256 !== asset.hash || metadata.metadata?.migration !== 'kambas-legacy-media-v1') {
        throw new Error(`Objeto existente incompatível: ${name}. Não será substituído.`);
      }
      const [downloaded] = await file.download();
      if (sha256(downloaded) !== asset.hash) throw new Error(`Falha na verificação dos bytes: ${name}`);
      const url = await getDownloadURL(file);
      await writePrivate(join(runDir, `asset-${String(++assetIndex).padStart(4, '0')}.json`), {
        name, generation: metadata.generation, sha256: asset.hash, url,
      });
      urls.set(name, url);
    }
    const batch = db.batch();
    const expected = [];
    for (const { doc, data, plan } of changed) {
      const replacements = new Map();
      for (const asset of plan.media) replacements.set(JSON.stringify(asset.path), urls.get(`public/legacy-migration/${asset.hash}.${asset.extension}`));
      for (const timestamp of plan.timestamps) replacements.set(JSON.stringify(timestamp.path), firestoreSDK.Timestamp.fromMillis(timestamp.milliseconds));
      const next = replaceValues(data, replacements);
      const fields = [...new Set([...plan.media, ...plan.timestamps].map((item) => item.path[0]))];
      const patch = Object.fromEntries(fields.map((field) => [field, next[field]]));
      batch.update(doc.ref, patch, { lastUpdateTime: doc.updateTime });
      expected.push({ ref: doc.ref, patch });
    }
    await writePrivate(join(runDir, 'commit-intent.json'), {
      documentPaths: expected.map(({ ref }) => ref.path),
      note: 'Um único batch, com precondições de updateTime. Se ocorrer falha de rede, reler o banco antes de repetir.',
    });
    // All documents commit atomically, and an intervening edit rejects the entire batch.
    const writes = await batch.commit();
    await writePrivate(join(runDir, 'commit-result.json'), writes.map((result, index) => ({
      path: expected[index].ref.path, updateTime: encodeBackup(result.writeTime, firestoreSDK),
    })));
    const actual = await db.getAll(...expected.map(({ ref }) => ref));
    const verification = actual.map((doc, index) => ({ path: doc.ref.path,
      fieldsMatch: doc.exists && Object.entries(expected[index].patch).every(([field, value]) =>
        JSON.stringify(encodeBackup(doc.get(field), firestoreSDK)) === JSON.stringify(encodeBackup(value, firestoreSDK))),
    }));
    await writePrivate(join(runDir, 'verification.json'), verification);
    if (verification.some((item) => !item.fieldsMatch)) throw new Error('O batch foi confirmado, mas a releitura difere. Consulta o backup e o relatório; não substituas edições posteriores.');
    console.log(`Migração confirmada e verificada: ${expected.length} perfis, ${urls.size} ficheiros únicos.`);
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
}

main().catch((error) => {
  // Do not dump request bodies, credentials or embedded image bytes.
  console.error(`Migração interrompida (${error.code || error.name || 'erro'}). Nenhum ficheiro original é eliminado. Se houver commit-intent sem commit-result, relê o banco antes de repetir.`);
  console.error(String(error.message).replace(/data:[^\s]+/gi, '[data URL omitida]').slice(0, 1000));
  process.exitCode = 1;
});
