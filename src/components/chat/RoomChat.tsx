import { useEffect, useState } from "react";
import {
  loadRoomMessages,
  sendRoomMessage,
  subscribeToRoomMessages,
  type RoomMessage,
} from "../../lib/chat";

type RoomChatProps = { roomId: string };

export function RoomChat({ roomId }: RoomChatProps) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void loadRoomMessages(roomId)
      .then((loaded) => {
        if (active) setMessages(loaded);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Chat unavailable",
          );
      });
    const unsubscribe = subscribeToRoomMessages(roomId, (message) =>
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      ),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [roomId]);

  const send = async () => {
    const message = draft.trim();
    if (!message) return;
    setDraft("");
    try {
      await sendRoomMessage(roomId, message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Message failed");
      setDraft(message);
    }
  };

  return (
    <aside className="room-chat" aria-label="Room chat">
      <div className="chat-heading">
        <strong>Room chat</strong>
        <span>{messages.length} messages</span>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Say hello while the room fills.</p>
        )}
        {messages.map((item) => (
          <div className="chat-message" key={item.id}>
            <strong>{item.user_id.slice(0, 6)}</strong>
            <p>{item.message}</p>
          </div>
        ))}
      </div>
      {error && <p className="chat-error">{error}</p>}
      <form
        className="chat-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
        />
        <button type="submit">Send</button>
      </form>
    </aside>
  );
}
