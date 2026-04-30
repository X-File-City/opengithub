// og-shell.jsx — top bar, sidebar, command palette, router

const RouteCtx = React.createContext(null);

function useRoute() {
  return React.useContext(RouteCtx);
}

function Router({ children }) {
  const [route, setRoute] = React.useState({ name: 'landing', params: {} });
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  const go = React.useCallback((name, params = {}) => {
    setRoute({ name, params });
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <RouteCtx.Provider value={{ route, go, paletteOpen, setPaletteOpen }}>
      {children}
    </RouteCtx.Provider>
  );
}

function TopBar({ inApp = true }) {
  const { go, setPaletteOpen, route } = useRoute();
  return (
    <header style={{
      height: 'var(--header-h)', display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 16,
      borderBottom: '1px solid var(--line)',
      background: 'var(--surface)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <button onClick={() => go(inApp ? 'dashboard' : 'landing')} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo size={22} />
        <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em' }}>opengithub</span>
      </button>

      {inApp && (
        <>
          <div className="div-v" style={{ height: 18, opacity: 0.5 }} />
          <nav style={{ display: 'flex', gap: 4 }}>
            {[
              ['dashboard', 'Home'],
              ['pulls', 'Pulls'],
              ['issues', 'Issues'],
              ['notifications', 'Inbox'],
            ].map(([n, label]) => (
              <button key={n} onClick={() => go(n)}
                style={{
                  padding: '6px 10px', borderRadius: 'var(--radius)',
                  fontSize: 13, fontWeight: 500,
                  color: route.name === n ? 'var(--ink-1)' : 'var(--ink-3)',
                  background: route.name === n ? 'var(--surface-2)' : 'transparent',
                }}>
                {label}
              </button>
            ))}
          </nav>
        </>
      )}

      <div style={{ flex: 1 }} />

      {inApp ? (
        <>
          <button onClick={() => setPaletteOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0 10px 0 12px', height: 32,
              border: '1px solid var(--line-strong)', borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--ink-3)',
              fontSize: 13,
              minWidth: 280,
            }}>
            {I.search}
            <span>Search code, repos, people…</span>
            <span style={{ flex: 1 }} />
            <span className="kbd">⌘K</span>
          </button>
          <button className="btn ghost" style={{ padding: 6, height: 32, width: 32 }}>{I.bell}</button>
          <button className="btn ghost" style={{ padding: 6, height: 32, width: 32 }}>{I.plus}</button>
          <div className="av sm" style={{ width: 28, height: 28, fontSize: 11 }}>{OG_USER.avatar}</div>
        </>
      ) : (
        <>
          <a href="#docs" style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 500 }}>Docs</a>
          <a href="#changelog" style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 500 }}>Changelog</a>
          <a href="#pricing" style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 500 }}>Self-host</a>
          <button className="btn" onClick={() => go('login')}>Sign in</button>
          <button className="btn primary" onClick={() => go('login')}>Get started</button>
        </>
      )}
    </header>
  );
}

