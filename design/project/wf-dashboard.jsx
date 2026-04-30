// wf-dashboard.jsx — Personal dashboard + global inbox

const Dash_A = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 130, borderRight: '1.5px solid var(--line)', padding: 8 }}>
        <Lbl>top repos</Lbl>
        {['ashley/opengithub', 'namuh-eng/ralph', 'ashley/dotfiles'].map(r => (
          <div key={r} className="row gap-4" style={{ padding: '3px 0' }}>
            <Avatar ch={r[0].toUpperCase()} size="sm" />
            <Mono style={{ fontSize: 9 }}>{r}</Mono>
          </div>
        ))}
        <HR dashed />
        <Lbl>teams</Lbl>
        {['namuh-eng/core', 'ashley/personal'].map(t => <Mono key={t} style={{ display: 'block', fontSize: 9, padding: '2px 0' }}>{t}</Mono>)}
      </div>
      <div style={{ flex: 1, padding: 10 }}>
        <Hand size={20}>good morning, ashley.</Hand>
        <div className="row gap-6" style={{ marginTop: 8 }}>
          <Box style={{ flex: 1, padding: 6 }}><Lbl>review requested</Lbl><Hand size={22}>4</Hand></Box>
          <Box style={{ flex: 1, padding: 6 }}><Lbl>assigned issues</Lbl><Hand size={22}>7</Hand></Box>
          <Box style={{ flex: 1, padding: 6 }}><Lbl>unread</Lbl><Hand size={22} style={{ color: 'var(--accent)' }}>12</Hand></Box>
        </div>
        <Hand size={14} style={{ marginTop: 12 }}>activity feed</Hand>
        <div className="rail" style={{ marginTop: 6 }}>
          {['jaeyun pushed to ashley/opengithub · main', 'misha opened issue #418', 'pages.yml succeeded on staging', 'ashley/dotfiles released v1.2'].map((t, i) => (
            <div key={i} className="item"><span className="dot" /><Mono style={{ paddingLeft: 4, fontSize: 10 }}>{t}</Mono></div>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

const Dash_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <Hand size={20}>today · 4 things waiting on you</Hand>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
        {[
          ['↗', 'review #421 · split routes', 'jaeyun · 2h ago'],
          ['○', 'fix · stream cancel logs', 'assigned · #418'],
          ['💬', '3 new comments on #412', 'misha tagged you'],
          ['✗', 'ci failed on staging', '12m ago'],
        ].map(([ic, h, sub], i) => (
          <Box key={i} style={{ padding: 8 }}>
            <div className="row gap-4"><Glyph ch={ic} sm /><Hand size={14} style={{ flex: 1 }}>{h}</Hand></div>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, display: 'block' }}>{sub}</Mono>
          </Box>
        ))}
      </div>
      <HR dashed />
      <Hand size={14}>repos</Hand>
      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
        {['opengithub', 'ralph', 'dotfiles', 'notes', 'web-archive'].map(r => <Chip soft key={r}>{r}</Chip>)}
      </div>
    </div>
    <Sticker rotate={3}>inbox-as-dashboard</Sticker>
  </Frame>
);

const Dash_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <Hand size={20}>this week</Hand>
      <Box dashed style={{ padding: 8, marginTop: 6 }}>
        <Lbl>contribution graph</Lbl>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(28, 1fr)', gap: 2, marginTop: 6 }}>
          {Array.from({ length: 84 }, (_, i) => {
            const lvl = (i * 7) % 5;
            const c = ['transparent', '#dbe8c8', '#a8d28a', '#5fa84a', '#2e7028'][lvl];
            return <div key={i} style={{ height: 10, background: c, border: '1px solid var(--line-soft)' }} />;
          })}
        </div>
      </Box>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Box style={{ flex: 1, padding: 6 }}>
          <Lbl>pulls open</Lbl><Hand size={22}>4</Hand>
          <div className="bar accent" style={{ width: '60%' }} />
        </Box>
        <Box style={{ flex: 1, padding: 6 }}>
          <Lbl>commits / wk</Lbl><Hand size={22}>87</Hand>
          <div className="bar" style={{ width: '80%' }} />
        </Box>
        <Box style={{ flex: 1, padding: 6 }}>
          <Lbl>streak</Lbl><Hand size={22}>14d</Hand>
          <div className="bar soft" style={{ width: '50%' }} />
        </Box>
      </div>
    </div>
    <Sticker rotate={-3}>activity-led</Sticker>
  </Frame>
);

