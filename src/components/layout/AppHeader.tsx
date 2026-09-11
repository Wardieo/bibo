type AppHeaderProps = {
  onStart: () => void
}

export function AppHeader({ onStart }: AppHeaderProps) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Bibo home">
        <span className="brand-mark" aria-hidden="true">
          bi
        </span>
        <span>bibo</span>
      </a>

      <nav className="main-nav" aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#safety">Safety</a>
        <a href="#about">About</a>
      </nav>

      <button className="header-action" type="button" onClick={onStart}>
        Start chatting <span aria-hidden="true">-&gt;</span>
      </button>
    </header>
  )
}
