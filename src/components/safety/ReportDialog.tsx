import { useState } from "react";

type ReportDialogProps = {
  onClose: () => void;
  onSubmit: (category: string, details: string, urgent: boolean) => void;
};

const categories = [
  "Nudity or sexual content",
  "Sexual solicitation",
  "Harassment or bullying",
  "Hate speech",
  "Threats or violence",
  "Suspected minor",
  "Spam or scam",
  "Impersonation",
  "Other",
];

export function ReportDialog({ onClose, onSubmit }: ReportDialogProps) {
  const [category, setCategory] = useState(categories[0]);
  const [details, setDetails] = useState("");
  const [urgent, setUrgent] = useState(false);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Safety report</p>
            <h2 id="report-title">What happened?</h2>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onClose}
            aria-label="Close report"
          >
            x
          </button>
        </div>
        <label className="field-label">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Details <span>(optional)</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Tell our moderators what they should know."
            rows={4}
          />
        </label>
        <label className="urgent-check">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(event) => setUrgent(event.target.checked)}
          />
          <span>
            This involves immediate danger, threats, or suspected child sexual
            exploitation.
          </span>
        </label>
        <p className="privacy-line">
          Your report is private and will be reviewed by our safety team.
        </p>
        <button
          className="primary-button report-submit"
          type="button"
          onClick={() => onSubmit(category, details, urgent)}
        >
          Submit report <span aria-hidden="true">-&gt;</span>
        </button>
      </section>
    </div>
  );
}
