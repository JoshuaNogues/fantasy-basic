import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <span className="hero-tag">Funtasy 5</span>
          <h1>
            Fantasy football built around <span>team identity</span>
          </h1>
          <p>
            Draft by strength, set lineups in seconds, and ride the hottest
            units in football. Funtasy 5 keeps the vibes high and the strategy
            sharper than ever.
          </p>
          <div className="hero-actions">
            <Link to="/scoreboard" className="btn-solid">
              View Live Scoreboard
            </Link>
            <Link to="/fantasy" className="btn-outline-alt">
              Manage Your League
            </Link>
          </div>
        </div>

        <div className="hero-dashboard">
          <div className="dashboard-card">
            <header>
              <span className="pill">Week Spotlight</span>
              <span className="status">Preview Example</span>
            </header>
            <div className="matchup">
              <div className="team">
                <span className="team-badge">BG</span>
                <div>
                  <p className="team-name">#Baguars</p>
                  <p className="team-record">5-2-0</p>
                </div>
              </div>
              <div className="matchup-score">122.4</div>
            </div>
            <div className="matchup">
              <div className="team">
                <span className="team-badge alt">HC</span>
                <div>
                  <p className="team-name">Hail Cary</p>
                  <p className="team-record muted">4-3-0</p>
                </div>
              </div>
              <div className="matchup-score muted">118.9</div>
            </div>
            <footer>
              <p>
                Build lineups around passing, rushing, defense, and keep the hot
                streak rolling.
              </p>
            </footer>
          </div>
        </div>
      </section>

      <section className="feature-showcase">
        <h2>Why Funtasy 5 hits different</h2>
        <div className="feature-grid">
          <article className="feature-item">
            <span className="feature-icon">⚡</span>
            <h3>Draft in five bold moves</h3>
            <p>
              Pick elite team units instead of chasing depth charts. Claim the
              Bengals passing game or the Ravens rush attack and own their
              momentum.
            </p>
          </article>
          <article className="feature-item">
            <span className="feature-icon">🎯</span>
            <h3>Lineups that lock fast</h3>
            <p>
              Starters and bench organized by slots you actually understand. Tap
              once to tweak, watch the points update instantly.
            </p>
          </article>
          <article className="feature-item">
            <span className="feature-icon">🔥</span>
            <h3>Ride the hottest streaks</h3>
            <p>
              Weekly points feed straight from your team units, so you always
              know which identity is carrying the squad.
            </p>
          </article>
          <article className="feature-item">
            <span className="feature-icon">🤝</span>
            <h3>Party-ready leagues</h3>
            <p>
              Perfect for quick drafts with friends or office rivalries. Less
              crunch, more trash talk, same championship feeling.
            </p>
          </article>
        </div>
      </section>

      <section className="lineup-preview">
        <div className="preview-copy">
          <h2>Build your identity, not just a roster</h2>
          <p>
            Passing, rushing, receiving, defense, and kicking — that&apos;s the
            Funtasy 5. Each slot represents a full unit, so one dominant Sunday
            can swing the matchup. Set your lineup by vibe, matchups, or pure
            fan loyalty.
          </p>
          <div className="preview-highlights">
            <div>
              <span className="highlight-value">92%</span>
              <span className="highlight-label">
                Managers set lineups in under 2 minutes
              </span>
            </div>
            <div>
              <span className="highlight-value">5</span>
              <span className="highlight-label">
                Slots to manage each week
              </span>
            </div>
          </div>
        </div>

        <div className="preview-card">
          <header>
            <p>Week 7 Starters</p>
            <span className="pill">Locked</span>
          </header>
          <ul>
            <li>
              <span className="slot">Passing</span>
              <span className="player">Detroit Lions</span>
              <span className="points">24.1</span>
            </li>
            <li>
              <span className="slot">Rushing</span>
              <span className="player">Baltimore Ravens</span>
              <span className="points">19.6</span>
            </li>
            <li>
              <span className="slot">Receiving</span>
              <span className="player">Dallas Cowboys</span>
              <span className="points">16.8</span>
            </li>
            <li>
              <span className="slot">Defense</span>
              <span className="player">San Francisco 49ers</span>
              <span className="points">11.2</span>
            </li>
            <li>
              <span className="slot">Kicking</span>
              <span className="player">Kansas City Chiefs</span>
              <span className="points">7.4</span>
            </li>
          </ul>
          <footer>
            <span>Total</span>
            <span className="points total">79.1</span>
          </footer>
        </div>
      </section>

      <section className="callout">
        <h2>Ready to bring your league into the Funtasy era?</h2>
        <p>
          Spin up a league, invite your crew, and draft the units that everyone
          will be talking about on Monday morning.
        </p>
        <div className="callout-actions">
          <Link to="/fantasy" className="btn-solid">
            Launch LM Tools
          </Link>
          <Link to="/scoreboard" className="btn-outline-alt">
            See Current Matchups
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <p>
          © {new Date().getFullYear()} Funtasy 5 · Powered by Fanzday · Built
          for players who love the story as much as the score.
        </p>
      </footer>
    </div>
  );
}
