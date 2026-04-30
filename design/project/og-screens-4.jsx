// og-screens-4.jsx — Issues list, Actions run with streaming logs

function IssuesList() {
  const { go } = useRoute();
  const [tab, setTab] = React.useState('open');
  const [groupBy, setGroupBy] = React.useState('milestone');
  const filtered = OG_ISSUES.filter(i => tab === 'all' || i.state === tab);
  const counts = { open: OG_ISSUES.filter(i => i.state === 'open').length, closed: OG_ISSUES.filter(i => i.state === 'closed').length };

  let groups = {};
  if (groupBy === 'milestone') {
    filtered.forEach(i => { (groups[i.milestone || 'No milestone'] = groups[i.milestone || 'No milestone'] || []).push(i); });
  } else if (groupBy === 'assignee') {
    filtered.forEach(i => { (groups[i.assignee || 'Unassigned'] = groups[i.assignee || 'Unassigned'] || []).push(i); });
  } else {
    groups = { 'All issues': filtered };
  }

  return (
    <div className="page-enter">
      <TopBar />
      <RepoSubnav active="issues" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px' }}>
        <div className="row" style={{ gap: 12, marginBottom: 16 }}>
          <div className="input" style={{ flex: 1, maxWidth: 480 }}>
            {I.search}
            <input placeholder="is:open is:issue assignee:@me" />
          </div>
          <button className="btn">Group: {groupBy}<span style={{ color: 'var(--ink-4)' }}>▾</span></button>
          <button className="btn">Sort<span style={{ color: 'var(--ink-4)' }}>▾</span></button>
          <button className="btn primary">{I.plus}New issue</button>
        </div>

        <div className="row" style={{ gap: 6, marginBottom: 14 }}>
          {['milestone', 'assignee', 'none'].map(g => (
            <button key={g} className={'chip' + (groupBy === g ? ' active' : ' soft')} onClick={() => setGroupBy(g)}>by {g}</button>
          ))}
        </div>

        <div className="card">
          <div className="tabs" style={{ padding: '0 16px' }}>
            {[['open', 'Open', counts.open, I.issue_open, 'var(--ok)'], ['closed', 'Closed', counts.closed, I.issue_closed, 'oklch(0.55 0.15 280)']].map(([id, label, count, ico, color]) => (
              <div key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color }}>{ico}</span>{label}<span className="badge t-num">{count}</span>
                </span>
              </div>
            ))}
          </div>
          {Object.entries(groups).map(([g, list]) => (
            <div key={g}>
              <div className="row" style={{ padding: '10px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)', gap: 10 }}>
                <span className="t-label">{g}</span>
                <span className="t-xs">· {list.length}</span>
              </div>
              {list.map(iss => (
                <div key={iss.n} className="list-row" style={{ padding: '14px 20px' }}>
                  <span style={{ color: iss.state === 'open' ? 'var(--ok)' : 'oklch(0.55 0.15 280)' }}>
                    {iss.state === 'open' ? I.issue_open : I.issue_closed}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{iss.title}</span>
                      {iss.labels.map(l => <span key={l} className="chip soft" style={{ fontSize: 11, height: 18 }}>{l}</span>)}
                    </div>
                    <div className="t-xs" style={{ marginTop: 4 }}>
                      <span className="t-mono-sm">#{iss.n}</span> opened by {iss.author} · updated {iss.updated}
                    </div>
                  </div>
                  {iss.assignee && <div className="av sm" title={iss.assignee}>{iss.assignee[0].toUpperCase()}</div>}
                  <span className="row" style={{ gap: 4, color: 'var(--ink-3)', fontSize: 12, minWidth: 40, justifyContent: 'flex-end' }}>{I.comment}<span className="t-num">{iss.comments}</span></span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function ActionsRun() {
  const run = OG_ACTIONS_RUN;
  const [logs, setLogs] = React.useState(OG_LOG_LINES.slice(0, 8));
  const [paused, setPaused] = React.useState(false);
  const [selectedJob, setSelectedJob] = React.useState('unit · web');
  const logRef = React.useRef(null);

  React.useEffect(() => {
    if (paused || logs.length >= OG_LOG_LINES.length) return;
    const t = setTimeout(() => {
      setLogs(l => [...l, OG_LOG_LINES[l.length]]);
    }, 700 + Math.random() * 600);
    return () => clearTimeout(t);
  }, [logs, paused]);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const lvlColor = (l) => ({ info: 'var(--info)', cmd: 'var(--accent)', out: 'var(--ink-2)', ok: 'var(--ok)', err: 'var(--err)' }[l] || 'var(--ink-3)');

  return (
    <div className="page-enter">
      <TopBar />
      <RepoSubnav active="actions" />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 32px' }}>
        <div className="row" style={{ gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="row" style={{ gap: 10 }}>
              <span className="dot live" />
              <div className="t-h2">{run.name} <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>· run #{run.n}</span></div>
            </div>
            <div className="t-sm muted" style={{ marginTop: 6 }}>
              {run.trigger} · <span className="t-mono-sm">{run.branch}</span> @ <span className="t-mono-sm">{run.commit}</span> · started {run.started}
            </div>
          </div>
          <button className="btn">{I.rerun}Re-run all</button>
          <button className="btn">Cancel run</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          <aside>
            <div className="card" style={{ padding: 6 }}>
              <div className="t-label" style={{ padding: '10px 10px 6px' }}>Jobs</div>
              {run.jobs.map(j => (
                <button key={j.name} onClick={() => setSelectedJob(j.name)}
                  style={{ display: 'flex', width: '100%', padding: '10px 10px', borderRadius: 6, gap: 10, alignItems: 'center', background: selectedJob === j.name ? 'var(--surface-2)' : 'transparent', textAlign: 'left' }}>
                  <span style={{ display: 'inline-flex', width: 18, justifyContent: 'center' }}>
                    {j.status === 'pass' && <span style={{ color: 'var(--ok)' }}>{I.check}</span>}
                    {j.status === 'fail' && <span style={{ color: 'var(--err)' }}>{I.x}</span>}
                    {j.status === 'running' && <span className="dot live" />}
                    {j.status === 'queued' && <span style={{ color: 'var(--ink-4)' }}>{I.clock}</span>}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: selectedJob === j.name ? 500 : 400 }}>{j.name}</span>
                  <span className="t-xs t-num">{j.duration || '—'}</span>
                </button>
              ))}
            </div>

            <div className="card" style={{ padding: 14, marginTop: 14 }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Summary</div>
              <div className="t-sm">3 of 5 passed · 1 running · 1 queued</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 2, height: 6 }}>
                <div style={{ flex: 3, background: 'var(--ok)', borderRadius: 1 }} />
                <div style={{ flex: 1, background: 'var(--accent)', borderRadius: 1 }} />
                <div style={{ flex: 1, background: 'var(--line-strong)', borderRadius: 1 }} />
              </div>
            </div>
          </aside>

          <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', gap: 12 }}>
              <span className="dot live" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedJob}</span>
              <span className="t-xs">running · 1m 12s</span>
              <span style={{ flex: 1 }} />
              <div className="input" style={{ height: 28, padding: '0 10px', maxWidth: 200 }}>
                {I.search}<input placeholder="Search log…" />
              </div>
              <button className="btn sm" onClick={() => setPaused(p => !p)}>{paused ? I.play : I.pause}{paused ? 'Resume' : 'Follow'}</button>
              <button className="btn sm">{I.download}</button>
            </div>
            <div ref={logRef} className="scroll" style={{ flex: 1, padding: '12px 0', height: 480, background: '#100e0a', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: '20px', overflowY: 'auto' }}>
              {logs.map((line, i) => (
                <div key={i} style={{ display: 'flex', padding: '0 16px', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: '#6e6857', minWidth: 60, fontSize: 11 }}>{line.t}</span>
                  <span style={{ color: lvlColor(line.lvl), minWidth: 36, fontSize: 11, fontWeight: 500 }}>{line.lvl}</span>
                  <span style={{ flex: 1, color: line.lvl === 'cmd' ? '#e8c898' : line.lvl === 'ok' ? '#9ad99e' : '#ddd6c5' }}>{line.m}</span>
                </div>
              ))}
              {logs.length < OG_LOG_LINES.length && !paused && (
                <div style={{ padding: '0 16px', display: 'flex', gap: 12, color: '#6e6857' }}>
                  <span style={{ minWidth: 60 }}>—</span>
                  <span className="dot live" style={{ marginTop: 7 }} />
                  <span>streaming…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { IssuesList, ActionsRun });
