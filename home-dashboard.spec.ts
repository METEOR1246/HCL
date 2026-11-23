import { test, expect } from '@playwright/test'

const settings = {
  created: true, bedtime: '23:45', wake: '07:00', duration: 30,
  reminder: true, reminderMinutes: 15, notifications: true, grayscale: true,
  apps: ['Instagram', 'TikTok'], name: 'Alex', phoneGoal: 30,
}
const url = 'http://localhost:5173'

for (const theme of ['light', 'dark', 'contrast']) {
  for (const language of ['en', 'zh-CN']) {
    test(`${theme} ${language}: confirmation, localization, persistence and mobile layout`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.setViewportSize({ width: 390, height: 844 })
      await page.clock.install({ time: new Date(2026, 10, 24, 18) })
      await page.addInitScript(({ settings, theme, language }) => {
        if (!localStorage.getItem('sleep-settings')) {
          localStorage.setItem('sleep-settings', JSON.stringify(settings))
          localStorage.setItem('sleep-theme', theme)
          localStorage.setItem('sleep-language', language)
        }
      }, { settings, theme, language })
      await page.goto(url)
      const zh = language === 'zh-CN'
      await expect(page.locator('h1')).toHaveText(zh ? '晚上好！' : 'Good Evening!')
      await expect(page.locator('.next-reminder')).toHaveText(zh ? '下一次提醒: 今晚 23:30' : 'Next reminder: Tonight 11:30 PM')
      await expect(page.locator('.bottom-nav')).toHaveText(zh ? '首页睡前准备数据分析我的' : 'HomeWind-DownInsightsMe')
      await expect(page.locator('.quick-actions')).toHaveCount(0)
      await expect(page.locator('.home-header .lucide-bell')).toHaveCount(0)
      await page.screenshot({ path: `.screenshots/dashboard-${theme}-${language}.png` })
      const ready = zh ? '准备放下了' : 'Ready to Put It Down'
      await page.getByRole('button', { name: ready, exact: true }).click()
      await expect(page.locator('.session-card h2')).toHaveText(zh ? '已开始睡前准备' : 'Wind-down started')
      await page.getByRole('button', { name: zh ? '撤销确认' : 'Undo Confirmation', exact: true }).click()
      await expect(page.getByRole('button', { name: ready, exact: true })).toBeVisible()
      await expect(page.locator('.session-card')).toHaveCount(0)
      await page.getByRole('button', { name: ready, exact: true }).click()
      await page.getByRole('button', { name: zh ? '结束睡前准备' : 'End Wind-Down', exact: true }).click()
      await expect(page.locator('.confirmation-completed')).toHaveText(zh ? '睡前准备已结束' : 'Wind-down completed')
      await page.getByRole('button', { name: zh ? '返回睡前提醒' : 'Return to bedtime reminder' }).click()
      await page.getByRole('button', { name: ready, exact: true }).click()
      await page.locator('.language-switch').click()
      await expect(page.locator('.session-card h2')).toHaveText(zh ? 'Wind-down started' : '已开始睡前准备')
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('lang', zh ? 'en' : 'zh-CN')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await page.setViewportSize({ width: 320, height: 700 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth
        && document.querySelector('main')!.scrollWidth <= document.querySelector('main')!.clientWidth)).toBe(true)
      const title = await page.locator('.home-header > span').boundingBox()
      const switchBox = await page.locator('.language-switch').boundingBox()
      expect(title!.x + title!.width).toBeLessThanOrEqual(switchBox!.x)
      expect(switchBox!.height).toBeGreaterThanOrEqual(44)
      expect(errors).toEqual([])
    })
  }
}

test('saved plan edits, appearance controls and disabled reminders', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 24, 18) })
  await page.addInitScript(settings => localStorage.setItem('sleep-settings', JSON.stringify(settings)), settings)
  await page.goto(url)
  await page.locator('.bedtime-card').click()
  await page.getByLabel('Target Bedtime', { exact: true }).fill('22:10')
  await page.getByRole('button', { name: 'Update My Plan' }).click()
  await expect(page.locator('.next-reminder')).toHaveText('Next reminder: Tonight 9:55 PM')
  await page.getByRole('button', { name: 'Wind-Down', exact: true }).click()
  await page.getByLabel('Reminder Time', { exact: true }).selectOption('60')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.locator('.next-reminder')).toHaveText('Next reminder: Tonight 9:10 PM')
  await page.getByRole('button', { name: 'Wind-Down', exact: true }).click()
  await page.getByRole('switch', { name: 'Bedtime Reminder', exact: true }).click()
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.locator('.reminder-status')).toHaveText('Bedtime reminder is off')
  await expect(page.locator('.next-reminder')).toHaveCount(0)
  await page.getByRole('button', { name: 'Me', exact: true }).click()
  for (const [label, theme] of [['Dark', 'dark'], ['High Contrast', 'contrast'], ['Light', 'light']]) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  }
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ready to Put It Down' })).toBeVisible()
})

test('midnight reminder uses saved lead time, snooze and localized live dialog', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 24, 23, 30) })
  await page.addInitScript(settings => {
    localStorage.setItem('sleep-settings', JSON.stringify({ ...settings, bedtime: '00:10', reminderMinutes: 30 }))
    localStorage.setItem('sleep-language', 'zh-CN')
  }, settings)
  await page.goto(url)
  await expect(page.locator('.next-reminder')).toHaveText('下一次提醒: 今晚 23:40')
  await page.clock.fastForward(10 * 60000)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('你的计划睡觉时间是 0:10')
  await page.getByRole('button', { name: '推迟 10 分钟' }).click()
  await page.clock.fastForward(1000)
  await expect(page.locator('.next-reminder')).toHaveText('下一次提醒: 今晚 23:50')
  await expect(page.locator('.toast')).toContainText('提醒已推迟至 23:50')
  await page.clock.fastForward(10 * 60000)
  await page.getByRole('button', { name: '准备放下了', exact: true }).last().click()
  await expect(page.locator('.session-card h2')).toHaveText('已开始睡前准备')
  await page.clock.fastForward(30 * 60000)
  await expect(page.locator('.confirmation-completed')).toHaveText('睡前准备已结束')
})
