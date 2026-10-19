# Ativação do banco e do painel

O código mantém o projeto Firebase e a base de dados com nome presentes em `firebase-applet-config.json`. Não foi criada outra base, migrado conteúdo nem publicada uma alteração de regras automaticamente.

## Antes de ativar

1. Confirma o acesso ao projeto original no Firebase e consulta a edição da base com `firebase firestore:databases:get <firestoreDatabaseId> --project <projectId>`. A edição ainda depende de confirmação na conta; esta preparação conserva as operações nativas do SDK que o projeto já usava.
2. Guarda uma exportação dos dados e das regras atualmente publicadas. As regras antigas do repositório permitiam escrita pública; as novas regras fecham essa possibilidade. Confirma se existem outros clientes que dependem dos caminhos antigos antes de as aplicar.
3. Ativa o fornecedor Google em Authentication e autoriza o domínio da aplicação. Um ficheiro aberto por `file://` serve para ver o visual, mas não é o endereço de operação do painel. A sessão administrativa deve abrir em HTTPS ou `localhost` autorizado.
4. Confirma que o bucket configurado existe, está acessível e tem o plano necessário para Cloud Storage. Não acrescentes credenciais de serviço ao frontend.

## Permissões

O painel usa a propriedade assinada `admin: true` no token do Firebase Authentication. PINs, localStorage e campos em `/users` não concedem essa função. O operador autenticado do projeto atribui a função à conta Google escolhida, depois de confirmar o seu UID na consola.

Num ambiente de confiança com Application Default Credentials e a dependência `firebase-admin` instalada:

```sh
node scripts/admin-claim.mjs --project <projectId-do-config> --uid <UID-confirmado> --grant
```

O script conserva as outras custom claims da conta. Para remover a função, troca `--grant` por `--revoke`. A remoção também revoga refresh tokens; tokens de acesso já emitidos podem continuar válidos até expirarem. Depois da atribuição, termina a sessão e volta a entrar para receber o token atualizado.

## Validar e publicar regras

Os testes são executados apenas num projeto fictício `demo-kambas-cms`, com emuladores. Requerem Node, Java compatível com a versão do emulador, Firebase CLI e `@firebase/rules-unit-testing` disponíveis no ambiente de desenvolvimento ou CI.

```sh
firebase emulators:exec --project demo-kambas-cms --only firestore,storage 'node --test tests/firestore-rules.test.mjs'
```

Após confirmar a edição, a conta, a cópia de segurança e o resultado dos testes, o operador publica as regras no projeto correto:

```sh
firebase deploy --project <projectId-do-config> --only firestore:rules,storage
```

`firebase.json` aponta expressamente para a base com nome existente. Não substituas essa entrada por `(default)`. Não incluímos configuração de Authentication no deploy para evitar substituir os fornecedores ou domínios já existentes.

## Conteúdo e operação

- `creators/{id}` guarda os perfis e os conteúdos públicos de cada um. Visitantes só leem; administradores publicam, alteram e eliminam.
- `settings/public` guarda os textos, FAQs e dados de pagamento visíveis. Não guarda chaves de pagamentos nem outros segredos. A sua existência também indica que o conteúdo inicial já foi publicado.
- `users/{uid}` só permite ao próprio utilizador ler e alterar os campos básicos da sua conta. Não permite gerir funções, assinaturas ou pagamentos.
- O botão explícito de publicação inicial cria apenas documentos em falta, numa transação. Não é executado por visitantes e não substitui documentos existentes.
- O painel só informa sucesso depois da confirmação do servidor. Falhas de rede ou de permissões são apresentadas como erro; não são disfarçadas com uma gravação local.
- Imagens até 20 MB e áudio/vídeo até 100 MB vão para `public/{uid}/…` no Storage. Só media suportada é aceite. Links `idb://`, `blob:` ou `data:` devem ser reenviados pelo painel; não funcionam como ficheiros partilhados entre dispositivos.

As imagens empacotadas com o site continuam em `/assets/…`; os ficheiros novos recebem uma URL de Storage. É necessário publicar o build completo, com esses assets, no mesmo domínio da aplicação.

## Limites deste CMS

O diretório e os media deste fluxo são públicos. A proteção de conteúdos pagos exige armazenamento separado, regras de assinaturas verificadas no servidor e integração de pagamentos. Os bloqueios visuais originais não são controlo de acesso a ficheiros. Este painel não cria cobrança nem confirma pagamentos automaticamente.

Referências oficiais: [Custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [testes de regras](https://firebase.google.com/docs/rules/unit-tests), [upload no Storage](https://firebase.google.com/docs/storage/web/upload-files), [transações](https://firebase.google.com/docs/firestore/manage-data/transactions).
