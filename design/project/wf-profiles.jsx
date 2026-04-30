// wf-profiles.jsx — User & org profiles, teams

const Profile_A = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 150, padding: 10, borderRight: '1.5px solid var(--line)' }}>
        <Avatar ch="A" size="xl" />
        <Hand size={20} style={{ marginTop: 6 }}>ashley ha</Hand>
        <Mono style={{ fontSize: 10, color: 'var(--ink-3)', display: 'block' }}>@ashley</Mono>
        <div className="body-sm" style={{ marginTop: 6 }}>building things at namuh.</div>
        <Btn sm style={{ marginTop: 6, width: '100%' }}>follow</Btn>
        <HR dashed />
        <Mono style={{ fontSize: 9, display: 'block' }}>📍 san francisco</Mono>
        <Mono style={{ fontSize: 9, display: 'block' }}>🔗 namuh.co</Mono>
        <HR dashed />
        <Mono style={{ fontSize: 9 }}>42 followers · 18 following</Mono>
      </div>
      <div style={{ flex: 1, padding: 8 }}>
        <div className="row" style={{ borderBottom: '1.5px solid var(--line)' }}>
          {['overview', 'repositories · 24', 'projects', 'packages', 'stars'].map((t, i) => (
            <div key={t} style={{ padding: '4px 8px', fontFamily: 'var(--hand)', fontSize: 13, borderBottom: i === 0 ? '3px solid var(--accent)' : 'none' }}>{t}</div>
          ))}
        </div>
        <Hand size={14} style={{ marginTop: 8 }}>pinned</Hand>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
          {['opengithub', 'ralph', 'dotfiles', 'notes'].map(r => (
            <Box key={r} style={{ padding: 4 }}>
              <Mono style={{ fontSize: 10, fontWeight: 700 }}>{r}</Mono>
              <Mono style={{ fontSize: 9, color: 'var(--ink-3)', display: 'block', marginTop: 2 }}>★ {12 + r.length * 4} · rust</Mono>
            </Box>
          ))}
        </div>
        <Hand size={14} style={{ marginTop: 8 }}>contributions</Hand>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(40, 1fr)', gap: 1, marginTop: 4 }}>
          {Array.from({ length: 80 }, (_, i) => {
            const lvl = (i * 11) % 5;
            return <div key={i} style={{ height: 6, background: ['transparent', '#dbe8c8', '#a8d28a', '#5fa84a', '#2e7028'][lvl], border: '1px solid var(--line-soft)' }} />;
          })}
        </div>
      </div>
    </div>
  </Frame>
);

const Profile_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 12 }}>
      <Box dashed style={{ padding: 12, position: 'relative' }}>
        <div className="row gap-12">
          <Avatar ch="A" size="xl" />
          <div style={{ flex: 1 }}>
            <Hand size={26}>ashley ha</Hand>
            <Mono style={{ fontSize: 10, color: 'var(--ink-3)' }}>@ashley · 42 followers</Mono>
            <div className="body-sm" style={{ marginTop: 4 }}>building things at namuh.</div>
          </div>
          <div className="row gap-4"><Btn primary sm>follow</Btn><Btn sm>···</Btn></div>
        </div>
      </Box>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
        <Stat label="repos" value="24" />
        <Stat label="stars" value="138" />
        <Stat label="streak" value="14d" accent />
        <Stat label="commits" value="2.1k" />
      </div>
      <Hand size={14} style={{ marginTop: 10 }}>activity · last 30 days</Hand>
      <Ph h={50} label="commit timeline · per-repo" style={{ marginTop: 4 }} />
    </div>
    <Sticker rotate={3}>stat-led</Sticker>
  </Frame>
);

const Profile_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <div className="row gap-8">
        <Avatar ch="A" size="lg" />
        <div style={{ flex: 1 }}>
          <Hand size={18}>@ashley</Hand>
          <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>building at namuh · sf</Mono>
        </div>
        <Btn sm>follow</Btn>
      </div>
      <Hand size={14} style={{ marginTop: 10 }}>readme.md (profile)</Hand>
      <Box style={{ padding: 8, marginTop: 4 }}>
        <Hand size={20}>👋</Hand>
        <Ph h={70} label="custom profile readme rendered as markdown" style={{ marginTop: 4 }} />
      </Box>
    </div>
    <Sticker rotate={-3}>readme-as-bio</Sticker>
  </Frame>
);

const Profile_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={18}>@ashley · stream</Hand>
      <div className="rail" style={{ marginTop: 8 }}>
        {[
          'pushed 3 commits to opengithub · main',
          'opened PR #421 · split routes',
          'starred tokio-rs/axum',
          'released ralph v0.4',
          'commented on #418',
          'forked rust-lang/mdBook',
        ].map((t, i) => (
          <div key={i} className="item">
            <span className="dot" />
            <Mono style={{ paddingLeft: 4, fontSize: 10 }}>{t}</Mono>
            <Mono style={{ paddingLeft: 4, fontSize: 9, color: 'var(--ink-3)', display: 'block' }}>{i + 1}h ago</Mono>
          </div>
        ))}
      </div>
    </div>
    <Sticker rotate={4}>activity feed</Sticker>
  </Frame>
);

