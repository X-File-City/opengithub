// wf-settings.jsx — Repository settings (access, branches, webhooks, Pages)

const SettingsShell = ({ active, children }) => (
  <Frame>
    <AppHeader crumbs="ashley/opengithub · settings" />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 140, borderRight: '1.5px solid var(--line)', padding: 6 }}>
        <Lbl>repo settings</Lbl>
        {['general', 'access', 'branches', 'tags', 'actions', 'webhooks', 'pages', 'secrets', 'security'].map(s => (
          <SideItem key={s} ch="·" label={s} active={s === active} />
        ))}
      </div>
      <div style={{ flex: 1, padding: 10, overflow: 'hidden' }}>{children}</div>
    </div>
  </Frame>
);

const Access_A = () => (
  <SettingsShell active="access">
    <Hand size={18}>access · who can do what</Hand>
    <Box style={{ padding: 6, marginTop: 6 }}>
      <Lbl>collaborators · 4</Lbl>
      {[['ashley', 'admin'], ['jaeyun', 'maintain'], ['misha', 'write'], ['kira', 'read']].map(([u, r]) => (
        <div key={u} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
          <Avatar ch={u[0].toUpperCase()} size="sm" />
          <Mono style={{ flex: 1, fontSize: 10 }}>{u}</Mono>
          <Chip soft style={{ fontSize: 9 }}>{r} ▾</Chip>
          <Btn sm>×</Btn>
        </div>
      ))}
    </Box>
    <div className="row gap-4" style={{ marginTop: 6 }}><Btn primary sm>+ add user</Btn><Btn sm>+ add team</Btn></div>
    <HR />
    <Lbl>teams · 2</Lbl>
    {[['namuh-eng/core', 'admin'], ['namuh-eng/qa', 'write']].map(([t, r]) => (
      <div key={t} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
        <Glyph ch="◆" sm /><Mono style={{ flex: 1, fontSize: 10 }}>{t}</Mono><Chip soft style={{ fontSize: 9 }}>{r}</Chip>
      </div>
    ))}
  </SettingsShell>
);

