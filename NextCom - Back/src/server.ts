import express from 'express'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Resolvido a partir deste módulo, independente do diretório de execução.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'nextcom-api' }))
app.get('/api/integrations/meta/status', (_req, res) => {
  res.json({
    provider: 'meta',
    connected: false,
    mode: 'demo',
    message: 'Integração Meta Ads prevista para a próxima etapa.',
  })
})
app.use((_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }))
const port = Number(process.env.PORT || 3001)
app.listen(port, '127.0.0.1', () => console.log(`NextCom API: http://127.0.0.1:${port}`))