const Org_A = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <div className="row gap-8">
        <Avatar ch="N" size="xl" />
        <div style={{ flex: 1 }}>
          <Hand size={22}>namuh-eng</Hand>
          <div className="body-sm" style={{ color: 'var(--ink-3)' }}>shipping side projects, in the open.</div>
        </div>
        <div className="row gap-4"><Btn primary sm>+ new repo</Btn><Btn sm>follow</Btn></div>
      </div>
      <div className="row" style={{ marginTop: 8, borderBottom: '1.5px solid var(--line)' }}>
        {['overview', 'repos · 12', 'projects', 'packages', 'people · 4', 'teams · 2', 'settings'].map((t, i) => (
          <div key={t} style={{ padding: '4px 8px', fontFamily: 'var(--hand)', fontSize: 13, borderBottom: i === 0 ? '3px solid var(--accent)' : 'none' }}>{t}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 8 }}>
        <div>
          <Hand size={14}>pinned</Hand>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
            {['opengithub', 'ralph-to-ralph', 'inspect-cli', 'qa-runner'].map(r => (
              <Box key={r} style={{ padding: 6 }}>
                <Mono style={{ fontWeight: 700, fontSize: 10 }}>{r}</Mono>
                <Mono style={{ fontSize: 9, color: 'var(--ink-3)', display: 'block', marginTop: 2 }}>rust · ★ {30 + r.length}</Mono>
              </Box>
            ))}
          </div>
        </div>
        <div>
          <Hand size={14}>people · 4</Hand>
          <div className="row gap-2" style={{ marginTop: 4 }}>{'AJMK'.split('').map(c => <Avatar ch={c} size="sm" key={c} />)}</div>
          <Hand size={14} style={{ marginTop: 8 }}>teams</Hand>
          {['core', 'qa'].map(t => <Mono key={t} style={{ display: 'block', fontSize: 10 }}>◆ {t}</Mono>)}
        </div>
      </div>
    </div>
  </Frame>
);

const Org_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <Hand size={22}>namuh-eng</Hand>
      <Box soft style={{ padding: 8, marginTop: 6 }}>
        <Lbl>org pulse · this week</Lbl>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', marginTop: 4 }}>
          <Stat label="commits" value="412" />
          <Stat label="prs merged" value="18" />
          <Stat label="issues closed" value="32" accent />
          <Stat label="releases" value="3" />
        </div>
      </Box>
      <Hand size={14} style={{ marginTop: 10 }}>repos · sorted by activity</Hand>
      {['opengithub · 142 commits', 'ralph · 87 commits', 'inspect · 24 commits'].map(r => (
        <Box key={r} style={{ padding: 6, marginTop: 4 }}>
          <Mono style={{ fontSize: 10 }}>{r}</Mono>
        </Box>
      ))}
    </div>
    <Sticker rotate={3}>org-as-dashboard</Sticker>
  </Frame>
);

const Team_A = () => (
  <Frame>
    <AppHeader crumbs="namuh-eng / core" />
    <div style={{ padding: 10 }}>
      <div className="row gap-6">
        <Glyph ch="◆" lg solid />
        <div style={{ flex: 1 }}>
          <Hand size={20}>core team</Hand>
          <Mono style={{ fontSize: 10, color: 'var(--ink-3)' }}>maintainers of namuh-eng · 4 people · 8 repos</Mono>
        </div>
        <Btn sm>+ invite</Btn>
      </div>
      <div className="row" style={{ marginTop: 8, borderBottom: '1.5px solid var(--line)' }}>
        {['members', 'repositories', 'discussions', 'settings'].map((t, i) => (
          <div key={t} style={{ padding: '4px 8px', fontFamily: 'var(--hand)', fontSize: 13, borderBottom: i === 0 ? '3px solid var(--accent)' : 'none' }}>{t}</div>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        {[['ashley', 'maintainer'], ['jaeyun', 'maintainer'], ['misha', 'member'], ['kira', 'member']].map(([u, r]) => (
          <div key={u} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
            <Avatar ch={u[0].toUpperCase()} size="sm" />
            <Mono style={{ flex: 1, fontSize: 10 }}>{u}</Mono>
            <Chip soft style={{ fontSize: 9 }}>{r}</Chip>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

const Team_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <Hand size={18}>nested teams</Hand>
      <div className="rail" style={{ marginTop: 6 }}>
        <div className="item"><span className="dot" /><Mono style={{ paddingLeft: 4, fontSize: 11, fontWeight: 700 }}>core · 4</Mono></div>
        <div className="item" style={{ paddingLeft: 18 }}><span className="dot" /><Mono style={{ paddingLeft: 4, fontSize: 10 }}>backend · 2</Mono></div>
        <div className="item" style={{ paddingLeft: 18 }}><span className="dot" /><Mono style={{ paddingLeft: 4, fontSize: 10 }}>frontend · 2</Mono></div>
        <div className="item"><span className="dot" /><Mono style={{ paddingLeft: 4, fontSize: 11, fontWeight: 700 }}>qa · 2</Mono></div>
      </div>
    </div>
    <Sticker rotate={3}>nested teams</Sticker>
  </Frame>
);

Object.assign(window, {
  Profile_A, Profile_B, Profile_C, Profile_D, Org_A, Org_B, Team_A, Team_B,
});
