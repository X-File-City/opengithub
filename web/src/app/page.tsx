import Link from "next/link";

export default function Home() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <header
        className="row"
        style={{
          height: "var(--header-h)",
          padding: "0 32px",
          gap: 16,
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          aria-label="opengithub home"
          className="row"
          href="/"
          style={{ gap: 10 }}
        >
          <span
            aria-hidden="true"
            className="center"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--display)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            o
          </span>
          <span
            style={{
              fontFamily: "var(--display)",
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            opengithub
          </span>
        </Link>
        <span style={{ flex: 1 }} />
        <Link
          className="t-sm muted"
          href="/docs/get-started"
          style={{ fontWeight: 500 }}
        >
          Docs
        </Link>
        <Link
          className="t-sm muted"
          href="/explore"
          style={{ fontWeight: 500 }}
        >
          Explore
        </Link>
        <Link className="btn" href="/login">
          Sign in
        </Link>
        <Link className="btn primary" href="/login">
          Get started
        </Link>
      </header>

      <main>
        <section
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "88px 32px 72px",
          }}
        >
          <span className="chip soft" style={{ marginBottom: 24 }}>
            <span className="dot live" /> v0.6 · public preview
          </span>
          <h1
            className="t-display"
            style={{ fontSize: 88, margin: "20px 0 0", maxWidth: 920 }}
          >
            A calmer place
            <br />
            for code to{" "}
            <em style={{ fontStyle: "italic", fontWeight: 400 }}>live</em>.
          </h1>
          <p
            style={{
              fontSize: 19,
              color: "var(--ink-3)",
              marginTop: 28,
              maxWidth: 620,
              lineHeight: 1.5,
            }}
          >
            opengithub is an open-source forge built around the unfashionable
            idea that reading code should feel as good as writing it.
            Self-hosted, fast, considered.
          </p>
          <div className="row" style={{ gap: 12, marginTop: 36 }}>
            <Link className="btn primary lg" href="/login">
              Get started →
            </Link>
            <Link className="btn lg" href="/docs/get-started">
              Read the docs
            </Link>
          </div>
        </section>

        <section
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--line)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div
            style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px" }}
          >
            <div className="t-label">Principles</div>
            <h2 className="t-h1" style={{ marginTop: 12, maxWidth: 720 }}>
              Built around the file. Quiet by default. Fast because it has to
              be.
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 24,
                marginTop: 48,
              }}
            >
              {[
                {
                  h: "File-first navigation",
                  p: "The codebase is the artifact. Tree, blame, history, and review all anchor to it.",
                },
                {
                  h: "An inbox that triages",
                  p: "Group by repo, by urgency, by what you actually own. Snooze. Done. Move on.",
                },
                {
                  h: "Reviews with context",
                  p: "See ownership, prior art, and adjacent changes without leaving the diff.",
                },
                {
                  h: "Keyboard-native",
                  p: "Every action behind ⌘K. j/k everywhere. Touch the mouse only when you want to.",
                },
                {
                  h: "Open source",
                  p: "MIT licensed. Self-host on a $5 box. No telemetry, no upsell, no lock-in.",
                },
                {
                  h: "Considered defaults",
                  p: "Sensible settings out of the box, so you spend time on code instead of configuration.",
                },
              ].map((f) => (
                <div key={f.h}>
                  <div
                    className="center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                    }}
                  >
                    ◆
                  </div>
                  <h3 className="t-h3" style={{ marginTop: 16 }}>
                    {f.h}
                  </h3>
                  <p
                    style={{
                      color: "var(--ink-3)",
                      marginTop: 6,
                      fontSize: 14,
                    }}
                  >
                    {f.p}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 32px" }}
        >
          <div
            className="row"
            style={{ alignItems: "flex-end", gap: 24, marginBottom: 36 }}
          >
            <h2 className="t-h1" style={{ flex: 1, margin: 0 }}>
              Two ways in.
            </h2>
            <p style={{ color: "var(--ink-3)", maxWidth: 360, margin: 0 }}>
              Run it on your own metal, or use the hosted instance and skip the
              setup.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div className="card" style={{ padding: 32 }}>
              <div className="t-label">Hosted</div>
              <div className="t-display" style={{ fontSize: 36, marginTop: 6 }}>
                opengithub.dev
              </div>
              <p style={{ color: "var(--ink-3)", marginTop: 10 }}>
                Sign in, push, share. Free for public projects.
              </p>
              <Link
                className="btn primary"
                href="/login"
                style={{ marginTop: 20 }}
              >
                Sign in with Google →
              </Link>
            </div>
            <div
              className="card"
              style={{
                padding: 32,
                background: "var(--ink-1)",
                color: "var(--bg)",
                borderColor: "var(--ink-1)",
              }}
            >
              <div className="t-label" style={{ color: "var(--ink-5)" }}>
                Self-host
              </div>
              <div className="t-display" style={{ fontSize: 36, marginTop: 6 }}>
                One binary, one box.
              </div>
              <p style={{ color: "var(--ink-5)", marginTop: 10 }}>
                Compile from source or grab a release. Postgres + a static dir
                is enough.
              </p>
              <div
                style={{
                  marginTop: 20,
                  padding: 12,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "var(--radius)",
                  fontFamily: "var(--mono)",
                  fontSize: 12.5,
                }}
              >
                $ cargo install opengithub
              </div>
            </div>
          </div>
        </section>

        <footer
          className="row"
          style={{
            borderTop: "1px solid var(--line)",
            padding: "32px",
            color: "var(--ink-4)",
            fontSize: 13,
            justifyContent: "space-between",
            maxWidth: 1240,
            margin: "0 auto",
          }}
        >
          <span>© 2026 opengithub · MIT</span>
          <span>Made by people who like reading code.</span>
        </footer>
      </main>
    </div>
  );
}
