// og-screens-3.jsx — Pulls list, PR detail, PR diff

function PullsList() {
  const { go } = useRoute();
  const [tab, setTab] = React.useState('open');
  const [labels, setLabels] = React.useState(new Set());
  const filtered = OG_PRS.filter(p => tab === 'all' || p.state === tab)
    .filter(p => labels.size === 0 || p.labels.some(l => labels.has(l)));
  const counts = { open: OG_PRS.filter(p => p.state === 'open').length, merged: OG_PRS.filter(p => p.state === 'merged').length, closed: OG_PRS.filter(p => p.state === 'closed').length };

  const allLabels = [...new Set(OG_PRS.flatMap(p => p.labels))];
  const toggleLabel = (l) => {
    const next = new Set(labels);
    next.has(l) ? next.delete(l) : next.add(l);
    setLabels(next);
  };

  return (
    <div className="page-enter">
      <TopBar />
      <RepoSubnav active="pulls" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px' }}>
        <div className="row" style={{ gap: 12, marginBottom: 16 }}>
          <div className="input" style={{ flex: 1, maxWidth: 480 }}>
            {I.search}
            <input placeholder="is:open is:pr  reviewer:@me" />
          </div>
          <button className="btn">Labels<span style={{ color: 'var(--ink-4)' }}>▾</span></button>
          <button className="btn">Milestones<span style={{ color: 'var(--ink-4)' }}>▾</span></button>
          <button className="btn">Sort<span style={{ color: 'var(--ink-4)' }}>▾</span></button>
          <button className="btn primary">{I.plus}New pull request</button>
        </div>

        <div className="row" style={{ gap: 6, marginBottom: 14 }}>
          {allLabels.map(l => (
            <button key={l} className={'chip' + (labels.has(l) ? ' active' : ' soft')} onClick={() => toggleLabel(l)}>{l}</button>
          ))}
          {labels.size > 0 && <button className="btn ghost sm" onClick={() => setLabels(new Set())}>Clear</button>}
        </div>

        <div className="card">
          <div className="tabs" style={{ padding: '0 16px' }}>
            {[['open', 'Open', counts.open, I.pr_open, 'var(--ok)'], ['merged', 'Merged', counts.merged, I.pr_merged, 'oklch(0.55 0.15 280)'], ['closed', 'Closed', counts.closed, I.pr_closed, 'var(--err)']].map(([id, label, count, ico, color]) => (
              <div key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color }}>{ico}</span>
                  {label}
                  <span className="badge t-num">{count}</span>
                </span>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <span className="t-xs" style={{ alignSelf: 'center' }}>{filtered.length} of {OG_PRS.length}</span>
          </div>
          {filtered.map(pr => (
            <div key={pr.n} className="list-row" onClick={() => go('pr_detail')} style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ color: pr.state === 'open' ? 'var(--ok)' : pr.state === 'merged' ? 'oklch(0.55 0.15 280)' : 'var(--err)', flexShrink: 0 }}>
                {pr.state === 'open' ? I.pr_open : pr.state === 'merged' ? I.pr_merged : I.pr_closed}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{pr.title}</span>
                  {pr.draft && <span className="chip soft" style={{ fontSize: 10, height: 18 }}>draft</span>}
                  {pr.labels.map(l => <span key={l} className="chip soft" style={{ fontSize: 11, height: 18 }}>{l}</span>)}
                </div>
                <div className="t-xs" style={{ marginTop: 4 }}>
                  <span className="t-mono-sm">#{pr.n}</span> opened by {pr.author} · <span className="t-mono-sm">{pr.branch}</span> → <span className="t-mono-sm">{pr.base}</span> · {pr.updated}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                {pr.checks === 'pass' && <span style={{ color: 'var(--ok)' }}>{I.check}</span>}
                {pr.checks === 'fail' && <span style={{ color: 'var(--err)' }}>{I.x}</span>}
                {pr.checks === 'running' && <span className="dot live" style={{ background: 'var(--warn)' }} />}
                {pr.checks === 'pending' && <span style={{ color: 'var(--ink-4)' }}>{I.clock}</span>}
              </div>
              <div className="row" style={{ gap: 4 }}>
                {pr.reviewers.slice(0, 3).map(r => <div key={r} className="av sm" style={{ marginLeft: -4 }}>{r[0].toUpperCase()}</div>)}
              </div>
              <div className="row" style={{ gap: 12, color: 'var(--ink-3)', fontSize: 12, minWidth: 140, justifyContent: 'flex-end' }}>
                <span className="row t-num" style={{ gap: 4 }}>
                  <span style={{ color: 'var(--ok)' }}>+{pr.additions}</span>
                  <span style={{ color: 'var(--err)' }}>−{pr.deletions}</span>
                </span>
                <span className="row" style={{ gap: 4 }}>{I.comment}<span className="t-num">{pr.comments}</span></span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 56, textAlign: 'center', color: 'var(--ink-3)' }}>
              No pull requests match these filters.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PRDetail() {
  const { go } = useRoute();
  const pr = OG_PRS[0]; // #421
  const [tab, setTab] = React.useState('conversation');
  return (
    <div className="page-enter">
      <TopBar />
      <RepoSubnav active="pulls" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px' }}>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-h1">{pr.title} <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>#{pr.n}</span></div>
            <div className="row" style={{ gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="chip ok"><span style={{ color: 'var(--ok)' }}>{I.pr_open}</span>Open</span>
              <span className="t-sm muted">
                <span className="av sm" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>M</span>
                <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>mira</strong> wants to merge 8 commits into <span className="t-mono-sm">main</span> from <span className="t-mono-sm">mira/split-routes</span>
              </span>
            </div>
          </div>
          <button className="btn">{I.copy}</button>
        </div>

        <div className="tabs" style={{ marginTop: 24 }}>
          {[['conversation', 'Conversation', pr.comments], ['commits', 'Commits', pr.commits], ['checks', 'Checks', null], ['files', 'Files changed', OG_DIFF.length]].map(([id, label, n]) => (
            <div key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => id === 'files' ? go('pr_diff') : setTab(id)}>
              {label}{n != null && <span className="badge t-num">{n}</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, marginTop: 24 }}>
          <div>
            {/* Original PR comment */}
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="av lg">M</div>
              <div className="card" style={{ flex: 1, position: 'relative' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <strong>mira</strong>
                  <span className="muted">opened this 12 minutes ago</span>
                  <span className="chip soft" style={{ marginLeft: 'auto', fontSize: 11, height: 20 }}>author</span>
                </div>
                <div style={{ padding: 20, fontSize: 14, lineHeight: 1.65 }}>
                  <p style={{ margin: 0 }}>Splits the monolithic <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>routes</code> module into per-resource files. Closes <a style={{ color: 'var(--accent)' }}>#312</a>.</p>
                  <ul style={{ marginTop: 12, paddingLeft: 20, color: 'var(--ink-2)' }}>
                    <li>Each resource owns its router + handlers + tests.</li>
                    <li>Public API: <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>routes::all()</code> returns the merged router.</li>
                    <li>Mechanical refactor — no behaviour change. CI green.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Timeline events */}
            <div style={{ paddingLeft: 56, position: 'relative', marginTop: 16 }}>
              <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--line)' }} />
              {[
                { kind: 'event', ico: I.user, t: <><strong>jaeyun</strong> was requested as a reviewer · <span className="muted">10 min ago</span></> },
                { kind: 'event', ico: I.user, t: <><strong>ashley</strong> was requested as a reviewer · <span className="muted">10 min ago</span></> },
                { kind: 'comment', who: 'jaeyun', when: '6 minutes ago', body: <p style={{ margin: 0 }}>Tiny thing — should we keep <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>routes::landing</code> public for the integration tests? Otherwise this looks great.</p> },
                { kind: 'event', ico: I.check, color: 'var(--ok)', t: <><strong>ashley</strong> approved these changes · <span className="muted">2 min ago</span></> },
              ].map((e, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 20 }}>
                  <div style={{ position: 'absolute', left: -38, top: 0, width: 32, height: 32, borderRadius: '50%', background: e.kind === 'comment' ? 'transparent' : 'var(--surface)', border: e.kind === 'comment' ? 'none' : '2px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: e.color || 'var(--ink-3)' }}>
                    {e.kind === 'comment' ? <div className="av sm" style={{ width: 32, height: 32 }}>{e.who[0].toUpperCase()}</div> : e.ico}
                  </div>
                  {e.kind === 'event' ? (
                    <div className="t-sm" style={{ paddingTop: 6 }}>{e.t}</div>
                  ) : (
                    <div className="card">
                      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', borderRadius: '10px 10px 0 0', fontSize: 13 }}>
                        <strong>{e.who}</strong> <span className="muted">commented {e.when}</span>
                      </div>
                      <div style={{ padding: 16, fontSize: 14 }}>{e.body}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Merge box */}
            <div className="card" style={{ marginTop: 24, overflow: 'hidden' }}>
              <div style={{ padding: '20px 20px 14px', display: 'flex', gap: 14, alignItems: 'flex-start', borderBottom: '1px solid var(--line)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ok-soft)', color: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{I.check}</div>
                <div style={{ flex: 1 }}>
                  <div className="t-h3">Ready to merge</div>
                  <div className="t-sm muted" style={{ marginTop: 4 }}>1 approval · all checks passing · no conflicts with <span className="t-mono-sm">main</span>.</div>
                </div>
                <button className="btn accent">Merge pull request{I.arrow_r}</button>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--ink-3)' }}>
                <button className="chip soft active" style={{ fontSize: 12 }}>Squash and merge</button>
                <button className="chip soft" style={{ fontSize: 12 }}>Create a merge commit</button>
                <button className="chip soft" style={{ fontSize: 12 }}>Rebase and merge</button>
                <span style={{ flex: 1 }} />
                <button className="btn ghost sm">Cancel</button>
              </div>
            </div>
          </div>

          <aside>
            <div className="t-label" style={{ marginBottom: 8 }}>Reviewers</div>
            {[['ashley', 'approved', 'var(--ok)', I.check], ['jaeyun', 'pending', 'var(--ink-4)', I.clock]].map(([who, status, color, ico]) => (
              <div key={who} className="row" style={{ gap: 10, padding: '8px 0' }}>
                <div className="av sm">{who[0].toUpperCase()}</div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{who}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color, fontSize: 12 }}>{ico}{status}</span>
              </div>
            ))}
            <button className="btn ghost sm" style={{ marginTop: 4 }}>{I.plus}Request review</button>

            <div className="div-h" style={{ margin: '20px 0' }} />
            <div className="t-label" style={{ marginBottom: 8 }}>Assignees</div>
            <div className="row" style={{ gap: 8 }}><div className="av sm">M</div><span style={{ fontSize: 13 }}>mira</span></div>

            <div className="div-h" style={{ margin: '20px 0' }} />
            <div className="t-label" style={{ marginBottom: 8 }}>Labels</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{pr.labels.map(l => <span key={l} className="chip soft">{l}</span>)}</div>

            <div className="div-h" style={{ margin: '20px 0' }} />
            <div className="t-label" style={{ marginBottom: 8 }}>Linked issues</div>
            <a className="row" style={{ gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
              <span style={{ color: 'var(--ok)' }}>{I.issue_open}</span>
              <span>Closes #312</span>
            </a>

            <div className="div-h" style={{ margin: '20px 0' }} />
            <div className="t-label" style={{ marginBottom: 8 }}>Checks</div>
            <div className="row" style={{ gap: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--ok)' }}>{I.check}</span>
              <span>5 / 5 passed</span>
              <span className="t-xs" style={{ marginLeft: 'auto' }}>1m 47s</span>
            </div>
            <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => go('actions')}>View run{I.arrow_r}</button>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PRDiff() {
  const { go } = useRoute();
  const [openFile, setOpenFile] = React.useState(0);
  return (
    <div className="page-enter">
      <TopBar />
      <RepoSubnav active="pulls" />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 32px' }}>
        <div className="row" style={{ gap: 12, marginBottom: 16 }}>
          <button className="btn ghost sm" onClick={() => go('pr_detail')}>{I.arrow_l}Back to #421</button>
          <div className="t-h2" style={{ marginLeft: 8 }}>Files changed <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>· {OG_DIFF.length}</span></div>
          <span style={{ flex: 1 }} />
          <span className="t-sm row" style={{ gap: 8, marginRight: 8 }}>
            <span className="t-num" style={{ color: 'var(--ok)' }}>+{OG_DIFF.reduce((a, f) => a + f.additions, 0)}</span>
            <span className="t-num" style={{ color: 'var(--err)' }}>−{OG_DIFF.reduce((a, f) => a + f.deletions, 0)}</span>
          </span>
          <button className="btn primary">Review changes{I.arrow_r}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          <aside style={{ position: 'sticky', top: 'calc(var(--header-h) + 20px)', alignSelf: 'flex-start' }}>
            <div className="card" style={{ padding: 6 }}>
              <div className="t-label" style={{ padding: '8px 10px' }}>Files in this PR</div>
              {OG_DIFF.map((f, i) => (
                <button key={f.file} onClick={() => setOpenFile(i)}
                  style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, background: openFile === i ? 'var(--surface-2)' : 'transparent', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ marginTop: 2, color: f.status === 'added' ? 'var(--ok)' : 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 11 }}>{f.status === 'added' ? '+' : 'M'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontFamily: 'var(--mono)', wordBreak: 'break-all', lineHeight: 1.4 }}>{f.file}</div>
                    <div className="t-xs t-num" style={{ marginTop: 2 }}>
                      <span style={{ color: 'var(--ok)' }}>+{f.additions}</span> <span style={{ color: 'var(--err)' }}>−{f.deletions}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <div>
            {OG_DIFF.filter(f => f.hunks).map((f, fi) => (
              <div key={f.file} className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
                <div className="row" style={{ padding: '10px 14px', gap: 10, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--ink-3)' }}>{I.chev_d}</span>
                  <span className="t-mono-sm" style={{ flex: 1 }}>{f.file}</span>
                  <span className="t-xs t-num">
                    <span style={{ color: 'var(--ok)' }}>+{f.additions}</span> <span style={{ color: 'var(--err)' }}>−{f.deletions}</span>
                  </span>
                  <button className="btn ghost sm">View file</button>
                </div>
                {f.hunks.map((h, hi) => (
                  <div key={hi}>
                    <div className="t-mono-sm" style={{ padding: '6px 16px', color: 'var(--ink-3)', background: 'var(--surface-3)', borderBottom: '1px solid var(--line-soft)' }}>{h.header}</div>
                    {h.lines.map((line, li) => {
                      const bg = line.type === 'add' ? 'var(--code-add)' : line.type === 'del' ? 'var(--code-del)' : 'transparent';
                      const numBg = line.type === 'add' ? 'var(--code-add-strong)' : line.type === 'del' ? 'var(--code-del-strong)' : 'var(--surface-2)';
                      const sign = line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' ';
                      return (
                        <div key={li} style={{ display: 'flex', minHeight: 22, fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: '22px', background: bg }}>
                          <span style={{ width: 50, paddingRight: 8, textAlign: 'right', color: 'var(--ink-4)', background: numBg, userSelect: 'none' }}>{line.old ?? ''}</span>
                          <span style={{ width: 50, paddingRight: 8, textAlign: 'right', color: 'var(--ink-4)', background: numBg, userSelect: 'none', borderRight: '1px solid var(--line-soft)' }}>{line.new ?? ''}</span>
                          <span style={{ width: 24, textAlign: 'center', color: 'var(--ink-4)', userSelect: 'none' }}>{sign}</span>
                          <span style={{ flex: 1, paddingRight: 16, color: 'var(--ink-1)', whiteSpace: 'pre' }} dangerouslySetInnerHTML={{ __html: highlightRust(line.t) || '&nbsp;' }} />
                        </div>
                      );
                    })}
                    {/* inline comment placeholder on a specific line */}
                    {fi === 0 && hi === 0 && (
                      <div style={{ borderTop: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)', background: 'var(--surface-2)', padding: 16, display: 'flex', gap: 12 }}>
                        <div className="av sm">J</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}><strong>jaeyun</strong> <span className="muted">on this line · 4 min ago</span></div>
                          <p style={{ margin: '4px 0 0', fontSize: 13 }}>Should this stay <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>pub</code> for tests?</p>
                          <div className="row" style={{ gap: 6, marginTop: 8 }}>
                            <button className="btn sm">Reply…</button>
                            <button className="btn sm ghost">Resolve</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { PullsList, PRDetail, PRDiff });
