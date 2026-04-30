// wf-repo.jsx — Repository workspace (Code tab) variations

const RepoCode_A = () => (
  <Frame>
    <AppHeader crumbs="ashley / opengithub" />
    <div style={{ padding: '6px 12px', borderBottom: '1.5px solid var(--line)' }}>
      <div className="row gap-8">
        <Hand size={18}>ashley / <span style={{ fontWeight: 700 }}>opengithub</span></Hand>
        <Chip soft>public</Chip>
        <div style={{ marginLeft: 'auto' }} className="row gap-6">
          <Btn sm>★ 1.2k</Btn><Btn sm>⑂ 84</Btn><Btn sm>👁 watch</Btn>
        </div>
      </div>
    </div>
    <TabBar tabs={['Code', 'Issues 23', 'Pulls 4', 'Actions', 'Projects', 'Wiki', 'Security', 'Insights', 'Settings']} active={0} />
    <div style={{ display: 'flex', height: 'calc(100% - 96px)' }}>
      <div style={{ width: 200, borderRight: '1.5px solid var(--line)', padding: 8, overflow: 'hidden' }}>
        <div className="row gap-4">
          <Box style={{ padding: '2px 6px', flex: 1 }}><Mono>⌥ main ▾</Mono></Box>
        </div>
        <Box dashed style={{ padding: 4, marginTop: 6, fontSize: 10 }}><Mono style={{ color: 'var(--ink-3)' }}>⌕ go to file</Mono></Box>
        <div style={{ marginTop: 6 }}>
          {['📁 .github', '📁 crates', '📁 docs', '📁 ralph', '📁 scripts', '📁 web', '📄 .gitignore', '📄 Cargo.toml', '📄 LICENSE', '📄 Makefile', '📄 README.md'].map(f => (
            <div key={f} className="file-row" style={{ gridTemplateColumns: '1fr' }}><Mono>{f}</Mono></div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: 12 }}>
        <Box soft style={{ padding: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar ch="J" size="sm" />
          <Mono style={{ flex: 1 }}>jaeyun · feat: route module split  <span style={{ color: 'var(--ink-3)' }}>2h ago</span></Mono>
          <Mono style={{ color: 'var(--ink-3)' }}>a3f29c1</Mono>
        </Box>
        <div style={{ marginTop: 10 }}>
          <Hand size={16}>README.md</Hand>
          <Box style={{ marginTop: 6, padding: 10 }}>
            <Hand size={20}>opengithub</Hand>
            <div className="body-sm" style={{ color: 'var(--ink-3)', marginTop: 4 }}>github clone — Rust API + Next.js, built end-to-end by ralph-to-ralph.</div>
            <HR dashed />
            <Lbl>stack</Lbl>
            <Ph h={50} label="markdown render placeholder" style={{ marginTop: 4 }} />
          </Box>
        </div>
      </div>
      <div style={{ width: 140, borderLeft: '1.5px dashed var(--line)', padding: 8 }}>
        <Lbl>about</Lbl>
        <div className="body-sm" style={{ marginTop: 4 }}>Rust + Next.js github clone</div>
        <HR dashed />
        <Lbl>release</Lbl>
        <Mono>v0.1.0</Mono>
        <HR dashed />
        <Lbl>contributors</Lbl>
        <div className="row gap-2" style={{ marginTop: 4 }}>{'AJKMR'.split('').map(c => <Avatar ch={c} size="sm" key={c} />)}</div>
      </div>
    </div>
  </Frame>
);

const RepoCode_B = () => (
  <Frame>
    <AppHeader crumbs="ashley / opengithub" />
    <div className="navbar" style={{ borderBottom: 'none', padding: '6px 12px' }}>
      <Hand size={18}>ashley / opengithub</Hand>
      <div style={{ marginLeft: 'auto' }} className="row gap-6">
        <Mono style={{ color: 'var(--ink-3)' }}>★ 1.2k · ⑂ 84</Mono>
      </div>
    </div>
    <div className="row" style={{ padding: '4px 12px', borderTop: '1.5px solid var(--line)', borderBottom: '1.5px solid var(--line)', gap: 8 }}>
      {['code', 'issues', 'pulls', 'actions', 'wiki', 'settings'].map((t, i) => (
        <Chip active={i === 0} key={t}>{t}</Chip>
      ))}
    </div>
    <div style={{ display: 'flex', height: 'calc(100% - 78px)' }}>
      <div style={{ flex: 1, padding: 10 }}>
        <Box soft style={{ padding: 6 }} className="row gap-6"><Mono>⌥ main</Mono><span style={{ color: 'var(--ink-3)' }}>·</span><Mono>54 branches</Mono><span style={{ color: 'var(--ink-3)' }}>·</span><Mono>12 tags</Mono></Box>
        <div style={{ marginTop: 8 }}>
          {[
            ['📁', '.github', 'feat: ci matrix', '2d'],
            ['📁', 'crates/api', 'route split', '2h'],
            ['📁', 'web/src', 'next-15 upgrade', '5h'],
            ['📄', 'Cargo.toml', 'bump axum to 0.8', '1d'],
            ['📄', 'README.md', 'add stack table', '4d'],
            ['📄', 'Makefile', 'make all target', '1w'],
          ].map((r, i) => (
            <div key={i} className="file-row" style={{ borderBottom: '1px dashed var(--line-soft)' }}>
              <Mono>{r[0]}</Mono>
              <Mono>{r[1]}</Mono>
              <Mono style={{ color: 'var(--ink-3)' }}>{r[2]}</Mono>
              <Mono style={{ color: 'var(--ink-3)' }}>{r[3]}</Mono>
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 180, padding: 10, background: 'var(--paper-2)' }}>
        <Lbl>readme · pinned</Lbl>
        <Box style={{ padding: 6, marginTop: 6 }}>
          <Hand size={14}>opengithub</Hand>
          <div className="body-sm" style={{ color: 'var(--ink-3)' }}>Rust + Next clone</div>
        </Box>
      </div>
    </div>
    <Sticker rotate={3}>flat tabs · pill nav</Sticker>
  </Frame>
);

const RepoCode_C = () => (
  <Frame>
    <AppHeader crumbs="ashley / opengithub" />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 56, borderRight: '1.5px solid var(--line)', padding: 6, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {[
          ['◰', 'code', true], ['◷', 'issues'], ['↗', 'pulls'], ['▶', 'runs'],
          ['⊞', 'projects'], ['🛡', 'sec'], ['⚙', 'set'],
        ].map(([ch, label, on], i) => (
          <div key={i} style={{ textAlign: 'center', padding: 4, borderRadius: 4, background: on ? 'var(--accent-soft)' : 'transparent' }}>
            <div style={{ fontFamily: 'var(--hand)', fontSize: 18 }}>{ch}</div>
            <Mono style={{ fontSize: 8, color: 'var(--ink-3)' }}>{label}</Mono>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column' }}>
        <div className="row between">
          <div>
            <Hand size={20}>opengithub <Mono style={{ color: 'var(--ink-3)' }}>· main</Mono></Hand>
            <div className="body-sm" style={{ color: 'var(--ink-3)' }}>github clone — Rust API + Next.js</div>
          </div>
          <div className="row gap-4"><Btn sm>★ 1.2k</Btn><Btn sm>clone ▾</Btn></div>
        </div>
        <Box dashed style={{ marginTop: 10, padding: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          <Stat label="commits" value="2,184" />
          <Stat label="branches" value="54" />
          <Stat label="contribs" value="9" accent />
          <Stat label="health" value="92%" />
        </Box>
        <div className="row gap-12" style={{ marginTop: 10, flex: 1, overflow: 'hidden' }}>
          <Box style={{ flex: 1, padding: 8, height: '100%' }}>
            <Lbl>files</Lbl>
            <div style={{ marginTop: 4 }}>
              {['crates/', 'web/', 'docs/', 'ralph/', 'scripts/', 'README.md', 'Cargo.toml'].map(f => (
                <Mono key={f} style={{ display: 'block', padding: '2px 0' }}>{f}</Mono>
              ))}
            </div>
          </Box>
          <Box soft style={{ flex: 1.2, padding: 8 }}>
            <Lbl>readme</Lbl>
            <Hand size={16} style={{ marginTop: 4 }}>opengithub</Hand>
            <Ph h={50} label="markdown" style={{ marginTop: 4 }} />
          </Box>
        </div>
      </div>
    </div>
    <Sticker rotate={-3}>icon rail · stat strip</Sticker>
  </Frame>
);

const RepoCode_D = () => (
  <Frame>
    <AppHeader crumbs="ashley / opengithub" />
    <div style={{ padding: 14 }}>
      <div className="row between">
        <Hand size={22}>ashley / opengithub</Hand>
        <Box soft style={{ padding: '2px 8px', fontFamily: 'var(--mono)', fontSize: 10 }}>git@opengithub.namuh.co:ashley/opengithub.git</Box>
      </div>
      <Box thick wobble style={{ marginTop: 10, padding: 10 }}>
        <Lbl>readme</Lbl>
        <Hand size={20} style={{ marginTop: 4 }}># opengithub</Hand>
        <Ph h={70} label="long-form README · text-first layout" style={{ marginTop: 6 }} />
      </Box>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <Box style={{ flex: 1, padding: 6 }}>
          <Lbl>files</Lbl>
          <div style={{ marginTop: 4, columnCount: 2, columnGap: 8 }}>
            {['crates', 'web', 'docs', 'ralph', 'scripts', 'README.md', 'Cargo.toml', 'Makefile'].map(f => (
              <Mono key={f} style={{ display: 'block', padding: '2px 0', breakInside: 'avoid' }}>📄 {f}</Mono>
            ))}
          </div>
        </Box>
        <Box style={{ width: 140, padding: 6 }}>
          <Lbl>activity</Lbl>
          <div className="rail" style={{ marginTop: 6 }}>
            {['+412', '+87', '+201', '+19'].map((c, i) => (
              <div key={i} className="item"><span className="dot" /><Mono style={{ paddingLeft: 4, fontSize: 10 }}>commit {i + 1} {c}</Mono></div>
            ))}
          </div>
        </Box>
      </div>
    </div>
    <Sticker rotate={4}>readme-first · long-form</Sticker>
  </Frame>
);

// ───── Repo: file blob viewer ─────

const RepoBlob_A = () => (
  <Frame>
    <AppHeader crumbs="ashley/opengithub / crates/api/src/main.rs" />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 160, borderRight: '1.5px solid var(--line)', padding: 6, fontSize: 11 }}>
        <Mono style={{ color: 'var(--ink-3)' }}>📁 crates/api/src</Mono>
        {['main.rs', 'auth.rs', 'routes/', 'jobs/', 'domain/'].map((f, i) => (
          <Mono key={f} style={{ display: 'block', padding: '2px 0', background: i === 0 ? 'var(--paper-2)' : 'transparent' }}>{i === 0 ? '▸' : ' '} {f}</Mono>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="row between" style={{ padding: 8, borderBottom: '1.5px solid var(--line)' }}>
          <Mono>main.rs · 2.4 KB · 87 lines</Mono>
          <div className="row gap-4"><Btn sm>raw</Btn><Btn sm>blame</Btn><Btn sm>history</Btn><Btn sm>edit ✎</Btn></div>
        </div>
        <CodeBlock lines={18} style={{ flex: 1, margin: 6 }} />
      </div>
    </div>
  </Frame>
);

const RepoBlob_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <div className="row gap-4">
        <Mono style={{ color: 'var(--ink-3)' }}>crates / api / src /</Mono>
        <Mono style={{ fontWeight: 700 }}>main.rs</Mono>
      </div>
      <div className="row gap-6" style={{ marginTop: 6 }}>
        <Chip active>blob</Chip><Chip soft>blame</Chip><Chip soft>history</Chip><Chip soft>raw</Chip>
      </div>
      <Box style={{ marginTop: 8, padding: 0 }}>
        <CodeBlock lines={20} />
      </Box>
    </div>
    <Sticker rotate={3}>chip-driven mode switch</Sticker>
  </Frame>
);

const RepoBlob_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ flex: 1, padding: 8 }}>
        <Mono>main.rs</Mono>
        <CodeBlock lines={18} style={{ marginTop: 4 }} />
      </div>
      <div style={{ width: 200, borderLeft: '1.5px dashed var(--line)', padding: 8, background: 'var(--paper-2)' }}>
        <Lbl>last edit</Lbl>
        <div className="row gap-6" style={{ marginTop: 4 }}><Avatar ch="J" size="sm" /><Mono>jaeyun · 2h</Mono></div>
        <Mono style={{ display: 'block', marginTop: 4, fontSize: 10, color: 'var(--ink-3)' }}>route module split</Mono>
        <HR dashed />
        <Lbl>blame · top contribs</Lbl>
        {['jaeyun 62%', 'ashley 31%', 'misha 7%'].map(c => (
          <div key={c} style={{ marginTop: 4 }}>
            <Mono style={{ fontSize: 10 }}>{c}</Mono>
            <div className="bar" style={{ width: c.split(' ')[1], marginTop: 2, height: 4 }} />
          </div>
        ))}
      </div>
    </div>
    <Sticker rotate={-3}>blame side-rail</Sticker>
  </Frame>
);

const RepoBlob_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Box soft style={{ padding: '4px 8px' }}>
        <Mono>~/opengithub/crates/api/src/main.rs</Mono>
      </Box>
      <Box style={{ marginTop: 6, padding: 0, background: 'var(--paper-2)' }}>
        <CodeBlock lines={22} />
      </Box>
      <div className="row gap-6" style={{ marginTop: 6 }}>
        <Mono style={{ color: 'var(--ink-3)' }}>↑↓ move · enter open · b blame · h history</Mono>
      </div>
    </div>
    <Sticker rotate={4}>keyboard-first / vim feel</Sticker>
  </Frame>
);

Object.assign(window, {
  RepoCode_A, RepoCode_B, RepoCode_C, RepoCode_D,
  RepoBlob_A, RepoBlob_B, RepoBlob_C, RepoBlob_D,
});
