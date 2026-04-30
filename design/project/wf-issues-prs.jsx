// wf-issues-prs.jsx — Issues & Pull Request wireframes

const IssuesList_A = () => (
  <Frame>
    <AppHeader crumbs="ashley/opengithub · issues" />
    <div className="row gap-6" style={{ padding: 8, borderBottom: '1.5px solid var(--line)' }}>
      <Box soft style={{ flex: 1, padding: '2px 8px' }}><Mono>is:open is:issue</Mono></Box>
      <Btn sm>labels</Btn><Btn sm>milestones</Btn><Btn primary sm>+ new issue</Btn>
    </div>
    <div className="row gap-6" style={{ padding: 6, borderBottom: '1px dashed var(--line)' }}>
      <Hand size={14} style={{ color: 'var(--accent)' }}>● 23 open</Hand>
      <Hand size={14} style={{ color: 'var(--ink-3)' }}>✓ 421 closed</Hand>
      <div style={{ marginLeft: 'auto' }} className="row gap-4"><Mono style={{ color: 'var(--ink-3)' }}>author ▾ · label ▾ · sort ▾</Mono></div>
    </div>
    {Array.from({ length: 7 }, (_, i) => (
      <div key={i} className="row gap-8" style={{ padding: 6, borderBottom: '1px dashed var(--line-soft)' }}>
        <Glyph ch="○" sm />
        <div style={{ flex: 1 }}>
          <Mono style={{ fontSize: 11 }}>workflow logs not streaming for cancelled jobs</Mono>
          <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>#{420 - i} opened 3d ago by jaeyun · {i % 3 === 0 ? 'bug' : 'enhancement'}</Mono>
        </div>
        <div className="row gap-2">{Array.from({ length: i % 4 }, (_, j) => <Avatar key={j} ch="" size="sm" />)}</div>
        <Mono style={{ color: 'var(--ink-3)' }}>💬 {3 + i}</Mono>
      </div>
    ))}
  </Frame>
);

const IssuesList_B = () => (
  <Frame>
    <AppHeader />
    <div className="row" style={{ padding: 8, gap: 6 }}>
      <Chip active>open · 23</Chip><Chip soft>closed · 421</Chip><Chip soft>all</Chip>
      <div style={{ flex: 1 }} />
      <Btn primary sm>+ new</Btn>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 8 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} style={{ padding: 6 }}>
          <div className="row gap-4">
            <Glyph ch="○" sm />
            <Mono style={{ fontSize: 10, fontWeight: 700, flex: 1 }}>#{418 - i}</Mono>
            <Chip soft style={{ fontSize: 9 }}>{['bug', 'p1', 'docs', 'ui'][i % 4]}</Chip>
          </div>
          <Mono style={{ fontSize: 11, marginTop: 4, display: 'block' }}>logs not streaming for cancelled jobs</Mono>
          <div className="row gap-4" style={{ marginTop: 6 }}>
            <Avatar ch="J" size="sm" />
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)', flex: 1 }}>3d ago · 5 comments</Mono>
          </div>
        </Box>
      ))}
    </div>
    <Sticker rotate={3}>card grid</Sticker>
  </Frame>
);

const IssuesList_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 130, borderRight: '1.5px solid var(--line)', padding: 6 }}>
        <Lbl>filters</Lbl>
        <SideItem ch="○" label="open" active count={23} />
        <SideItem ch="✓" label="closed" count={421} />
        <HR dashed />
        <Lbl>labels</Lbl>
        {['bug 12', 'p1 4', 'docs 6', 'ui 8'].map(l => <SideItem key={l} ch="●" label={l} />)}
        <HR dashed />
        <Lbl>milestones</Lbl>
        <SideItem ch="◇" label="MVP · 60%" />
      </div>
      <div style={{ flex: 1, padding: 6 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)', minWidth: 32 }}>#{420 - i}</Mono>
            <Mono style={{ flex: 1, fontSize: 11 }}>{['logs not streaming', 'tree breaks on >10k', 'prs lazy fetch', '404 on raw'][i % 4]}</Mono>
            <Chip soft style={{ fontSize: 9 }}>{['bug', 'docs', 'p1'][i % 3]}</Chip>
          </div>
        ))}
      </div>
    </div>
    <Sticker rotate={-3}>filter rail</Sticker>
  </Frame>
);

