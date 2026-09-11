type ModeratorDashboardProps = {
  onClose: () => void
}

const reports = [
  { category: 'Suspected minor', severity: 'critical', user: 'user_8f24', room: 'room_1024', age: '2 min ago' },
  { category: 'Harassment or bullying', severity: 'high', user: 'user_3a19', room: 'room_1018', age: '18 min ago' },
  { category: 'Spam or scam', severity: 'medium', user: 'user_5c77', room: 'room_1001', age: '41 min ago' },
]

export function ModeratorDashboard({ onClose }: ModeratorDashboardProps) {
  return (
    <section className="moderator-shell" aria-labelledby="moderator-title">
      <div className="moderator-header">
        <div><p className="eyebrow">Moderator workspace</p><h1 id="moderator-title">Safety queue</h1></div>
        <button className="back-button" type="button" onClick={onClose}>&lt;- Return to app</button>
      </div>
      <div className="moderator-stats"><div><strong>03</strong><span>Open reports</span></div><div><strong>01</strong><span>Urgent review</span></div><div><strong>12</strong><span>Actions today</span></div></div>
      <div className="report-table">
        <div className="report-row report-head"><span>Priority</span><span>Report</span><span>User / room</span><span>Received</span><span>Action</span></div>
        {reports.map((report) => <div className="report-row" key={report.user}><span><b className={`severity ${report.severity}`}>{report.severity}</b></span><span><strong>{report.category}</strong><small>Requires human review</small></span><span><strong>{report.user}</strong><small>{report.room}</small></span><span>{report.age}</span><span><button className="review-button" type="button">Review</button></span></div>)}
      </div>
      <p className="moderator-footnote">Moderator actions are logged. Access to reports and evidence is restricted by server-side role permissions.</p>
    </section>
  )
}
