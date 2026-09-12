export type GroupSize = 1 | 2 | 3;

type GroupSizePickerProps = {
  value: GroupSize;
  onChange: (value: GroupSize) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSearching: boolean;
};

const options: Array<{
  value: GroupSize;
  label: string;
  detail: string;
  accent: string;
}> = [
  {
    value: 1,
    label: "1 person",
    detail: "A focused one-on-one chat",
    accent: "01",
  },
  { value: 2, label: "2 people", detail: "You + two new faces", accent: "02" },
  {
    value: 3,
    label: "3 people",
    detail: "A lively group of four",
    accent: "03",
  },
];

export function GroupSizePicker({
  value,
  onChange,
  onBack,
  onSubmit,
  isSearching,
}: GroupSizePickerProps) {
  return (
    <section className="matchmaking-panel" aria-labelledby="matchmaking-title">
      <button className="back-button" type="button" onClick={onBack}>
        <span aria-hidden="true">&lt;-</span> Back home
      </button>
      <div className="panel-heading">
        <p className="eyebrow">Set the room</p>
        <h1 id="matchmaking-title">How many people do you want to meet?</h1>
        <p>
          Choose the number of other people you would like in your next
          conversation.
        </p>
      </div>

      <div
        className="size-options"
        role="radiogroup"
        aria-label="People to meet"
      >
        {options.map((option) => (
          <button
            className={`size-option ${value === option.value ? "selected" : ""}`}
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <span className="option-number">{option.accent}</span>
            <span className="option-content">
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </span>
            <span className="radio-indicator" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="panel-footer">
        <p>
          <span className="lock-mark" aria-hidden="true">
            *
          </span>
          Your camera and microphone stay off until you join.
        </p>
        <button
          className="primary-button"
          type="button"
          onClick={onSubmit}
          disabled={isSearching}
        >
          {isSearching ? "Looking for people..." : "Find my people"}
          <span aria-hidden="true">-&gt;</span>
        </button>
      </div>
    </section>
  );
}