const IssuesList_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <Hand size={20}>23 open · grouped by milestone</Hand>
      {[
        ['MVP · sept', ['logs streaming', 'large tree perf', 'pr review polish']],
        ['v1.1 · oct', ['discussions filters', 'mobile nav']],
        ['no milestone', ['typo in readme']],
      ].map(([m, items]) => (
        <Box key={m} style={{ marginTop: 8, padding: 0 }}>
          <div style={{ background: 'var(--paper-2)', padding: 4, borderBottom: '1.5px solid var(--line)' }}>
            <Hand size={14}>{m}</Hand>
          </div>
          {items.map((t, i) => (
            <div key={i} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
              <Glyph ch="○" sm />
              <Mono style={{ flex: 1, fontSize: 10 }}>{t}</Mono>
              <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>3d</Mono>
            </div>
          ))}
        </Box>
      ))}
    </div>
    <Sticker rotate={4}>grouped by milestone</Sticker>
  </Frame>
);

// ───── Issue detail ─────

const IssueDetail_A = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <Hand size={18}>logs not streaming for cancelled jobs <Mono style={{ color: 'var(--ink-3)' }}>#418</Mono></Hand>
      <div className="row gap-6" style={{ marginTop: 4 }}>
        <Chip style={{ background: '#d4f4dd', borderColor: '#5a8a6a' }}>open</Chip>
        <Mono style={{ fontSize: 10, color: 'var(--ink-3)' }}>jaeyun opened 3d ago · 5 comments</Mono>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <div style={{ flex: 2 }}>
          <Box style={{ padding: 6 }}>
            <div className="row gap-4"><Avatar ch="J" size="sm" /><Mono style={{ fontSize: 10 }}>jaeyun · 3d</Mono></div>
            <Ph h={50} label="markdown body of issue" style={{ marginTop: 6 }} />
          </Box>
          <div className="rail" style={{ marginTop: 8 }}>
            {['ashley reproduced on staging', 'jaeyun pushed fix branch', 'ci · failed on test/cancel', 'ashley commented'].map((t, i) => (
              <div key={i} className="item"><span className="dot" /><Mono style={{ paddingLeft: 4, fontSize: 10 }}>{t}</Mono></div>
            ))}
          </div>
          <Box style={{ marginTop: 8, padding: 6 }}>
            <Lbl>add a comment</Lbl>
            <Ph h={40} label="markdown editor" style={{ marginTop: 4 }} />
            <div className="row gap-4" style={{ marginTop: 4 }}><Btn sm>preview</Btn><Btn primary sm>comment</Btn><Btn sm>close issue</Btn></div>
          </Box>
        </div>
        <div style={{ width: 130 }}>
          {[
            ['assignees', 'jaeyun'],
            ['labels', 'bug, p1'],
            ['milestone', 'MVP'],
            ['projects', '—'],
            ['linked PRs', '#421'],
          ].map(([k, v]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <Lbl>{k}</Lbl>
              <Mono style={{ fontSize: 10 }}>{v}</Mono>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

const IssueDetail_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <div className="row gap-4">
        <Chip style={{ background: '#d4f4dd' }}>● open</Chip>
        <Mono style={{ color: 'var(--ink-3)' }}>#418</Mono>
      </div>
      <Hand size={20} style={{ marginTop: 4 }}>logs not streaming for cancelled jobs</Hand>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, marginTop: 10 }}>
        {[['who', 'jaeyun'], ['when', '3d ago'], ['labels', 'bug · p1'], ['milestone', 'MVP'], ['linked', '#421']].map(([k, v]) => (
          <React.Fragment key={k}><Lbl>{k}</Lbl><Mono>{v}</Mono></React.Fragment>
        ))}
      </div>
      <HR />
      <Hand size={14}>conversation</Hand>
      <Box style={{ padding: 6, marginTop: 4 }}>
        <Ph h={70} label="threaded discussion · timeline collapsed by default" />
      </Box>
    </div>
    <Sticker rotate={3}>metadata-first</Sticker>
  </Frame>
);

