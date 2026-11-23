import { test, expect, type Page } from '@playwright/test'
import { translations, type TranslationKey } from './src/i18n'

const settings = {
  created: true, bedtime: '23:45', wake: '07:00', duration: 30,
  reminder: true, reminderMinutes: 15, notifications: true, grayscale: true,
  apps: ['Instagram', 'Games'], name: 'Alex', phoneGoal: 30,
}
const url = 'http://localhost:5173'

async function checkChinese(page: Page) {
  const text = await page.locator('.phone-screen').innerText()
  const labels = await page.locator('[aria-label]').evaluateAll(elements =>
    elements.map(element => element.getAttribute('aria-label')).join('\n'))
  const remaining = `${text}\n${labels}`.replace(/Smart Sleep Companion|Instagram|TikTok|YouTube|Alex|\bEN\b|\bz+\b/g, '')
  expect(remaining, 'Chinese UI must contain no untranslated English text or accessibility labels').not.toMatch(/[A-Za-z]/)
}

async function checkLayout(page: Page) {
  expect(await page.evaluate(() => {
    const containers = [document.documentElement, ...document.querySelectorAll('main, .modal-card')]
    return containers.every(element => element.scrollWidth <= element.clientWidth + 1)
  }), 'No horizontal overflow on a 320px screen').toBe(true)
}

for (const theme of ['light', 'dark', 'contrast'] as const) {
  test(`${theme}: Chinese then English across all pages, dialogs, charts and settings`, async ({ page }) => {
    test.setTimeout(90000)
    page.setDefaultTimeout(10000)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: 320, height: 740 })
    await page.clock.install({ time: new Date(2026, 10, 24, 18) })
    await page.addInitScript(({ settings, theme }) => {
      if (!localStorage.getItem('sleep-settings')) {
        localStorage.setItem('sleep-settings', JSON.stringify(settings))
        localStorage.setItem('sleep-theme', theme)
      }
    }, { settings, theme })
    await page.goto(url)
    for (const language of ['zh-CN', 'en'] as const) {
      await page.locator('.language-switch').click()
      const text = translations[language]
      const button = (key: TranslationKey) => page.getByRole('button', { name: text[key], exact: true })
      const verify = async () => {
        await checkLayout(page)
        if (language === 'zh-CN') await checkChinese(page)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      }
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      await verify()
      const saved = await page.evaluate(() => localStorage.getItem('sleep-settings'))
      await page.locator('.bedtime-card').click()
      await expect(page.locator('h1')).toHaveText(text.setupTitle)
      await verify()
      await page.getByLabel(text.targetBedtime, { exact: true }).fill('')
      await button('updatePlan').click()
      await expect(page.locator('.toast')).toHaveText(text.chooseTimes)
      await verify()
      await page.getByLabel(text.targetBedtime, { exact: true }).fill(settings.bedtime)
      await button('updatePlan').click()
      await expect(page.locator('.toast')).toHaveText(text.planSaved)

      await button('wind').click()
      await expect(page.locator('h1')).toHaveText(text.windTitle)
      await verify()
      await page.getByRole('button', { name: new RegExp(`^${text.lockApps}`) }).click()
      await expect(page.getByRole('dialog')).toContainText(text.games)
      await page.getByLabel(text.games, { exact: true }).uncheck()
      await page.getByLabel(text.games, { exact: true }).check()
      await verify()
      await button('done').click()
      await button('saveChanges').click()
      await expect(page.locator('.toast')).toHaveText(text.windSaved)

      await button('insights').click()
      await expect(page.locator('h1')).toHaveText(text.insightsTitle)
      await verify()
      await expect(page.locator('.bedtime-chart')).toHaveAccessibleName(
        new RegExp(language === 'zh-CN' ? '过去 7 天' : 'Bedtime over 7 days'))
      for (const key of ['month', 'allTime', 'week'] as const) {
        await page.getByRole('tab', { name: text[key], exact: true }).click()
        await verify()
      }
      await expect(page.locator('.bedtime-chart')).toContainText(text.mon)
      await page.locator('.recommendations button').first().click()
      await expect(page.locator('h1')).toHaveText(text.setupTitle)
      await button('back').click()

      await button('me').click()
      await expect(page.locator('h1')).toHaveText(text.me)
      await verify()
      for (const appearance of ['light', 'dark', 'contrast'] as const) {
        await button(appearance).click()
        await expect(page.locator('html')).toHaveAttribute('data-theme', appearance)
        if (language === 'zh-CN') await checkChinese(page)
      }
      await button(theme).click()
      await button('savePreferences').click()
      await expect(page.locator('.toast')).toHaveText(text.preferencesSaved)
      await button('about').click()
      await expect(page.getByRole('dialog')).toContainText(text.helpMetrics)
      await verify()
      await button('gotIt').click()

      await button('testReminder').click()
      await button('resetSimulation').click()
      await expect(page.locator('.simulation-status')).toHaveText(text.simulationReset)
      await verify()
      await page.getByLabel(text.simulatedTime, { exact: true }).fill('20:00')
      await button('checkReminder').click()
      await expect(page.locator('.simulation-status')).toHaveText(text.simulationNotDue)
      await page.getByRole('switch', { name: text.phoneInUse }).click()
      await button('checkReminder').click()
      await expect(page.locator('.simulation-status')).toHaveText(text.simulationInactive)
      await page.getByRole('switch', { name: text.phoneInUse }).click()
      await button('advance').click()
      await expect(page.locator('.simulation-status')).toContainText(language === 'zh-CN' ? '20:10' : '8:10 PM')
      await verify()
      await page.getByLabel(text.simulatedTime, { exact: true }).fill('23:35')
      await button('checkReminder').click()
      await expect(page.locator('h1')).toHaveText(text.reminderTitle)
      await verify()
      await button('snoozeAction').click()
      await expect(page.locator('.toast')).toContainText(language === 'zh-CN' ? '23:45' : '11:45 PM')

      await button('me').click()
      await button('testReminder').click()
      await button('checkReminder').click()
      await expect(page.locator('.simulation-status')).toContainText(language === 'zh-CN' ? '推迟至 23:45' : 'Snoozed until 11:45 PM')
      await verify()
      await page.getByLabel(text.simulatedTime, { exact: true }).fill('23:52')
      await button('checkReminder').click()
      await expect(page.locator('h1')).toHaveText(text.interventionTitle)
      await verify()
      await button('skipAction').click()
      await expect(page.locator('.toast')).toHaveText(text.simulationSkipped)
      await button('me').click()
      await button('testReminder').click()
      await button('checkReminder').click()
      await expect(page.locator('.simulation-status')).toHaveText(text.simulationSkipStatus)
      await verify()
      await button('resetSimulation').click()
      await button('close').click()
      await button('home').click()
      await button('ready').click()
      await verify()
      await button('undo').click()
      expect(await page.evaluate(() => localStorage.getItem('sleep-settings'))).toBe(saved)
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    }
    expect(errors).toEqual([])
  })
}

