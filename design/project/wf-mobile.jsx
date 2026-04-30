// wf-mobile.jsx — Mobile follow-up

const PhoneFrame = ({ children, label }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, background: 'var(--paper-2)' }}>
    <div style={{ width: 200, height: 380, border: '2px solid var(--ink)', borderRadius: 18, background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ height: 16, background: 'var(--paper)', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
        <Mono style={{ fontSize: 8 }}>9:41</Mono>
        <Mono style={{ fontSize: 8 }}>● ●●</Mono>
      </div>
      {children}
    </div>
    {label && <Mono style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 6 }}>{label}</Mono>}
  </div>
);

const Mob_Dash = () => (
  <Frame>
    <PhoneFrame label="dashboard">
      <div style={{ padding: 8 }}>
        <Hand size={16}>good morning</Hand>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {['4 reviews', '7 issues', '12 unread'].map(t => <Box key={t} style={{ flex: 1, padding: 4 }}><Mono style={{ fontSize: 8 }}>{t}</Mono></Box>)}
        </div>
        <Hand size={12} style={{ marginTop: 8 }}>recent</Hand>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="row gap-4" style={{ padding: 3, borderBottom: '1px dashed var(--line-soft)' }}>
            <Glyph ch={['↗', '○', '💬', '✗'][i]} sm />
            <Mono style={{ fontSize: 8, flex: 1 }}>#{421 - i}</Mono>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, borderTop: '1.5px solid var(--line)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {['◰', '○', '↗', '⊠', '☰'].map((c, i) => <span key={i} style={{ fontFamily: 'var(--hand)', fontSize: 14, opacity: i === 0 ? 1 : 0.5 }}>{c}</span>)}
      </div>
    </PhoneFrame>
  </Frame>
);

const Mob_Repo = () => (
  <Frame>
    <PhoneFrame label="repo · code tab">
      <div style={{ padding: 6 }}>
        <Mono style={{ fontSize: 9, fontWeight: 700 }}>ashley/opengithub</Mono>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, fontFamily: 'var(--mono)', fontSize: 8 }}>
          {['code', 'issues', 'pulls', '...'].map((t, i) => <span key={t} style={{ padding: '2px 4px', borderBottom: i === 0 ? '2px solid var(--accent)' : '1px solid transparent' }}>{t}</span>)}
        </div>
        <Box soft style={{ padding: 3, marginTop: 6 }}><Mono style={{ fontSize: 8 }}>⌥ main ▾</Mono></Box>
        {['📁 crates', '📁 web', '📁 docs', '📄 README.md', '📄 Cargo.toml'].map(f => (
          <Mono key={f} style={{ display: 'block', padding: '2px 0', fontSize: 9 }}>{f}</Mono>
        ))}
      </div>
    </PhoneFrame>
  </Frame>
);

const Mob_PR = () => (
  <Frame>
    <PhoneFrame label="pr detail">
      <div style={{ padding: 6 }}>
        <Mono style={{ fontSize: 8, color: 'var(--ink-3)' }}>#421</Mono>
        <Hand size={13}>split route modules</Hand>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <Chip style={{ background: '#d4f4dd', fontSize: 8 }}>open</Chip>
          <Chip soft style={{ fontSize: 8 }}>+412 −89</Chip>
        </div>
        <Box accent style={{ padding: 4, marginTop: 6 }}>
          <Mono style={{ fontSize: 8 }}>✓ ready to merge</Mono>
        </Box>
        <div style={{ marginTop: 6 }}>
          {['files (12)', 'commits (8)', 'checks ✓'].map(t => (
            <div key={t} className="row gap-4" style={{ padding: 3, borderBottom: '1px dashed var(--line-soft)' }}>
              <Mono style={{ fontSize: 9, flex: 1 }}>{t}</Mono><span>›</span>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  </Frame>
);

const Mob_Inbox = () => (
  <Frame>
    <PhoneFrame label="inbox · swipe to triage">
      <div style={{ padding: 6 }}>
        <Hand size={14}>inbox · 12</Hand>
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} style={{ padding: 4, marginTop: 4, borderLeft: i < 3 ? '3px solid var(--accent)' : '3px solid transparent' }}>
            <Mono style={{ fontSize: 8 }}>#{421 - i} · {['split routes', 'cancel logs', 'comment'][i % 3]}</Mono>
            <Mono style={{ fontSize: 7, color: 'var(--ink-3)', display: 'block', marginTop: 1 }}>opengithub · {i + 1}h</Mono>
          </Box>
        ))}
      </div>
    </PhoneFrame>
  </Frame>
);

Object.assign(window, { Mob_Dash, Mob_Repo, Mob_PR, Mob_Inbox });