const IssueDetail_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ flex: 1, padding: 8, borderRight: '1.5px dashed var(--line)' }}>
        <Hand size={16}>#418 · logs not streaming</Hand>
        <Box style={{ padding: 6, marginTop: 4 }}><Ph h={40} label="opening comment" /></Box>
        <Hand size={12} style={{ marginTop: 8 }}>5 comments</Hand>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <Box key={i} style={{ padding: 4 }}>
              <div className="row gap-4"><Avatar ch={'AJMK'[i]} size="sm" /><Mono style={{ fontSize: 9 }}>{['ashley', 'jaeyun', 'misha', 'kira'][i]} · 2d</Mono></div>
              <Ph h={20} style={{ marginTop: 4 }} label="" />
            </Box>
          ))}
        </div>
      </div>
      <div style={{ width: 160, padding: 8, background: 'var(--paper-2)' }}>
        <Lbl>activity timeline</Lbl>
        <div className="rail" style={{ marginTop: 6 }}>
          {['opened', 'labeled', 'assigned', 'PR opened', 'mentioned'].map((t, i) => (
            <div key={i} className="item"><span className="dot" /><Mono style={{ paddingLeft: 4, fontSize: 9 }}>{t}</Mono></div>
          ))}
        </div>
      </div>
    </div>
    <Sticker rotate={-3}>activity sidebar</Sticker>
  </Frame>
);

const IssueDetail_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 10 }}>
      <div className="row gap-4">
        <Hand size={18}>#418</Hand>
        <Chip style={{ background: '#d4f4dd' }}>open</Chip>
        <Chip soft>bug</Chip>
        <Chip soft>p1</Chip>
        <div style={{ marginLeft: 'auto' }}><Btn sm>close ✓</Btn></div>
      </div>
      <Hand size={20} style={{ marginTop: 4 }}>logs not streaming for cancelled jobs</Hand>
      <div className="row gap-6" style={{ marginTop: 8, padding: 6, background: 'var(--highlight)' }}>
        <Glyph ch="!" sq />
        <Mono style={{ fontSize: 10 }}>fix landed in <span className="underline-h">#421</span> — awaiting review</Mono>
      </div>
      <Box soft style={{ padding: 6, marginTop: 8 }}>
        <Ph h={80} label="full conversation · single column · readable" />
      </Box>
    </div>
    <Sticker rotate={4}>status banner</Sticker>
  </Frame>
);

// ───── PR list ─────

const PRList_A = () => (
  <Frame>
    <AppHeader />
    <div className="row gap-6" style={{ padding: 8 }}>
      <Box soft style={{ flex: 1, padding: '2px 8px' }}><Mono>is:open is:pr review:none</Mono></Box>
      <Btn primary sm>+ new pull</Btn>
    </div>
    {Array.from({ length: 6 }, (_, i) => {
      const states = [['◐', 'draft'], ['↗', 'open'], ['✓', 'merged'], ['↗', 'open']];
      const [ic, st] = states[i % 4];
      return (
        <div key={i} className="row gap-6" style={{ padding: 6, borderBottom: '1px dashed var(--line-soft)' }}>
          <Glyph ch={ic} sm />
          <div style={{ flex: 1 }}>
            <Mono style={{ fontSize: 11 }}>{['feat: split route modules', 'fix: stream cancel logs', 'chore: bump axum 0.8', 'docs: add stack table'][i % 4]}</Mono>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>#{500 - i} · {st} · jaeyun wants to merge into main</Mono>
          </div>
          <div className="row gap-2"><Avatar ch="J" size="sm" /><Avatar ch="A" size="sm" /></div>
          <Mono style={{ fontSize: 9, color: 'var(--accent)' }}>+412 −89</Mono>
          <Mono style={{ fontSize: 9 }}>✓ ci</Mono>
        </div>
      );
    })}
  </Frame>
);

const PRList_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>4 pulls · grouped by status</Hand>
      {[
        ['needs review · 2', ['split route modules', 'stream cancel logs']],
        ['changes requested · 1', ['axum 0.8']],
        ['draft · 1', ['discussions schema']],
      ].map(([h, items]) => (
        <Box key={h} style={{ marginTop: 8, padding: 0 }}>
          <div style={{ background: 'var(--paper-2)', padding: 4, borderBottom: '1.5px solid var(--line)' }} className="row gap-4">
            <Hand size={13}>{h}</Hand>
          </div>
          {items.map((t, i) => (
            <div key={i} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
              <Glyph ch="↗" sm />
              <Mono style={{ flex: 1, fontSize: 10 }}>{t}</Mono>
              <Mono style={{ fontSize: 9, color: 'var(--accent)' }}>+128 −12</Mono>
            </div>
          ))}
        </Box>
      ))}
    </div>
    <Sticker rotate={3}>kanban-ish groups</Sticker>
  </Frame>
);