test('existing toast and simulation messages retranslate without resetting settings', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 24, 18) })
  await page.addInitScript(settings => localStorage.setItem('sleep-settings', JSON.stringify(settings)), settings)
  await page.goto(url)
  await page.getByRole('button', { name: 'Wind-Down', exact: true }).click()
  await page.getByRole('switch', { name: 'Bedtime Reminder', exact: true }).click()
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await expect(page.locator('.toast')).toHaveText('Wind-down preferences saved.')
  await page.locator('.language-switch').click()
  await expect(page.locator('.toast')).toHaveText('睡前准备偏好已保存。')
  await page.getByRole('button', { name: '我的', exact: true }).click()
  await page.getByRole('button', { name: '测试睡前提醒' }).click()
  await page.getByRole('button', { name: '检查提醒' }).click()
  await expect(page.locator('.simulation-status')).toHaveText(translations['zh-CN'].simulationOff)
  await checkChinese(page)
  await page.getByRole('button', { name: '关闭对话框' }).click()
  await page.getByRole('button', { name: '首页', exact: true }).click()
  const settingsBefore = await page.evaluate(() => localStorage.getItem('sleep-settings'))
  await page.locator('.language-switch').click()
  await page.getByRole('button', { name: 'Me', exact: true }).click()
  await page.getByRole('button', { name: 'Test Bedtime Reminder' }).click()
  await expect(page.locator('.simulation-status')).toHaveText(translations.en.simulationOff)
  expect(await page.evaluate(() => localStorage.getItem('sleep-settings'))).toBe(settingsBefore)
})

test('first-run Chinese plan creation and localized storage failure', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 24, 18) })
  await page.addInitScript(() => {
    localStorage.setItem('sleep-language', 'zh-CN')
    localStorage.setItem('sleep-theme', 'contrast')
  })
  await page.goto(url)
  await expect(page.locator('h1')).toHaveText('设置睡眠计划')
  await checkChinese(page)
  await page.getByRole('button', { name: '创建我的计划' }).click()
  await expect(page.locator('h1')).toHaveText('晚上好！')
  await expect(page.locator('.toast')).toHaveText('睡眠计划已保存。')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'sleep-settings') throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '睡前准备', exact: true }).click()
  await page.getByRole('button', { name: '保存更改', exact: true }).click()
  await expect(page.locator('.toast')).toHaveText('设置已应用，但此浏览器无法保存。')
  await checkChinese(page)
  await page.locator('.language-switch').click()
  await expect(page.locator('.toast')).toHaveText(translations.en.saveError)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast')
})
