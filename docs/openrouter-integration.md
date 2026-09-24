# OpenRouter — referência de integração NextCom

Fonte oficial indicada pelo usuário: <https://openrouter.ai/docs/llms-full.txt> (consultada em 2026-09-23). Esta nota resume somente as partes relevantes para a integração da NextCom; a documentação oficial é a autoridade e deve ser revisitada antes de alterar endpoints ou parâmetros, pois modelos e provedores mudam.

## Segurança

- A chave `OPENROUTER_API_KEY` fica somente no `.env` da raiz e é lida pelo backend. Nunca usar `VITE_`, enviar a chave ao navegador, incluí-la em logs ou retorná-la em endpoints de status.
- Tratar chaves mostradas em capturas, logs ou commits como expostas: revogar/rotacionar e definir limites de crédito por chave na OpenRouter.
- Enviar ao provedor apenas os dados estritamente necessários e somente após consentimento explícito na interface. Não registrar prompt, CSV, resposta completa nem cabeçalho de autorização.
- `HTTP-Referer` e `X-OpenRouter-Title` são metadados opcionais de atribuição, não credenciais.

## API e requisições

- A API compatível com chat completions usa `https://openrouter.ai/api/v1/chat/completions` (`POST`). Autenticar com `Authorization: Bearer <OPENROUTER_API_KEY>` e `Content-Type: application/json`.
- O corpo precisa identificar `model` e `messages`; parâmetros como `temperature`, `max_tokens`, `stream`, `response_format` e `plugins` dependem do uso e da compatibilidade do modelo/provedor.
- Para resposta não transmitida em streaming, leia `choices[0].message.content`, confira `choices[0].finish_reason` e trate `usage` como opcional. Não suponha que o conteúdo sempre seja JSON puro, uma string simples ou uma resposta concluída: verifique recusa, truncamento e erros.
- Em respostas não streaming, confira o corpo por `error` mesmo quando o status HTTP é 200: falhas do provedor ocorridas após o início da geração podem vir sem `choices`, ou dentro de `choices[0].error` com `finish_reason: "error"`.
- Use `GET https://openrouter.ai/api/v1/models` para validar slugs, modalidades e parâmetros compatíveis. Para capacidades de roteamento por provedor, consulte `GET /api/v1/models/{author}/{slug}/endpoints` e a página atual do modelo. Não deduza suporte a partir do nome do modelo: ele pode variar entre provedores e mudar com o tempo.
- A documentação atual recomenda `@openrouter/sdk` para TypeScript. Se a integração continuar usando `fetch`, preserve a URL, autenticação, formato e tratamento de respostas definidos pela referência oficial; considere o SDK em uma alteração futura com validação de compatibilidade.

## JSON estruturado

- `response_format` (`json_object` ou `json_schema`) só deve ser enviado quando o endpoint/provedor escolhido declarar suporte. Para JSON Schema, fornecer schema válido; usar `strict: true` e `additionalProperties: false` quando compatíveis.
- Se a rota exigir a capacidade, `provider.require_parameters: true` evita encaminhar a solicitação a provedores que não aceitam os parâmetros pedidos; isso pode reduzir as rotas disponíveis.
- O plugin `response-healing` é opt-in e corrige/extrai JSON para respostas não streaming quando usado com `response_format`. Não substitui validação do JSON e dos campos no backend.
- Mesmo com saída estruturada, validar tipos, tamanhos, campos obrigatórios, limites e conteúdo antes de expor a resposta à interface.

## Erros e diagnóstico

