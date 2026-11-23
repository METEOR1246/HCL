import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlarmClock, ArrowLeft, BarChart3, BedDouble, Bell, BellOff, Check, ChevronRight, CircleHelp, Home, Lightbulb, LockKeyhole, Moon, Play, ShieldCheck, Signal, Smartphone, Sun, Target, UserRound, Wifi, X, type LucideIcon } from 'lucide-react'
import { useTheme } from './ThemeContext'
import { useLanguage, type Message } from './i18n'
import { clock, loadSettings, minutes, nightMinute, phoneUse, reminderDue, sleepRecords, stats, type Page, type Settings } from './model'
import { useBedtimeReminder } from './useBedtimeReminder'
import { enableAndPlayReminderSound, playReminderSound, stopReminderSound, unlockReminderSound } from './reminderSound'

function Icon({ icon: Component, className = '' }: { icon: LucideIcon; className?: string }) {
  return <Component className={`icon ${className}`} aria-hidden="true" strokeWidth={1.8} />
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <button className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-label={label} aria-checked={checked} onClick={onChange}><span /></button>
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const { t } = useLanguage()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button, input, select')?.focus()
    function handle(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]') || [])
        const first = focusable[0], last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', handle)
    return () => { document.removeEventListener('keydown', handle); previous?.focus() }
  }, [onClose])
  return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="modal-card" ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="flex items-center justify-between gap-3"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label={t('close')} onClick={onClose}><Icon icon={X} /></button></div>
      {children}
    </div>
  </div>
}
export default function App() {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t, time, reminderDate, message, appName } = useLanguage()
  const [settings, setSettings] = useState(loadSettings)
  const [draft, setDraft] = useState(settings)
  const [page, setPage] = useState<Page>(settings.created ? 'home' : 'setup')
  const [period, setPeriod] = useState<'Week' | 'Month' | 'All Time'>('Week')
  const [modal, setModal] = useState<'apps' | 'simulation' | 'help' | null>(null)
  const [toast, setToast] = useState<Message | null>(null)
  const [active, setActive] = useState(false)
  const [confirmation, setConfirmation] = useState<'default' | 'started' | 'completed'>('default')
  const [sessionEnd, setSessionEnd] = useState<number | null>(null)
  const [tick, setTick] = useState(Date.now())
  const [simTime, setSimTime] = useState(clock(minutes(settings.bedtime) + 7))
  const [phoneActive, setPhoneActive] = useState(true)
  const [simRunning, setSimRunning] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [snooze, setSnooze] = useState<number | null>(null)
  const [simulationStatus, setSimulationStatus] = useState<Message>({ key: 'simulationInitial' })
  const [soundBlocked, setSoundBlocked] = useState(false)
  const liveReminder = useBedtimeReminder(settings, active, page === 'intervention' || modal === 'simulation')
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const unlock = () => unlockReminderSound()
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    return () => { document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); stopReminderSound() }
  }, [])
  useEffect(() => {
    if (page !== 'intervention' && !liveReminder.reminder) return
    if (liveReminder.reminder) setModal(null)
    setSoundBlocked(!playReminderSound())
    return stopReminderSound
  }, [page, liveReminder.reminder])
  useEffect(() => { mainRef.current?.scrollTo(0, 0) }, [page])
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 3500); return () => clearTimeout(id) }, [toast])
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  useEffect(() => {
    if (active && sessionEnd && tick >= sessionEnd) { setActive(false); setSessionEnd(null); setConfirmation('completed') }
    else if (!active && confirmation === 'started') setConfirmation('default')
  }, [tick, active, sessionEnd, confirmation])
  useEffect(() => {
    if (simRunning && !active && reminderDue(minutes(simTime), settings, phoneActive, skipped, snooze)) {
      setModal(null); setPage('intervention'); setSimulationStatus({ key: 'simulationTriggered' })
    }
  }, [simTime, simRunning, phoneActive, settings, skipped, snooze, active])
  function navigate(next: Page) {
    if (next === 'wind' || next === 'setup' || next === 'me') setDraft(settings)
    setPage(next)
  }
  function persist(value: Settings) {
    setSettings(value); setDraft(value)
    try { localStorage.setItem('sleep-settings', JSON.stringify(value)); return true }
    catch { setToast({ key: 'saveError' }); return false }
  }
  function startWindDown() {
    stopReminderSound(); liveReminder.dismiss()
    setActive(true); setConfirmation('started'); setSessionEnd(Date.now() + settings.duration * 60000); setTick(Date.now())
    setSimRunning(false); setModal(null); navigate('home'); setToast(null)
  }
  function finishConfirmation(completed: boolean) {
    setActive(false); setSessionEnd(null); setConfirmation(completed ? 'completed' : 'default'); setToast(null)
  }
  function runSimulation() {
    setSimRunning(true)
    if (reminderDue(minutes(simTime), settings, phoneActive, skipped, snooze)) { setModal(null); setPage('intervention') }
    else setSimulationStatus(skipped ? { key: 'simulationSkipStatus' } : !settings.reminder ? { key: 'simulationOff' } : !phoneActive ? { key: 'simulationInactive' } : snooze !== null && nightMinute(minutes(simTime)) < snooze ? { key: 'simulationSnoozed', time: clock(snooze) } : { key: 'simulationNotDue' })
  }
  const records = sleepRecords(period === 'Week' ? 7 : period === 'Month' ? 28 : 84)
  const metrics = stats(records, settings.bedtime)
  const progress = Math.min(100, Math.floor(settings.phoneGoal / phoneUse * 100))
  const remaining = sessionEnd ? Math.max(0, Math.ceil((sessionEnd - tick) / 60000)) : settings.duration
  const backVisible = page === 'setup' || page === 'wind'
  const navVisible = page !== 'setup' && page !== 'intervention'
  const closeModal = useCallback(() => setModal(null), [])
  const skipLiveReminder = useCallback(() => {
    stopReminderSound(); liveReminder.dismiss(); setToast({ key: 'skipped' })
  }, [liveReminder.dismiss])
  async function replaySound() {
    setSoundBlocked(!await enableAndPlayReminderSound())
  }
  return <div className="app-stage">
    <div className="phone-shell">
      <div className="phone-screen">
        <div className="status-bar"><span>{page === 'intervention' ? time(simTime) : '9:41'}</span><div className="notch" /><span className="status-icons"><Signal size={16} fill="currentColor" /><Wifi size={16} /><span className="battery" /></span></div>
        <header className={`app-header ${page === 'home' ? 'home-header' : ''}`}>
          {backVisible && <button className="icon-button header-left" aria-label={t('back')} onClick={() => navigate('home')}><Icon icon={ArrowLeft} /></button>}
          <span>Smart Sleep Companion</span>
          {page === 'home' && <button className="language-switch" aria-label={t('switchLanguage')} onClick={() => setLanguage(language === 'en' ? 'zh-CN' : 'en')}><span className={language === 'en' ? 'selected' : ''} lang="en">EN</span><span aria-hidden="true">/</span><span className={language === 'zh-CN' ? 'selected' : ''} lang="zh-CN">中文</span></button>}
        </header>
        <main ref={mainRef} className={`page-content page-${page}`}>
          {page === 'setup' && <>
            <div className="page-intro"><h1>{t('setupTitle')}</h1><p>{t('setupIntro')}</p></div>
            <div className="setup-fields">
              <label className="setup-row"><Icon icon={BedDouble} /><span>{t('targetBedtime')}</span><input aria-label={t('targetBedtime')} type="time" value={draft.bedtime} onChange={e => setDraft({ ...draft, bedtime: e.target.value })} required /></label>
              <label className="setup-row"><Icon icon={Sun} /><span>{t('wakeTime')}</span><input aria-label={t('wakeTime')} type="time" value={draft.wake} onChange={e => setDraft({ ...draft, wake: e.target.value })} required /></label>
              <label className="setup-row"><Icon icon={Moon} /><span>{t('duration')}</span><select aria-label={t('duration')} value={draft.duration} onChange={e => setDraft({ ...draft, duration: Number(e.target.value) })}>{[15, 30, 45, 60].map(n => <option key={n} value={n}>{t('minutes', { value: n })}</option>)}</select></label>
            </div>
            <div className="bottom-action"><button className="primary-button" onClick={() => { if (!draft.bedtime || !draft.wake) { setToast({ key: 'chooseTimes' }); return } const saved = persist({ ...draft, created: true }); navigate('home'); if (saved) setToast({ key: 'planSaved' }) }}>{t(settings.created ? 'updatePlan' : 'createPlan')}</button></div>
          </>}
          {page === 'home' && <>
            <div className="page-intro"><h1>{t('greeting')}</h1><p>{t('intro')}</p></div>
            <button className="bedtime-card card" onClick={() => navigate('setup')}><span className="icon-disc"><Icon icon={BedDouble} /></span><span><strong>{t('bedtime')}</strong><b>{time(settings.bedtime)}</b></span><Icon icon={ChevronRight} /></button>
            <div className="usage-card card"><div><h2>{t('phoneUse')}<br />{t('beforeSleep')}</h2><b className="big-number">{t('minutes', { value: phoneUse })}</b><p>{t('goal', { value: settings.phoneGoal })}</p></div><div className="progress-ring" style={{ '--progress': `${progress}%` } as React.CSSProperties} role="img" aria-label={t('ring', { value: progress })}><div><b>{progress}%</b><span>{t('ofGoal')}</span></div></div></div>
            <section className="bedtime-confirmation" aria-label={t('wind')}>
              <div className="reminder-status"><span className={`status-dot ${settings.reminder ? '' : 'off'}`} aria-hidden="true" /><strong>{t(settings.reminder ? 'reminderOn' : 'reminderOff')}</strong></div>
              {settings.reminder && liveReminder.nextReminder && <p className="next-reminder">{t('nextReminder')}: {reminderDate(new Date(liveReminder.nextReminder))}</p>}
              <div role="status" aria-live="polite">
                {confirmation === 'started' && <div className="session-card card"><div className="flex items-center gap-2"><Icon icon={Moon} /><h2>{t('started')}</h2><span className="session-time">{t('minutes', { value: remaining })}</span></div><p>{t('confirmation')}</p><div className={`simulation-preview ${settings.grayscale ? 'is-grayscale' : ''}`}><Smartphone size={20} /><span>{t(settings.notifications ? 'quieted' : 'unchanged')}<br />{t(settings.grayscale ? 'grayscale' : 'color')}</span><ShieldCheck size={20} /></div><p className="small-copy">{t(settings.apps.length ? 'locked' : 'noApps', { apps: settings.apps.map(appName).join('、') })}</p></div>}
                {confirmation === 'completed' && <p className="confirmation-completed"><Icon icon={Check} />{t('completed')}</p>}
              </div>
              <div className="confirmation-actions">
                {confirmation === 'default' && <button className="primary-button" onClick={startWindDown}>{t('ready')}</button>}
                {confirmation === 'started' && <><button className="secondary-button" onClick={() => finishConfirmation(false)}>{t('undo')}</button><button className="primary-button" onClick={() => finishConfirmation(true)}>{t('end')}</button></>}
                {confirmation === 'completed' && <button className="secondary-button" onClick={() => finishConfirmation(false)}>{t('reset')}</button>}
              </div>
            </section>
            {(snooze !== null || skipped) && <p className="status-note"><Icon icon={AlarmClock} />{skipped ? t('skipped') : t('snoozed', { time: time(clock(snooze!)) })}</p>}
          </>}
          {page === 'wind' && <>
            <div className="page-intro"><h1>{t('windTitle')}</h1><p>{t('windIntro')}</p></div>
            <div className="preferences">
              <section className="preference-card card"><div className="preference-row"><Icon icon={Bell} /><div><h2>{t('bedtimeReminder')}</h2><p>{t('reminderDescription')}</p></div><Toggle label={t('bedtimeReminder')} checked={draft.reminder} onChange={() => setDraft({ ...draft, reminder: !draft.reminder })} /></div><label className={`reminder-time ${!draft.reminder ? 'disabled' : ''}`}><span>{t('reminderTime')}</span><select aria-label={t('reminderTime')} disabled={!draft.reminder} value={draft.reminderMinutes} onChange={e => setDraft({ ...draft, reminderMinutes: Number(e.target.value) })}>{[0, 10, 15, 30, 60].map(n => <option key={n} value={n}>{t(n ? 'minutesBefore' : 'atBedtime', { value: n })}</option>)}</select></label></section>
              <section className="preference-card card"><div className="preference-row"><Icon icon={BellOff} /><div><h2>{t('reduceNotifications')}</h2><p>{t('notificationsDescription')}</p></div><Toggle label={t('reduceNotifications')} checked={draft.notifications} onChange={() => setDraft({ ...draft, notifications: !draft.notifications })} /></div></section>
              <section className="preference-card card"><div className="preference-row"><Icon icon={Smartphone} /><div><h2>{t('grayscaleMode')}</h2><p>{t('grayscaleDescription')}</p></div><Toggle label={t('grayscaleMode')} checked={draft.grayscale} onChange={() => setDraft({ ...draft, grayscale: !draft.grayscale })} /></div></section>
              <button className="preference-card card preference-row" onClick={() => setModal('apps')}><span className="apps-icon"><span /><span /><span /><span /></span><div><h2>{t('lockApps')}</h2><p>{t('lockDescription')}</p></div><Icon icon={ChevronRight} /></button>
            </div>
            <p className="prototype-note">{t('prototypeNote')}</p>
            <div className="bottom-action"><button className="primary-button" onClick={() => { const saved = persist(draft); navigate('home'); if (saved) setToast({ key: 'windSaved' }) }}>{t('saveChanges')}</button></div>
          </>}
          {page === 'intervention' && <div className="intervention-content"><div className="sleep-emblem" aria-hidden="true"><Moon /><span>z<sup>z</sup></span></div><h1>{t(nightMinute(minutes(simTime)) >= nightMinute(minutes(settings.bedtime)) ? 'interventionTitle' : 'reminderTitle')}</h1><p>{t(nightMinute(minutes(simTime)) >= nightMinute(minutes(settings.bedtime)) ? 'interventionAfter' : 'interventionBefore', { time: time(settings.bedtime) })}</p><div className="intervention-actions"><button className="primary-button" onClick={startWindDown}><Icon icon={Play} />{t('startWind')}</button><button className="secondary-button" onClick={() => { stopReminderSound(); const until = nightMinute(minutes(simTime)) + 10; setSnooze(until); navigate('home'); setToast({ key: 'snoozed', time: clock(until) }) }}><Icon icon={AlarmClock} />{t('snoozeAction')}</button><button className="secondary-button" onClick={() => { stopReminderSound(); setSkipped(true); setSimRunning(false); navigate('home'); setToast({ key: 'simulationSkipped' }) }}><Icon icon={X} />{t('skipAction')}</button></div>{soundBlocked && <button className="text-button" onClick={replaySound}>{t('soundAction')}</button>}</div>}
          {page === 'insights' && <>
            <div className="page-intro"><h1>{t('insightsTitle')}</h1></div>
            <div className="segmented period-tabs" role="tablist" aria-label={t('insightsPeriod')}>{(['Week', 'Month', 'All Time'] as const).map(p => <button role="tab" aria-selected={period === p} className={period === p ? 'selected' : ''} key={p} onClick={() => setPeriod(p)}>{t(p === 'Week' ? 'week' : p === 'Month' ? 'month' : 'allTime')}</button>)}</div>
            <section className="chart-card card"><h2>{t('chartTitle', { value: records.length })}</h2><BedtimeChart records={records} target={settings.bedtime} period={period} /><p className="chart-caption">{t('chartLegend')}</p></section>
            <div className="metric-grid"><div className="metric-card card"><Icon icon={Target} /><div><h2>{t('consistency')}</h2><b>{metrics.consistency}%</b></div></div><div className="metric-card card"><Icon icon={Smartphone} /><div><h2>{t('latePhone')}</h2><b>{metrics.phone} <small>{t('perNight')}</small></b></div></div></div>
            <section className="recommendations card"><h2><Icon icon={Lightbulb} />{t('recommendations')}</h2><button onClick={() => navigate('setup')}><Icon icon={Moon} /><span>{t(metrics.consistency < 90 ? 'earlierRecommendation' : 'regularRecommendation')}</span><Icon icon={ChevronRight} /></button><button onClick={() => navigate('wind')}><Icon icon={Bell} /><span>{t('phoneRecommendation', { value: settings.phoneGoal })}</span><Icon icon={ChevronRight} /></button></section>
          </>}
          {page === 'me' && <>
            <div className="page-intro"><h1>{t('me')}</h1><p>{t('meIntro')}</p></div>
            <section className="profile-card card"><div className="avatar"><Icon icon={UserRound} /></div><div><h2>{settings.name}</h2><p>{t('profileTagline')}</p></div><span className="profile-moon"><Icon icon={Moon} /></span></section>
            <section className="appearance"><h2 className="section-heading">{t('appearance')}</h2><p>{t('appearanceIntro')}</p><div className="segmented theme-tabs" role="group" aria-label={t('appearance')}>{([{ value: 'light', icon: Sun }, { value: 'dark', icon: Moon }, { value: 'contrast', icon: Target }] as const).map(option => <button aria-pressed={theme === option.value} className={theme === option.value ? 'selected' : ''} onClick={() => setTheme(option.value)} key={option.value}><Icon icon={option.icon} /><span>{t(option.value)}</span></button>)}</div></section>
            <h2 className="section-heading">{t('personalPreferences')}</h2><section className="profile-preferences card"><label><span>{t('displayName')}</span><input aria-label={t('displayName')} maxLength={30} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label><span>{t('phoneGoal')}</span><select aria-label={t('phoneGoal')} value={draft.phoneGoal} onChange={e => setDraft({ ...draft, phoneGoal: Number(e.target.value) })}>{[15, 30, 45, 60].map(n => <option key={n} value={n}>{t('minutes', { value: n })}</option>)}</select></label><button onClick={() => navigate('setup')}><span>{t('sleepPlan')}</span><span>{time(settings.bedtime)}<Icon icon={ChevronRight} /></span></button></section>
            <button className="primary-button profile-save" onClick={() => { const saved = persist({ ...settings, name: draft.name.trim() || 'Alex', phoneGoal: draft.phoneGoal }); if (saved) setToast({ key: 'preferencesSaved' }) }}>{t('savePreferences')}</button>
            <div className="developer-section"><button className="developer-button" onClick={() => setModal('simulation')}><Icon icon={Bell} /><span>{t('testReminder')}</span><Icon icon={ChevronRight} /></button><button className="developer-button" onClick={() => setModal('help')}><Icon icon={CircleHelp} /><span>{t('about')}</span><Icon icon={ChevronRight} /></button></div>
          </>}
        </main>
        {navVisible && <nav className="bottom-nav" aria-label={t('navigation')}>{([{ page: 'home', icon: Home }, { page: 'wind', icon: Moon }, { page: 'insights', icon: BarChart3 }, { page: 'me', icon: UserRound }] as const).map(n => <button key={n.page} aria-current={page === n.page ? 'page' : undefined} className={page === n.page ? 'active' : ''} onClick={() => navigate(n.page)}><Icon icon={n.icon} /><span>{t(n.page)}</span></button>)}</nav>}
        <div className="home-indicator"><span /></div>
        {toast && <div className="toast" role="status"><Check size={18} /><span>{message(toast)}</span></div>}
        {modal === 'apps' && <Modal title={t('lockApps')} onClose={closeModal}><p className="modal-description">{t('appsDescription')}</p><div className="app-choices">{['Instagram', 'TikTok', 'YouTube', 'Games'].map(app => <label key={app}><span><Icon icon={LockKeyhole} />{appName(app)}</span><input type="checkbox" checked={draft.apps.includes(app)} onChange={() => setDraft({ ...draft, apps: draft.apps.includes(app) ? draft.apps.filter(a => a !== app) : [...draft.apps, app] })} /></label>)}</div><button className="primary-button" onClick={closeModal}>{t('done')}</button><p className="small-copy text-center">{t('applyChoices')}</p></Modal>}
        {modal === 'simulation' && <Modal title={t('testReminder')} onClose={closeModal}><p className="modal-description">{t(settings.reminderMinutes ? 'simulationBefore' : 'simulationAt', { value: settings.reminderMinutes, time: time(settings.bedtime) })}</p><label className="simulation-time"><span>{t('simulatedTime')}</span><input type="time" aria-label={t('simulatedTime')} value={simTime} onChange={e => { setSimRunning(false); setSimTime(e.target.value) }} /></label><div className="simulation-phone"><span>{t('phoneInUse')}</span><Toggle label={t('phoneInUse')} checked={phoneActive} onChange={() => { setSimRunning(false); setPhoneActive(!phoneActive) }} /></div><p className="simulation-status" role="status">{message(simulationStatus)}</p><button className="primary-button" onClick={runSimulation}>{t('checkReminder')}</button><button className="secondary-button advance-button" onClick={() => { const next = clock(minutes(simTime) + 10); setSimTime(next); setSimRunning(true); setSimulationStatus({ key: 'simulationAdvanced', time: next }) }}>{t('advance')}</button><button className="text-button w-full" onClick={() => { setSkipped(false); setSnooze(null); setSimRunning(false); setSimTime(clock(minutes(settings.bedtime) + 7)); setSimulationStatus({ key: 'simulationReset' }); setActive(false); setSessionEnd(null) }}>{t('resetSimulation')}</button></Modal>}
        {modal === 'help' && <Modal title={t('helpTitle')} onClose={closeModal}><p className="modal-description">{t('helpIntro')}</p><p className="modal-description">{t('helpMetrics')}</p><button className="primary-button" onClick={closeModal}>{t('gotIt')}</button></Modal>}
        {liveReminder.reminder && <Modal title={t('reminderTitle')} onClose={skipLiveReminder}><div className="live-reminder"><div className="sleep-emblem" aria-hidden="true"><Moon /><span>z<sup>z</sup></span></div><p>{t('reminderBody', { time: time(liveReminder.reminder.bedtime) })}</p><div className="intervention-actions"><button className="primary-button" onClick={startWindDown}><Icon icon={Play} />{t('ready')}</button><button className="secondary-button" onClick={() => { stopReminderSound(); const until = new Date(liveReminder.snooze()); setToast({ key: 'snoozed', time: clock(until.getHours() * 60 + until.getMinutes()) }) }}><Icon icon={AlarmClock} />{t('snoozeAction')}</button><button className="secondary-button" onClick={skipLiveReminder}><Icon icon={X} />{t('skipAction')}</button></div>{soundBlocked && <><p className="small-copy">{t('soundHint')}</p><button className="text-button" onClick={replaySound}>{t('soundAction')}</button></>}</div></Modal>}
      </div>
    </div>
  </div>
}

