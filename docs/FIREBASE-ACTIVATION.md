# Ativação do Firebase — estado verificado em 19/10/2026

Projeto: `gen-lang-client-0427413818`. PR: #1, branch `codex/kambas-admin-cms`.

## Confirmado na consola

- Projeto no plano Blaze.
- Banco existente `ai-studio-sandragomesvippo-c286da2b-c4e2-427a-8481-49470795f0f6`: Enterprise, Firestore nativo, região `europe-west2`, atualizações em tempo real ativadas.
- A coleção `creators` contém 11 perfis. O documento inspecionado contém os campos completos, imagens `data:image/jpeg;base64` e datas ISO em strings.
- Google Authentication já estava ativo. Anonymous Authentication não constava entre os fornecedores ativos.
- O bucket `gen-lang-client-0427413818.firebasestorage.app` foi criado em `europe-west2`, Standard, modo de produção. Permanece vazio, com leitura e escrita de clientes negadas.
- O domínio da prévia Netlify não constava da lista autorizada. Os domínios Google/AI Studio existentes devem ser preservados.

## Pendente

- Concluir autorização do operador no Google Cloud SDK. A consola web tem sessão, mas o Cloud Shell ainda não possui uma conta autenticada.
- Autorizar os domínios da aplicação necessários ao login, preservando os existentes.
- Confirmar a conta Google administrativa e o seu UID no Firebase Authentication; conceder `admin: true` com o script existente.
- Guardar as regras atualmente publicadas e executar o inventário com cópia de segurança dos 11 perfis.
- Rever o relatório de migração, migrar media e datas, e verificar a releitura.
- Publicar as regras do PR, confirmar gravação/upload e executar a publicação inicial pelo painel.
- Concluir validação end-to-end antes de integrar o PR ou anunciar a ativação completa.

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

A simulação ainda não foi executada no banco real. Um backup de `creators` não substitui uma exportação completa do projeto nem uma cópia das regras.

As operações nativas foram mantidas na aplicação porque as atualizações em tempo real são necessárias. A migração usa uma consulta limitada de inventário, sem alterar o modelo ou mudar para o banco `(default)`.
