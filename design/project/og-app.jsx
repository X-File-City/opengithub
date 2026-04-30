// og-app.jsx — root, routes all screens, tweaks panel

const OG_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "editorial",
  "density": "regular"
}/*EDITMODE-END*/;

function applyTweaks(t) {
  // clear all theme classes first, then apply the chosen one
  document.body.classList.remove('theme-dark', 'theme-terminal', 'theme-studio');
  if (t.theme === 'editorial-dark') document.body.classList.add('theme-dark');
  if (t.theme === 'terminal') document.body.classList.add('theme-terminal');
  if (t.theme === 'studio') document.body.classList.add('theme-studio');
  document.body.classList.toggle('density-compact', t.density === 'compact');
  // clear inline accent overrides from prior versions
  document.documentElement.style.removeProperty('--accent');
  document.documentElement.style.removeProperty('--accent-hover');
  document.documentElement.style.removeProperty('--accent-soft');
}

function App() {
  const [tweaks, setTweak] = useTweaks(OG_TWEAK_DEFAULTS);
  React.useEffect(() => applyTweaks(tweaks), [tweaks]);

  return (
    <Router>
      <Inner />
      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakSelect
            label="Aesthetic"
            value={tweaks.theme}
            options={[
              { label: 'Editorial — warm, serious', value: 'editorial' },
              { label: 'Editorial · dark', value: 'editorial-dark' },
              { label: 'Terminal — mono, dark', value: 'terminal' },
              { label: 'Studio — crisp, modern', value: 'studio' },
            ]}
            onChange={v => setTweak('theme', v)}
          />
          <TweakRadio
            label="Density"
            value={tweaks.density}
            options={[{ label: 'Regular', value: 'regular' }, { label: 'Compact', value: 'compact' }]}
            onChange={v => setTweak('density', v)}
          />
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: 4 }}>
            Same 11 screens · three personalities. Try the same flow in each.
          </div>
        </TweakSection>
        <TweakSection title="Navigate">
          <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            Press <span className="kbd">⌘K</span> anywhere to open the command palette.<br/>
            Click anything that looks like a link.
          </div>
          <Jumpbar />
        </TweakSection>
      </TweaksPanel>
    </Router>
  );
}

function Jumpbar() {
  const { go } = useRoute() || {};
  if (!go) return null;
  const screens = [
    ['landing', 'Landing'],
    ['login', 'Login'],
    ['dashboard', 'Dashboard'],
    ['notifications', 'Inbox'],
    ['repo', 'Repo home'],
    ['file', 'File viewer'],
    ['pulls', 'Pulls list'],
    ['pr_detail', 'PR detail'],
    ['pr_diff', 'PR diff'],
    ['issues', 'Issues list'],
    ['actions', 'Actions run'],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 10 }}>
      {screens.map(([n, l]) => (
        <button key={n} onClick={() => go(n)}
          style={{
            padding: '6px 8px', borderRadius: 6,
            border: '1px solid var(--line, #e2dccd)',
            background: 'var(--surface, #fff)',
            fontSize: 11.5, textAlign: 'left',
            color: 'var(--ink-2, #2a2a2a)',
          }}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Inner() {
  const { route } = useRoute();
  const screens = {
    landing: <Landing />,
    login: <Login />,
    dashboard: <Dashboard />,
    notifications: <Notifications />,
    repo: <Repo />,
    file: <FileView />,
    pulls: <PullsList />,
    pr_detail: <PRDetail />,
    pr_diff: <PRDiff />,
    issues: <IssuesList />,
    actions: <ActionsRun />,
  };
  return (
    <>
      <div key={route.name}>{screens[route.name] || <Landing />}</div>
      <CommandPalette />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
