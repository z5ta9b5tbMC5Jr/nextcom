# NextCom — orientação para desenvolvimento

- Todo frontend novo ou alterado deve incluir animações coerentes de entrada, saída, interação e mudança de estado. Esta é uma preferência explícita do usuário.
- Reutilizar `src/lib/motion.ts`, `components/motion/` e `src/motion.css` no frontend. Não criar tempos e curvas arbitrários em cada componente.
- Usar `MotionPanel` para entrada de seções, `AnimatePresence` para elementos condicionais e animações CSS via `data-state` para componentes Radix/shadcn. Preservar conteúdo durante a saída e chaves estáveis em listas.
- Movimento deve ajudar a ler a mudança. Preferir opacity/transform, entradas curtas e cascatas discretas. Não usar loops decorativos, pulsações contínuas, efeitos que prejudiquem foco ou remount do dashboard ao filtrar.
- Respeitar `prefers-reduced-motion` no CSS, Motion, gráficos, contadores e rolagem programática. Cancelar animações/timers ao desmontar e suportar interações rápidas.
- Usar `MotionPreferencesProvider` e `useNextMotion`: Seguir sistema é o padrão; escolhas explícitas Completas/Reduzidas têm prioridade e precisam valer no CSS e no JavaScript. Não adicionar media queries que anulem a escolha Completas. O usuário pediu feedback perceptível nos botões e navegação; preservar `NavButton` e o indicador deslizante.
- Testar entradas/saídas reais, teclado, modo de movimento reduzido e layout mobile ao alterar esse comportamento. Verificar a build.
- Frontend em `NextCom - Front`; backend em `NextCom - Back`. Segredos apenas no `.env` da raiz, nunca em variáveis `VITE_`.
- Preservar a legibilidade responsiva: textos de apoio com pelo menos 12 px, conteúdo principal com 13–14 px e KPIs com pelo menos 26 px. Reorganizar colunas conforme a largura do conteúdo usando `responsive.css`; não diminuir fontes nem aplicar zoom/scale global para fazer o dashboard caber. No celular, valores monetários longos ocupam a linha inteira. Validar cortes, sobreposições e rolagem horizontal de 320 a 1920 px.
- Para qualquer alteração na integração OpenRouter, consultar primeiro `docs/openrouter-integration.md` e a documentação oficial atual em https://openrouter.ai/docs/llms-full.txt; confirmar compatibilidade do endpoint, modelo e provedor, nunca expor segredos e validar erros/saídas no backend.