function BedtimeChart({ records, target, period }: { records: ReturnType<typeof sleepRecords>; target: string; period: string }) {
  const { t, time } = useLanguage()
  const goal = nightMinute(minutes(target))
  const min = Math.floor(Math.min(1350, goal - 30, ...records.map(r => r.bedtime)) / 30) * 30
  const max = Math.ceil(Math.max(1470, goal + 30, ...records.map(r => r.bedtime)) / 30) * 30
  const y = (v: number) => 143 - (v - min) / (max - min) * 120
  const groups = period === 'Week' ? records.map(r => [r]) : Array.from({ length: period === 'Month' ? 4 : 6 }, (_, i) => {
    const size = period === 'Month' ? 7 : 14
    return records.slice(i * size, (i + 1) * size)
  })
  const points = groups.map((group, i) => ({ x: 82 + i * 224 / (groups.length - 1), y: y(group.reduce((s, r) => s + r.bedtime, 0) / group.length) }))
  const line = points.map(p => `${p.x},${p.y}`).join(' ')
  const labels = period === 'Week' ? (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(key => t(key)) : period === 'Month' ? [1, 2, 3, 4].map(value => t('chartWeek', { value })) : ['1–14', '15–28', '29–42', '43–56', '57–70', '71–84']
  return <svg className="bedtime-chart" viewBox="0 0 326 171" role="img" aria-label={t('chartLabel', { days: records.length, value: stats(records, target).consistency })}>
    <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".2" /><stop offset="100%" stopColor="var(--accent)" stopOpacity=".02" /></linearGradient></defs>
    {Array.from({ length: 5 }, (_, i) => min + (max - min) * i / 4).map(v => <g key={v}><line x1="68" x2="319" y1={y(v)} y2={y(v)} className="chart-grid" /><text x="3" y={y(v) + 4} className="axis-text">{time(clock(Math.round(v)))}</text></g>)}
    <polygon points={`${points[0].x},143 ${line} ${points[points.length - 1].x},143`} fill="url(#chart-fill)" />
    <line x1="68" x2="319" y1={y(goal)} y2={y(goal)} className="goal-line" />
    <polyline points={line} fill="none" className="chart-line" />
    {points.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r="4.6" className="chart-dot" /><text x={p.x} y="164" textAnchor="middle" className="axis-text">{labels[i]}</text></g>)}
  </svg>
}
