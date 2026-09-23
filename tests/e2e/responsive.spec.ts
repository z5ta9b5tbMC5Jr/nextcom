import { expect, test } from '@playwright/test'

test('dashboard reorganiza colunas sem reduzir texto ou cortar valores', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  for (const [width, columns] of [
    [320, 2],
    [390, 2],
    [768, 2],
    [1024, 3],
    [1440, 3],
    [1920, 6],
  ]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect
      .poll(() =>
        page
          .locator('.kpi-grid')
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
      )
      .toBe(columns)
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      clippedValues: [...document.querySelectorAll<HTMLElement>('.kpi-value')].filter(
        (el) => el.scrollWidth > el.clientWidth,
      ).length,
      smallestValue: Math.min(
        ...[...document.querySelectorAll('.kpi-value')].map((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        ),
      ),
      smallestLabel: Math.min(
        ...[
          ...document.querySelectorAll('.kpi-label, .channel-row, .country-value strong, .campaign-table td'),
        ].map((el) => parseFloat(getComputedStyle(el).fontSize)),
      ),
    }))
    expect(layout.overflow, `page overflow at ${width}`).toBe(false)
    expect(layout.clippedValues, `clipped KPIs at ${width}`).toBe(0)
    expect(layout.smallestValue).toBeGreaterThanOrEqual(26)
    expect(layout.smallestLabel).toBeGreaterThanOrEqual(13)
  }
  // 960 CSS px represents the available space on a 1920px screen at 200% browser zoom.
  await page.setViewportSize({ width: 960, height: 540 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
