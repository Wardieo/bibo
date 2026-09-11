const values = [
  ['01', 'No endless scroll', 'You meet people, not content.'],
  ['02', 'Small rooms', 'Every voice gets space to be heard.'],
  ['03', 'Leave anytime', 'Your comfort comes first, always.'],
]

export function ValueStrip() {
  return (
    <section className="value-strip" id="how-it-works" aria-label="Why Bibo">
      {values.map(([number, title, description]) => (
        <article className="value-item" key={number}>
          <span className="value-number">{number}</span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </article>
      ))}
    </section>
  )
}
