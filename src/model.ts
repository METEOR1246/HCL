export type Theme = 'light' | 'dark' | 'contrast'
export type Page = 'setup' | 'home' | 'wind' | 'insights' | 'me' | 'intervention'
export interface Settings {
  created: boolean
  bedtime: string
  wake: string
  duration: number
  reminder: boolean
  reminderMinutes: number
  notifications: boolean
  grayscale: boolean
  apps: string[]
  name: string
  phoneGoal: number
}
export const defaults: Settings = {
  created: false, bedtime: '23:00', wake: '07:00', duration: 30,
  reminder: true, reminderMinutes: 30, notifications: true, grayscale: true,
  apps: ['Instagram', 'TikTok'], name: 'Alex', phoneGoal: 30,
}
export function minutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
export function clock(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}
export function formatTime(time: string) {
  const value = minutes(time), h = Math.floor(value / 60)
  return `${h % 12 || 12}:${String(value % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
// Anchor a sleep night at noon so 00:10 follows 23:50.
export const nightMinute = (value: number) => value < 720 ? value + 1440 : value
export function reminderDue(now: number, settings: Settings, phoneActive: boolean, skipped: boolean, snooze: number | null) {
  const current = nightMinute(now)
  const target = nightMinute(minutes(settings.bedtime))
  const wake = target + ((minutes(settings.wake) - minutes(settings.bedtime) + 1440) % 1440 || 1440)
  return settings.reminder && phoneActive && !skipped && current >= target - settings.reminderMinutes
    && current < wake && (snooze === null || current >= snooze)
}
export const phoneUse = 48
export function sleepRecords(count: number) {
  const offsets = [30, 18, 5, 5, 20, 34, 47]
  const use = [42, 35, 26, 28, 34, 41, 46]
  return Array.from({ length: count }, (_, i) => ({
    bedtime: 1380 + offsets[i % 7] + (count > 7 ? (Math.floor(i / 7) % 3 - 1) * 7 : 0),
    phone: use[i % 7] + (count > 7 ? Math.floor(i / 7) % 5 - 2 : 0),
  }))
}
export function stats(records: ReturnType<typeof sleepRecords>, target: string) {
  const averageDeviation = records.reduce((sum, r) => sum + Math.abs(r.bedtime - nightMinute(minutes(target))), 0) / records.length
  return {
    consistency: Math.max(0, Math.round(100 - averageDeviation / 1.6)),
    phone: Math.round(records.reduce((sum, r) => sum + r.phone, 0) / records.length),
  }
}
export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem('sleep-settings') || '{}')
    const validTime = (s: unknown) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
    return {
      ...defaults,
      created: saved.created === true,
      bedtime: validTime(saved.bedtime) ? saved.bedtime : defaults.bedtime,
      wake: validTime(saved.wake) ? saved.wake : defaults.wake,
      duration: [15, 30, 45, 60].includes(saved.duration) ? saved.duration : defaults.duration,
      reminder: typeof saved.reminder === 'boolean' ? saved.reminder : defaults.reminder,
      reminderMinutes: [0, 10, 15, 30, 60].includes(saved.reminderMinutes) ? saved.reminderMinutes : defaults.reminderMinutes,
      notifications: typeof saved.notifications === 'boolean' ? saved.notifications : defaults.notifications,
      grayscale: typeof saved.grayscale === 'boolean' ? saved.grayscale : defaults.grayscale,
      apps: Array.isArray(saved.apps) ? saved.apps.filter((a: unknown) => ['Instagram', 'TikTok', 'YouTube', 'Games'].includes(String(a))) : defaults.apps,
      name: typeof saved.name === 'string' && saved.name.trim() ? saved.name.slice(0, 30) : defaults.name,
      phoneGoal: [15, 30, 45, 60].includes(saved.phoneGoal) ? saved.phoneGoal : defaults.phoneGoal,
    }
  } catch { return defaults }
}
