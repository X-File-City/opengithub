// wf-discussions.jsx — Discussions, Wiki, Projects

const Disc_A = () => (
  <Frame>
    <AppHeader crumbs="ashley/opengithub · discussions" />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 130, borderRight: '1.5px solid var(--line)', padding: 6 }}>
        <Lbl>categories</Lbl>
        {[['📣', 'Announcements'], ['💡', 'Ideas'], ['❓', 'Q&A'], ['🗳', 'Polls'], ['🎉', 'Show&tell']].map(([ic, c], i) => (
          <SideItem key={c} ch={ic} label={c} active={i === 0} count={[3, 12, 24, 2, 6][i]} />
        ))}
      </div>
      <div style={{ flex: 1, padding: 6 }}>
        <div className="row gap-4"><Box soft style={{ flex: 1, padding: '2px 8px' }}><Mono style={{ fontSize: 10 }}>⌕ search discussions</Mono></Box><Btn primary sm>+ new</Btn></div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="row gap-6" style={{ padding: 6, borderBottom: '1px dashed var(--line-soft)' }}>
            <Avatar ch={'AJMK'[i % 4]} size="sm" />
            <div style={{ flex: 1 }}>
              <Mono style={{ fontSize: 11 }}>{['Roadmap for v1', 'Switch to nightly?', 'Best CI pattern?', 'New logo concepts'][i % 4]}</Mono>
              <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>{['Ideas', 'Q&A', 'Q&A', 'Show&tell'][i % 4]} · {2 + i}d ago</Mono>
            </div>
            <Mono style={{ fontSize: 9 }}>↑ {12 + i * 3}</Mono>
            <Mono style={{ fontSize: 9 }}>💬 {3 + i}</Mono>
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

const Disc_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={18}>discussions · most helpful this week</Hand>
      <Box accent style={{ padding: 6, marginTop: 6 }}>
        <Mono style={{ fontSize: 10, fontWeight: 700 }}>✓ answered · How to debug cancel jobs</Mono>
        <Mono style={{ fontSize: 9, display: 'block', marginTop: 2 }}>jaeyun · 12 upvotes · 8 replies</Mono>
      </Box>
      <Hand size={14} style={{ marginTop: 10 }}>browse</Hand>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
        {[['💡', 'ideas', 12], ['❓', 'q&a', 24], ['📣', 'news', 3], ['🗳', 'polls', 2]].map(([i, c, n]) => (
          <Box key={c} style={{ padding: 8 }}>
            <div style={{ fontSize: 22 }}>{i}</div>
            <Hand size={14}>{c}</Hand>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>{n} threads</Mono>
          </Box>
        ))}
      </div>
    </div>
    <Sticker rotate={3}>category cards</Sticker>
  </Frame>
);

const Wiki_A = () => (
  <Frame>
    <AppHeader crumbs="ashley/opengithub · wiki" />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 140, borderRight: '1.5px solid var(--line)', padding: 6 }}>
        <Lbl>pages · 12</Lbl>
        {['Home', 'Architecture', 'Deploy', 'Style guide', 'Onboarding', 'FAQ'].map((p, i) => (
          <SideItem key={p} ch="📄" label={p} active={i === 0} />
        ))}
      </div>
      <div style={{ flex: 1, padding: 10 }}>
        <Hand size={20}>Home</Hand>
        <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>last edited by ashley · 2d ago</Mono>
        <Box style={{ padding: 8, marginTop: 6 }}>
          <Ph h={150} label="markdown wiki content · TOC + body" />
        </Box>
        <div className="row gap-4" style={{ marginTop: 6 }}><Btn sm>✎ edit</Btn><Btn sm>history</Btn><Btn sm>+ new page</Btn></div>
      </div>
    </div>
  </Frame>
);