const PRList_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {['draft', 'review', 'ready'].map((c, i) => (
          <Box key={c} dashed style={{ padding: 6, minHeight: 200 }}>
            <Hand size={14}>{c}</Hand>
            {Array.from({ length: i + 1 }, (_, j) => (
              <Box key={j} soft style={{ padding: 4, marginTop: 4 }}>
                <Mono style={{ fontSize: 10 }}>#{500 - j} {['split routes', 'log fix', 'axum bump'][j % 3]}</Mono>
                <div className="row gap-2" style={{ marginTop: 4 }}><Avatar ch="J" size="sm" /><Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>+412 −89</Mono></div>
              </Box>
            ))}
          </Box>
        ))}
      </div>
    </div>
    <Sticker rotate={-3}>kanban board</Sticker>
  </Frame>
);

const PRList_D = () => (
  <Frame>
    <AppHeader />
    <div className="row" style={{ borderBottom: '1.5px solid var(--line)' }}>
      {['mine', 'review-requested', 'mentioned', 'all open'].map((t, i) => (
        <div key={t} style={{ padding: '6px 10px', fontFamily: 'var(--hand)', fontSize: 14, borderRight: '1px dashed var(--line-soft)', borderBottom: i === 1 ? '3px solid var(--accent)' : 'none' }}>{t}</div>
      ))}
    </div>
    <div style={{ padding: 6 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} style={{ padding: 6, marginTop: 4 }}>
          <div className="row gap-4">
            <Mono style={{ fontWeight: 700, fontSize: 11 }}>#{500 - i}</Mono>
            <Mono style={{ flex: 1, fontSize: 11 }}>{['split routes', 'log fix', 'axum bump'][i % 3]}</Mono>
            <Mono style={{ fontSize: 9 }}>review wanted ↗</Mono>
          </div>
          <div className="row gap-4" style={{ marginTop: 4 }}>
            <Mono style={{ fontSize: 9, color: 'var(--ink-3)' }}>jaeyun → main · 3 files · ci ✓</Mono>
          </div>
        </Box>
      ))}
    </div>
    <Sticker rotate={4}>my-review-queue tabs</Sticker>
  </Frame>
);

// ───── PR detail / files ─────

const PRDetail_A = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>feat: split route modules <Mono style={{ color: 'var(--ink-3)' }}>#421</Mono></Hand>
      <div className="row gap-6" style={{ marginTop: 4 }}>
        <Chip style={{ background: '#d4f4dd' }}>open</Chip>
        <Mono style={{ fontSize: 10, color: 'var(--ink-3)' }}>jaeyun wants to merge 8 commits from <span className="underline-h">jh/routes</span> into <span className="underline-h">main</span></Mono>
      </div>
      <TabBar tabs={['Conversation 12', 'Commits 8', 'Checks 6', 'Files +412 −89']} active={0} style={{ marginTop: 8 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <div style={{ flex: 2 }}>
          <Box accent style={{ padding: 6 }}>
            <Hand size={14}>✓ this branch is ready to merge</Hand>
            <div className="body-sm">all checks passed · 2 approvals</div>
            <div style={{ marginTop: 6 }} className="row gap-4"><Btn primary sm>merge ▾</Btn><Btn sm>squash</Btn></div>
          </Box>
          <Ph h={70} label="comment timeline" style={{ marginTop: 6 }} />
        </div>
        <div style={{ width: 130 }}>
          <Lbl>reviewers</Lbl><div className="row gap-2" style={{ marginTop: 4 }}><Avatar ch="A" size="sm" /><Avatar ch="M" size="sm" /></div>
          <HR dashed />
          <Lbl>checks · 6</Lbl>
          {['build ✓', 'test ✓', 'clippy ✓', 'biome ✓', 'e2e ✓', 'pages ✓'].map(c => <Mono key={c} style={{ fontSize: 9, display: 'block' }}>{c}</Mono>)}
        </div>
      </div>
    </div>
  </Frame>
);

const PRDetail_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <Hand size={16}>#421 split route modules</Hand>
      <Box thick style={{ marginTop: 6, padding: 6 }}>
        <div className="row gap-6">
          <div style={{ flex: 1 }}>
            <Lbl>head → base</Lbl>
            <Mono>jh/routes → main</Mono>
          </div>
          <div style={{ flex: 1 }}>
            <Lbl>commits</Lbl><Mono>8</Mono>
          </div>
          <div style={{ flex: 1 }}>
            <Lbl>diff</Lbl><Mono style={{ color: 'var(--accent)' }}>+412 −89</Mono>
          </div>
        </div>
      </Box>
      <Hand size={14} style={{ marginTop: 8 }}>changed files · 12</Hand>
      <Box style={{ padding: 0, marginTop: 4 }}>
        {['routes/mod.rs', 'routes/repos.rs', 'routes/issues.rs', 'main.rs', 'tests/routes.rs'].map((f, i) => (
          <div key={f} className="row gap-6" style={{ padding: 4, borderBottom: '1px dashed var(--line-soft)' }}>
            <Mono style={{ flex: 1, fontSize: 10 }}>{f}</Mono>
            <Mono style={{ fontSize: 9, color: 'var(--accent)' }}>+{40 + i * 10} −{i * 5}</Mono>
          </div>
        ))}
      </Box>
    </div>
    <Sticker rotate={3}>diff-summary first</Sticker>
  </Frame>
);

