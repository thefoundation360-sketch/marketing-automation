import { supabase } from './supabase'

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID

export async function initOneSignal(userId: string) {
  if (!APP_ID || !('OneSignal' in window)) return

  try {
    const OneSignal = (window as Window & { OneSignal: OneSignalType }).OneSignal
    await OneSignal.init({
      appId: APP_ID,
      safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_ID,
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: import.meta.env.DEV,
    })

    const playerId = await OneSignal.getUserId()
    if (playerId && userId) {
      await supabase.from('profiles').update({ onesignal_player_id: playerId }).eq('id', userId)
    }

    OneSignal.setExternalUserId(userId)
  } catch (err) {
    console.warn('OneSignal init failed:', err)
  }
}

export async function requestPushPermission() {
  if (!('OneSignal' in window)) return false
  try {
    const OneSignal = (window as Window & { OneSignal: OneSignalType }).OneSignal
    await OneSignal.showSlidedownPrompt()
    return true
  } catch {
    return false
  }
}

export async function sendNotification(userId: string, notification: {
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data ?? {},
  })
  return !error
}

interface OneSignalType {
  init: (config: Record<string, unknown>) => Promise<void>
  getUserId: () => Promise<string | null>
  setExternalUserId: (id: string) => void
  showSlidedownPrompt: () => Promise<void>
}
