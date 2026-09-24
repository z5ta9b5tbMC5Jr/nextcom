# NextAI — conversa e ações no dashboard

A aba NextAI fica abaixo de Relatórios. A interface adapta o componente de referência ao tema violeta da NextCom, usando os componentes e tokens de movimento existentes. Funciona em temas claro/escuro, com teclado e movimento reduzido.

## Como usar

1. Abra NextAI e anexe um CSV UTF-8 do Gerenciador de Anúncios, de até 5 MB/20 mil linhas.
2. Autorize o envio de mensagens e resumos agregados ao modelo. A chave continua apenas no `.env` da raiz.
3. Escreva, por exemplo: **“Importe este CSV para o dashboard. Todas as campanhas rodaram no Brasil; atribua os dados ao BR.”**
4. A confirmação de aplicação aparece separada da resposta do modelo. Clique em **Ver dashboard**.
5. **Desfazer última aplicação** restaura o dataset anterior (ou a demonstração). Uma nova importação substitui a anterior, sem somar períodos.

O chat também analisa os dados ativos e ajuda no planejamento. Não publica nem modifica campanhas na Meta. Analisar um arquivo não significa aplicá-lo: a alteração precisa ser solicitada na mensagem atual.

## Dados e limitações deste protótipo

- CSV, conversa e painel importado ficam em memória no navegador; navegar entre abas os preserva, recarregar encerra essa sessão. Nova conversa limpa o chat e o anexo, mantendo o painel atual.
- O backend processa CSV em memória, sem salvar arquivo ou histórico. O provedor recebe mensagens e um resumo limitado; não recebe o CSV bruto. Políticas de retenção da OpenRouter e do provedor continuam aplicáveis.
- Métricas são calculadas pelo importador determinístico, nunca pelo modelo. Ausências continuam indisponíveis e resultados de objetivos diferentes permanecem separados.
- Datas vêm do arquivo. Não são criadas séries diárias para relatórios agregados. O resumo existente limita listas a 50 grupos por dimensão e séries a 180 dias. KPIs cobrem todas as linhas válidas; o contexto do modelo recebe até 20 campanhas e 60 dias.
- País informado no chat só preenche arquivos sem país e recebe identificação de origem. Não sobrescreve geografia exportada. Países atualmente aceitos para essa atribuição: BR, US, PT, AR, GB, CA, DE, FR, MX, CL, ES e AU. Países sem correspondência no mapa continuam visíveis na lista.
- Cancelar descarta a resposta pendente e interrompe a requisição upstream; isso não garante estorno de tokens já processados pelo provedor.
- Mensagens antigas não são armazenamento permanente: a interface mantém até 40 mensagens e envia as últimas 8 como contexto.

## Arquitetura

- `components/ui/ai-assistant-interface.tsx`: compositor, anexo, mensagens e recibos das ações.
- `lib/use-nextai.ts`: estado em memória, consentimento, cancelamento, aplicação e desfazer.
- `components/ImportedDashboard.tsx`: painel alimentado pelo resumo real, sem comparativos fictícios.
- `POST /api/ai/chat`: recebe mensagem, histórico limitado e uma fonte CSV; exige consentimento e usa o mesmo limitador das análises.
- `src/nextai.ts`: parseia a fonte, envia agregados ao modelo e executa exclusivamente `import` ou `assign_country`. Saída desconhecida, pedido sem instrução explícita, país ambíguo e tentativa de sobrescrever geografia são recusados sem mudança no painel.
- `src/ai-agent.ts`: transporte OpenRouter compartilhado com a análise anterior. O chat permite até 120 segundos; a análise anterior mantém 60 segundos. Erros não expõem respostas brutas, credenciais ou metadados privados.

Esta é uma aplicação local: a API continua vinculada a `127.0.0.1`. Antes de hospedagem multiusuário, implementar autenticação, autorização por workspace, isolamento de datasets, proteção contra abuso e persistência com política de retenção.

## Validação

`npm test` cobre ações permitidas, preservação de métricas/datas, consentimento, minimização de dados, falhas do provedor e compatibilidade da análise anterior. `npm run test:e2e` cobre o fluxo CSV → chat → painel → desfazer, erro, cancelamento, teclado, temas e larguras de 320 a 1920 px. Os testes automatizados usam respostas simuladas e não consomem créditos da OpenRouter.