function CommandPalette() {
  const { paletteOpen, setPaletteOpen, go } = useRoute();
  const [q, setQ] = React.useState('');
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (paletteOpen) {
      setQ('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [paletteOpen]);

  if (!paletteOpen) return null;

  const items = [
    { section: 'Go to', list: [
      { ico: I.book, label: 'ashley/opengithub', desc: 'repository', go: () => go('repo') },
      { ico: I.pr_open, label: 'Pull requests', desc: 'all open', go: () => go('pulls') },
      { ico: I.issue_open, label: 'Issues', desc: 'all open', go: () => go('issues') },
      { ico: I.bell, label: 'Inbox', desc: '12 unread', go: () => go('notifications') },
      { ico: I.play, label: 'Actions · CI #1184', desc: 'running', go: () => go('actions') },
    ]},
    { section: 'Recent', list: [
      { ico: I.pr_open, label: '#421 · Split route modules', desc: 'pull · open', go: () => go('pr_detail') },
      { ico: I.file, label: 'crates/opengithub-web/src/main.rs', desc: 'file', go: () => go('file') },
      { ico: I.issue_open, label: '#310 · Add ⌘K command palette', desc: 'issue · open', go: () => go('issues') },
    ]},
    { section: 'Actions', list: [
      { ico: I.plus, label: 'New repository', desc: 'create', go: () => {} },
      { ico: I.settings, label: 'Settings', desc: 'preferences', go: () => {} },
    ]},
  ];

  const flat = items.flatMap(s => s.list);
  const filtered = q ? flat.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) : flat;
  const display = q
    ? [{ section: 'Results', list: filtered }]
    : items;

  const onKey = (e) => {
    const total = filtered.length || flat.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % total); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => (s - 1 + total) % total); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const list = q ? filtered : flat;
      const item = list[sel];
      if (item) { item.go(); setPaletteOpen(false); }
    }
  };

  let i = 0;
  return (
    <div className="palette-backdrop" onClick={() => setPaletteOpen(false)}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-input">
          {I.search}
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey}
            placeholder="Search anywhere — repos, files, issues, people…" />
          <span className="kbd">esc</span>
        </div>
        <div className="palette-list">
          {display.map(s => (
            <div key={s.section}>
              <div className="palette-section">{s.section}</div>
              {s.list.map(item => {
                const idx = i++;
                return (
                  <div key={idx} className={'palette-item' + (idx === sel ? ' selected' : '')}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => { item.go(); setPaletteOpen(false); }}>
                    <span className="ico">{item.ico}</span>
                    <span>{item.label}</span>
                    <span className="desc">{item.desc}</span>
                  </div>
                );
              })}
              {s.list.length === 0 && <div style={{ padding: 16, color: 'var(--ink-4)', fontSize: 13 }}>Nothing matches "{q}".</div>}
            </div>
          ))}
        </div>
        <div style={{
          padding: '8px 12px', borderTop: '1px solid var(--line)',
          display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-4)',
        }}>
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span style={{ marginLeft: 'auto' }}>opengithub</span>
        </div>
      </div>
    </div>
  );
}

function RepoSubnav({ active = 'code' }) {
  const { go } = useRoute();
  const tabs = [
    ['code', 'Code', I.book, null],
    ['issues', 'Issues', I.issue_open, 24],
    ['pulls', 'Pulls', I.pr_open, 6],
    ['actions', 'Actions', I.play, null],
    ['discussions', 'Discussions', I.comment, null],
    ['settings', 'Settings', I.settings, null],
  ];
  return (
    <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)', padding: '0 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, paddingTop: 18 }}>
        <div style={{ flex: 1 }}>
          <div className="row" style={{ gap: 10, color: 'var(--ink-3)', fontSize: 13 }}>
            <button onClick={() => go('dashboard')} style={{ color: 'var(--ink-3)' }}>ashley</button>
            <span>/</span>
            <button onClick={() => go('repo')} style={{ color: 'var(--ink-1)', fontWeight: 600 }}>opengithub</button>
            <span className="chip soft" style={{ height: 20, fontSize: 11 }}>public</span>
          </div>
          <div className="t-h2" style={{ marginTop: 4 }}>opengithub</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm">{I.eye}<span>Watch</span><span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>· 84</span></button>
          <button className="btn sm">{I.fork}<span>Fork</span><span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>· 142</span></button>
          <button className="btn sm">{I.star}<span>Star</span><span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>· 4.2k</span></button>
        </div>
      </div>
      <div className="tabs" style={{ borderBottom: 'none', marginTop: 16 }}>
        {tabs.map(([id, label, icon, badge]) => (
          <div key={id} className={'tab' + (active === id ? ' active' : '')}
            onClick={() => {
              if (id === 'pulls') go('pulls');
              else if (id === 'issues') go('issues');
              else if (id === 'actions') go('actions');
              else if (id === 'code') go('repo');
            }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: active === id ? 'var(--ink-2)' : 'var(--ink-4)' }}>{icon}</span>
              {label}
              {badge != null && <span className="badge t-num">{badge}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Router, useRoute, TopBar, CommandPalette, RepoSubnav });