const PRDetail_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
      <div style={{ width: 130, padding: 6, borderRight: '1.5px solid var(--line)' }}>
        <Lbl>files</Lbl>
        {['routes/mod.rs', 'routes/repos.rs', 'main.rs', 'tests/routes.rs'].map((f, i) => (
          <Mono key={f} style={{ display: 'block', padding: '2px 0', fontSize: 9, background: i === 1 ? 'var(--paper-2)' : 'transparent' }}>{f}</Mono>
        ))}
      </div>
      <div style={{ flex: 1, padding: 6, display: 'flex', flexDirection: 'column' }}>
        <Mono style={{ fontSize: 10 }}>routes/repos.rs · +124 −12</Mono>
        <Box style={{ marginTop: 4, padding: 0, flex: 1, background: 'var(--paper-2)' }}>
          {Array.from({ length: 14 }, (_, i) => {
            const kind = i % 7 === 0 ? 'add' : i % 5 === 0 ? 'del' : 'ctx';
            const bg = kind === 'add' ? '#d8f0d8' : kind === 'del' ? '#f4d8d8' : 'transparent';
            return (
              <div key={i} className="row" style={{ background: bg, padding: '0 4px', minHeight: 14 }}>
                <Mono style={{ fontSize: 9, color: 'var(--ink-4)', minWidth: 18 }}>{i + 1}</Mono>
                <Mono style={{ fontSize: 9, color: 'var(--ink-4)', minWidth: 12 }}>{kind === 'add' ? '+' : kind === 'del' ? '−' : ' '}</Mono>
                <div style={{ flex: 1, height: 4, width: `${40 + (i * 7) % 50}%`, background: 'var(--ink-2)', opacity: 0.7, marginTop: 5 }} />
              </div>
            );
          })}
        </Box>
      </div>
    </div>
    <Sticker rotate={-3}>files · split diff</Sticker>
  </Frame>
);

const PRDetail_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 8 }}>
      <div className="row gap-4">
        <Hand size={16}>#421</Hand>
        <Hand size={16} style={{ flex: 1 }}>split route modules</Hand>
      </div>
      <Box style={{ marginTop: 6, padding: 8, background: 'var(--accent-soft)' }}>
        <Hand size={14}>review · what reviewers see first</Hand>
        <div className="body-sm" style={{ marginTop: 4 }}>"break out per-resource route modules so /jobs and /domain stay clean. no behavior changes."</div>
        <div className="row gap-4" style={{ marginTop: 6 }}><Btn sm>👍 looks good</Btn><Btn sm>request changes</Btn><Btn primary sm>approve</Btn></div>
      </Box>
      <HR dashed />
      <Hand size={14}>walkthrough</Hand>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        {['1. routes/mod.rs registers groups', '2. each resource owns its module', '3. tests still green'].map(t => (
          <div key={t} className="row gap-6"><span className="check on" /><Mono style={{ fontSize: 10 }}>{t}</Mono></div>
        ))}
      </div>
    </div>
    <Sticker rotate={4}>review-led narrative</Sticker>
  </Frame>
);

Object.assign(window, {
  IssuesList_A, IssuesList_B, IssuesList_C, IssuesList_D,
  IssueDetail_A, IssueDetail_B, IssueDetail_C, IssueDetail_D,
  PRList_A, PRList_B, PRList_C, PRList_D,
  PRDetail_A, PRDetail_B, PRDetail_C, PRDetail_D,
});
