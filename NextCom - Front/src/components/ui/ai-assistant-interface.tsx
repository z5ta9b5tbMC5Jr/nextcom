import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUp,
  ArrowUpRight,
  ChartNoAxesCombined,
  CheckCheck,
  FileSpreadsheet,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  Undo2,
  X,
} from 'lucide-react'
import { Button } from './button'
import { MotionPanel } from '@/components/motion/MotionPanel'
import { useNextMotion } from '@/lib/motion'
import type { NextAIState } from '@/lib/use-nextai'

export function AIAssistantInterface({ chat, onDashboard }: { chat: NextAIState; onDashboard: () => void }) {
  const { presence, reduced } = useNextMotion()
  const fileInput = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const last = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (chat.messages.length || chat.busy)
      last.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'nearest' })
  }, [chat.messages.length, chat.busy, reduced])
  const suggestions = [
    {
      icon: FileSpreadsheet,
      title: 'Organizar meu dashboard',
      description: 'Do CSV ao painel, com contexto.',
      prompt: 'Importe o CSV anexado para o dashboard e atribua todos os dados ao Brasil.',
    },
    {
      icon: ChartNoAxesCombined,
      title: 'Entender meus resultados',
      description: 'Encontre sinais e oportunidades.',
      prompt: 'Analise os dados disponíveis. Quais pontos merecem atenção e quais métricas estão faltando?',
    },
    {
      icon: Target,
      title: 'Planejar o próximo passo',
      description: 'Transforme dúvidas em hipóteses.',
      prompt: 'Ajude a planejar um teste de anúncios. Pergunte primeiro meu objetivo e orçamento.',
    },
  ]
  return (
    <div className="nextai-page">
      <div className="nextai-top">
        <div>
          <Sparkles size={19} />
          <strong>NextAI</strong>
          <span className="nextai-badge">ASSISTENTE</span>
        </div>
        <Button variant="ghost" onClick={chat.clear} disabled={chat.busy || !chat.messages.length}>
          Nova conversa
        </Button>
      </div>
      <div className="nextai-stage">
        <AnimatePresence mode="wait" initial={false}>
          {!chat.messages.length && !chat.busy ? (
            <motion.div key="welcome" {...presence} className="nextai-welcome">
              <div className="nextai-orb" aria-hidden="true">
                <Sparkles size={38} strokeWidth={1.3} />
              </div>
              <p className="nextai-eyebrow">SEUS DADOS. MAIS POSSIBILIDADES.</p>
              <h1>
                Vamos encontrar seu
                <br />
                <span>próximo resultado?</span>
              </h1>
              <p>
                Sou o Next. Traga seus dados, compartilhe o contexto.
                <br />
                Vamos organizar, analisar e planejar juntos.
              </p>
              <AnimatePresence>
                {!chat.messages.length && (
                  <MotionPanel key="suggestions" exit={presence.exit} className="nextai-suggestions">
                    {suggestions.map(({ icon: Icon, title, description, prompt }) => (
                      <button
                        key={title}
                        onClick={() => {
                          chat.setDraft(prompt)
                          textarea.current?.focus()
                        }}
                      >
                        <Icon size={20} />
                        <strong>{title}</strong>
                        <span>{description}</span>
                        <ArrowUpRight size={16} className="nextai-suggestion-arrow" />
                      </button>
                    ))}
                  </MotionPanel>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              {...presence}
              className="nextai-messages"
              role="log"
              aria-label="Conversa com NextAI"
              aria-live="polite"
            >
              {chat.messages.map((message) => (
                <motion.article key={message.id} {...presence} className={`nextai-message ${message.role}`}>
                  <span className="nextai-author">
                    {message.role === 'assistant' ? (
                      <>
                        <Sparkles size={15} /> Next
                      </>
                    ) : (
                      'Você'
                    )}
                  </span>
                  {message.attachment && (
                    <small className="nextai-file-label">
                      <FileSpreadsheet size={14} />
                      {message.attachment}
                    </small>
                  )}
                  <p>
                    {message.content
                      .split(/(\*\*[^*\n]+\*\*)/g)
                      .map((part, index) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={index}>{part.slice(2, -2)}</strong>
                        ) : (
                          part
                        ),
                      )}
                  </p>
                  {message.receipt && (
                    <div className="nextai-receipt">
                      <CheckCheck size={18} />
                      <div>
                        <strong>{message.receipt}</strong>
                        <small>Aplicação concluída nesta conversa. Veja o estado atual no painel.</small>
                      </div>
                      <Button variant="ghost" onClick={onDashboard}>
                        Ver dashboard <ArrowUpRight size={15} />
                      </Button>
                    </div>
                  )}
                </motion.article>
              ))}
              <AnimatePresence>
                {chat.busy && (
                  <motion.article
                    key="pending"
                    {...presence}
                    className="nextai-message user"
                    aria-label="Mensagem enviada"
                  >
                    <span className="nextai-author">Você · enviado</span>
                    {chat.attachment && (
                      <small className="nextai-file-label">
                        <FileSpreadsheet size={14} />
                        {chat.attachment.filename}
                      </small>
                    )}
                    <p>{chat.draft}</p>
                  </motion.article>
                )}
              </AnimatePresence>
              <div ref={last} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <MotionPanel className="nextai-compose-area">
        {chat.dataset && (
          <div className="nextai-context">
            <span>
              <span className="nextai-status-dot" />
              Painel conectado · {chat.dataset.summary.filename}
            </span>
            <Button variant="ghost" onClick={onDashboard}>
              Ver painel
            </Button>
          </div>
        )}
        <form
          className="nextai-composer"
          onSubmit={(event) => {
            event.preventDefault()
            void chat.send()
          }}
        >
          <AnimatePresence>
            {chat.attachment && (
              <motion.div key="attachment" {...presence} className="nextai-attachment">
                <FileSpreadsheet size={21} />
                <span>
                  <strong>{chat.attachment.filename}</strong>
                  <small>CSV · pronto para processar</small>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover anexo"
                  disabled={chat.busy}
                  onClick={chat.removeAttachment}
                >
                  <X size={15} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <label className="sr-only" htmlFor="nextai-message">
            Mensagem para NextAI
          </label>
          <textarea
            ref={textarea}
            id="nextai-message"
            value={chat.busy ? '' : chat.draft}
            maxLength={4000}
            disabled={chat.busy}
            placeholder={
              chat.busy ? 'Aguardando resposta do Next…' : 'Pergunte ao Next ou anexe um CSV para começar…'
            }
            rows={2}
            onChange={(e) => chat.setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void chat.send()
              }
            }}
          />
          <div className="nextai-compose-tools">
            <div>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                tabIndex={-1}
                aria-label="Arquivo CSV"
                onChange={(e) => {
                  void chat.attach(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileInput.current?.click()}
                disabled={chat.busy || chat.reading}
              >
                <Paperclip size={17} />
                {chat.reading ? 'Lendo arquivo…' : 'Anexar CSV'}
              </Button>
              <span className="nextai-model">{chat.model || 'OpenRouter'}</span>
            </div>
            {chat.busy ? (
              <Button
                key="cancel"
                type="button"
                aria-label="Cancelar resposta"
                onClick={(event) => {
                  event.preventDefault()
                  chat.cancel()
                }}
              >
                <Square size={15} />
                Cancelar
              </Button>
            ) : (
              <Button
                key="send"
                type="submit"
                size="icon"
                aria-label="Enviar mensagem"
                disabled={!chat.draft.trim() || !chat.consent || chat.configured !== true || chat.reading}
              >
                <ArrowUp size={20} />
              </Button>
            )}
          </div>
        </form>
        <label className="nextai-consent">
          <input
            type="checkbox"
            checked={chat.consent}
            disabled={chat.busy}
            onChange={(e) => chat.setConsent(e.target.checked)}
          />
          <span>
            Autorizo enviar mensagens e resumos das campanhas à OpenRouter e ao provedor do modelo. O CSV
            bruto não é enviado a eles. Evite dados pessoais.
          </span>
        </label>
        <AnimatePresence>
          {chat.busy && (
            <motion.p key="busy" {...presence} className="nextai-feedback" role="status">
              <Sparkles size={16} />
              {chat.attachment || chat.dataset
                ? 'Next está consultando seus dados. O painel só muda após a conclusão.'
                : 'Next está preparando a resposta…'}
            </motion.p>
          )}
          {chat.error && (
            <motion.p key="error" {...presence} className="nextai-error" role="alert">
              {chat.error}
            </motion.p>
          )}
          {chat.configured === false && (
            <motion.p key="configuration" {...presence} className="nextai-error" role="status">
              IA indisponível. Confira a API e OPENROUTER_API_KEY no .env do servidor.
            </motion.p>
          )}
        </AnimatePresence>
        {chat.canUndo && (
          <Button variant="ghost" disabled={chat.busy} onClick={chat.undo}>
            <Undo2 size={15} />
            Desfazer última aplicação
          </Button>
        )}
      </MotionPanel>
      <p className="nextai-footnote">
        <ShieldCheck size={15} />
        Dados e conversa ficam na memória desta sessão. Recarregar limpa o painel importado. A IA pode errar;
        confira as análises.
      </p>
    </div>
  )
}
