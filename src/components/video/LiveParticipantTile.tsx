import { useEffect, useRef } from "react";
import type { Participant } from "livekit-client";

type LiveParticipantTileProps = {
  participant: Participant;
  isLocal?: boolean;
  color: string;
};

export function LiveParticipantTile({
  participant,
  isLocal = false,
  color,
}: LiveParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoPublication = Array.from(
    participant.videoTrackPublications.values(),
  ).find((publication) => publication.isSubscribed || isLocal);
  const audioTrack = Array.from(
    participant.audioTrackPublications.values(),
  ).find((publication) => publication.isSubscribed && !isLocal)?.track;

  useEffect(() => {
    const element = videoRef.current;
    const track = videoPublication?.track;
    if (!element || !track) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [videoPublication?.track]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !audioTrack) return;
    audioTrack.attach(element);
    void element.play().catch(() => undefined);
    return () => {
      audioTrack.detach(element);
    };
  }, [audioTrack]);

  return (
    <article className={`video-tile ${color}`}>
      {videoPublication?.track ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          className="local-video"
        />
      ) : (
        <div className="avatar-placeholder">
          {participant.identity.slice(0, 2).toUpperCase()}
        </div>
      )}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      <div className="tile-meta">
        <strong>{isLocal ? "You" : participant.identity.slice(0, 12)}</strong>
        <span>{participant.isSpeaking ? "Speaking" : "Mic on"}</span>
      </div>
    </article>
  );
}
