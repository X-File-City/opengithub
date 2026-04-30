// wf-search.jsx — Search & discovery

const Search_A = () => (
  <Frame>
    <AppHeader />
    <Box soft style={{ padding: 6, margin: 8 }}>
      <Mono style={{ fontSize: 11 }}>⌕ axum middleware language:rust org:namuh-eng</Mono>
    </Box>
    <div className="row" style={{ borderBottom: '1.5px solid var(--line)', padding: '0 8px', gap: 4 }}>
      {['code · 142', 'repos · 18', 'issues · 24', 'pulls · 9', 'commits · 87', 'users · 3', 'discussions · 4'].map((t, i) => (
        <div key={t} style={{ padding: '6px 8px', fontFamily: 'var(--hand)', fontSize: 13, borderBottom: i === 0 ? '3px solid var(--accent)' : 'none' }}>{t}</div>
      ))}
    </div>
    <div style={{ padding: 8 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Box key={i} style={{ padding: 6, marginTop: 4 }}>
          <Mono style={{ fontSize: 10 }}>ashley/opengithub <span style={{ color: 'var(--ink-3)' }}>· crates/api/src/middleware.rs</span></Mono>
          <CodeLine n={42 + i} indent={1} kind="long" />
          <CodeLine n={43 + i} indent={2} kind="comment" />
          <CodeLine n={44 + i} indent={1} kind="short" />
        </Box>
      ))}
    </div>
  </Frame>
);

const Search_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Box thick wobble style={{ padding: 8 }}>
        <Mono style={{ fontSize: 12 }}>⌕ axum middleware<span style={{ color: 'var(--accent)' }}>▌</span></Mono>
        <div className="row gap-4" style={{ marginTop: 6, flexWrap: 'wrap' }}>
          <Chip soft style={{ fontSize: 9 }}>language: rust</Chip>
          <Chip soft style={{ fontSize: 9 }}>org: namuh-eng</Chip>
          <Chip soft style={{ fontSize: 9 }}>+ filter</Chip>
        </div>
      </Box>
      <Hand size={14} style={{ marginTop: 10 }}>quick jumps</Hand>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
        {['↗ ashley/opengithub · repo', '📄 crates/api/src/middleware.rs', '○ #418 · cancel logs', '◆ axum-login docs'].map(t => (
          <div key={t} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}><Mono style={{ fontSize: 10 }}>{t}</Mono></div>
        ))}
      </div>
      <HR />
      <Hand size={14}>code matches · 142</Hand>
      <Ph h={70} label="grouped code snippets" style={{ marginTop: 4 }} />
    </div>
    <Sticker rotate={3}>command-palette</Sticker>
  </Frame>
);

const Search_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 130, borderRight: '1.5px solid var(--line)', padding: 6 }}>
        <Lbl>refine</Lbl>
        <div style={{ marginTop: 4 }}>
          <Lbl>language</Lbl>
          {['rust', 'ts', 'md', 'sql'].map(l => <SideItem key={l} ch="▪" label={l} count={[120, 18, 4, 0][['rust', 'ts', 'md', 'sql'].indexOf(l)]} />)}
        </div>
        <HR dashed />
        <Lbl>repo</Lbl>
        {['opengithub', 'ralph'].map(r => <SideItem key={r} ch="▪" label={r} count={r === 'opengithub' ? 124 : 18} />)}
      </div>
      <div style={{ flex: 1, padding: 6 }}>
        <Mono style={{ fontSize: 10, color: 'var(--ink-3)' }}>142 results · 0.04s</Mono>
        {Array.from({ length: 5 }, (_, i) => (
          <Box key={i} soft style={{ padding: 4, marginTop: 4 }}>
            <Mono style={{ fontSize: 9 }}>ashley/opengithub · src/middleware.rs:{42 + i * 5}</Mono>
            <CodeLine n={42 + i * 5} indent={2} kind="normal" />
          </Box>
        ))}
      </div>
    </div>
    <Sticker rotate={-3}>faceted search</Sticker>
  </Frame>
);

const Search_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Mono style={{ fontSize: 11 }}>⌕ "axum middleware" path:src lang:rust</Mono>
      <Hand size={14} style={{ marginTop: 8 }}>top file · 14 hits</Hand>
      <Box soft style={{ padding: 4, marginTop: 4 }}>
        <Mono style={{ fontSize: 9 }}>crates/api/src/middleware.rs</Mono>
      </Box>
      <Box style={{ padding: 0, marginTop: 4 }}>
        {Array.from({ length: 18 }, (_, i) => {
          const hl = [3, 7, 12].includes(i);
          return (
            <div key={i} className="row" style={{ padding: '0 4px', minHeight: 12, background: hl ? 'var(--highlight)' : 'transparent' }}>
              <Mono style={{ fontSize: 9, color: 'var(--ink-4)', minWidth: 18 }}>{40 + i}</Mono>
              <div style={{ flex: 1, height: 4, width: `${50 + (i * 7) % 40}%`, background: hl ? 'var(--ink)' : 'var(--ink-3)', opacity: 0.7, marginTop: 4 }} />
            </div>
          );
        })}
      </Box>
    </div>
    <Sticker rotate={4}>file-focused matches</Sticker>
  </Frame>
);

Object.assign(window, { Search_A, Search_B, Search_C, Search_D });
