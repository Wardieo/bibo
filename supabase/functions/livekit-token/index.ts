import { createClient } from 'npm:@supabase/supabase-js@2'
import { AccessToken } from 'npm:livekit-server-sdk@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const { roomId } = await request.json() as { roomId?: string }
    if (!roomId) throw new Error('roomId is required')
    const { data: membership, error: membershipError } = await supabase
      .from('room_participants')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .maybeSingle()
    if (membershipError || !membership) throw new Error('Not a room participant')

    const apiKey = Deno.env.get('LIVEKIT_API_KEY')
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
    if (!apiKey || !apiSecret) throw new Error('LiveKit is not configured')
    const token = new AccessToken(apiKey, apiSecret, { identity: user.id, ttl: '10m' })
    token.addGrant({ roomJoin: true, room: roomId, canPublish: true, canSubscribe: true })
    return new Response(JSON.stringify({ token: await token.toJwt(), url: Deno.env.get('LIVEKIT_URL') }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Token request failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
