# Otimizar os MP4 publicados

Executar numa máquina com Python 3.10+, `gcloud` autenticado no projeto e,
para aplicar, `ffmpeg`/`ffprobe`. O script usa o projeto, a base Firestore nomeada
e o bucket de `firebase-applet-config.json`. Não inclui credenciais.

## 1. Preparar e rever o plano

```sh
python3 scripts/optimize-published-media.py --repo . --max-total-mb 100
```

O modo padrão só faz leituras remotas. Guarda os documentos originais completos
e um manifesto numa pasta privada fora do repositório, indicada no relatório.
Rever a quantidade de vídeos, documentos e bytes antes de aplicar. Os relatórios
não mostram URLs nem tokens; o backup e o estado privado contêm URLs originais
e de reprodução, pelo que não devem ser publicados ou incluídos no Git.

O escopo é apenas MP4 em `public/assets` ou objetos `public/` do próprio bucket,
nos campos de vídeo conhecidos de capa, apresentação, publicações e destaques.
URLs externas, outros formatos e arquivos acima de 100 MiB são ignorados.
Referências partilhadas usam uma única transcodificação e um único novo objeto.

## 2. Aplicar exatamente o plano revisto

```sh
python3 scripts/optimize-published-media.py --repo . \
  --apply /caminho/privado/do/plano \
  --owner-uid UID_DO_PROPRIETARIO_FIREBASE
```

Cada vídeo é reduzido localmente pelo `optimize-videos.py`: H.264, no máximo
540 × 960 e 30 fps, áudio AAC 64 kbps por faixa e início rápido do MP4.
Só saídas menores, com duração, faixas de áudio e estrutura verificadas, são
publicadas. A compressão é com perdas; conservar os originais permite comparar
a qualidade. Não há garantia de redução para todos os vídeos.

O script confirma a geração e o acesso público da origem antes de criar uma
cópia pública e novamente antes de alterar o documento. Novos objetos usam
UUIDs, cache imutável e token de reprodução. Os originais são conservados;
nenhuma regra, permissão IAM ou ACL é alterada.

O PATCH exige o `updateTime` guardado no plano e altera apenas os campos de
mídia envolvidos e `updatedAt`. Edições concorrentes são ignoradas, não
sobrescritas. Arrays de publicações/destaques são enviados completos sob essa
mesma precondição. Uma leitura posterior confirma os campos alterados.

## Retomar e custos

Repetir o mesmo comando `--apply` retoma a pasta existente, reutiliza cópias
confirmadas e reconcilia um PATCH interrompido antes de tentar escrever de novo.
Não executar duas aplicações na mesma pasta. Vídeos com a marca desta versão
da otimização são ignorados em planos seguintes.

Código de saída: `0` concluído ou sem redução; `2` houve falha/conflito a rever;
`1` interrupção por erro; `130` cancelamento. Após conflito, rever as alterações
e gerar um novo plano. Nunca restaurar documentos inteiros por cima de edições
recentes. Um conflito depois do upload pode deixar um objeto novo sem referência;
o script mantém esse objeto e todos os originais, sem eliminação automática.

Há leituras Firestore/Storage, transferências de mídia, processamento local,
armazenamento adicional e escritas dos documentos efetivamente atualizados.
Os valores dependem da conta e região; o relatório mede bytes, não estima preços.
Uma rede lenta continua a limitar a reprodução mesmo com arquivos menores.