const Dash_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <Hand size={20}>jump back in</Hand>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 6 }}>
        {['ashley/opengithub · main', 'namuh-eng/ralph · jh/qa', 'ashley/dotfiles'].map(r => (
          <Box key={r} soft style={{ padding: 6 }}>
            <Mono style={{ fontSize: 10 }}>{r}</Mono>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)', display: 'block', marginTop: 2 }}>last visit · 2h</Mono>
          </Box>
        ))}
      </div>
      <Hand size={14} style={{ marginTop: 10 }}>what's new across your repos</Hand>
      <div style={{ marginTop: 4 }}>
        {['ralph: 12 commits since friday', 'opengithub: 3 new PRs', 'dotfiles: deps updated'].map(t => (
          <div key={t} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
            <Glyph ch="•" sm /><Mono style={{ fontSize: 10 }}>{t}</Mono>
          </div>
        ))}
      </div>
    </div>
    <Sticker rotate={4}>recent-work</Sticker>
  </Frame>
);

const Notif_A = () => (
  <Frame>
    <AppHeader crumbs="/notifications" />
    <div className="row" style={{ padding: 6, borderBottom: '1.5px solid var(--line)', gap: 6 }}>
      <Chip active>inbox · 12</Chip><Chip soft>saved</Chip><Chip soft>done</Chip>
      <div style={{ flex: 1 }} /><Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>group: repository ▾</Mono>
    </div>
    {['ashley/opengithub', 'namuh-eng/ralph'].map((repo, ri) => (
      <Box key={repo} style={{ padding: 0, marginTop: 4 }}>
        <div style={{ background: 'var(--paper-2)', padding: '4px 8px' }}><Mono style={{ fontSize: 10 }}>{repo}</Mono></div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
            <span className="check" style={{ background: i === 0 && ri === 0 ? 'var(--accent)' : 'transparent' }} />
            <Glyph ch={['↗', '○', '💬'][i]} sm />
            <Mono style={{ flex: 1, fontSize: 10 }}>{['split route modules', 'logs not streaming', 'misha replied'][i]}</Mono>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>2h</Mono>
          </div>
        ))}
      </Box>
    ))}
  </Frame>
);

const Notif_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <div className="row between"><Hand size={18}>inbox · 12</Hand><div className="row gap-4"><Btn sm>✓ all done</Btn><Btn sm>filter</Btn></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 8 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <Box key={i} style={{ padding: 6, borderLeft: i < 4 ? '3px solid var(--accent)' : '3px solid transparent' }}>
            <div className="row gap-4">
              <Glyph ch={['↗', '○', '💬', '✗'][i % 4]} sm />
              <Mono style={{ flex: 1, fontSize: 10 }}>#{421 - i} {['split routes', 'logs', 'comment', 'ci'][i % 4]}</Mono>
            </div>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)', display: 'block', marginTop: 2 }}>ashley/opengithub · 2h</Mono>
          </Box>
        ))}
      </div>
    </div>
    <Sticker rotate={3}>tile triage</Sticker>
  </Frame>
);

const Notif_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 130, borderRight: '1.5px solid var(--line)', padding: 6 }}>
        <Lbl>filters</Lbl>
        {['mentions', 'review-requested', 'assigned', 'team', 'subscribed'].map((f, i) => <SideItem key={f} ch="●" label={f} active={i === 0} count={[3, 4, 2, 1, 5][i]} />)}
      </div>
      <div style={{ flex: 1, padding: 6 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
            <span className="check" />
            <Mono style={{ fontSize: 10, flex: 1 }}>{['split routes', 'logs not streaming', 'comment by misha'][i % 3]}</Mono>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>2h</Mono>
          </div>
        ))}
      </div>
    </div>
    <Sticker rotate={-3}>filter rail</Sticker>
  </Frame>
);

const Notif_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>triage · today</Hand>
      <Box soft style={{ padding: 6, marginTop: 6 }}>
        <Mono style={{ fontSize: 9 }}>swipe ←/→ to mark done · ↓/↑ to navigate · keyboard hints below</Mono>
      </Box>
      <Box style={{ marginTop: 8, padding: 8 }}>
        <div className="row gap-6"><Glyph ch="↗" /><Mono style={{ fontSize: 11 }}>review #421 · split routes</Mono></div>
        <div className="row gap-4" style={{ marginTop: 8 }}>
          <Btn sm>e · done</Btn><Btn sm>s · save</Btn><Btn sm>m · mute</Btn>
        </div>
      </Box>
      <Mono style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 6, display: 'block' }}>11 more →</Mono>
    </div>
    <Sticker rotate={4}>one-at-a-time triage</Sticker>
  </Frame>
);

Object.assign(window, {
  Dash_A, Dash_B, Dash_C, Dash_D,
  Notif_A, Notif_B, Notif_C, Notif_D,
});
