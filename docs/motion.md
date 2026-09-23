# Movimento na NextCom

Animação é parte do padrão do frontend. Os efeitos devem explicar mudanças de estado e responder ao usuário, preservando leitura e foco.

## Base compartilhada

- `NextCom - Front/src/lib/motion.ts`: tempos, curvas, preferência de movimento reduzido e retenção de conteúdo durante a saída.
- `NextCom - Front/src/motion.css`: microinterações, temas, entrada/saída de overlays Radix, navegação mobile e estilos compartilhados.
- `components/motion/MotionPanel.tsx`: entrada de seções quando entram na área visível, uma vez por montagem.
- `components/motion/AnimatedNumber.tsx`: interpolação de valores sem renderizar a árvore React a cada frame. Interrupções partem do último valor exibido; leitores de tela recebem o valor final.
- `MotionPreferencesProvider` sincroniza CSS, Motion, números, gráficos e rolagem. O padrão é **Seguir sistema**; o controle com ícone de brilho no topo permite escolher **Completas** ou **Reduzidas**, persistindo em `nextcom-motion`. Se os efeitos estiverem reduzidos, clicar no controle os ativa. A escolha explícita Completas prevalece sobre a preferência do sistema, sem alterar o Windows.
- `components/motion/NavButton.tsx`: hover com deslocamento, resposta de pressão e indicador compartilhado que desliza até a seleção.
- `src/interaction.css`: feedback visível dos botões, condicionado à preferência efetiva `data-motion` na raiz.

| Uso                    | Duração |
| ---------------------- | ------- |
| Feedback de interação  | 160 ms  |
| Entrada de superfícies | 320 ms  |
| Saída                  | 180 ms  |
| Entrada de seções      | 480 ms  |
| Mudança de dados       | 520 ms  |

Curva principal: `cubic-bezier(.22, 1, .36, 1)`. Menus compactos usam 220 ms e saem em 160 ms; a troca de ícones usa 120 ms por fase. A entrada dos KPIs tem intervalo de 45 ms entre cards.

## Novos componentes

```tsx
import { AnimatePresence, motion } from 'motion/react'
import { MotionPanel } from '@/components/motion/MotionPanel'
import { useNextMotion } from '@/lib/motion'

function Example({ visible }: { visible: boolean }) {
  const { presence } = useNextMotion()
  return (
    <MotionPanel className="panel">
      <AnimatePresence initial={false}>
        {visible && (
          <motion.div key="details" {...presence}>
            Detalhes
          </motion.div>
        )}
      </AnimatePresence>
    </MotionPanel>
  )
}
```

Para modais, popovers, selects e tooltips, reutilizar shadcn/Radix. As animações CSS de `data-state` têm nomes distintos para abertura e fechamento; Radix mantém o elemento montado até a saída terminar. Não envolver os portais em um condicional que os remova imediatamente. Usar `useRetainedValue` quando limpar o estado de seleção apagaria o conteúdo durante o fechamento.

Para listas, usar chaves de identidade e `layout="position"` quando a ordem mudar, desabilitando o layout animado quando `reduced` estiver ativo. Não recriar componentes dentro do render nem usar a posição no array como identidade de registros.

## Comportamentos aplicados

- Cabeçalho e filtros entram suavemente; KPIs entram em sequência.
- Seções são reveladas ao rolar, sem repetir a entrada em cada filtro.
- Valores dos KPIs e canais interpolam ao mudar período ou canal.
- Gráficos têm transição entre visualizações, indicador de aba deslizante e animação de séries.
- Mapas interpolam zoom e cores; tooltips entram e saem.
- Rankings e campanhas animam mudanças de posição. Filtros, estados vazios e rascunhos têm transições de presença.
- Toasts conservam a posição enquanto entram e saem.
- Menu mobile fecha suavemente e fica inerte quando oculto.
- Botões respondem ao pressionar; hover de cards e ícones é aplicado somente a dispositivos com ponteiro preciso.
- Cores de superfícies transitam na troca de tema, acompanhadas da troca animada do ícone.

## Limites

- Não usar loops decorativos ou deslocamentos grandes em áreas de análise.
- Priorizar opacity/transform. Larguras das barras de distribuição e cores do mapa são exceções locais para comunicar dados.
- Não aplicar `transition: all` globalmente, nem `will-change` permanente.
- Não animar números desde zero a cada montagem; o valor inicial é imediato e as mudanças posteriores interpolam.
- Não depender de animação para disponibilizar um controle.
- Respeitar movimento reduzido também nas animações JavaScript, tooltips Recharts e rolagem programática; CSS sozinho não é suficiente.
- Manter o tempo total das saídas curto e cancelar animações substituídas ou desmontadas.

## Validação

`npm run test:e2e` inclui testes de retenção e desmontagem dos modais, filtros rápidos, última visualização do gráfico, saída de avisos, movimento reduzido e navegação mobile. `npm run build` valida a integração e os tipos.

Referências de implementação: [Motion / AnimatePresence](https://motion.dev/docs/react-animate-presence), [MotionConfig](https://motion.dev/docs/react-motion-config) e [animações CSS no Radix](https://www.radix-ui.com/primitives/docs/guides/animation).
