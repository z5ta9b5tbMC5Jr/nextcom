# NextCom · NextCorp Inc.

Primeira versão do dashboard de planejamento e análise de anúncios. Projeto sem fins lucrativos, com identidade própria, dark-first e tema claro. Esta etapa usa **somente dados demonstrativos**; não autentica, consulta ou publica campanhas na Meta.

## Executar

Requisito: Node.js 22.12+ (validado com Node 24) e npm.

```sh
npm install
npm run dev
```

- Dashboard: http://127.0.0.1:5173
- API local: http://127.0.0.1:3001/api/health

O comando da raiz inicia front e back juntos. Também podem ser iniciados separadamente com `npm run dev -w @nextcom/front` e `npm run dev -w @nextcom/back`.

## Estrutura

```text
NextCom - Front/             React + Vite + TypeScript + Tailwind CSS + shadcn/ui
  src/components/           Dashboard, KPIs, gráficos, mapa e tabela
  src/components/ui/        Componentes shadcn/ui baseados em Radix
  src/lib/data.ts           Dados fictícios e funções de cálculo/exportação
  src/index.css             Tokens dos temas e layout responsivo
NextCom - Back/              Node.js + Express + TypeScript
  src/server.ts             Health check e status da integração futura
tests/                      Testes de métricas e navegação com Playwright
.env                        Configuração privada, exclusiva do backend
.env.example                Modelo sem segredos
```

## Disponível nesta etapa

- Seis KPIs com comparação ao período anterior de igual duração.
- Períodos de 7, 14 e 30 dias e filtro por posicionamento da Meta: Instagram, Facebook e Audience Network.
- Gráfico de compras por canal e comparação entre investimento e valor de conversão.
- Mapa vetorial interativo, com tooltip, seleção por mouse/teclado, destaque, zoom e restauração.
- Ranking de países e seleção das seis métricas no mapa.
- Campanhas com busca, filtro de status, ordenação por gasto/ROAS e detalhes.
- Exportação CSV com os filtros atuais de **período e canal**. Busca e status da tabela não restringem esse relatório.
- Rascunhos de planejamento salvos no navegador, com remoção. Não são publicados na Meta.
- Tema claro/escuro persistido localmente, menu mobile e modais acessíveis do Radix.
- Ícones e fontes empacotados localmente; o dashboard não precisa de CDNs em tempo de execução.

## GeoPerformanceMap

```tsx
<GeoPerformanceMap
  data={countryData}
  metric="spend"
  selectedCountry={selectedCountry}
  onMetricChange={setMetric}
  onCountrySelect={setSelectedCountry}
/>
```

`data` recebe `CountryPerformance[]`: identificação numérica ISO de três dígitos, código ISO de duas letras, nome e métricas agregadas. `metric` aceita `spend`, `results`, `cpa`, `revenue`, `roas` e `ctr`. Seleção e métrica podem ser controladas pelo pai ou pelo próprio componente.

São 176 geometrias, sem a Antártida, convertidas de TopoJSON para SVG com D3 Geo e projeção Natural Earth. Países sem dados recebem o token `--geo-empty`. A escala violeta possui cinco níveis, normalizados pela raiz quadrada da razão entre o valor e o máximo da seleção, para dar visibilidade aos valores menores. A intensidade indica magnitude, não qualidade: CPA maior continua representando custo maior.

O zoom centraliza o país selecionado; sem seleção, centraliza o mundo. A seleção sincroniza o mapa e o ranking e **não filtra** os demais KPIs. Países sem dados continuam interativos e identificados como “Sem dados”.

