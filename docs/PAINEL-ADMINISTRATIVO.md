# Painel de conteúdos

Esta versão prepara o painel de gestão do site aprovado, mantendo os textos, as imagens e a apresentação originais como valores iniciais. O HTML portátil anteriormente aprovado continua a ser uma pré-visualização sem ligação ao banco.

## Entrar e editar

Depois de configurar o Firebase e hospedar esta versão num domínio autorizado:

1. Abrir `/admin` no endereço do site.
2. Entrar com a conta Google autorizada como administradora.
3. Na primeira configuração, publicar o conteúdo inicial pelo botão do painel. Esse procedimento não deve substituir documentos já existentes.
4. Selecionar um perfil e editar os campos, planos, publicações, imagens, vídeos, destaques, mensagens ou áudios.
5. Nas definições gerais, editar os textos de cada secção, as perguntas e respostas frequentes e os dados públicos de pagamento.
6. Guardar e aguardar a confirmação. Só uma gravação confirmada pelo banco é apresentada como concluída.

Os textos com marcadores como `{name}` inserem automaticamente o nome correspondente. Podem ser traduzidos ou alterados mantendo os marcadores necessários. A edição de conteúdo não altera automaticamente o desenho do logótipo, os ícones, as cores ou a estrutura visual.

Os ficheiros enviados pelo painel ficam no armazenamento do Firebase. Um ficheiro guardado apenas no computador ou num endereço temporário `blob:`/`idb:` não é publicado como ficheiro partilhado.

## Ativação pendente

As alterações de código não ativam serviços nem concedem acesso a contas. É necessário confirmar o projeto e a edição do banco existente, ativar/configurar os serviços, aplicar as regras testadas, autorizar a conta administradora e o domínio. Ver [FIREBASE-SETUP.md](FIREBASE-SETUP.md).

Não colocar chaves privadas de gateways, credenciais de servidor ou dados de assinantes nas definições públicas. O painel substitui o PIN fixo por autenticação e autorização verificadas pelo Firebase.

## Limites desta entrega

Este trabalho cobre a gestão dos conteúdos públicos. Não implementa cobrança, confirmação bancária, direitos de assinatura, entrega privada de conteúdo pago ou conversas reais entre utilizadores. Alguns desses fluxos no projeto original são demonstrações locais; a confirmação de pagamento não deve ser considerada uma confirmação do banco.

As URLs guardadas nos perfis são públicas, incluindo os ficheiros que a interface apresenta desfocados. O desfoque não protege um ficheiro pago. A entrega de ficheiros privados exige uma implementação separada com autorização no servidor.

Comentários e mensagens de apresentação podem ser editados nos textos do painel. Novas interações de visitantes continuam com o comportamento local da versão original, sem um serviço de mensagens/moderação partilhado.
