import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <h1>🏈 Funtisy 5</h1>
        <p>The easiest way to play fantasy football — reimagined by team strengths. Brought to you by Fanzday.</p>
        <Link to="/fantasy" className="cta-button">Start Playing</Link>
      </section>

      {/* Features */}
      <section className="features">
        <h2>📊 Draft by Team Strengths</h2>
        <div className="feature-row">
          <div className="feature-card">
            <h3>Bengals Passing</h3>
            <p>Focus on high-powered passing attacks like Joe Burrow and the Bengals without worrying about depth charts.</p>
          </div>
          <div className="feature-card">
            <h3>Ravens Rushing</h3>
            <p>Draft a rushing identity — Lamar Jackson + Derrick Henry — and dominate the ground game.</p>
          </div>
          <div className="feature-card">
            <h3>Cowboys Receiving</h3>
            <p>Pick powerhouse receiving corps like CeeDee Lamb, George Pickens & Jake Ferguson as a unit instead of gambling on individual WRs & TEs.</p>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="why">
        <h2>✨ Why VeeFive?</h2>
        <ul>
          <li>✅ Easier for beginners — no confusing waiver wires</li>
          <li>✅ More strategic drafting — think like a GM</li>
          <li>✅ Track real team identities, not just individual stats</li>
          <li>✅ Quick to play with friends or leagues</li>
        </ul>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} Funtasy 5 - Powered By Fanzday. All rights reserved.</p>
      </footer>
    </div>
  );
}
