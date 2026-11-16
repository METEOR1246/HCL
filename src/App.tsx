import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlarmClock, ArrowLeft, BarChart3, BedDouble, Bell, BellOff, Check, ChevronRight, CircleHelp, Home, Lightbulb, LockKeyhole, Moon, Play, Settings2, ShieldCheck, Signal, Smartphone, Sun, Target, UserRound, Wifi, X, type LucideIcon } from 'lucide-react'
import { useTheme } from './ThemeContext'
import { clock, formatTime, loadSettings, minutes, nightMinute, phoneUse, reminderDue, sleepRecords, stats, type Page, type Settings } from './model'
import { useBedtimeReminder } from './useBedtimeReminder'
import { enableAndPlayReminderSound, playReminderSound, stopReminderSound, unlockReminderSound } from './reminderSound'

function Icon({ icon: Component, className = '' }: { icon: LucideIcon; className?: string }) {
  return <Component className={`icon ${className}`} aria-hidden="true" strokeWidth={1.8} />
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <button className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-label={label} aria-checked={checked} onClick={onChange}><span /></button>
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
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
      <div className="flex items-center justify-between gap-3"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon icon={X} /></button></div>
      {children}
    </div>
  </div>
}
export default function App() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState(loadSettings)
  const [draft, setDraft] = useState(settings)
  const [page, setPage] = useState<Page>(settings.created ? 'home' : 'setup')
  const [period, setPeriod] = useState<'Week' | 'Month' | 'All Time'>('Week')
  const [modal, setModal] = useState<'apps' | 'simulation' | 'help' | null>(null)
  const [toast, setToast] = useState('')
  const [active, setActive] = useState(false)
  const [sessionEnd, setSessionEnd] = useState<number | null>(null)
  const [tick, setTick] = useState(Date.now())
  const [simTime, setSimTime] = useState(clock(minutes(settings.bedtime) + 7))
  const [phoneActive, setPhoneActive] = useState(true)
  const [simRunning, setSimRunning] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [snooze, setSnooze] = useState<number | null>(null)
  const [simulationStatus, setSimulationStatus] = useState('Choose a time to test your bedtime reminder.')
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
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3500); return () => clearTimeout(id) }, [toast])
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  useEffect(() => {
    if (active && sessionEnd && tick >= sessionEnd) { setActive(false); setSessionEnd(null); setToast('Wind-down complete. Sleep well!') }
  }, [tick, active, sessionEnd])
  useEffect(() => {
    if (simRunning && !active && reminderDue(minutes(simTime), settings, phoneActive, skipped, snooze)) {
      setModal(null); setPage('intervention'); setSimulationStatus('Reminder triggered. Your phone is still active.')
    }
  }, [simTime, simRunning, phoneActive, settings, skipped, snooze, active])
  function navigate(next: Page) {
    if (next === 'wind' || next === 'setup' || next === 'me') setDraft(settings)
    setPage(next)
  }
  function persist(value: Settings) {
    setSettings(value); setDraft(value)
    try { localStorage.setItem('sleep-settings', JSON.stringify(value)); return true }
    catch { setToast('Settings applied, but this browser could not save them.'); return false }
  }
  function startWindDown() {
    stopReminderSound(); liveReminder.dismiss()
    setActive(true); setSessionEnd(Date.now() + settings.duration * 60000); setTick(Date.now())
    setSimRunning(false); setModal(null); navigate('home'); setToast('Your wind-down has started. Take a moment for yourself.')
  }
  function runSimulation() {
    setSimRunning(true)
    if (reminderDue(minutes(simTime), settings, phoneActive, skipped, snooze)) { setModal(null); setPage('intervention') }
    else setSimulationStatus(skipped ? 'Reminders are skipped for this simulated night.' : !settings.reminder ? 'Bedtime Reminder is off. Enable it in Wind-Down.' : !phoneActive ? 'No reminder: your phone is not in use.' : snooze !== null && nightMinute(minutes(simTime)) < snooze ? `Snoozed until ${formatTime(clock(snooze))}. Advance the time to test again.` : 'No reminder at this time. Try a time near your bedtime.')
  }
  const records = sleepRecords(period === 'Week' ? 7 : period === 'Month' ? 28 : 84)
  const metrics = stats(records, settings.bedtime)
  const progress = Math.min(100, Math.floor(settings.phoneGoal / phoneUse * 100))
  const remaining = sessionEnd ? Math.max(0, Math.ceil((sessionEnd - tick) / 60000)) : settings.duration
  const backVisible = page === 'setup' || page === 'wind'
  const navVisible = page !== 'setup' && page !== 'intervention'
  const closeModal = useCallback(() => setModal(null), [])
  const skipLiveReminder = useCallback(() => {
    stopReminderSound(); liveReminder.dismiss(); setToast('Bedtime reminder skipped for tonight.')
  }, [liveReminder.dismiss])
  async function replaySound() {
    setSoundBlocked(!await enableAndPlayReminderSound())
  }
  return <div className="app-stage">
    <div className="phone-shell">
      <div className="phone-screen">
        <div className="status-bar"><span>{page === 'intervention' ? formatTime(simTime).split(' ')[0] : '9:41'}</span><div className="notch" /><span className="status-icons"><Signal size={16} fill="currentColor" /><Wifi size={16} /><span className="battery" /></span></div>
        <header className="app-header">
          {backVisible && <button className="icon-button header-left" aria-label="Back to Home" onClick={() => navigate('home')}><Icon icon={ArrowLeft} /></button>}
          <span>Smart Sleep Companion</span>
          {page === 'home' && <button className="icon-button header-right" aria-label="Test bedtime reminder" onClick={() => setModal('simulation')}><Icon icon={Bell} /></button>}
        </header>
        <main ref={mainRef} className={`page-content page-${page}`}>
          {page === 'setup' && <>
            <div className="page-intro"><h1>Set Up Your Sleep Plan</h1><p>Let’s create a plan to help you wind down, sleep on time, and wake up refreshed.</p></div>
            <div className="setup-fields">
              <label className="setup-row"><Icon icon={BedDouble} /><span>Target Bedtime</span><input aria-label="Target Bedtime" type="time" value={draft.bedtime} onChange={e => setDraft({ ...draft, bedtime: e.target.value })} required /></label>
              <label className="setup-row"><Icon icon={Sun} /><span>Wake-Up Time</span><input aria-label="Wake-Up Time" type="time" value={draft.wake} onChange={e => setDraft({ ...draft, wake: e.target.value })} required /></label>
              <label className="setup-row"><Icon icon={Moon} /><span>Nightly Wind-Down<br />Duration</span><select aria-label="Nightly Wind-Down Duration" value={draft.duration} onChange={e => setDraft({ ...draft, duration: Number(e.target.value) })}>{[15, 30, 45, 60].map(n => <option key={n} value={n}>{n} min</option>)}</select></label>
            </div>
            <div className="bottom-action"><button className="primary-button" onClick={() => { if (!draft.bedtime || !draft.wake) { setToast('Please choose both times.'); return } const saved = persist({ ...draft, created: true }); navigate('home'); if (saved) setToast('Your sleep plan is ready.') }}>{settings.created ? 'Update My Plan' : 'Create My Plan'}</button></div>
          </>}
          {page === 'home' && <>
            <div className="page-intro"><h1>Good Evening!</h1><p>Let’s get ready for a restful night.</p></div>
            <button className="bedtime-card card" onClick={() => navigate('setup')}><span className="icon-disc"><Icon icon={BedDouble} /></span><span><strong>Tonight’s Bedtime Goal</strong><b>{formatTime(settings.bedtime)}</b></span><Icon icon={ChevronRight} /></button>
            <div className="usage-card card"><div><h2>Phone Use<br />Before Sleep</h2><b className="big-number">{phoneUse} min</b><p>(Goal: ≤ {settings.phoneGoal} min)</p></div><div className="progress-ring" style={{ '--progress': `${progress}%` } as React.CSSProperties} role="img" aria-label={`${progress}% of phone use goal`}><div><b>{progress}%</b><span>of goal</span></div></div></div>
            <h2 className="section-heading">Quick Actions</h2>
            <div className="quick-actions">
              <button onClick={startWindDown}><Icon icon={Moon} /><span>Start<br />Wind-Down</span></button>
              <button onClick={() => navigate('wind')}><Icon icon={Settings2} /><span>Plan<br />Settings</span></button>
              <button onClick={() => navigate('insights')}><Icon icon={BarChart3} /><span>Sleep<br />Insights</span></button>
            </div>
            {active && <section className="session-card card"><div className="flex items-center gap-2"><Icon icon={Moon} /><h2>Wind-down in progress</h2><span className="session-time">{remaining} min</span></div><p>A quieter space, just for you.</p><div className={`simulation-preview ${settings.grayscale ? 'is-grayscale' : ''}`}><Smartphone size={20} /><span>{settings.notifications ? 'Notifications quieted' : 'Notifications unchanged'}<br />{settings.grayscale ? 'Grayscale preview on' : 'Color preview on'}</span><ShieldCheck size={20} /></div><p className="small-copy">{settings.apps.length ? `${settings.apps.join(', ')} simulated as locked.` : 'No apps selected for simulated locking.'}</p><button className="text-button" onClick={() => { setActive(false); setSessionEnd(null); setToast('Wind-down ended.') }}>End Wind-Down</button></section>}
            {(snooze !== null || skipped) && <p className="status-note"><Icon icon={AlarmClock} />{skipped ? 'Reminder skipped for tonight' : `Reminder snoozed until ${formatTime(clock(snooze!))}`}</p>}
          </>}
          {page === 'wind' && <>
            <div className="page-intro"><h1>Wind-Down Plan</h1><p>Set up your wind-down preferences for a smoother transition to sleep.</p></div>
            <div className="preferences">
              <section className="preference-card card"><div className="preference-row"><Icon icon={Bell} /><div><h2>Bedtime Reminder</h2><p>Get a reminder before your target bedtime.</p></div><Toggle label="Bedtime Reminder" checked={draft.reminder} onChange={() => setDraft({ ...draft, reminder: !draft.reminder })} /></div><label className={`reminder-time ${!draft.reminder ? 'disabled' : ''}`}><span>Reminder Time</span><select aria-label="Reminder Time" disabled={!draft.reminder} value={draft.reminderMinutes} onChange={e => setDraft({ ...draft, reminderMinutes: Number(e.target.value) })}>{[0, 10, 15, 30, 60].map(n => <option key={n} value={n}>{n ? `${n} min before` : 'At bedtime'}</option>)}</select></label></section>
              <section className="preference-card card"><div className="preference-row"><Icon icon={BellOff} /><div><h2>Reduce Notifications</h2><p>Silence non-essential notifications during wind-down.</p></div><Toggle label="Reduce Notifications" checked={draft.notifications} onChange={() => setDraft({ ...draft, notifications: !draft.notifications })} /></div></section>
              <section className="preference-card card"><div className="preference-row"><Icon icon={Smartphone} /><div><h2>Grayscale Mode</h2><p>Switch your screen to grayscale during wind-down.</p></div><Toggle label="Grayscale Mode" checked={draft.grayscale} onChange={() => setDraft({ ...draft, grayscale: !draft.grayscale })} /></div></section>
              <button className="preference-card card preference-row" onClick={() => setModal('apps')}><span className="apps-icon"><span /><span /><span /><span /></span><div><h2>Lock Distracting Apps</h2><p>Limit access to selected apps during wind-down.</p></div><Icon icon={ChevronRight} /></button>
            </div>
            <p className="prototype-note">Quiet mode, grayscale, and app locks are simulated.</p>
            <div className="bottom-action"><button className="primary-button" onClick={() => { const saved = persist(draft); navigate('home'); if (saved) setToast('Wind-down preferences saved.') }}>Save Changes</button></div>
          </>}
          {page === 'intervention' && <div className="intervention-content"><div className="sleep-emblem"><Moon /><span>z<sup>z</sup></span></div><h1>{nightMinute(minutes(simTime)) >= nightMinute(minutes(settings.bedtime)) ? 'It’s Bedtime!' : 'Time to Wind Down'}</h1><p>You’re still using your phone {nightMinute(minutes(simTime)) >= nightMinute(minutes(settings.bedtime)) ? 'after' : 'before'} your target bedtime ({formatTime(settings.bedtime)}).<br />It’s a good time to wind down and get ready for sleep.</p><div className="intervention-actions"><button className="primary-button" onClick={startWindDown}><Icon icon={Play} />Start Wind-Down</button><button className="secondary-button" onClick={() => { stopReminderSound(); const until = nightMinute(minutes(simTime)) + 10; setSnooze(until); navigate('home'); setToast(`Reminder snoozed until ${formatTime(clock(until))}.`) }}><Icon icon={AlarmClock} />Snooze 10 min</button><button className="secondary-button" onClick={() => { stopReminderSound(); setSkipped(true); setSimRunning(false); navigate('home'); setToast('Reminder skipped for this simulated night.') }}><Icon icon={X} />Skip Tonight</button></div>{soundBlocked && <button className="text-button" onClick={replaySound}>Enable &amp; Play Reminder Sound</button>}</div>}
          {page === 'insights' && <>
            <div className="page-intro"><h1>Sleep Insights</h1></div>
            <div className="segmented period-tabs" role="tablist" aria-label="Insights period">{(['Week', 'Month', 'All Time'] as const).map(p => <button role="tab" aria-selected={period === p} className={period === p ? 'selected' : ''} key={p} onClick={() => setPeriod(p)}>{p}</button>)}</div>
            <section className="chart-card card"><h2>Bedtime (Past {records.length} Days)</h2><BedtimeChart records={records} target={settings.bedtime} period={period} /><p className="chart-caption">Dashed line: your bedtime goal</p></section>
            <div className="metric-grid"><div className="metric-card card"><Icon icon={Target} /><div><h2>Bedtime<br />Consistency</h2><b>{metrics.consistency}%</b></div></div><div className="metric-card card"><Icon icon={Smartphone} /><div><h2>Late-Night<br />Phone Use</h2><b>{metrics.phone} <small>min / night</small></b></div></div></div>
            <section className="recommendations card"><h2><Icon icon={Lightbulb} />Recommendations</h2><button onClick={() => navigate('setup')}><Icon icon={Moon} /><span>{metrics.consistency < 90 ? 'Go to bed 10–15 min earlier to improve your consistency.' : 'Keep your regular bedtime to maintain your consistency.'}</span><Icon icon={ChevronRight} /></button><button onClick={() => navigate('wind')}><Icon icon={Bell} /><span>Keep late-night phone use under {settings.phoneGoal} min for better sleep.</span><Icon icon={ChevronRight} /></button></section>
          </>}
          {page === 'me' && <>
            <div className="page-intro"><h1>Me</h1><p>Your space for better sleep.</p></div>
            <section className="profile-card card"><div className="avatar"><Icon icon={UserRound} /></div><div><h2>{settings.name}</h2><p>A little calmer, every evening.</p></div><span className="profile-moon"><Icon icon={Moon} /></span></section>
            <section className="appearance"><h2 className="section-heading">Appearance</h2><p>Make yourself comfortable.</p><div className="segmented theme-tabs" role="group" aria-label="Appearance">{([{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'contrast', label: 'High Contrast', icon: Target }] as const).map(t => <button aria-pressed={theme === t.value} className={theme === t.value ? 'selected' : ''} onClick={() => setTheme(t.value)} key={t.value}><Icon icon={t.icon} /><span>{t.label}</span></button>)}</div></section>
            <h2 className="section-heading">Personal Preferences</h2><section className="profile-preferences card"><label><span>Display name</span><input aria-label="Display name" maxLength={30} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label><span>Phone use goal</span><select aria-label="Phone use goal" value={draft.phoneGoal} onChange={e => setDraft({ ...draft, phoneGoal: Number(e.target.value) })}>{[15, 30, 45, 60].map(n => <option key={n} value={n}>{n} min</option>)}</select></label><button onClick={() => navigate('setup')}><span>Sleep plan</span><span>{formatTime(settings.bedtime)}<Icon icon={ChevronRight} /></span></button></section>
            <button className="primary-button profile-save" onClick={() => { const saved = persist({ ...settings, name: draft.name.trim() || 'Alex', phoneGoal: draft.phoneGoal }); if (saved) setToast('Personal preferences saved.') }}>Save Preferences</button>
            <div className="developer-section"><button className="developer-button" onClick={() => setModal('simulation')}><Icon icon={Bell} /><span>Test Bedtime Reminder</span><Icon icon={ChevronRight} /></button><button className="developer-button" onClick={() => setModal('help')}><Icon icon={CircleHelp} /><span>About this prototype</span><Icon icon={ChevronRight} /></button></div>
          </>}
        </main>
        {navVisible && <nav className="bottom-nav" aria-label="Main navigation">{([{ page: 'home', label: 'Home', icon: Home }, { page: 'wind', label: 'Wind-Down', icon: Moon }, { page: 'insights', label: 'Insights', icon: BarChart3 }, { page: 'me', label: 'Me', icon: UserRound }] as const).map(n => <button key={n.page} aria-current={page === n.page ? 'page' : undefined} className={page === n.page ? 'active' : ''} onClick={() => navigate(n.page)}><Icon icon={n.icon} /><span>{n.label}</span></button>)}</nav>}
        <div className="home-indicator"><span /></div>
        {toast && <div className="toast" role="status"><Check size={18} /><span>{toast}</span></div>}
        {modal === 'apps' && <Modal title="Lock Distracting Apps" onClose={closeModal}><p className="modal-description">Choose the apps to pause during your wind-down. This is a visual simulation.</p><div className="app-choices">{['Instagram', 'TikTok', 'YouTube', 'Games'].map(app => <label key={app}><span><Icon icon={LockKeyhole} />{app}</span><input type="checkbox" checked={draft.apps.includes(app)} onChange={() => setDraft({ ...draft, apps: draft.apps.includes(app) ? draft.apps.filter(a => a !== app) : [...draft.apps, app] })} /></label>)}</div><button className="primary-button" onClick={closeModal}>Done</button><p className="small-copy text-center">Apply your choices with Save Changes.</p></Modal>}
        {modal === 'simulation' && <Modal title="Test Bedtime Reminder" onClose={closeModal}><p className="modal-description">Try a simulated evening. Your reminder starts {settings.reminderMinutes ? `${settings.reminderMinutes} min before` : 'at'} {formatTime(settings.bedtime)} when your phone is active.</p><label className="simulation-time"><span>Simulated time</span><input type="time" aria-label="Simulated time" value={simTime} onChange={e => { setSimRunning(false); setSimTime(e.target.value) }} /></label><div className="simulation-phone"><span>Phone in use</span><Toggle label="Phone in use" checked={phoneActive} onChange={() => { setSimRunning(false); setPhoneActive(!phoneActive) }} /></div><p className="simulation-status" role="status">{simulationStatus}</p><button className="primary-button" onClick={runSimulation}>Check Reminder</button><button className="secondary-button advance-button" onClick={() => { const next = clock(minutes(simTime) + 10); setSimTime(next); setSimRunning(true); setSimulationStatus(`Advanced to ${formatTime(next)}.`) }}>Advance 10 min</button><button className="text-button w-full" onClick={() => { setSkipped(false); setSnooze(null); setSimRunning(false); setSimTime(clock(minutes(settings.bedtime) + 7)); setSimulationStatus('A new simulated night is ready.'); setActive(false); setSessionEnd(null) }}>Reset Simulated Night</button></Modal>}
        {modal === 'help' && <Modal title="A calmer night" onClose={closeModal}><p className="modal-description">Smart Sleep Companion helps you build a gentle evening routine. Phone activity and sleep history use mock data; app locks, quiet notifications, and grayscale are visual previews.</p><p className="modal-description">Consistency is 100 minus the average bedtime deviation in minutes divided by 1.6 (rounded, minimum 0). Phone use is the nightly average for the selected period. Your settings and appearance are saved on this device.</p><button className="primary-button" onClick={closeModal}>Got It</button></Modal>}
        {liveReminder.reminder && <Modal title="It’s Bedtime!" onClose={skipLiveReminder}><div className="live-reminder"><div className="sleep-emblem"><Moon /><span>z<sup>z</sup></span></div><p>You’ve reached your bedtime goal ({formatTime(liveReminder.reminder.bedtime)}).<br />Let’s wind down and get ready for sleep.</p><div className="intervention-actions"><button className="primary-button" onClick={startWindDown}><Icon icon={Play} />Start Wind-Down</button><button className="secondary-button" onClick={() => { stopReminderSound(); const until = new Date(liveReminder.snooze()); setToast(`Reminder snoozed until ${formatTime(clock(until.getHours() * 60 + until.getMinutes()))}.`) }}><Icon icon={AlarmClock} />Snooze 10 min</button><button className="secondary-button" onClick={skipLiveReminder}><Icon icon={X} />Skip Tonight</button></div>{soundBlocked && <><p className="small-copy">Tap below to enable the reminder sound in this browser.</p><button className="text-button" onClick={replaySound}>Enable &amp; Play Reminder Sound</button></>}</div></Modal>}
      </div>
    </div>
  </div>
}

