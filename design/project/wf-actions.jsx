// wf-actions.jsx — Actions: workflows, runs, logs

const ActionsList_A = () => (
  <Frame>
    <AppHeader crumbs="ashley/opengithub · actions" />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 140, borderRight: '1.5px solid var(--line)', padding: 6 }}>
        <Lbl>workflows</Lbl>
        {['all', 'ci.yml', 'release.yml', 'pages.yml', 'qa.yml'].map((w, i) => <SideItem key={w} ch="▶" label={w} active={i === 0} count={[null, 142, 12, 18, 9][i]} />)}
        <HR dashed />
        <Lbl>filter</Lbl>
        <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>event ▾ · status ▾ · branch ▾</Mono>
      </div>
      <div style={{ flex: 1, padding: 6 }}>
        {Array.from({ length: 8 }, (_, i) => {
          const states = [['✓', 'success'], ['✗', 'failed'], ['◌', 'running'], ['◐', 'queued']];
          const [ic, st] = states[i % 4];
          const color = st === 'failed' ? '#c44' : st === 'success' ? '#4a8' : 'var(--ink-3)';
          return (
            <div key={i} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
              <Glyph ch={ic} sm style={{ color, borderColor: color }} />
              <div style={{ flex: 1 }}>
                <Mono style={{ fontSize: 10 }}>feat: split route modules</Mono>
                <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>ci · #{2184 - i} · push by jaeyun · main · {2 + i}m</Mono>
              </div>
              <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>3m 12s</Mono>
            </div>
          );
        })}
      </div>
    </div>
  </Frame>
);

const ActionsList_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={18}>recent runs</Hand>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 2, marginTop: 8 }}>
        {Array.from({ length: 60 }, (_, i) => {
          const c = ['#4a8', '#4a8', '#4a8', '#c44', '#4a8', '#4a8', '#aaa'][i % 7];
          return <div key={i} style={{ height: 12, background: c, borderRadius: 1 }} />;
        })}
      </div>
      <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>each square = 1 run · last 60 · 92% success</Mono>
      <HR dashed />
      <Hand size={14}>workflows</Hand>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
        {['ci.yml', 'release.yml', 'pages.yml', 'qa.yml'].map(w => (
          <Box key={w} style={{ padding: 6 }}>
            <Mono style={{ fontWeight: 700 }}>{w}</Mono>
            <div className="row gap-4" style={{ marginTop: 4 }}>
              <Mono style={{ fontSize: 9, color: '#4a8' }}>✓ 142</Mono>
              <Mono style={{ fontSize: 9, color: '#c44' }}>✗ 4</Mono>
              <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>p50 3m</Mono>
            </div>
          </Box>
        ))}
      </div>
    </div>
    <Sticker rotate={3}>health-first dashboard</Sticker>
  </Frame>
);

