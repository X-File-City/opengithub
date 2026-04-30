// og-screens-1.jsx — Landing, Login, Dashboard, Notifications

function Landing() {
  const { go } = useRoute();
  return (
    <div className="page-enter" style={{ background: 'var(--bg)' }}>
      <TopBar inApp={false} />
      <main>
        {/* Hero */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 32px 72px' }}>
          <div className="chip soft" style={{ marginBottom: 24 }}>
            <span className="dot live" /> v0.6 · public preview
          </div>
          <h1 className="t-display" style={{ fontSize: 88, margin: 0, maxWidth: 920 }}>
            A calmer place<br/>for code to <em style={{ fontStyle: 'italic', fontWeight: 400 }}>live</em>.
          </h1>
          <p style={{ fontSize: 19, color: 'var(--ink-3)', marginTop: 28, maxWidth: 620, lineHeight: 1.5 }}>
            opengithub is an open-source forge built around the unfashionable idea that reading code should feel as good as writing it. Self-hosted, fast, considered.
          </p>
          <div className="row" style={{ gap: 12, marginTop: 36 }}>
            <button className="btn primary lg" onClick={() => go('login')}>Get started{I.arrow_r}</button>
            <button className="btn lg">Read the docs</button>
          </div>
          <div className="row" style={{ gap: 28, marginTop: 56, color: 'var(--ink-3)', fontSize: 13 }}>
            <span className="row" style={{ gap: 8 }}>{I.star}<span className="t-num">4,218 stars</span></span>
            <span className="row" style={{ gap: 8 }}>{I.fork}<span className="t-num">142 forks</span></span>
            <span className="row" style={{ gap: 8 }}>{I.user}<span className="t-num">39 contributors</span></span>
            <span style={{ marginLeft: 'auto' }}>MIT · self-host · or use ours</span>
          </div>
        </section>

        {/* Visual demo */}
        <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 80px' }}>
          <div style={{
            border: '1px solid var(--line-strong)', borderRadius: 16, overflow: 'hidden',
            background: 'var(--surface)', boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ height: 36, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#e6655c' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#e6c45c' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#7fc26b' }} />
              <span style={{ marginLeft: 12, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>opengithub.dev/ashley/opengithub</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 420 }}>
              <div style={{ borderRight: '1px solid var(--line)', padding: 16, background: 'var(--surface-2)' }}>
                <div className="t-label" style={{ marginBottom: 10 }}>Files</div>
                {['crates/', 'web/', 'docs/', '.github/', 'README.md', 'Cargo.toml'].map((f, i) => (
                  <div key={f} style={{ padding: '5px 6px', fontSize: 12.5, fontFamily: 'var(--mono)', color: i < 4 ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                    {i < 4 ? '▸ ' : '  '}{f}
                  </div>
                ))}
              </div>
              <div style={{ padding: 32 }}>
                <div className="t-h1" style={{ fontSize: 28 }}>opengithub</div>
                <p style={{ color: 'var(--ink-3)', marginTop: 8 }}>A calmer place for code to live. Self-hosted, fast, and considered.</p>
                <div style={{ marginTop: 20, padding: 14, background: 'var(--surface-2)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink-4)' }}>$</span> cargo install opengithub
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
            <div className="t-label">Principles</div>
            <h2 className="t-h1" style={{ marginTop: 12, maxWidth: 720 }}>Built around the file. Quiet by default. Fast because it has to be.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 48 }}>
              {[
                { i: I.file, h: 'File-first navigation', p: 'The codebase is the artifact. Tree, blame, history, and review all anchor to it.' },
                { i: I.bell, h: 'An inbox that triages', p: 'Group by repo, by urgency, by what you actually own. Snooze. Done. Move on.' },
                { i: I.flame, h: 'Reviews with context', p: 'See ownership, prior art, and adjacent changes without leaving the diff.' },
                { i: I.command, h: 'Keyboard-native', p: 'Every action behind ⌘K. j/k everywhere. Touch the mouse only when you want to.' },
                { i: I.book, h: 'Open source', p: 'MIT licensed. Self-host on a $5 box. No telemetry, no upsell, no SaaS lock-in.' },
                { i: I.sparkle, h: 'Considered defaults', p: 'Sensible settings out of the box, so you spend time on code instead of configuration.' },
              ].map(f => (
                <div key={f.h}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{f.i}</div>
                  <h3 className="t-h3" style={{ marginTop: 16 }}>{f.h}</h3>
                  <p style={{ color: 'var(--ink-3)', marginTop: 6, fontSize: 14 }}>{f.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 32px' }}>
          <div className="row" style={{ alignItems: 'flex-end', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <h2 className="t-h1">Two ways in.</h2>
            </div>
            <p style={{ color: 'var(--ink-3)', maxWidth: 360 }}>Run it on your own metal, or use the hosted instance and skip the setup.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 36 }}>
            <div className="card" style={{ padding: 32 }}>
              <div className="t-label">Hosted</div>
              <div className="t-display" style={{ fontSize: 36, marginTop: 6 }}>opengithub.dev</div>
              <p style={{ color: 'var(--ink-3)', marginTop: 10 }}>Sign in, push, share. Free for public projects.</p>
              <button className="btn primary" style={{ marginTop: 20 }} onClick={() => go('login')}>Sign in with Google{I.arrow_r}</button>
            </div>
            <div className="card" style={{ padding: 32, background: 'var(--ink-1)', color: 'var(--bg)', borderColor: 'var(--ink-1)' }}>
              <div className="t-label" style={{ color: 'var(--ink-5)' }}>Self-host</div>
              <div className="t-display" style={{ fontSize: 36, marginTop: 6 }}>One binary, one box.</div>
              <p style={{ color: 'var(--ink-5)', marginTop: 10 }}>Compile from source or grab a release. Postgres + a static dir is enough.</p>
              <div style={{ marginTop: 20, padding: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                $ cargo install opengithub
              </div>
            </div>
          </div>
        </section>

        <footer style={{ borderTop: '1px solid var(--line)', padding: '32px', color: 'var(--ink-4)', fontSize: 13, display: 'flex', justifyContent: 'space-between', maxWidth: 1240, margin: '0 auto' }}>
          <span>© 2026 opengithub · MIT</span>
          <span>Made by people who like reading code.</span>
        </footer>
      </main>
    </div>
  );
}

function Login() {
  const { go } = useRoute();
  return (
    <div className="page-enter" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg)' }}>
      <div style={{ padding: '56px 64px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => go('landing')} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
          <Logo size={22} />
          <span style={{ fontFamily: 'var(--display)', fontSize: 18 }}>opengithub</span>
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 380 }}>
          <div className="t-label">Sign in</div>
          <h1 className="t-h1" style={{ fontSize: 40, marginTop: 8 }}>Welcome back.</h1>
          <p style={{ color: 'var(--ink-3)', marginTop: 12 }}>Continue with your work account. We don't store passwords.</p>

          <button className="btn lg" style={{ marginTop: 32, justifyContent: 'center', height: 46, fontSize: 14, gap: 10 }} onClick={() => go('dashboard')}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92a8.78 8.78 0 0 0 2.68-6.61z"/>
              <path fill="#34A853" d="M9 18a8.59 8.59 0 0 0 5.96-2.18l-2.92-2.26a5.4 5.4 0 0 1-8.05-2.84H.96v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.99 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.03-2.33z"/>
              <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.59A8.65 8.65 0 0 0 9 0a9 9 0 0 0-8.04 4.95l3.03 2.33A5.4 5.4 0 0 1 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
          <button className="btn lg" style={{ marginTop: 12, justifyContent: 'center', height: 46, fontSize: 14, gap: 10, background: 'var(--ink-1)', color: 'var(--bg)', borderColor: 'var(--ink-1)' }} onClick={() => go('dashboard')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 0 0-2.5 15.6c.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3.1-1.8 3.8-3.6 4 .3.3.6.8.6 1.6v2.3c0 .2.1.5.5.4A8 8 0 0 0 8 0z"/></svg>
            Continue with terminal
          </button>

          <p style={{ color: 'var(--ink-4)', fontSize: 12, marginTop: 32 }}>
            By signing in you agree to our <a style={{ textDecoration: 'underline' }}>terms</a> and <a style={{ textDecoration: 'underline' }}>privacy</a>. We don't sell your data, ever.
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--ink-1)', color: 'var(--bg)', padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundImage: 'radial-gradient(circle at 30% 20%, oklch(0.30 0.10 32) 0%, transparent 50%)' }}>
        <div style={{ alignSelf: 'flex-end', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-5)' }}>v0.6 · 8a4f2c1</div>
        <blockquote style={{ margin: 0 }}>
          <p className="t-display" style={{ fontSize: 32, lineHeight: 1.25, fontStyle: 'italic', fontWeight: 400 }}>
            "I forgot how much I'd missed reviewing code that didn't fight back."
          </p>
          <footer style={{ marginTop: 24, color: 'var(--ink-5)', fontSize: 14 }}>— Mira H., open-source maintainer</footer>
        </blockquote>
      </div>
    </div>
  );
}

function Dashboard() {
  const { go } = useRoute();
  return (
    <div className="page-enter">
      <TopBar />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '32px' }}>
        <div className="row" style={{ alignItems: 'flex-end', marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            <div className="t-label">Tuesday, 21 April</div>
            <h1 className="t-h1" style={{ marginTop: 6 }}>Good morning, Ashley.</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn">{I.plus}New repository</button>
          </div>
        </div>

        {/* Top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { k: '4', label: 'Awaiting your review', sub: '1 urgent', go: 'pulls' },
            { k: '7', label: 'Issues assigned', sub: '2 in v0.7', go: 'issues' },
            { k: '12', label: 'Unread notifications', sub: '5 mentions', go: 'notifications' },
            { k: '1', label: 'Failing checks', sub: 'on main', go: 'actions' },
          ].map(s => (
            <button key={s.label} className="card" style={{ padding: 16, textAlign: 'left' }} onClick={() => go(s.go)}>
              <div className="t-display t-num" style={{ fontSize: 36, lineHeight: 1 }}>{s.k}</div>
              <div className="t-sm" style={{ marginTop: 8, fontWeight: 500 }}>{s.label}</div>
              <div className="t-xs">{s.sub}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div>
            <div className="row" style={{ marginBottom: 12 }}>
              <h2 className="t-h3" style={{ flex: 1 }}>Awaiting your review</h2>
              <button className="btn ghost sm" onClick={() => go('pulls')}>See all{I.arrow_r}</button>
            </div>
            <div className="card">
              {OG_PRS.filter(p => p.state === 'open').slice(0, 4).map(pr => (
                <div key={pr.n} className="list-row" onClick={() => go('pr_detail')}>
                  <span style={{ color: 'var(--ok)' }}>{I.pr_open}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{pr.title}</span>
                      {pr.labels.slice(0, 1).map(l => <span key={l} className="chip soft" style={{ fontSize: 11, height: 18 }}>{l}</span>)}
                    </div>
                    <div className="t-xs" style={{ marginTop: 3 }}>
                      <span className="t-mono-sm">#{pr.n}</span> · {pr.author} opened · updated {pr.updated}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 12, color: 'var(--ink-3)', fontSize: 12 }}>
                    <span className="row" style={{ gap: 4 }}><span style={{ color: 'var(--ok)' }}>+{pr.additions}</span><span style={{ color: 'var(--err)' }}>−{pr.deletions}</span></span>
                    <span className="row" style={{ gap: 4 }}>{I.comment}{pr.comments}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="row" style={{ marginTop: 32, marginBottom: 12 }}>
              <h2 className="t-h3" style={{ flex: 1 }}>Recent repositories</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {OG_REPOS.slice(0, 4).map(r => (
                <button key={r.name} className="card" style={{ padding: 16, textAlign: 'left' }}
                  onClick={() => r.name === 'opengithub' && go('repo')}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ color: 'var(--ink-3)' }}>{I.book}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{r.owner} /</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span>
                    {r.private && <span className="chip soft" style={{ fontSize: 10, height: 18 }}>private</span>}
                  </div>
                  <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 8, marginBottom: 12 }}>{r.desc}</p>
                  <div className="row" style={{ gap: 16, fontSize: 12, color: 'var(--ink-4)' }}>
                    <span className="row" style={{ gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: r.langColor }} />{r.lang}</span>
                    <span className="row" style={{ gap: 4 }}>{I.star}<span className="t-num">{r.stars.toLocaleString()}</span></span>
                    <span style={{ marginLeft: 'auto' }}>{r.updated}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside>
            <h2 className="t-h3" style={{ marginBottom: 12 }}>This week</h2>
            <div className="card" style={{ padding: 16 }}>
              <div className="t-display" style={{ fontSize: 32 }}>14<span style={{ color: 'var(--ink-4)', fontSize: 16 }}> commits</span></div>
              <div className="row" style={{ gap: 3, marginTop: 14, height: 36, alignItems: 'flex-end' }}>
                {[3, 1, 4, 2, 0, 0, 1, 5, 2, 3, 0, 4, 6, 2].map((v, i) => (
                  <div key={i} style={{ flex: 1, height: `${Math.max(2, v * 6)}px`, background: i === 12 ? 'var(--accent)' : 'var(--ink-2)', opacity: i === 12 ? 1 : 0.6 + v * 0.05, borderRadius: 1.5 }} />
                ))}
              </div>
              <div className="t-xs" style={{ marginTop: 8 }}>2 weeks · longest streak: 6 days</div>
            </div>

            <h2 className="t-h3" style={{ marginTop: 28, marginBottom: 12 }}>Pinned</h2>
            <div className="card">
              {[
                ['#310', 'Add ⌘K command palette', 'issue'],
                ['v0.7', 'Milestone · 8 of 14', 'milestone'],
                ['#421', 'Split route modules', 'pull'],
              ].map(([k, l, kind]) => (
                <div key={k} className="list-row" style={{ padding: '10px 14px' }}>
                  <span className="t-mono-sm" style={{ color: 'var(--ink-4)', minWidth: 38 }}>{k}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{l}</span>
                  <span className="t-xs">{kind}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Notifications() {
  const { go } = useRoute();
  const [filter, setFilter] = React.useState('unread');
  const [items, setItems] = React.useState(OG_NOTIFS);
  const filtered = filter === 'unread' ? items.filter(n => n.unread) : filter === 'all' ? items : items.filter(n => n.kind === 'review-request');
  const grouped = filtered.reduce((acc, n) => {
    (acc[n.repo] = acc[n.repo] || []).push(n);
    return acc;
  }, {});
  const markRead = (id) => setItems(items.map(n => n.id === id ? { ...n, unread: false } : n));
  const markAll = () => setItems(items.map(n => ({ ...n, unread: false })));

  const kindIcon = (k) => ({
    'review-request': <span style={{ color: 'var(--ok)' }}>{I.pr_open}</span>,
    'mention': <span style={{ color: 'var(--info)' }}>{I.comment}</span>,
    'comment': <span style={{ color: 'var(--ink-3)' }}>{I.comment}</span>,
    'check-fail': <span style={{ color: 'var(--err)' }}>{I.x}</span>,
  }[k]);

  return (
    <div className="page-enter">
      <TopBar />
      <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px' }}>
        <div className="row" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div className="t-label">Inbox</div>
            <h1 className="t-h1" style={{ marginTop: 6 }}>{filtered.length} {filter === 'unread' ? 'unread' : 'notifications'}</h1>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm" onClick={markAll}>{I.check}Mark all read</button>
            <button className="btn sm">{I.settings}</button>
          </div>
        </div>

        <div className="row" style={{ gap: 6, marginBottom: 16 }}>
          {[['unread', 'Unread'], ['all', 'All'], ['review-request', 'Review requests']].map(([id, label]) => (
            <button key={id} className={'chip' + (filter === id ? ' active' : ' soft')} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="t-xs">Grouped by repository</span>
        </div>

        {Object.entries(grouped).map(([repo, list]) => (
          <div key={repo} style={{ marginBottom: 24 }}>
            <div className="row" style={{ gap: 8, padding: '8px 0', color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--mono)' }}>
              {I.book}
              <span>{repo}</span>
              <span style={{ flex: 1 }} />
              <span>{list.length}</span>
            </div>
            <div className="card">
              {list.map(n => (
                <div key={n.id} className="list-row" onClick={() => { markRead(n.id); n.kind === 'review-request' && n.n === 421 ? go('pr_detail') : go('pr_detail'); }}>
                  {n.unread && <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)', flexShrink: 0 }} />}
                  {!n.unread && <div style={{ width: 6 }} />}
                  {kindIcon(n.kind)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: n.unread ? 500 : 400 }}>
                      {n.title} <span className="t-mono-sm" style={{ color: 'var(--ink-4)' }}>#{n.n}</span>
                    </div>
                    <div className="t-xs" style={{ marginTop: 3 }}>
                      {n.kind === 'review-request' && `${n.who} requested your review`}
                      {n.kind === 'mention' && `${n.who} mentioned you`}
                      {n.kind === 'comment' && `${n.who} commented`}
                      {n.kind === 'check-fail' && `Checks failed on ${n.who}`}
                    </div>
                  </div>
                  {n.urgent && <span className="chip accent" style={{ fontSize: 11, height: 20 }}>urgent</span>}
                  <span className="t-xs" style={{ minWidth: 70, textAlign: 'right' }}>{n.when}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 56, textAlign: 'center' }}>
            <div className="t-display" style={{ fontSize: 28 }}>Inbox zero.</div>
            <p style={{ color: 'var(--ink-3)', marginTop: 6 }}>Touch grass.</p>
          </div>
        )}
      </main>
    </div>
  );
}

Object.assign(window, { Landing, Login, Dashboard, Notifications });