- Erros seguem `{ error: { code, message, metadata? } }`. Quando disponível, use `error.metadata.error_type` para classificar a causa; status isolado pode não bastar e, em streaming, erros após o início chegam como eventos com HTTP 200. Consultar a referência atual para códigos e categorias.
- Ler `Retry-After` quando presente em respostas que admitem nova tentativa. Não repetir cegamente 402; a documentação distingue saldo/limite de crédito do orçamento simultâneo em andamento. Em erros de provedor, não registrar nem exibir `metadata.raw` ou `metadata.flagged_input`.
- Mostrar orientação curta e segura para o usuário; nunca repassar metadados que contenham entrada sinalizada, prompts, tokens ou detalhes sensíveis. Guardar somente status, código e identificadores não secretos quando logs forem necessários.
- Diagnóstico precisa distinguir erro HTTP do gateway, recusa do modelo, ausência de conteúdo, término por limite (`finish_reason`) e falha de parsing. Não classificar toda saída fora do JSON como problema de autenticação.

## Fluxo atual da NextCom

- O backend em `NextCom - Back/src/ai-agent.ts` chama chat completions com a chave do servidor. O frontend só consulta `/api/ai/status` para saber se a análise está configurada; esse endpoint nunca retorna a chave.
- A análise pede JSON com `response_format: { type: "json_object" }`, desativa streaming explicitamente, exige roteamento para endpoints que aceitem os parâmetros (`provider.require_parameters: true`) e habilita o plugin oficial `response-healing` para completar/extrair JSON malformado. A API também valida todos os campos retornados; healing não substitui essa validação.
- No modelo local `xiaomi/mimo-v2.5`, a API de modelos/endpoints consultada em 2026-09-23 indicou `response_format` em 5 dos 6 provedores listados. Esse dado é somente uma fotografia do catálogo; confirmar novamente ao trocar modelo ou quando o roteamento não encontrar provedor compatível.
- `OPENROUTER_MODEL` é um slug de modelo; validá-lo na API de modelos e na página/provedores antes de trocar. Alterações no `.env` exigem reiniciar a API. Para tarefas de análise curtas, usar esforço de raciocínio baixo e timeout que cubra a leitura completa do corpo HTTP. `reasoning.effort` e `reasoning.max_tokens` são mutuamente exclusivos; não envie ambos. Verificar `finish_reason` antes de rejeitar conteúdo vazio: modelos podem consumir o limite de tokens com raciocínio e retornar conteúdo vazio com `finish_reason: "length"`. Uma interrupção durante `response.text()`/`response.json()` deve ser reconhecida pelo estado do `AbortSignal`, não só pelo nome da exceção.
- A análise recebe resumo agregado validado pelo backend, não o arquivo CSV bruto. Preservar essa minimização e o consentimento explícito.

## NextAI

A conversa usa o mesmo endpoint e transporte validados da análise, com JSON `{reply, action, country}`. O backend interpreta a ação em uma lista fechada e calcula métricas pelo importador; não aceita métricas inventadas pelo modelo. A mensagem atual precisa autorizar a alteração. O CSV bruto não sai para o provedor. O chat usa timeout de 120 segundos, incluindo leitura do corpo; a análise existente continua com 60 segundos. O cancelamento do navegador é propagado ao fetch upstream. Consulte [o fluxo, limites e segurança do protótipo](nextai.md).

Na validação desta implementação, uma requisição real com CSV sintético retornou HTTP 200 em aproximadamente 18 segundos, com importação de R$ 10,00 e atribuição explícita ao BR. Uma tentativa anterior excedeu 60 segundos; disponibilidade e latência do provedor não são garantidas. O catálogo oficial confirmou suporte a `response_format` em 5 dos 6 endpoints consultados do modelo configurado.

## Referências oficiais

- [Documentação completa para LLMs](https://openrouter.ai/docs/llms-full.txt)
- [Chat completions](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request)
- [Autenticação](https://openrouter.ai/docs/api_reference/authentication)
- [Modelos e parâmetros](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)
- [Structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)
- [Response Healing](https://openrouter.ai/docs/guides/features/plugins/response-healing)
- [Erros e diagnóstico](https://openrouter.ai/docs/api_reference/errors-and-debugging)
- [Limites de crédito e requisições](https://openrouter.ai/docs/api_reference/limits)
