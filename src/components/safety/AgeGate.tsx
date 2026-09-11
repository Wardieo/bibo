import { useState } from 'react'

type AgeGateProps = {
  onConfirm: () => void
  onDecline: () => void
}

export function AgeGate({ onConfirm, onDecline }: AgeGateProps) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <section className="safety-panel age-gate" aria-labelledby="age-gate-title">
      <p className="eyebrow">Before you enter</p>
      <h1 id="age-gate-title">Random video chat is 18+ only.</h1>
      <p className="safety-lead">
        Bibo connects you with strangers through live video. Please confirm your age
        before choosing a room.
      </p>
      <label className="age-check">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} />
        <span>I confirm that I am 18 or older.</span>
      </label>
      <div className="age-actions">
        <button className="primary-button" type="button" onClick={onConfirm} disabled={!confirmed}>
          I am 18 or older <span aria-hidden="true">-&gt;</span>
        </button>
        <button className="text-button" type="button" onClick={onDecline}>
          I am under 18
        </button>
      </div>
      <p className="safety-note">Your age-gate acceptance is recorded with your account.</p>
    </section>
  )
}
