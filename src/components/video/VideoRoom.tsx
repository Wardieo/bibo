import { useCallback, useEffect, useState } from 'react'
import type { Room } from 'livekit-client'
import { ReportDialog } from '../safety/ReportDialog'
import { LiveParticipantTile } from './LiveParticipantTile'
import { RoomChat } from '../chat/RoomChat'
import { createLiveKitRoom, subscribeToLiveKit } from '../../lib/livekit'
import { acceptAgeGate, joinMatchmaking, leaveMatchmaking, leaveRoom, resetMyMatchmakingSession, type DesiredPeople } from '../../lib/matchmaking'

type VideoRoomProps = {
  onLeave: () => void
  onNext: () => void
}

const tileColors = ['lavender', 'peach', 'mint', 'yellow']

function describeError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const details = error as { message?: string; code?: string; details?: string; hint?: string }
    return [details.message, details.code && `Code: ${details.code}`, details.details, details.hint].filter(Boolean).join(' | ') || fallback
  }
  return fallback
}

export function VideoRoom({ onLeave, onNext }: VideoRoomProps) {
  const [groupSize, setGroupSize] = useState<1 | 2 | 3>(1)
  const [country, setCountry] = useState('International')
  const [phase, setPhase] = useState<'setup' | 'searching' | 'connecting' | 'live'>('setup')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [notice, setNotice] = useState('')
  const [roomId, setRoomId] = useState<string | null>(null)
  const [liveRoom, setLiveRoom] = useState<Room | null>(null)
  const [participantVersion, setParticipantVersion] = useState(0)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const visibleParticipants = liveRoom ? [liveRoom.localParticipant, ...Array.from(liveRoom.remoteParticipants.values())] : []

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const stopPreview = useCallback(() => {
    previewStream?.getTracks().forEach((track) => track.stop())
    setPreviewStream(null)
  }, [previewStream])

  const connectToRoom = useCallback(async (matchedRoomId: string) => {
    stopPreview()
    setRoomId(matchedRoomId)
    setPhase('connecting')
    try {
      const room = await createLiveKitRoom(matchedRoomId)
      setLiveRoom(room)
      setParticipantVersion((value) => value + 1)
      subscribeToLiveKit(room, () => setParticipantVersion((value) => value + 1))
      setPhase('live')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to connect to the video room.')
      setPhase('searching')
    }
  }, [stopPreview])

  useEffect(() => {
    if (phase !== 'searching') return
    let cancelled = false
    const poll = async () => {
      try {
        const match = await joinMatchmaking(groupSize as DesiredPeople, 'video')
        if (!cancelled && match?.status === 'matched' && match.room_id) await connectToRoom(match.room_id)
      } catch (error) {
        console.error('Matchmaking poll failed', error)
        if (!cancelled) setNotice(describeError(error, 'Unable to check your match.'))
      }
    }
    void poll()
    const interval = window.setInterval(() => void poll(), 2000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [connectToRoom, groupSize, phase])

  useEffect(() => () => { liveRoom?.disconnect() }, [liveRoom])

  const startMatching = async () => {
    setNotice('')
    navigate('/video')
    setPhase('searching')
    try {
      await resetMyMatchmakingSession()
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setPreviewStream(stream)
      }
      await acceptAgeGate()
      const result = await joinMatchmaking(groupSize as DesiredPeople, 'video')
      if (result.status === 'matched' && result.room_id) await connectToRoom(result.room_id)
    } catch (error) {
      console.error('Unable to enter matchmaking', error)
      stopPreview()
      setPhase('setup')
      setNotice(describeError(error, 'Unable to enter matchmaking.').replace(/^Error:\s*/i, ''))
    }
  }

  const endRoom = async () => {
    stopPreview()
    liveRoom?.disconnect()
    if (roomId) await leaveRoom(roomId).catch(() => undefined)
    setLiveRoom(null)
    setRoomId(null)
    setPhase('setup')
  }

  const submitReport = (category: string, _details: string, urgent: boolean) => {
    setShowReport(false)
    setNotice(urgent ? 'Urgent report sent to the safety team.' : `Report sent: ${category}.`)
  }

  const toggleMicrophone = async () => {
    const enabled = !muted
    await liveRoom?.localParticipant.setMicrophoneEnabled(enabled)
    setMuted(!enabled)
  }

  const toggleCamera = async () => {
    const enabled = !cameraOff
    await liveRoom?.localParticipant.setCameraEnabled(enabled)
    setCameraOff(!enabled)
  }

  if (phase === 'setup') {
    return (
      <section className="room-app setup-room" aria-labelledby="room-title">
        <aside className="country-rail" aria-label="Choose a country">
          <div className="rail-logo">bi</div>
          <p>Meet people from</p>
          {['International', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan'].map((option) => (
            <button className={country === option ? 'country-option selected' : 'country-option'} type="button" key={option} onClick={() => setCountry(option)}>
              <span>{option === 'International' ? '◎' : '○'}</span>{option}
            </button>
          ))}
          <div className="rail-bottom">18+ only<br />Safe chat, always.</div>
        </aside>
        <main className="setup-content">
          <div className="room-brand"><span className="brand-mark">bi</span><strong>bibo</strong><span className="room-tag">random video chat</span></div>
          <div className="setup-center">
            <p className="setup-kicker">{country} <span className="status-dot" /></p>
            <h1 id="room-title">Who do you want<br /><em>to meet?</em></h1>
            <p className="setup-subtitle">Choose your room size, then we will find a conversation waiting for you.</p>
            <div className="capacity-options" role="radiogroup" aria-label="Number of people to meet">
              {[1, 2, 3].map((size) => <button type="button" role="radio" aria-checked={groupSize === size} className={groupSize === size ? 'capacity-option selected' : 'capacity-option'} key={size} onClick={() => setGroupSize(size as 1 | 2 | 3)}><strong>{size}</strong><span>{size === 1 ? '1 on 1' : `you + ${size} people`}</span><i /></button>)}
            </div>
            <label className="room-age-check"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} /><span>I confirm that I am 18 or older.</span></label>
            <button className="enter-room-button" type="button" disabled={!ageConfirmed} onClick={() => void startMatching()}>Start matching <span>-&gt;</span></button>
            <p className="setup-privacy">Your camera and microphone stay off until you enter. No public broadcasting.</p>
            {notice && <p className="room-notice" role="alert">{notice}</p>}
          </div>
        </main>
      </section>
    )
  }

  if (phase === 'searching' || phase === 'connecting') {
    return (
      <section className="room-shell room-app queue-room" aria-labelledby="queue-title">
        <div className="room-topbar">
          <div><p className="eyebrow">Private room</p><h1 id="queue-title">Waiting for your room</h1></div>
          <div className="room-status"><span className="waiting-dot" /> Finding {groupSize} {groupSize === 1 ? 'person' : 'people'}</div>
        </div>
        <div className={`video-grid queue-grid capacity-${groupSize}`}>
          <article className="video-tile lavender queue-local">
            {previewStream ? <video ref={(element) => { if (element) { element.srcObject = previewStream; void element.play().catch(() => undefined) } }} autoPlay muted playsInline className="local-video" /> : <div className="avatar-placeholder">YO</div>}
            <div className="tile-meta"><strong>You</strong><span>Camera preview</span></div>
          </article>
          {Array.from({ length: groupSize }).map((_, index) => <article className="video-tile loading-tile" key={index}><span className="loading-ring" /><div className="tile-meta"><strong>Waiting for someone</strong><span>Searching...</span></div></article>)}
        </div>
        <div className="queue-footer"><span className="waiting-spinner" /><p>{phase === 'searching' ? `Waiting for ${groupSize} ${groupSize === 1 ? 'other person' : 'other people'} who chose the same room size.` : 'Connecting your room...'}</p><button className="leave-button" type="button" onClick={() => { void leaveMatchmaking(); stopPreview(); navigate('/'); setPhase('setup') }}>Cancel search</button></div>
      </section>
    )
  }

  return (
    <section className="room-shell room-app" aria-labelledby="room-title">
      <div className="room-topbar">
        <div>
          <p className="eyebrow">Private room</p>
          <h1 id="room-title">A good place to say hello.</h1>
        </div>
        <div className="room-status"><span className="status-dot" /> {visibleParticipants.length} / {groupSize + 1} people &middot; {visibleParticipants.length === groupSize + 1 ? 'Room is full' : `Looking for ${groupSize + 1 - visibleParticipants.length} more`}</div>
      </div>
      <div className="live-room-content"><div className={`video-grid capacity-${groupSize} participants-${visibleParticipants.length}`} key={participantVersion}>
        {visibleParticipants.map((participant, index) => <LiveParticipantTile key={participant.identity} participant={participant} isLocal={index === 0} color={tileColors[index % tileColors.length]} />)}
        {Array.from({ length: Math.max(0, groupSize + 1 - visibleParticipants.length) }).map((_, index) => <article className="video-tile loading-tile" key={`empty-${index}`}><span className="loading-ring" /><div className="tile-meta"><strong>Waiting for someone</strong><span>Joining soon</span></div></article>)}
      </div>{roomId && <RoomChat roomId={roomId} />}</div>
      <div className="room-controls">
        <button className={`round-control ${muted ? 'active' : ''}`} type="button" onClick={toggleMicrophone} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? 'mic off' : 'mic on'}</button>
        <button className={`round-control ${cameraOff ? 'active' : ''}`} type="button" onClick={toggleCamera} aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}>{cameraOff ? 'cam off' : 'cam on'}</button>
        <button className="next-button" type="button" onClick={() => { void endRoom(); onNext() }}>Next <span aria-hidden="true">-&gt;</span></button>
        <div className="more-wrap">
          <button className="round-control" type="button" onClick={() => setShowMore(!showMore)} aria-expanded={showMore}>...</button>
          {showMore && <div className="more-menu"><button type="button" onClick={() => setShowReport(true)}>Report</button><button type="button" onClick={() => { setNotice('Maya was blocked.'); setShowMore(false) }}>Block</button><button type="button" onClick={() => setNotice('Room settings are coming soon.')}>Settings</button></div>}
        </div>
        <button className="leave-button" type="button" onClick={() => { void endRoom(); onLeave() }}>Leave</button>
      </div>
      {notice && <p className="room-notice" role="status">{notice}</p>}
      {showReport && <ReportDialog onClose={() => setShowReport(false)} onSubmit={submitReport} />}
    </section>
  )
}
