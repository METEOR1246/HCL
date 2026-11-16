let context: AudioContext | null = null
const tones = new Set<OscillatorNode>()

// Called inside a user gesture to satisfy browser autoplay policies.
export function unlockReminderSound() {
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') void context.resume().catch(() => {})
  } catch { /* A visual reminder remains available without Web Audio. */ }
}

export function stopReminderSound() {
  for (const tone of tones) {
    try { tone.stop() } catch { /* It may have already finished. */ }
  }
  tones.clear()
}

export function playReminderSound(): boolean {
  if (!context || context.state !== 'running') return false
  try {
    stopReminderSound()
    const start = context.currentTime
    for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
      const oscillator = context.createOscillator()
      const volume = context.createGain()
      const time = start + index * 0.32
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      volume.gain.setValueAtTime(0, time)
      volume.gain.linearRampToValueAtTime(0.12, time + 0.025)
      volume.gain.exponentialRampToValueAtTime(0.001, time + 0.5)
      oscillator.connect(volume)
      volume.connect(context.destination)
      tones.add(oscillator)
      oscillator.onended = () => { tones.delete(oscillator); oscillator.disconnect(); volume.disconnect() }
      oscillator.start(time)
      oscillator.stop(time + 0.55)
    }
    return true
  } catch { stopReminderSound(); return false }
}

export async function enableAndPlayReminderSound() {
  unlockReminderSound()
  try {
    if (context?.state === 'suspended') await context.resume()
    return playReminderSound()
  } catch { return false }
}