const ActionsList_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>workflow runs · timeline</Hand>
      <Box dashed style={{ padding: 6, marginTop: 6 }}>
        <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>← 1h ago                                              now →</Mono>
        <div style={{ position: 'relative', height: 40, marginTop: 4 }}>
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${i * 5.4}%`,
              width: `${1 + (i % 4)}%`, height: 14,
              top: (i * 7) % 24,
              background: i === 5 ? '#c44' : '#4a8', opacity: 0.85,
              border: '1px solid var(--line)',
            }} />
          ))}
        </div>
      </Box>
      <Hand size={14} style={{ marginTop: 8 }}>concurrent jobs · live</Hand>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
        {['build · running 1m12s', 'test · running 32s', 'lint · queued', 'pages · success'].map((j, i) => (
          <div key={j} className="row gap-6" style={{ padding: 3, borderBottom: '1px dashed var(--line-soft)' }}>
            <Glyph ch={['◌', '◌', '◐', '✓'][i]} sm />
            <Mono style={{ flex: 1, fontSize: 10 }}>{j}</Mono>
          </div>
        ))}
      </div>
    </div>
    <Sticker rotate={-3}>timeline view</Sticker>
  </Frame>
);

const ActionsList_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <div className="row between">
        <Hand size={18}>actions</Hand>
        <div className="row gap-4"><Btn sm>+ new workflow</Btn><Btn sm>↺ rerun all</Btn></div>
      </div>
      <Box soft style={{ padding: 6, marginTop: 6 }}>
        <Mono style={{ fontSize: 10 }}>filter:  </Mono>
        <Chip soft style={{ fontSize: 9 }}>status:any</Chip>{' '}
        <Chip soft style={{ fontSize: 9 }}>branch:main</Chip>{' '}
        <Chip soft style={{ fontSize: 9 }}>actor:@me</Chip>{' '}
        <Chip soft style={{ fontSize: 9 }}>+ add</Chip>
      </Box>
      <div style={{ marginTop: 8 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} style={{ padding: 6, marginTop: 4 }}>
            <div className="row gap-6">
              <Glyph ch={i % 3 === 1 ? '✗' : '✓'} sm />
              <Mono style={{ flex: 1, fontSize: 11 }}>ci · #{2184 - i}</Mono>
              <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>3m 12s · 142 jobs</Mono>
            </div>
            <div className="row gap-2" style={{ marginTop: 4, flexWrap: 'wrap' }}>
              {Array.from({ length: 12 }, (_, j) => <div key={j} style={{ width: 10, height: 4, background: j === 4 && i === 1 ? '#c44' : '#4a8' }} />)}
            </div>
          </Box>
        ))}
      </div>
    </div>
    <Sticker rotate={4}>filter chips · per-job blips</Sticker>
  </Frame>
);

const ActionRun_A = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>ci · #2184 · feat: split route modules</Hand>
      <div className="row gap-4" style={{ marginTop: 4 }}>
        <Chip style={{ background: '#fcdcdc' }}>✗ failed</Chip>
        <Mono style={{ fontSize: 10, color: 'var(--ink-3)' }}>jaeyun · main · 8 jobs · 4m 22s</Mono>
        <div style={{ marginLeft: 'auto' }} className="row gap-4"><Btn sm>↻ rerun all</Btn><Btn sm>↻ failed only</Btn><Btn sm>cancel</Btn></div>
      </div>
      <div style={{ display: 'flex', height: 230, marginTop: 8 }}>
        <div style={{ width: 130, borderRight: '1.5px solid var(--line)', padding: 6 }}>
          <Lbl>jobs</Lbl>
          {[['build', '✓'], ['test (cancel)', '✗'], ['clippy', '✓'], ['biome', '✓'], ['e2e', '◌'], ['pages', '◐']].map(([j, s], i) => (
            <div key={j} className="row gap-6" style={{ padding: '4px 0', background: i === 1 ? 'var(--paper-2)' : 'transparent', borderRadius: 2 }}>
              <Glyph ch={s} sm />
              <Mono style={{ fontSize: 10 }}>{j}</Mono>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 6, background: '#1a1a1a', color: '#e8e3d6', overflow: 'hidden' }}>
          <Mono style={{ fontSize: 9, color: '#999' }}>$ cargo test --workspace</Mono>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} style={{ height: 4, width: `${50 + (i * 13) % 45}%`, background: i === 8 ? '#c44' : '#666', marginTop: 3 }} />
          ))}
          <Mono style={{ fontSize: 9, color: '#c44' }}>error: test cancel_logs failed</Mono>
        </div>
      </div>
    </div>
  </Frame>
);

const ActionRun_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>#2184 · failed</Hand>
      <Box style={{ padding: 6, marginTop: 6 }}>
        <Lbl>jobs · gantt</Lbl>
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['build', 0, 60, '#4a8'],
            ['test', 30, 90, '#c44'],
            ['clippy', 0, 35, '#4a8'],
            ['biome', 5, 25, '#4a8'],
            ['e2e', 60, 100, '#aaa'],
            ['pages', 60, 80, '#aaa'],
          ].map(([j, s, e, c]) => (
            <div key={j} className="row gap-6">
              <Mono style={{ fontSize: 9, minWidth: 50 }}>{j}</Mono>
              <div style={{ flex: 1, position: 'relative', height: 8, background: 'var(--paper-2)' }}>
                <div style={{ position: 'absolute', left: `${s}%`, width: `${e - s}%`, height: '100%', background: c }} />
              </div>
            </div>
          ))}
        </div>
      </Box>
      <Box accent style={{ marginTop: 8, padding: 6 }}>
        <Hand size={13}>↳ 1 job failed: test (cancel_logs)</Hand>
        <Mono style={{ fontSize: 9, marginTop: 2, display: 'block' }}>jump to log line 412 →</Mono>
      </Box>
    </div>
    <Sticker rotate={3}>gantt of jobs</Sticker>
  </Frame>
);

const ActionRun_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>log · test (cancel_logs)</Hand>
      <Box soft style={{ padding: '4px 8px', marginTop: 6 }}>
        <Mono style={{ fontSize: 9 }}>🔍 search log · ⌘F · jump to error · share line</Mono>
      </Box>
      <Box style={{ background: '#1a1a1a', color: '#e8e3d6', padding: 6, marginTop: 6, height: 200, overflow: 'hidden', fontFamily: 'var(--mono)', fontSize: 9 }}>
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, padding: '1px 0', background: i === 12 ? '#3a1a1a' : 'transparent' }}>
            <span style={{ color: '#666', minWidth: 24, textAlign: 'right' }}>{400 + i}</span>
            <span style={{ color: '#666' }}>10:42:{(i + 12).toString().padStart(2, '0')}</span>
            <div style={{ flex: 1, height: 4, width: `${40 + (i * 11) % 50}%`, background: i === 12 ? '#c44' : '#888', marginTop: 2 }} />
          </div>
        ))}
      </Box>
      <div className="row gap-4" style={{ marginTop: 6 }}><Btn sm>↧ download log</Btn><Btn sm>raw</Btn><Btn sm>artifacts (3)</Btn></div>
    </div>
    <Sticker rotate={-3}>log focus · search</Sticker>
  </Frame>
);

const ActionRun_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>#2184 · summary</Hand>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
        <Stat label="duration" value="4m 22s" />
        <Stat label="jobs" value="6" />
        <Stat label="failed" value="1" accent />
      </div>
      <HR dashed />
      <Hand size={14}>artifacts</Hand>
      {['build-output.tar.gz · 12 MB', 'test-coverage.html · 220 KB', 'logs.zip · 1.2 MB'].map(a => (
        <div key={a} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
          <Glyph ch="📦" sm />
          <Mono style={{ flex: 1, fontSize: 10 }}>{a}</Mono>
          <Btn sm>↧</Btn>
        </div>
      ))}
      <HR dashed />
      <Hand size={14}>annotations · 3</Hand>
      <Box soft style={{ padding: 6, marginTop: 4 }}>
        <Mono style={{ fontSize: 10 }}>⚠ test cancel_logs · main.rs:412</Mono>
      </Box>
    </div>
    <Sticker rotate={4}>summary-led</Sticker>
  </Frame>
);

Object.assign(window, {
  ActionsList_A, ActionsList_B, ActionsList_C, ActionsList_D,
  ActionRun_A, ActionRun_B, ActionRun_C, ActionRun_D,
});
