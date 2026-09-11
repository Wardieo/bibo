import { Room, RoomEvent } from 'livekit-client'
import { supabase } from './supabase'

export async function createLiveKitRoom(roomId: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke('livekit-token', { body: { roomId } })
  if (error || !data?.token || !data?.url) throw error ?? new Error(data?.error ?? 'Unable to create LiveKit token')
  const room = new Room({ adaptiveStream: true, dynacast: true })
  await room.connect(data.url, data.token)
  await room.localParticipant.enableCameraAndMicrophone()
  return room
}

export function subscribeToLiveKit(room: Room, onParticipantChange: () => void) {
  const events = [RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed]
  events.forEach((event) => room.on(event, onParticipantChange))
  return () => events.forEach((event) => room.off(event, onParticipantChange))
}

