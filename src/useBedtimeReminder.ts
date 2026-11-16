import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings } from './model'

interface NightState { night: number; handled: boolean; snoozeUntil: number | null }
interface Reminder { night: number; bedtime: string }
const storageKey = 'sleep-live-reminder'

function loadNight(): NightState | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null')
    return value && Number.isFinite(value.night) && typeof value.handled === 'boolean'
      && (value.snoozeUntil === null || Number.isFinite(value.snoozeUntil)) ? value : null
  } catch { return null }
}

// Local calendar dates handle midnight and daylight-saving transitions.
export function bedtimeWindow(now: Date, settings: Pick<Settings, 'bedtime' | 'wake'>) {
  const [hour, minute] = settings.bedtime.split(':').map(Number)
  const target = new Date(now)
  target.setHours(hour, minute, 0, 0)
  if (target.getTime() > now.getTime()) target.setDate(target.getDate() - 1)
  const [wakeHour, wakeMinute] = settings.wake.split(':').map(Number)
  const end = new Date(target)
  end.setHours(wakeHour, wakeMinute, 0, 0)
  if (end.getTime() <= target.getTime()) end.setDate(end.getDate() + 1)
  return now.getTime() < end.getTime() ? { night: target.getTime(), end: end.getTime() } : null
}

export function useBedtimeReminder(settings: Settings, active: boolean, paused: boolean) {
  const [reminder, setReminder] = useState<Reminder | null>(null)
  const nightRef = useRef<NightState | null>(loadNight())
  const writeNight = useCallback((value: NightState) => {
    nightRef.current = value
    try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* Retain state in memory. */ }
  }, [])

  useEffect(() => {
    function check() {
      const now = new Date()
      const window = bedtimeWindow(now, settings)
      if (!settings.created || !settings.reminder || !window) { setReminder(null); return }
      if (nightRef.current?.night !== window.night) {
        writeNight({ night: window.night, handled: false, snoozeUntil: null })
        setReminder(null)
      }
      if (active) {
        writeNight({ night: window.night, handled: true, snoozeUntil: null })
        setReminder(null)
        return
      }
      const state = nightRef.current!
      if (paused || document.visibilityState !== 'visible' || state.handled
        || (state.snoozeUntil !== null && now.getTime() < state.snoozeUntil)) return
      // Record delivery before opening: re-renders and refreshes cannot duplicate it.
      writeNight({ night: window.night, handled: true, snoozeUntil: null })
      setReminder({ night: window.night, bedtime: settings.bedtime })
    }
    check()
    const timer = window.setInterval(check, 1000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [settings, active, paused, writeNight])

  const dismiss = useCallback(() => setReminder(null), [])
  const snooze = useCallback(() => {
    const until = Date.now() + 10 * 60 * 1000
    if (reminder) writeNight({ night: reminder.night, handled: false, snoozeUntil: until })
    setReminder(null)
    return until
  }, [reminder, writeNight])
  return { reminder, dismiss, snooze }
}
