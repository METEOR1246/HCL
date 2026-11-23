import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const en = {
  greeting: 'Good Evening!', intro: 'Let’s get ready for a restful night.',
  bedtime: 'Tonight’s Bedtime Goal', phoneUse: 'Phone Use', beforeSleep: 'Before Sleep',
  minutes: '{value} min', goal: '(Goal: ≤ {value} min)', ofGoal: 'of goal',
  ring: '{value}% of phone use goal', reminderOn: 'Bedtime reminder is on',
  reminderOff: 'Bedtime reminder is off', nextReminder: 'Next reminder',
  tonight: 'Tonight', today: 'Today', tomorrow: 'Tomorrow',
  ready: 'Ready to Put It Down', started: 'Wind-down started',
  confirmation: 'You’ve confirmed your wind-down routine. Take a moment for yourself.',
  undo: 'Undo Confirmation', end: 'End Wind-Down', completed: 'Wind-down completed',
  reset: 'Return to bedtime reminder', home: 'Home', wind: 'Wind-Down',
  insights: 'Insights', me: 'Me', navigation: 'Main navigation',
  switchLanguage: 'Switch to Simplified Chinese', quieted: 'Notifications quieted',
  unchanged: 'Notifications unchanged', grayscale: 'Grayscale preview on',
  color: 'Color preview on', locked: '{apps} simulated as locked.',
  noApps: 'No apps selected for simulated locking.',
  skipped: 'Reminder skipped for tonight', snoozed: 'Reminder snoozed until {time}',
  reminderTitle: 'Time to Wind Down',
  reminderBody: 'Your bedtime goal is {time}. Let’s wind down and get ready for sleep.',
  snoozeAction: 'Snooze 10 min', skipAction: 'Skip Tonight',
  soundHint: 'Tap below to enable the reminder sound in this browser.',
  soundAction: 'Enable & Play Reminder Sound', close: 'Close dialog',
  saveError: 'Settings applied, but this browser could not save them.',
  planSaved: 'Your sleep plan is ready.', windSaved: 'Wind-down preferences saved.',
  preferencesSaved: 'Personal preferences saved.', simulationSkipped: 'Reminder skipped for this simulated night.',
  back: 'Back to Home', setupTitle: 'Set Up Your Sleep Plan',
  setupIntro: 'Let’s create a plan to help you wind down, sleep on time, and wake up refreshed.',
  targetBedtime: 'Target Bedtime', wakeTime: 'Wake-Up Time',
  duration: 'Nightly Wind-Down Duration', updatePlan: 'Update My Plan',
  createPlan: 'Create My Plan', chooseTimes: 'Please choose both times.',
  windTitle: 'Wind-Down Plan',
  windIntro: 'Set up your wind-down preferences for a smoother transition to sleep.',
  bedtimeReminder: 'Bedtime Reminder', reminderDescription: 'Get a reminder before your target bedtime.',
  reminderTime: 'Reminder Time', minutesBefore: '{value} min before', atBedtime: 'At bedtime',
  reduceNotifications: 'Reduce Notifications',
  notificationsDescription: 'Silence non-essential notifications during wind-down.',
  grayscaleMode: 'Grayscale Mode', grayscaleDescription: 'Switch your screen to grayscale during wind-down.',
  lockApps: 'Lock Distracting Apps', lockDescription: 'Limit access to selected apps during wind-down.',
  prototypeNote: 'Quiet mode, grayscale, and app locks are simulated.', saveChanges: 'Save Changes',
  interventionTitle: 'It’s Bedtime!', startWind: 'Start Wind-Down',
  interventionBefore: 'You’re still using your phone before your target bedtime ({time}). It’s a good time to wind down and get ready for sleep.',
  interventionAfter: 'You’re still using your phone after your target bedtime ({time}). It’s a good time to wind down and get ready for sleep.',
  insightsTitle: 'Sleep Insights', insightsPeriod: 'Insights period',
  week: 'Week', month: 'Month', allTime: 'All Time',
  chartTitle: 'Bedtime (Past {value} Days)', chartLegend: 'Dashed line: your bedtime goal',
  consistency: 'Bedtime Consistency', latePhone: 'Late-Night Phone Use', perNight: 'min / night',
  recommendations: 'Recommendations',
  earlierRecommendation: 'Go to bed 10–15 min earlier to improve your consistency.',
  regularRecommendation: 'Keep your regular bedtime to maintain your consistency.',
  phoneRecommendation: 'Keep late-night phone use under {value} min for better sleep.',
  chartLabel: 'Bedtime over {days} days. Consistency {value} percent.',
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
  chartWeek: 'Wk {value}',
  meIntro: 'Your space for better sleep.', profileTagline: 'A little calmer, every evening.',
  appearance: 'Appearance', appearanceIntro: 'Make yourself comfortable.',
  light: 'Light', dark: 'Dark', contrast: 'High Contrast',
  personalPreferences: 'Personal Preferences', displayName: 'Display name', phoneGoal: 'Phone use goal',
  sleepPlan: 'Sleep plan', savePreferences: 'Save Preferences',
  testReminder: 'Test Bedtime Reminder', about: 'About this prototype',
  appsDescription: 'Choose the apps to pause during your wind-down. This is a visual simulation.',
  games: 'Games', done: 'Done', applyChoices: 'Apply your choices with Save Changes.',
  simulationBefore: 'Try a simulated evening. Your reminder starts {value} min before {time} when your phone is active.',
  simulationAt: 'Try a simulated evening. Your reminder starts at {time} when your phone is active.',
  simulatedTime: 'Simulated time', phoneInUse: 'Phone in use', checkReminder: 'Check Reminder',
  advance: 'Advance 10 min', resetSimulation: 'Reset Simulated Night',
  simulationInitial: 'Choose a time to test your bedtime reminder.',
  simulationTriggered: 'Reminder triggered. Your phone is still active.',
  simulationSkipStatus: 'Reminders are skipped for this simulated night.',
  simulationOff: 'Bedtime Reminder is off. Enable it in Wind-Down.',
  simulationInactive: 'No reminder: your phone is not in use.',
  simulationSnoozed: 'Snoozed until {time}. Advance the time to test again.',
  simulationNotDue: 'No reminder at this time. Try a time near your bedtime.',
  simulationAdvanced: 'Advanced to {time}.', simulationReset: 'A new simulated night is ready.',
  helpTitle: 'A calmer night',
  helpIntro: 'Smart Sleep Companion helps you build a gentle evening routine. Phone activity and sleep history use mock data; app locks, quiet notifications, and grayscale are visual previews.',
  helpMetrics: 'Consistency is 100 minus the average bedtime deviation in minutes divided by 1.6 (rounded, minimum 0). Phone use is the nightly average for the selected period. Your settings and appearance are saved on this device.',
  gotIt: 'Got It',
}
type Key = keyof typeof en
const zh: Record<Key, string> = {
  greeting: '晚上好！', intro: '让我们为今晚的休息做好准备。',
  bedtime: '今晚的计划睡觉时间', phoneUse: '睡前手机', beforeSleep: '使用时长',
  minutes: '{value} 分钟', goal: '（目标：≤ {value} 分钟）', ofGoal: '目标比例',
  ring: '手机使用目标的 {value}%', reminderOn: '睡前提醒已开启', reminderOff: '睡前提醒已关闭',
  nextReminder: '下一次提醒', tonight: '今晚', today: '今天', tomorrow: '明天',
  ready: '准备放下了', started: '已开始睡前准备',
  confirmation: '你已确认开始睡前准备。给自己一点放松的时间。',
  undo: '撤销确认', end: '结束睡前准备', completed: '睡前准备已结束',
  reset: '返回睡前提醒', home: '首页', wind: '睡前准备', insights: '数据分析', me: '我的',
  navigation: '主导航', switchLanguage: '切换为英语',
  quieted: '通知静音预览已开启', unchanged: '通知保持不变',
  grayscale: '灰度预览已开启', color: '彩色预览已开启',
  locked: '已模拟锁定：{apps}。', noApps: '未选择要模拟锁定的应用。',
  skipped: '今晚已跳过提醒', snoozed: '提醒已推迟至 {time}',
  reminderTitle: '该开始睡前准备了',
  reminderBody: '你的计划睡觉时间是 {time}。让我们放松下来，为休息做好准备。',
  snoozeAction: '推迟 10 分钟', skipAction: '今晚跳过',
  soundHint: '点击下方按钮，开启此浏览器的提醒声音。',
  soundAction: '开启并播放提醒声音', close: '关闭对话框',
  saveError: '设置已应用，但此浏览器无法保存。',
  planSaved: '睡眠计划已保存。', windSaved: '睡前准备偏好已保存。',
  preferencesSaved: '个人偏好已保存。', simulationSkipped: '已跳过本次模拟夜晚的提醒。',
  back: '返回首页', setupTitle: '设置睡眠计划',
  setupIntro: '制定计划，帮助你放松下来、按时休息，并在醒来时精神焕发。',
  targetBedtime: '计划睡觉时间', wakeTime: '起床时间', duration: '每晚睡前准备时长',
  updatePlan: '更新我的计划', createPlan: '创建我的计划', chooseTimes: '请选择睡觉和起床时间。',
  windTitle: '睡前准备计划', windIntro: '设置睡前准备偏好，让你更轻松地进入休息状态。',
  bedtimeReminder: '睡前提醒', reminderDescription: '在计划睡觉时间之前收到提醒。',
  reminderTime: '提醒时间', minutesBefore: '提前 {value} 分钟', atBedtime: '在计划睡觉时间',
  reduceNotifications: '减少通知', notificationsDescription: '在睡前准备期间将非必要通知静音。',
  grayscaleMode: '灰度模式', grayscaleDescription: '在睡前准备期间将屏幕切换为灰度。',
  lockApps: '锁定易分心的应用', lockDescription: '在睡前准备期间限制使用选定的应用。',
  prototypeNote: '静音、灰度和应用锁定均为模拟效果。', saveChanges: '保存更改',
  interventionTitle: '该休息了！', startWind: '开始睡前准备',
  interventionBefore: '你仍在计划睡觉时间（{time}）之前使用手机。现在适合放松下来，为休息做好准备。',
  interventionAfter: '已过计划睡觉时间（{time}），你仍在使用手机。现在适合放松下来，为休息做好准备。',
  insightsTitle: '睡眠数据分析', insightsPeriod: '分析时间范围',
  week: '本周', month: '本月', allTime: '全部',
  chartTitle: '睡觉时间（过去 {value} 天）', chartLegend: '虚线：计划睡觉时间',
  consistency: '睡觉时间规律性', latePhone: '夜间手机使用', perNight: '分钟／晚',
  recommendations: '建议', earlierRecommendation: '提前 10–15 分钟休息，让睡觉时间更规律。',
  regularRecommendation: '保持固定的睡觉时间，维持良好的规律性。',
  phoneRecommendation: '将夜间手机使用控制在 {value} 分钟以内，有助于更好地休息。',
  chartLabel: '过去 {days} 天的睡觉时间，规律性为 {value}%。',
  mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日',
  chartWeek: '第 {value} 周',
  meIntro: '为更好的休息，留一片自己的空间。', profileTagline: '让每个夜晚更从容。',
  appearance: '外观', appearanceIntro: '选择让你舒适的显示方式。',
  light: '浅色', dark: '深色', contrast: '高对比度',
  personalPreferences: '个人偏好', displayName: '显示名称', phoneGoal: '手机使用目标',
  sleepPlan: '睡眠计划', savePreferences: '保存偏好',
  testReminder: '测试睡前提醒', about: '关于此原型',
  appsDescription: '选择睡前准备期间暂停使用的应用。这是视觉模拟。',
  games: '游戏', done: '完成', applyChoices: '点击“保存更改”以应用所选设置。',
  simulationBefore: '模拟一个夜晚：当你仍在使用手机时，提醒会在 {time} 前 {value} 分钟触发。',
  simulationAt: '模拟一个夜晚：当你仍在使用手机时，提醒会在 {time} 触发。',
  simulatedTime: '模拟时间', phoneInUse: '正在使用手机', checkReminder: '检查提醒',
  advance: '前进 10 分钟', resetSimulation: '重置模拟夜晚',
  simulationInitial: '选择一个时间，测试睡前提醒。',
  simulationTriggered: '提醒已触发，你仍在使用手机。',
  simulationSkipStatus: '本次模拟夜晚已跳过提醒。',
  simulationOff: '睡前提醒已关闭，请在“睡前准备”中开启。',
  simulationInactive: '未触发提醒：你没有在使用手机。',
  simulationSnoozed: '提醒已推迟至 {time}，请前进时间后再次测试。',
  simulationNotDue: '此时没有提醒，请尝试接近计划睡觉时间的时刻。',
  simulationAdvanced: '已前进至 {time}。', simulationReset: '新的模拟夜晚已准备就绪。',
  helpTitle: '更从容的夜晚',
  helpIntro: 'Smart Sleep Companion 帮助你建立轻松的睡前习惯。手机活动和睡眠历史使用模拟数据；应用锁定、通知静音和灰度均为视觉预览。',
  helpMetrics: '规律性计算方式：100 减去平均睡觉时间偏差（分钟）除以 1.6，四舍五入，最低为 0。手机使用时长为所选时间范围内的每晚平均值。设置与外观保存在此设备上。',
  gotIt: '知道了',
}
export const translations = { en, 'zh-CN': zh }
export type TranslationKey = Key
export type Message = { key: Key; values?: Record<string, string | number>; time?: string }
const LanguageContext = createContext<ReturnType<typeof useLanguageState> | null>(null)
function useLanguageState() {
  const [language, setLanguage] = useState<'en' | 'zh-CN'>(() => {
    try { return localStorage.getItem('sleep-language') === 'zh-CN' ? 'zh-CN' : 'en' }
    catch { return 'en' }
  })
  useEffect(() => {
    document.documentElement.lang = language
    document.title = 'Smart Sleep Companion'
    try { localStorage.setItem('sleep-language', language) } catch { /* Use in-memory selection. */ }
  }, [language])
  function t(key: Key, values: Record<string, string | number> = {}) {
    return translations[language][key].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''))
  }
  function time(value: string | Date) {
    const date = value instanceof Date ? value : new Date(2000, 0, 1, ...value.split(':').map(Number) as [number, number])
    return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit', hour12: language === 'en' }).format(date)
  }
  function reminderDate(date: Date) {
    const now = new Date(), tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const day = date.toDateString() === now.toDateString()
      ? t(date.getHours() >= 18 ? 'tonight' : 'today')
      : date.toDateString() === tomorrow.toDateString() ? t('tomorrow')
        : new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(date)
    return `${day} ${time(date)}`
  }
  function message(value: Message) {
    return t(value.key, { ...value.values, ...(value.time ? { time: time(value.time) } : {}) })
  }
  function appName(value: string) { return value === 'Games' ? t('games') : value }
  return { language, setLanguage, t, time, reminderDate, message, appName }
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const value = useLanguageState()
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage requires LanguageProvider')
  return value
}
