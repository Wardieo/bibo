import { Room, RoomEvent } from "livekit-client";
import { supabase } from "./supabase";

export async function createLiveKitRoom(roomId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.functions.invoke("livekit-token", {
    body: { roomId },
  });
  if (error) {
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = (await context.clone().json().catch(() => null)) as
        | { error?: string }
        | null;
      if (payload?.error) message = payload.error;
    }
    throw new Error(message);
  }
  if (!data?.token || !data?.url)
    throw new Error(data?.error ?? "LiveKit token response is incomplete.");
  const room = new Room({ adaptiveStream: true, dynacast: true });
  try {
    await room.connect(data.url, data.token);
    await room.localParticipant.enableCameraAndMicrophone();
    return room;
  } catch (error) {
    room.disconnect();
    throw error;
  }
}

export function subscribeToLiveKit(
  room: Room,
  onParticipantChange: () => void,
) {
  const events = [
    RoomEvent.ParticipantConnected,
    RoomEvent.ParticipantDisconnected,
    RoomEvent.TrackSubscribed,
    RoomEvent.TrackUnsubscribed,
  ];
  events.forEach((event) => room.on(event, onParticipantChange));
  return () => events.forEach((event) => room.off(event, onParticipantChange));
}
