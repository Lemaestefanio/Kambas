# Ativação do Firebase — estado verificado em 19/10/2026

Projeto: `gen-lang-client-0427413818`. PR: #1, branch `codex/kambas-admin-cms`.

## Ativação concluída

- Projeto no plano Blaze.
- Banco existente `ai-studio-sandragomesvippo-c286da2b-c4e2-427a-8481-49470795f0f6`: Enterprise, Firestore nativo, região `europe-west2`, atualizações em tempo real ativadas.
- Os 11 perfis existentes foram preservados. A migração converteu duas imagens incorporadas em dois objetos Storage e converteu as datas ISO para Timestamp, mantendo os instantes originais. O batch e a releitura foram verificados.
- Google Authentication e Anonymous Authentication ativos. A conta proprietária confirmada recebeu `admin: true`; a identidade Google e as claims foram verificadas, preservando claims anteriores.
- Bucket `gen-lang-client-0427413818.firebasestorage.app` criado em `europe-west2`, Standard. As regras de `storage.rules` estão publicadas.
- `deploy-preview-1--meuskambas.netlify.app` e `meuskambas.netlify.app` autorizados no Authentication, preservando todos os domínios anteriores.
- Regras de `firestore.rules` publicadas exclusivamente no banco nomeado configurado. As duas releases foram relidas e correspondem exatamente aos ficheiros da PR.
- `settings/public` criado com os defaults existentes do projeto, usando `create()` para impedir sobrescritas. Releitura confirmou versão 1 e cinco FAQs; os 11 perfis permaneceram intactos.

## Verificação e limite restante

- Login Google no painel e gravação de perfil confirmados na prévia. O teste manteve os valores públicos; a releitura confirmou `updatedAt` novo e `createdAt` original preservado.
- A gravação completa foi corrigida para preservar a data de criação remota numa transação. Cinco testes específicos cobrem preservação, criação, repetição por concorrência, falha e autorização.
- CI do commit `e9116e879050f69deadbd4250c06ebc7e46bcd92` passou: testes de gravação e migração, TypeScript, build, comparação do visual aprovado e regras Firestore/Storage nos emuladores. Execução: https://github.com/Lemaestefanio/Kambas/actions/runs/39309285536
- Verificação HTTP sem sessão: leitura de `settings/public` retornou 200; listagem de utilizadores e listagem do Storage retornaram 403. As duas imagens migradas puderam ser lidas publicamente e os hashes SHA-256 corresponderam aos originais.
- Backups privados de perfis, regras anteriores, configuração de Authentication, claims anteriores e relatórios de verificação estão em `~/kambas-private-backups/` no Cloud Shell do operador. Não foram adicionados ao Git.
- O teste de upload pela interface ficou bloqueado pela extensão do navegador, que exige “Allow access to file URLs”. Os uploads administrativos da migração e as regras do Storage foram verificados; ainda não se afirma validação end-to-end do seletor de ficheiros do painel.
- A confirmação JavaScript do bootstrap também encontrou uma falha de automação do navegador. Por isso, apenas `settings/public`, que estava ausente, foi criado pelo Admin SDK a partir de `DEFAULT_SITE_SETTINGS`; não houve reimportação dos perfis.

O Firebase está ativo na prévia da PR. A PR permanece aberta, sem integração em `main`. Este CMS gere conteúdo público; não implementa pagamentos, assinaturas ou um cofre de ficheiros privados pagos.

## Migração dos perfis legados

O novo CMS recusa URLs locais e imagens incorporadas em documentos. Não devem ser removidas ou substituídas por imagens genéricas. Os utilitários `scripts/migrate-legacy-media.mjs` e `scripts/legacy-media-core.mjs` preservam os bytes originais, enviam-nos para o bucket configurado e substituem apenas os campos correspondentes por URLs de Storage.

Requer Node.js, `firebase-admin` instalado no ambiente do projeto e Application Default Credentials do operador. Nunca adicionar credenciais ao repositório, frontend ou CI público.

Simulação com backup, sem escritas remotas:

```sh
node scripts/migrate-legacy-media.mjs \
  --project gen-lang-client-0427413818 \
  --database ai-studio-sandragomesvippo-c286da2b-c4e2-427a-8481-49470795f0f6 \
  --backup-dir ../kambas-private-backups
```

Depois de rever `plan.json` e confirmar que não há problemas, repetir o comando com `--apply`. Cada execução cria uma pasta privada e única; nunca guardar os backups no Git.

O script:
- Guarda os documentos originais com tipos Firestore e hash SHA-256; confirma a escrita do backup antes de alterar o Firebase.
- Bloqueia se encontrar `idb://`, `blob:`, formatos inesperados ou datas inválidas.
- Deduplica por hash; não sobrescreve ficheiros existentes e verifica os bytes enviados.
- Converte datas ISO válidas para Timestamp sem inventar datas.
- Altera os perfis num único batch com precondições de `updateTime`, evitando sobrescrever edições concorrentes.
- Preserva o resto dos campos e relê os documentos para verificar o resultado.
- Não elimina os originais. Um upload concluído seguido de conflito no Firestore pode deixar objetos sem referência; rever o relatório antes de qualquer limpeza.

A simulação e a aplicação foram executadas no banco real em 19/10/2026, sem problemas de validação, com 11 perfis e dois ficheiros únicos. Os backups de `creators` e regras são específicos desta ativação, não uma exportação completa do projeto.

As operações nativas foram mantidas na aplicação porque as atualizações em tempo real são necessárias. A migração usa uma consulta limitada de inventário, sem alterar o modelo ou mudar para o banco `(default)`.

