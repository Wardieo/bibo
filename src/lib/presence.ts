import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ensureSession } from "./matchmaking";

const PRESENCE_CHANNEL = "bibo-online-users";

type PresencePayload = {
  online_at: string;
};

export function useOnlineCount() {
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const updateCount = () => {
      if (active && channel)
        setOnlineCount(Object.keys(channel.presenceState()).length);
    };

    void ensureSession()
      .then((session) => {
        if (!active || !session) return;
        channel = client.channel(PRESENCE_CHANNEL, {
          config: { presence: { key: session.user.id } },
        });
        channel.on("presence", { event: "sync" }, updateCount);
        channel.on("presence", { event: "join" }, updateCount);
        channel.on("presence", { event: "leave" }, updateCount);
        void channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel?.track({
              online_at: new Date().toISOString(),
            } satisfies PresencePayload);
            updateCount();
          }
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (channel) void client.removeChannel(channel);
    };
  }, []);

  return onlineCount;
}