function BedtimeChart({ records, target, period }: { records: ReturnType<typeof sleepRecords>; target: string; period: string }) {
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
  const labels = period === 'Week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : period === 'Month' ? ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'] : ['1–14', '15–28', '29–42', '43–56', '57–70', '71–84']
  return <svg className="bedtime-chart" viewBox="0 0 326 171" role="img" aria-label={`Bedtime over ${records.length} days. Consistency ${stats(records, target).consistency} percent.`}>
    <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".2" /><stop offset="100%" stopColor="var(--accent)" stopOpacity=".02" /></linearGradient></defs>
    {Array.from({ length: 5 }, (_, i) => min + (max - min) * i / 4).map(v => <g key={v}><line x1="68" x2="319" y1={y(v)} y2={y(v)} className="chart-grid" /><text x="3" y={y(v) + 4} className="axis-text">{formatTime(clock(Math.round(v)))}</text></g>)}
    <polygon points={`${points[0].x},143 ${line} ${points[points.length - 1].x},143`} fill="url(#chart-fill)" />
    <line x1="68" x2="319" y1={y(goal)} y2={y(goal)} className="goal-line" />
    <polyline points={line} fill="none" className="chart-line" />
    {points.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r="4.6" className="chart-dot" /><text x={p.x} y="164" textAnchor="middle" className="axis-text">{labels[i]}</text></g>)}
  </svg>
}
