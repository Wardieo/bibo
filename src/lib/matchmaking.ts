import { supabase } from "./supabase";

export type DesiredPeople = 1 | 2 | 3;
export type MatchMode = "video" | "text";

export type MatchResult = {
  room_id: string | null;
  status: "waiting" | "matched";
};

function requireSupabase() {
  if (!supabase)
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  return supabase;
}

export async function ensureSession() {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } =
    await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session;
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session)
    throw (
      error ?? new Error("Enable Supabase Anonymous Auth to start matchmaking.")
    );
  return data.session;
}

export async function joinMatchmaking(
  desiredPeople: DesiredPeople,
  mode: MatchMode = "video",
): Promise<MatchResult> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("join_matchmaking", {
    requested_people: desiredPeople,
    requested_mode: mode,
  });
  if (error) throw error;
  return data as MatchResult;
}

export async function resetMyMatchmakingSession() {
  const client = requireSupabase();
  const { error } = await client.rpc("reset_my_matchmaking_session");
  if (error) throw error;
}

export async function acceptAgeGate() {
  const client = requireSupabase();
  await ensureSession();
  const { error } = await client.rpc("accept_age_gate");
  if (error) throw error;
}

export async function leaveMatchmaking() {
  const client = requireSupabase();
  const { error } = await client.rpc("cancel_matchmaking");
  if (error) throw error;
}

export async function leaveRoom(roomId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("leave_room", { target_room_id: roomId });
  if (error) throw error;
}

export function subscribeToMatch(userId: string, onChange: () => void) {
  const client = requireSupabase();
  return client
    .channel(`matchmaking:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "match_queue",
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();
}

export async function getCurrentMatch() {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user)
    throw new Error("Sign in is required before matchmaking.");
  const { data, error } = await client
    .from("match_queue")
    .select("status, room_id")
    .eq("user_id", userData.user.id)
    .in("status", ["waiting", "matched"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as MatchResult | null;
}
