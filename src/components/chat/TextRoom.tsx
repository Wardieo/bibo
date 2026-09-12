import { startTransition, useCallback, useEffect, useState } from "react";
import { ReportDialog } from "../safety/ReportDialog";
import { OnlineUsers } from "../presence/OnlineUsers";
import { useOnlineCount } from "../../lib/presence";
import { RoomChat } from "./RoomChat";
import {
  acceptAgeGate,
  ensureSession,
  joinMatchmaking,
  leaveMatchmaking,
  leaveRoom,
  resetMyMatchmakingSession,
  subscribeToMatch,
  type DesiredPeople,
} from "../../lib/matchmaking";

type TextRoomProps = { onLeave: () => void };

type Phase = "setup" | "searching" | "live";

export function TextRoom({ onLeave }: TextRoomProps) {
  const [groupSize, setGroupSize] = useState<DesiredPeople>(1);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showReport, setShowReport] = useState(false);
  const onlineCount = useOnlineCount();

  const findTextRoom = useCallback(async () => {
    try {
      const result = await joinMatchmaking(groupSize, "text");
      if (result.status === "matched" && result.room_id) {
        startTransition(() => {
          setRoomId(result.room_id);
          setPhase("live");
        });
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to enter text matchmaking.",
      );
    }
  }, [groupSize]);

  useEffect(() => {
    if (phase !== "searching") return;
    let cancelled = false;
    let unsubscribe: () => void = () => undefined;
    void ensureSession()
      .then((session) => {
        if (!cancelled)
          unsubscribe = subscribeToMatch(session.user.id, (match) => {
            if (match.room_id) {
              startTransition(() => {
                setRoomId(match.room_id);
                setPhase("live");
              });
            }
          });
      })
      .catch((error) => {
        if (!cancelled) console.error("Match realtime subscription failed", error);
      });
    void findTextRoom();
    const interval = window.setInterval(() => void findTextRoom(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [findTextRoom, phase]);

  const start = async () => {
    setNotice("");
    try {
      await resetMyMatchmakingSession();
      await acceptAgeGate();
      setPhase("searching");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to start text chat.",
      );
    }
  };

  const leave = async () => {
    if (roomId) await leaveRoom(roomId).catch(() => undefined);
    else await leaveMatchmaking().catch(() => undefined);
    setRoomId(null);
    setPhase("setup");
    onLeave();
  };

  const next = async () => {
    if (roomId) await leaveRoom(roomId).catch(() => undefined);
    else await leaveMatchmaking().catch(() => undefined);
    setRoomId(null);
    setPhase("searching");
  };

  if (phase === "setup")
    return (
      <main className="text-setup">
        <div className="text-brand">
          <span className="brand-mark">bi</span>
          <strong>bibo</strong>
          <span>text chat</span>
        </div>
        <div className="text-setup-copy">
          <p className="eyebrow">No camera. Just conversation.</p>
          <h1>
            Who do you want
            <br />
            <em>to meet?</em>
          </h1>
          <p>Choose how many strangers you want in your text room.</p>
        </div>
        <div className="text-capacity-options">
          {[1, 2, 3].map((size) => (
            <button
              type="button"
              className={
                groupSize === size
                  ? "capacity-option selected"
                  : "capacity-option"
              }
              key={size}
              onClick={() => setGroupSize(size as DesiredPeople)}
            >
              <strong>{size}</strong>
              <span>
                {size === 1 ? "You + 1 stranger" : `You + ${size} strangers`}
              </span>
              <small>{size + 1} people total</small>
            </button>
          ))}
        </div>
        <label className="room-age-check">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(event) => setAgeConfirmed(event.target.checked)}
          />
          <span>I confirm that I am 18 or older.</span>
        </label>
        <button
          className="enter-room-button"
          type="button"
          disabled={!ageConfirmed}
          onClick={() => void start()}
        >
          Start Text Chat <span>-&gt;</span>
        </button>
        {notice && (
          <p className="room-notice" role="alert">
            {notice}
          </p>
        )}
        <button className="text-back-button" type="button" onClick={onLeave}>
          Choose another mode
        </button>
      </main>
    );

  if (phase === "searching")
    return (
      <main className="text-room text-queue-room">
        <OnlineUsers count={onlineCount} />
        <header className="text-room-header">
          <div>
            <p className="eyebrow">Random Text Chat</p>
            <h1>Finding your chat.</h1>
          </div>
          <div>
            <strong>Text only · No camera</strong>
            <button
              className="leave-button"
              type="button"
              onClick={() => {
                void leave();
              }}
            >
              Cancel
            </button>
          </div>
        </header>
        <section className="text-room-body text-queue-body">
          <div className="queue-chat-panel">
            <div className="chat-heading">
              <strong>Room chat</strong>
              <span>Waiting to connect</span>
            </div>
            <div className="queue-chat-empty">
              <span className="loading-ring" />
              <h2>Your chat is getting ready.</h2>
              <p>
                You can start messaging as soon as another person chooses the
                same text room.
              </p>
            </div>
            <div className="chat-compose queue-compose">
              <input disabled placeholder="Chat opens when matched..." />
              <button type="button" disabled>
                Send
              </button>
            </div>
          </div>
          <aside className="text-room-actions queue-people-panel">
            <p className="setup-kicker">Text room</p>
            <h2>{groupSize + 1} people total</h2>
            <p>
              Waiting for {groupSize} {groupSize === 1 ? "person" : "people"}{" "}
              who chose the same room size.
            </p>
            <div className="queue-people-list">
              <div className="queue-person joined">
                <span />
                You
              </div>
              {Array.from({ length: groupSize }).map((_, index) => (
                <div className="queue-person" key={index}>
                  <span />
                  Waiting for someone
                </div>
              ))}
            </div>
            <div className="queue-status-line">
              <span className="waiting-spinner" /> Searching for compatible
              people
            </div>
          </aside>
        </section>
      </main>
    );

  return (
    <main className="text-room">
      <OnlineUsers count={onlineCount} />
      <header className="text-room-header">
        <div>
          <p className="eyebrow">Random Text Chat</p>
          <h1>Say hello.</h1>
        </div>
        <div>
          <strong>{groupSize + 1} people max</strong>
          <button
            className="leave-button"
            type="button"
            onClick={() => void leave()}
          >
            Leave
          </button>
        </div>
      </header>
      <section className="text-room-body">
        {roomId && <RoomChat roomId={roomId} />}
        <aside className="text-room-actions">
          <p className="setup-kicker">Text room</p>
          <h2>People in chat</h2>
          <p>
            Room is open as soon as a match is found. More people can join until
            it reaches capacity.
          </p>
          <button type="button" onClick={() => setShowReport(true)}>
            Report someone
          </button>
          <button
            className="next-button"
            type="button"
            onClick={() => void next()}
          >
            Next <span>-&gt;</span>
          </button>
        </aside>
      </section>
      {showReport && (
        <ReportDialog
          onClose={() => setShowReport(false)}
          onSubmit={() => setShowReport(false)}
        />
      )}
    </main>
  );
}
