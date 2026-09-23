import { expect, test } from '@playwright/test'
import { currency, getRecords, sum } from '../../NextCom - Front/src/lib/data'

test('animações completas podem ser ativadas mesmo com redução no sistema', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
  await page.getByRole('button', { name: 'Preferência de animações' }).click()
  await page.getByRole('combobox', { name: 'Modo de animação' }).click()
  await page.getByRole('option', { name: 'Completas', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full')
  await page.getByRole('button', { name: 'Planejamento', exact: true }).click()
  expect(
    await page
      .locator('[data-slot="dialog-content"]')
      .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
  ).toBeGreaterThan(0.2)
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full')
})

test('botões deslocam no hover e indicador acompanha a navegação', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const exportButton = page.getByRole('button', { name: 'Exportar dados' })
  await exportButton.hover()
  await expect(exportButton).toHaveCSS('translate', '0px -3px')
  const campaigns = page.getByRole('button', { name: /^Campanhas/ })
  await campaigns.click()
  await expect(campaigns).toHaveAttribute('aria-current', 'location')
  await expect(campaigns.locator('.nav-active-surface')).toHaveCount(1)
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute(
    'aria-current',
    'location',
  )
})

test('modal preserva conteúdo até terminar a animação de saída', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Planejamento', exact: true }).click()
  const dialog = page.locator('[data-slot="dialog-content"]')
  await expect(dialog).toHaveCSS('animation-name', 'nc-dialog-in')
  await dialog.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished))
  })
  const closing = await dialog.evaluate(
    (el) =>
      new Promise<{ text: string; animation: string; duration: number }>((resolve) => {
        const observer = new MutationObserver(() => {
          if (el.getAttribute('data-state') === 'closed') {
            const css = getComputedStyle(el)
            resolve({
              text: el.textContent ?? '',
              animation: css.animationName,
              duration: parseFloat(css.animationDuration),
            })
            observer.disconnect()
          }
        })
        observer.observe(el, { attributes: true, attributeFilter: ['data-state'] })
        el.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')!.click()
      }),
  )
  expect(closing.text).toContain('Planeje o próximo passo')
  expect(closing.animation).toBe('nc-dialog-out')
  expect(closing.duration).toBeGreaterThan(0.1)
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0)
})

test('interações rápidas terminam com dados e gráfico atuais, sem animações presas', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  for (const days of [7, 14, 7]) {
    await page.getByRole('combobox', { name: 'Período do dashboard' }).click()
    await page.getByRole('option', { name: `Últimos ${days} dias` }).click()
  }
  const value = page.locator('.kpi-value .animated-number > [aria-hidden="true"]').first()
  await expect(value).toHaveText(currency(sum(getRecords(7, 'all')).spend))
  await page.getByRole('button', { name: 'Investimento', exact: true }).click()
  await page.getByRole('button', { name: 'Resultados', exact: true }).click()
  await page.getByRole('button', { name: 'Investimento', exact: true }).click()
  await expect(page.locator('.chart-canvas')).toHaveCount(1)
  await expect(page.locator('.chart-canvas')).toHaveAttribute('aria-label', /^Investimento:/)
  await expect(page.locator('.recharts-area').first()).toBeVisible()
  await page.getByRole('button', { name: 'Exportar dados' }).click()
  await expect(page.getByRole('status')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar aviso' }).click()
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('movimento reduzido mantém filtros e saídas funcionais no celular', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.kpi-card').first()).toHaveCSS('opacity', '1')
  await page.getByRole('combobox', { name: 'Período do dashboard' }).click()
  await page.getByRole('option', { name: 'Últimos 7 dias' }).click()
  const values = await page
    .locator('.kpi-value .animated-number')
    .first()
    .evaluate((el) => ({
      visible: el.querySelector('[aria-hidden="true"]')?.textContent,
      accessible: el.querySelector('.sr-only')?.textContent,
    }))
  expect(values.visible).toBe(values.accessible)
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('button', { name: 'Planejamento', exact: true }).click()
  const duration = await page
    .locator('[data-slot="dialog-content"]')
    .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))
  expect(duration).toBeLessThan(0.001)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.sidebar')).toHaveAttribute('inert', '')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})
