import { supabase } from './supabase'

export type RoomMessage = {
  id: string
  room_id: string
  user_id: string
  message: string
  created_at: string
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function loadRoomMessages(roomId: string) {
  const client = requireSupabase()
  const { data, error } = await client.from('room_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(100)
  if (error) throw error
  return (data ?? []) as RoomMessage[]
}

export async function sendRoomMessage(roomId: string, message: string) {
  const client = requireSupabase()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) throw userError ?? new Error('Sign in is required to chat.')
  const { data, error } = await client.from('room_messages').insert({ room_id: roomId, user_id: userData.user.id, message: message.trim() }).select().single()
  if (error) throw error
  return data as RoomMessage
}

export function subscribeToRoomMessages(roomId: string, onMessage: (message: RoomMessage) => void) {
  const client = requireSupabase()
  const channel = client.channel(`room-messages:${roomId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` }, (payload) => onMessage(payload.new as RoomMessage))
  void channel.subscribe()
  return () => { void client.removeChannel(channel) }
}
