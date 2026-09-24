import { expect, test, type Page } from '@playwright/test'
import { summarizeSource } from '../../NextCom - Back/src/nextai'

const csv =
  'Campaign name,Amount spent (BRL),Results,Result indicator,Reporting starts,Reporting ends\nCampanha teste,150,2,purchase,2026-09-23,2026-09-30'
const summary = summarizeSource({ csv, filename: 'teste.csv', countryOverride: 'BR' })
async function openChat(page: Page) {
  await page.route('**/api/ai/status', (route) =>
    route.fulfill({ json: { configured: true, model: 'modelo-de-teste' } }),
  )
  await page.goto('/')
  if ((page.viewportSize()?.width ?? 1440) <= 760)
    await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('button', { name: 'NextAI', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Mensagem para NextAI' })).toBeVisible()
}
test('CSV, conversa, aplicação real ao painel e desfazer sem perder histórico', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await openChat(page)
  await page.route('**/api/ai/chat', async (route) => {
    const input = route.request().postDataJSON()
    expect(input.source.csv).toBe(csv)
    expect(input.consent).toBe(true)
    await route.fulfill({
      json: {
        reply: 'O CSV contém duas compras. O período foi preservado.',
        model: 'modelo-de-teste',
        applied: { summary, countryOverride: 'BR', label: 'Dados aplicados · país BR informado por você' },
      },
    })
  })
  await page
    .getByLabel('Arquivo CSV')
    .setInputFiles({ name: 'teste.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(page.locator('.nextai-attachment')).toContainText('teste.csv')
  await page.getByRole('textbox', { name: 'Mensagem para NextAI' }).fill('Importe o CSV e atribua ao Brasil')
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
  await page.getByRole('checkbox').check()
  await page.getByRole('textbox', { name: 'Mensagem para NextAI' }).press('Enter')
  await expect(page.locator('.nextai-receipt')).toContainText('Dados aplicados')
  await page.getByRole('button', { name: 'Ver dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Seu dashboard.' })).toBeVisible()
  await expect(page.locator('.imported-kpi').first()).toContainText('150,00')
  await expect(page.getByRole('button', { name: /^Brasil:/ })).toHaveAttribute('aria-label', /150,00/)
  await expect(page.locator('.imported-provenance').first()).toContainText('informado pelo usuário')
  await expect(page.locator('.imported-dashboard')).not.toContainText('Dados demonstrativos')
  await page.getByRole('button', { name: 'Conversar com Next' }).click()
  await expect(page.getByRole('log')).toContainText('duas compras')
  await page.getByRole('button', { name: 'Desfazer última aplicação' }).click()
  await expect(page.getByRole('log')).toContainText('desfeita')
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard.' })).toBeVisible()
  expect(errors).toEqual([])
})

test('erro preserva rascunho e anexo; cancelar não aplica resposta tardia', async ({ page }) => {
  await openChat(page)
  await page
    .getByLabel('Arquivo CSV')
    .setInputFiles({ name: 'teste.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('textbox', { name: 'Mensagem para NextAI' }).fill('Importe o CSV')
  await page.getByRole('checkbox').check()
  await page.route('**/api/ai/chat', (route) =>
    route.fulfill({ status: 503, json: { error: 'Provedor indisponível' } }),
  )
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.getByRole('alert')).toContainText('Provedor indisponível')
  await expect(page.getByRole('textbox', { name: 'Mensagem para NextAI' })).toHaveValue('Importe o CSV')
  await expect(page.locator('.nextai-attachment')).toBeVisible()
  await page.unroute('**/api/ai/chat')
  let release!: () => void
  await page.route('**/api/ai/chat', async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route
      .fulfill({ json: { reply: 'Tardia', applied: { summary, countryOverride: 'BR' } } })
      .catch(() => {})
  })
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.getByRole('button', { name: 'Cancelar resposta' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar resposta' }).click()
  release()
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled()
  await expect(page.locator('.nextai-receipt')).toHaveCount(0)
})

for (const width of [320, 768, 1440, 1920]) {
  test(`NextAI legível, teclado e movimento reduzido em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openChat(page)
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
    await page.getByRole('button', { name: /Entender meus resultados/ }).click()
    const input = page.getByRole('textbox', { name: 'Mensagem para NextAI' })
    await expect(input).toBeFocused()
    await input.press('Shift+Enter')
    await expect(input).toHaveValue(/\n/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Ativar tema claro' }).click()
    await expect(page.locator('html')).not.toHaveClass('dark')
  })
}

test('chat ocupa a largura útil e mantém compositor visível em monitores grandes', async ({ page }) => {
  await openChat(page)
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
    [3440, 1440],
  ]) {
    await page.setViewportSize({ width, height })
    await expect
      .poll(async () => {
        const composer = await page.locator('.nextai-composer').boundingBox()
        const main = await page.locator('main').boundingBox()
        return Boolean(
          composer && main && composer.width > main.width * 0.88 && composer.y + composer.height <= height,
        )
      })
      .toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.getByRole('checkbox').check()
  await page.route('**/api/ai/chat', (route) =>
    route.fulfill({
      json: {
        reply: 'Uma resposta extensa para testar a leitura.\n'.repeat(90),
        applied: null,
        model: 'teste',
      },
    }),
  )
  await page.getByRole('textbox', { name: 'Mensagem para NextAI' }).fill('Explique')
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.getByRole('log')).toContainText('Uma resposta extensa')
  await expect
    .poll(() => page.locator('.nextai-stage').evaluate((el) => el.scrollHeight > el.clientHeight))
    .toBe(true)
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeInViewport()
  await page.locator('.nextai-stage').evaluate((el) => {
    el.scrollTop = 0
  })
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeInViewport()
})

test('mensagem aparece durante a espera e pode ser cancelada por teclado', async ({ page }) => {
  await openChat(page)
  await page.route('**/api/ai/chat', (route) => route.abort('failed'))
  await page.getByRole('checkbox').check()
  // Hold the network response so the pending state is observable without consuming provider credits.
  await page.unroute('**/api/ai/chat')
  let finish!: () => void
  await page.route('**/api/ai/chat', async (route) => {
    await new Promise<void>((resolve) => {
      finish = resolve
    })
    await route.abort().catch(() => {})
  })
  await page.getByRole('textbox', { name: 'Mensagem para NextAI' }).fill('Olá, me fale mais sobre você')
  await page.getByRole('textbox', { name: 'Mensagem para NextAI' }).press('Enter')
  await expect(page.getByLabel('Mensagem enviada')).toContainText('Olá, me fale mais sobre você')
  await expect(page.locator('.nextai-feedback')).not.toContainText('2 minutos')
  await page.getByRole('button', { name: 'Cancelar resposta' }).focus()
  await page.keyboard.press('Enter')
  finish()
  await expect(page.getByRole('textbox', { name: 'Mensagem para NextAI' })).toHaveValue(
    'Olá, me fale mais sobre você',
  )
  await expect(page.getByLabel('Mensagem enviada')).toHaveCount(0)
})
