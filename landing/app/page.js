const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tikidoc.xyz";

const highlights = [
  {
    name: "My Tiki",
    description: "Patient portal, arrival, forms, and aftercare continuity through one link.",
  },
  {
    name: "TikiBell",
    description: "Patient-facing helper for safe visit questions, reassurance, and guided follow-up.",
  },
  {
    name: "Tiki Desk",
    description: "Staff operations surface for check-in, escalation, room traffic, and aftercare review.",
  },
  {
    name: "Tiki Room",
    description: "Doctor-controlled in-room communication surface for treatment and care workflows.",
  },
];

export default function LandingPage() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <span>TikiDoc</span>
        </div>
        <nav className="topnav">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a className="nav-cta" href={`${APP_URL}/login`}>Open App</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Clinic operations, not generic chat</p>
          <h1>One product surface for patients, staff, and room-side care.</h1>
          <p className="hero-text">
            TikiDoc connects My Tiki, TikiBell, Tiki Desk, and Tiki Room into one clinic workflow.
            Patients stay guided. Staff stay aligned. Doctors stay in control.
          </p>
          <div className="hero-actions">
            <a className="primary-btn" href={`${APP_URL}/login`}>Go to app.tikidoc.xyz</a>
            <a className="secondary-btn" href={APP_URL}>Open product app</a>
          </div>
        </div>

        <div className="hero-card" aria-label="Product summary">
          <div className="card-row">
            <span className="card-label">Patient entry</span>
            <strong>My Tiki</strong>
          </div>
          <div className="card-row">
            <span className="card-label">Patient helper</span>
            <strong>TikiBell</strong>
          </div>
          <div className="card-row">
            <span className="card-label">Staff surface</span>
            <strong>Tiki Desk</strong>
          </div>
          <div className="card-row">
            <span className="card-label">In-room surface</span>
            <strong>Tiki Room</strong>
          </div>
        </div>
      </section>

      <section className="section" id="product">
        <div className="section-heading">
          <p className="eyebrow">Product system</p>
          <h2>Four names, four clear roles.</h2>
        </div>
        <div className="highlight-grid">
          {highlights.map((item) => (
            <article className="highlight-card" key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-muted" id="workflow">
        <div className="section-heading">
          <p className="eyebrow">Workflow</p>
          <h2>Marketing stays public. Product stays in the app.</h2>
        </div>
        <div className="workflow-grid">
          <div className="workflow-card">
            <span className="workflow-domain">tikidoc.xyz</span>
            <h3>Landing only</h3>
            <p>Brand story, product explanation, and CTA to the live app.</p>
          </div>
          <div className="workflow-card">
            <span className="workflow-domain">app.tikidoc.xyz</span>
            <h3>Actual product</h3>
            <p>Login, staff app, patient links, quote links, and room-side workflows.</p>
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="cta-card">
          <div>
            <p className="eyebrow">App entry</p>
            <h2>Use the real product at app.tikidoc.xyz.</h2>
          </div>
          <a className="primary-btn" href={`${APP_URL}/login`}>Open app</a>
        </div>
      </section>
    </main>
  );
}
