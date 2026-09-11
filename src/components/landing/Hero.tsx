import heroImage from '../../assets/hero.png'

type HeroProps = {
  onStart: () => void
}

export function Hero({ onStart }: HeroProps) {
  return (
    <section className="hero-section" id="top">
      <div className="hero-copy">
        <p className="eyebrow">Random video chat, made human</p>
        <h1>
          Your next
          <span>hello</span>
          is out there.
        </h1>
        <p className="hero-description">
          Meet someone new in a private, live video room. No feeds to scroll,
          no audience to perform for. Just a real conversation.
        </p>
        <button className="primary-button" type="button" onClick={onStart}>
          Start random chat <span aria-hidden="true">-&gt;</span>
        </button>
        <p className="microcopy">
          <span className="status-dot" aria-hidden="true" />
          Free to join. You are always in control.
        </p>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="visual-orbit orbit-one" />
        <div className="visual-orbit orbit-two" />
        <img src={heroImage} alt="" />
        <div className="floating-note note-top">
          <span className="note-icon">+</span>
          <span>
            <strong>one good chat</strong>
            can change your day
          </span>
        </div>
        <div className="floating-note note-bottom">
          <span className="avatar-stack">
            <i />
            <i />
            <i />
          </span>
          <span><strong>12,480</strong> people online</span>
        </div>
      </div>
    </section>
  )
}