const Access_B = () => (
  <SettingsShell active="access">
    <Hand size={18}>access · matrix</Hand>
    <Box style={{ padding: 0, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', borderBottom: '1.5px solid var(--line)' }}>
        {['', 'read', 'write', 'maintain', 'admin'].map((h, i) => (
          <div key={i} style={{ padding: 4, borderRight: '1px dashed var(--line-soft)', fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', color: 'var(--ink-3)' }}>{h}</div>
        ))}
      </div>
      {[['ashley', 0, 0, 0, 1], ['jaeyun', 0, 0, 1, 0], ['misha', 0, 1, 0, 0], ['kira', 1, 0, 0, 0]].map(([u, ...cols]) => (
        <div key={u} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', borderBottom: '1px dashed var(--line-soft)' }}>
          <div style={{ padding: 4 }} className="row gap-4"><Avatar ch={u[0].toUpperCase()} size="sm" /><Mono style={{ fontSize: 10 }}>{u}</Mono></div>
          {cols.map((on, i) => <div key={i} className="center" style={{ padding: 4 }}><span className={'check' + (on ? ' on' : '')} /></div>)}
        </div>
      ))}
    </Box>
    <Sticker rotate={3}>matrix view</Sticker>
  </SettingsShell>
);

const Branches_A = () => (
  <SettingsShell active="branches">
    <Hand size={18}>branch protection rules</Hand>
    <Box style={{ padding: 6, marginTop: 6 }}>
      <div className="row gap-6"><Mono style={{ fontWeight: 700, flex: 1 }}>main</Mono><Chip soft>protected</Chip></div>
      <HR dashed />
      {['require pull request reviews · 1+', 'require status checks: ci, biome', 'require linear history', 'restrict who can push', 'allow force pushes'].map((r, i) => (
        <div key={r} className="row gap-6" style={{ padding: '3px 0' }}>
          <span className={'check' + (i < 3 ? ' on' : '')} />
          <Mono style={{ fontSize: 10 }}>{r}</Mono>
        </div>
      ))}
    </Box>
    <div style={{ marginTop: 6 }}><Btn primary sm>+ add rule</Btn></div>
  </SettingsShell>
);

const Branches_B = () => (
  <SettingsShell active="branches">
    <Hand size={18}>rulesets · per pattern</Hand>
    {[
      ['main', 'enforced', ['1 review', 'ci ✓', 'no force-push']],
      ['release/*', 'enforced', ['2 reviews', 'codeowners', 'signed']],
      ['feat/*', 'evaluate-only', ['ci ✓']],
    ].map(([p, st, rules]) => (
      <Box key={p} style={{ padding: 6, marginTop: 6 }}>
        <div className="row gap-6"><Mono style={{ fontWeight: 700 }}>{p}</Mono><Chip soft={st !== 'enforced'} active={st === 'enforced'} style={{ fontSize: 9 }}>{st}</Chip></div>
        <div className="row gap-4" style={{ marginTop: 4, flexWrap: 'wrap' }}>{rules.map(r => <Chip soft key={r} style={{ fontSize: 9 }}>{r}</Chip>)}</div>
      </Box>
    ))}
    <Sticker rotate={-3}>ruleset cards</Sticker>
  </SettingsShell>
);

const Webhooks_A = () => (
  <SettingsShell active="webhooks">
    <div className="row between"><Hand size={18}>webhooks · 3</Hand><Btn primary sm>+ new</Btn></div>
    {[
      ['https://hooks.slack.com/...', '✓', '200 OK · 12ms'],
      ['https://ci.namuh.co/hook', '✓', '200 OK · 88ms'],
      ['https://old.endpoint/x', '✗', '500 · 4 retries'],
    ].map(([u, s, last], i) => (
      <Box key={u} style={{ padding: 6, marginTop: 6 }}>
        <div className="row gap-6"><Glyph ch={s} sm /><Mono style={{ flex: 1, fontSize: 10 }}>{u}</Mono><Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>{last}</Mono></div>
        <Mono style={{ fontSize: 9, color: 'var(--ink-3)', display: 'block', marginTop: 4 }}>events: push, pull_request, issues · 142 deliveries · last 24h</Mono>
      </Box>
    ))}
  </SettingsShell>
);

const Webhooks_B = () => (
  <SettingsShell active="webhooks">
    <Hand size={18}>delivery log</Hand>
    <Box soft style={{ padding: '4px 8px', marginTop: 6 }}><Mono style={{ fontSize: 9 }}>filter · status:any · event:push · last 24h</Mono></Box>
    <div style={{ marginTop: 6 }}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
          <Glyph ch={i % 5 === 1 ? '✗' : '✓'} sm />
          <Mono style={{ fontSize: 10, flex: 1 }}>push · main · {i % 5 === 1 ? '500' : '200'}</Mono>
          <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>{12 + i * 7}ms</Mono>
          <Btn sm>↻ redeliver</Btn>
        </div>
      ))}
    </div>
    <Sticker rotate={3}>delivery log focus</Sticker>
  </SettingsShell>
);

const Pages_A = () => (
  <SettingsShell active="pages">
    <Hand size={18}>pages</Hand>
    <Box accent style={{ padding: 8, marginTop: 8 }}>
      <Hand size={14}>your site is live</Hand>
      <Mono style={{ fontSize: 10, display: 'block', marginTop: 2 }}>https://ashley.opengithub.namuh.co/opengithub</Mono>
      <Btn sm style={{ marginTop: 6 }}>visit ↗</Btn>
    </Box>
    <HR />
    <Lbl>source</Lbl>
    <Box style={{ padding: 6, marginTop: 4 }}>
      <div className="row gap-4"><Mono style={{ flex: 1 }}>branch: gh-pages · /</Mono><Btn sm>change</Btn></div>
    </Box>
    <Lbl style={{ marginTop: 8 }}>custom domain</Lbl>
    <Box style={{ padding: 6, marginTop: 4 }}>
      <Mono>docs.namuh.co</Mono>
      <Mono style={{ fontSize: 9, color: '#4a8', display: 'block', marginTop: 2 }}>✓ DNS check passed · TLS auto</Mono>
    </Box>
  </SettingsShell>
);

const Pages_B = () => (
  <SettingsShell active="pages">
    <Hand size={18}>pages · build pipeline</Hand>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
      {['source', 'build', 'deploy', 'live'].map((s, i) => (
        <Box key={s} style={{ padding: 6, position: 'relative' }}>
          <Lbl>step {i + 1}</Lbl>
          <Hand size={14}>{s}</Hand>
          <Mono style={{ fontSize: 9, color: i < 3 ? '#4a8' : 'var(--accent)', display: 'block', marginTop: 4 }}>{i < 3 ? '✓ ok' : '◌ deploying...'}</Mono>
        </Box>
      ))}
    </div>
    <HR />
    <Lbl>recent builds</Lbl>
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
        <Glyph ch="✓" sm />
        <Mono style={{ flex: 1, fontSize: 10 }}>{`#${42 - i} · main · 2m ${10 + i}s`}</Mono>
        <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>{i + 1}h ago</Mono>
      </div>
    ))}
    <Sticker rotate={-3}>pipeline view</Sticker>
  </SettingsShell>
);

Object.assign(window, {
  Access_A, Access_B, Branches_A, Branches_B, Webhooks_A, Webhooks_B, Pages_A, Pages_B,
});
