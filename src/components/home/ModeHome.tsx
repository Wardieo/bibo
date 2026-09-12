type ModeHomeProps = {
  onChoose: (mode: "video" | "text") => void;
};

export function ModeHome({ onChoose }: ModeHomeProps) {
  return (
    <main className="mode-home">
      <div className="mode-home-brand">
        <span className="brand-mark">bi</span>
        <strong>bibo</strong>
        <span>random chat</span>
      </div>
      <div className="mode-home-copy">
        <p className="eyebrow">Meet someone new</p>
        <h1>
          Choose your
          <br />
          <em>conversation.</em>
        </h1>
        <p>Random rooms for real people. Pick how you want to connect.</p>
      </div>
      <div className="mode-cards">
        <button
          className="mode-card mode-video"
          type="button"
          onClick={() => onChoose("video")}
        >
          <span className="mode-icon">▣</span>
          <strong>Video Chat</strong>
          <span>Meet random people through live video.</span>
          <small>Camera + microphone</small>
          <b>
            Start Video Chat <i>-&gt;</i>
          </b>
        </button>
        <button
          className="mode-card mode-text"
          type="button"
          onClick={() => onChoose("text")}
        >
          <span className="mode-icon">•••</span>
          <strong>Text Chat</strong>
          <span>Meet random people through text.</span>
          <small>No camera or microphone</small>
          <b>
            Start Text Chat <i>-&gt;</i>
          </b>
        </button>
      </div>
      <p className="mode-home-foot">
        18+ only &nbsp; · &nbsp; Safe chat, always.
      </p>
    </main>
  );
}