Base geográfica: [world-atlas / Natural Earth](https://github.com/topojson/world-atlas), resolução 1:110m. A simplificação geográfica é adequada à visualização analítica, não à definição de limites jurídicos. Licenças da base e bibliotecas permanecem nos respectivos pacotes. Bandeiras: [flag-icons](https://github.com/lipis/flag-icons), MIT.

## Dados demonstrativos

O período termina em **23/09/2026**. O dataset contém 60 dias, permitindo comparar os últimos 30 com os 30 anteriores. São cinco campanhas de vendas, 12 países e três canais. Todas as campanhas usam **compras** como resultado, evitando somar ações incompatíveis.

- CPA = gasto total / compras totais.
- ROAS = valor de conversão total / gasto total.
- CTR = cliques totais / impressões totais × 100.
- As taxas são calculadas pelos totais, não pela média simples das taxas individuais.
- Gasto maior recebe variação neutra; CPA menor recebe variação favorável.
- Dados são determinísticos, não aleatórios a cada renderização. Datas e valores não representam uma conta real.

## Configuração privada e backend

Se `.env` não existir, copie `.env.example` para `.env` na **raiz do repositório**. O arquivo está ignorado pelo Git e é carregado exclusivamente pelo backend, a partir da localização do módulo. As chaves estão vazias nesta entrega.

O frontend não carrega o `.env` da raiz. Não use `VITE_` em variáveis sensíveis, pois esse prefixo expõe valores ao cliente conforme a [documentação do Vite](https://vite.dev/guide/env-and-mode).

Endpoints atuais:

| Rota                                | Comportamento                                           |
| ----------------------------------- | ------------------------------------------------------- |
| `GET /api/health`                   | Status do serviço                                       |
| `GET /api/integrations/meta/status` | Retorna modo demo e `connected: false`, sem credenciais |

A porta padrão é 3001. Se alterar `PORT`, atualize também o proxy em `NextCom - Front/vite.config.ts`. O backend é uma base local; autenticação, banco, OAuth, permissões e sincronização da API Meta serão implementados na próxima fase. Rascunhos atuais são locais ao navegador e não são dados de servidor.

## Importação CSV e assistente de análise

A integração nativa com a Meta continua em espera. O painel **Integrações** aceita CSVs exportados do Gerenciador de Anúncios nos níveis campanha, conjunto ou anúncio e reconhece nomes de colunas em português e inglês. O backend interpreta o arquivo com regras determinísticas, valida até 5 MB e 20 mil linhas e apresenta totais, itens, datas, países, regiões, canais e horários quando o relatório contém esses recortes. Exportações com início e encerramento do relatório por linha são tratadas como totais do período, sem inventar uma tendência diária. Quando o CSV contém indicadores diferentes de resultado, eles são separados em vez de somados em um total ou CPA incompatível. CSV sem país, hora ou outra dimensão continua válido; a NextCom informa quando o dado não está disponível.

Nesta fase, o dashboard principal continua usando os dados demonstrativos. O resumo importado é mostrado no painel de integrações durante a sessão e não é persistido. Ainda não há contas de usuário, banco ou isolamento multiusuário.

O assistente é um protótipo de análise única, executado no backend pela API de chat da OpenRouter. Ele recebe apenas o resumo agregado selecionado (totais e recortes limitados de campanha, região, canal e tempo), nunca o arquivo bruto. A interface exige consentimento antes da chamada e informa que conteúdo empresarial será enviado à OpenRouter e ao modelo escolhido. Evite incluir nomes que revelem dados pessoais ou informações confidenciais. As respostas são sugestões sujeitas a erro; o agente não altera nem publica campanhas.

Configure no `.env` da raiz:

- `OPENROUTER_API_KEY`: chave criada no painel da OpenRouter. Permanece somente no servidor.
- `OPENROUTER_MODEL`: identificador de modelo disponibilizado pela OpenRouter; o exemplo inicial usa `openai/gpt-4o-mini`.
- `OPENROUTER_SITE_URL`: opcional, URL pública para atribuição do app.
- `NEXTCOM_ALLOWED_ORIGINS`: origens do frontend separadas por vírgula. Em produção, substitua as origens locais por seus domínios HTTPS.

O arquivo `.env.example` contém apenas valores vazios/de demonstração. Nunca copie uma chave real para o frontend, para um `VITE_*`, commit, issue ou log. A NextCom não consegue criar sua chave: gere uma no painel da OpenRouter e informe-a somente no `.env` local do servidor.

| Rota                          | Uso                                                              |
| ----------------------------- | ---------------------------------------------------------------- |
| `GET /api/ai/status`          | Estado configurado e identificador do modelo, sem expor a chave  |
| `POST /api/imports/meta-csv`  | Recebe texto CSV UTF-8 e devolve um resumo calculado no servidor |
| `POST /api/ai/analyze-import` | Envia um resumo validado ao modelo configurado                   |
| `POST /api/ai/chat` | Conversa NextAI, com importação e atribuição de país validadas no backend |

Os endpoints atuais não gravam o CSV nem o resumo no servidor. A análise tem limite local de quatro chamadas por minuto por IP, timeout e limite de resposta. O backend escuta em loopback por padrão; autenticação, persistência segura por usuário, gestão de consentimento auditável, exclusão de dados e publicação multiusuário ainda precisam ser implementadas antes de hospedar a aplicação para terceiros. Para a futura versão multiusuário, tokens OpenRouter pessoais e conexões de dados devem ficar em armazenamento de credenciais criptografado, nunca compartilhados no `.env` do servidor.

## Verificação e produção

A aba **NextAI**, abaixo de Relatórios, permite anexar CSV, conversar com o modelo e aplicar dados ao dashboard com opção de desfazer. Conversas e dados importados permanecem somente na sessão atual. Consulte [o guia NextAI](docs/nextai.md) para exemplos, limites e arquitetura.

O frontend possui um sistema compartilhado de animações de entrada, saída, interação e atualização de dados, com suporte a `prefers-reduced-motion`. Consulte [o guia de movimento](docs/motion.md) ao criar componentes. A preferência do projeto está registrada em `AGENTS.md`.

```sh
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

`build` gera `NextCom - Front/dist` e `NextCom - Back/dist`. `preview` serve a interface compilada em http://127.0.0.1:4173 para revisão local. A API compilada pode ser iniciada com `npm start -w @nextcom/back`.

Os testes cobrem reconciliação das métricas, comparação temporal, divisões por zero, CSV, filtros, mapa, tema, exportação, planejamento local, layout mobile e endpoints.

Os componentes UI seguem a [instalação oficial shadcn/ui para Vite](https://ui.shadcn.com/docs/installation/vite). Para adicionar novos componentes, execute o CLI dentro de `NextCom - Front`.
