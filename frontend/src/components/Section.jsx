export default function Section({ title, subtitle, actions, children }) {
  return (
    <section className="content-section">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