const Wiki_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <Hand size={18}>wiki · graph view</Hand>
      <Box dashed style={{ padding: 8, marginTop: 6, position: 'relative', height: 200 }}>
        {[
          ['Home', 50, 50],
          ['Arch', 20, 25], ['Deploy', 75, 25],
          ['FAQ', 30, 80], ['Style', 70, 80], ['Onboard', 85, 55],
        ].map(([n, x, y]) => (
          <div key={n} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', padding: '2px 6px', border: '1.5px solid var(--line)', background: 'var(--paper)', fontFamily: 'var(--hand)', fontSize: 12, borderRadius: 3 }}>{n}</div>
        ))}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <line x1="50%" y1="50%" x2="20%" y2="25%" stroke="var(--ink)" strokeDasharray="3 2" />
          <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="var(--ink)" strokeDasharray="3 2" />
          <line x1="50%" y1="50%" x2="30%" y2="80%" stroke="var(--ink)" strokeDasharray="3 2" />
          <line x1="50%" y1="50%" x2="70%" y2="80%" stroke="var(--ink)" strokeDasharray="3 2" />
          <line x1="50%" y1="50%" x2="85%" y2="55%" stroke="var(--ink)" strokeDasharray="3 2" />
        </svg>
      </Box>
    </div>
    <Sticker rotate={3}>graph wiki</Sticker>
  </Frame>
);

const Project_A = () => (
  <Frame>
    <AppHeader crumbs="namuh-eng · projects · MVP" />
    <div className="row gap-6" style={{ padding: 6 }}>
      {['table', 'board', 'roadmap'].map((v, i) => <Chip key={v} active={i === 1} soft={i !== 1}>{v}</Chip>)}
      <div style={{ flex: 1 }} />
      <Btn sm>+ add item</Btn>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, padding: 4, height: 'calc(100% - 90px)' }}>
      {['todo · 12', 'in progress · 4', 'review · 2', 'done · 24'].map((c, ci) => (
        <Box key={c} dashed style={{ padding: 4, overflow: 'hidden' }}>
          <Hand size={13}>{c}</Hand>
          {Array.from({ length: 3 - (ci % 2) }, (_, i) => (
            <Box key={i} soft style={{ padding: 4, marginTop: 4 }}>
              <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>#{418 - i - ci * 5}</Mono>
              <Mono style={{ fontSize: 10, display: 'block' }}>{['log streaming', 'route split', 'mobile nav', 'auth flow'][(i + ci) % 4]}</Mono>
              <div className="row gap-2" style={{ marginTop: 4 }}><Avatar ch={'AJMK'[i % 4]} size="sm" /></div>
            </Box>
          ))}
        </Box>
      ))}
    </div>
  </Frame>
);

const Project_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>roadmap · q3</Hand>
      <Box dashed style={{ padding: 8, marginTop: 6 }}>
        <div className="row gap-2"><Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>jul</Mono>{Array.from({ length: 12 }, (_, i) => <div key={i} style={{ flex: 1, height: 1, background: 'var(--line)' }} />)}<Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>sep</Mono></div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[['MVP launch', 0, 60, 'var(--accent)'], ['Actions GA', 30, 80, '#5fa84a'], ['Pages beta', 50, 90, '#aaa'], ['Discussions', 65, 100, '#aaa']].map(([n, s, e, c]) => (
            <div key={n} className="row gap-6">
              <Mono style={{ fontSize: 9, minWidth: 70 }}>{n}</Mono>
              <div style={{ flex: 1, position: 'relative', height: 10, background: 'var(--paper-2)' }}>
                <div style={{ position: 'absolute', left: `${s}%`, width: `${e - s}%`, height: '100%', background: c, border: '1px solid var(--line)' }} />
              </div>
            </div>
          ))}
        </div>
      </Box>
    </div>
    <Sticker rotate={3}>roadmap timeline</Sticker>
  </Frame>
);

Object.assign(window, { Disc_A, Disc_B, Wiki_A, Wiki_B, Project_A, Project_B });
