// og-screens-2.jsx — Repo home, File viewer

function FileTree({ tree, onOpen, depth = 0, expanded, setExpanded }) {
  return (
    <div>
      {tree.map((node, i) => {
        const path = depth + '_' + i + '_' + node.name;
        const isOpen = expanded[path] !== false; // default expanded
        if (node.type === 'dir') {
          return (
            <div key={path}>
              <div onClick={() => setExpanded({ ...expanded, [path]: !isOpen })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', paddingLeft: 8 + depth * 14, cursor: 'pointer', fontSize: 13, borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: 'var(--ink-4)', display: 'flex' }}>{isOpen ? I.chev_d : I.chev_r}</span>
                <span style={{ color: 'var(--accent)', display: 'flex' }}>{I.folder}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{node.name}</span>
              </div>
              {isOpen && <FileTree tree={node.children} onOpen={onOpen} depth={depth + 1} expanded={expanded} setExpanded={setExpanded} />}
            </div>
          );
        }
        const isMain = node.highlight;
        return (
          <div key={path}
            onClick={() => isMain && onOpen()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', paddingLeft: 8 + depth * 14 + 18, cursor: 'pointer', fontSize: 13, borderRadius: 4, background: isMain ? 'var(--accent-soft)' : 'transparent' }}
            onMouseEnter={e => !isMain && (e.currentTarget.style.background = 'var(--hover)')}
            onMouseLeave={e => !isMain && (e.currentTarget.style.background = 'transparent')}>
            <span style={{ color: 'var(--ink-4)', display: 'flex' }}>{I.file}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: isMain ? 'var(--accent)' : 'var(--ink-2)', fontWeight: isMain ? 500 : 400 }}>{node.name}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{node.size}</span>
          </div>
        );
      })}
    </div>
  );
}

function Repo() {
  const { go } = useRoute();
  const [expanded, setExpanded] = React.useState({});
  return (
    <div className="page-enter">
      <TopBar />
      <RepoSubnav active="code" />
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 32px' }}>
        <div className="row" style={{ gap: 12, marginBottom: 16 }}>
          <button className="btn sm">{I.branch}main<span style={{ color: 'var(--ink-4)' }}>▾</span></button>
          <span className="t-xs">12 branches · 4 tags</span>
          <span style={{ flex: 1 }} />
          <button className="btn sm">Go to file</button>
          <button className="btn sm">{I.copy}Clone</button>
          <button className="btn sm primary">{I.download}Code</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 280px', gap: 24 }}>
          <aside>
            <div className="card" style={{ padding: 8 }}>
              <div className="row" style={{ padding: '6px 8px 8px', gap: 8, borderBottom: '1px solid var(--line-soft)' }}>
                <span style={{ color: 'var(--ink-3)' }}>{I.search}</span>
                <input placeholder="Filter files…" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 13 }} />
                <span className="kbd">t</span>
              </div>
              <div style={{ padding: 4, maxHeight: 540, overflowY: 'auto' }} className="scroll">
                <FileTree tree={OG_FILE_TREE} onOpen={() => go('file')} expanded={expanded} setExpanded={setExpanded} />
              </div>
            </div>
          </aside>

          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="row" style={{ padding: '10px 14px', gap: 10, borderBottom: '1px solid var(--line)' }}>
                <div className="av sm">AS</div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>ashley</span>
                <span className="t-mono-sm muted">8a4f2c1</span>
                <span className="t-sm">Refactor router into per-resource modules</span>
                <span style={{ flex: 1 }} />
                <span className="t-xs">2 hours ago</span>
                <span className="t-xs">·</span>
                <span className="t-xs t-num">412 commits</span>
              </div>
              <div style={{ padding: '32px 40px' }}>
                {OG_README_LINES.map((l, i) => {
                  if (l.tag === 'h1') return <h1 key={i} className="t-display" style={{ fontSize: 44, margin: 0 }}>{l.text}</h1>;
                  if (l.tag === 'lede') return <p key={i} style={{ fontSize: 18, color: 'var(--ink-3)', marginTop: 14, lineHeight: 1.5 }}>{l.text}</p>;
                  if (l.tag === 'h2') return <h2 key={i} className="t-h2" style={{ marginTop: 32 }}>{l.text}</h2>;
                  if (l.tag === 'p') return <p key={i} style={{ marginTop: 12, color: 'var(--ink-2)', lineHeight: 1.65 }}>{l.text}</p>;
                  if (l.tag === 'code') return (
                    <div key={i} style={{ marginTop: 16, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 13 }}>
                      <span style={{ color: 'var(--ink-4)' }}>$</span> {l.text}
                    </div>
                  );
                  return null;
                })}
              </div>
            </div>
          </div>

          <aside>
            <div className="t-label" style={{ marginBottom: 8 }}>About</div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>A calmer place for code to live. Self-hosted, fast, and considered.</p>
            <div className="row" style={{ gap: 12, marginTop: 16, color: 'var(--ink-3)', fontSize: 13, flexWrap: 'wrap' }}>
              <span className="row" style={{ gap: 5 }}>{I.star}<span className="t-num">4,218</span></span>
              <span className="row" style={{ gap: 5 }}>{I.fork}<span className="t-num">142</span></span>
              <span className="row" style={{ gap: 5 }}>{I.eye}<span className="t-num">84</span></span>
            </div>

            <div className="div-h" style={{ margin: '20px 0' }} />

            <div className="t-label" style={{ marginBottom: 10 }}>Languages</div>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ flex: 84, background: 'oklch(0.62 0.16 32)' }} />
              <div style={{ flex: 11, background: 'oklch(0.55 0.10 250)' }} />
              <div style={{ flex: 5, background: 'oklch(0.65 0.12 200)' }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
              <div className="row" style={{ gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(0.62 0.16 32)' }} />Rust<span style={{ marginLeft: 'auto' }}>84%</span></div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(0.55 0.10 250)' }} />TypeScript<span style={{ marginLeft: 'auto' }}>11%</span></div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'oklch(0.65 0.12 200)' }} />Other<span style={{ marginLeft: 'auto' }}>5%</span></div>
            </div>

            <div className="div-h" style={{ margin: '20px 0' }} />

            <div className="t-label" style={{ marginBottom: 10 }}>Releases · 14</div>
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 500 }}>v0.6.0 · public preview</div>
              <div className="t-xs">released 4 days ago</div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function FileView() {
  const { go } = useRoute();
  const [showBlame, setShowBlame] = React.useState(true);
  return (
    <div className="page-enter">
      <TopBar />
      <RepoSubnav active="code" />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 32px' }}>
        <div className="row" style={{ gap: 8, marginBottom: 14, fontSize: 13, fontFamily: 'var(--mono)' }}>
          <button className="btn sm">{I.branch}main</button>
          <button onClick={() => go('repo')} style={{ color: 'var(--ink-3)' }}>crates</button>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <button style={{ color: 'var(--ink-3)' }}>opengithub-web</button>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <button style={{ color: 'var(--ink-3)' }}>src</button>
          <span style={{ color: 'var(--ink-4)' }}>/</span>
          <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>main.rs</span>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="row" style={{ padding: '10px 14px', gap: 12, borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <div className="av sm">AS</div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>ashley</span>
            <span className="t-sm muted">last edited the file 2 days ago</span>
            <span style={{ flex: 1 }} />
            <span className="t-xs">25 lines · 2.1 KB · Rust</span>
          </div>
          <div className="row" style={{ padding: '8px 14px', gap: 6, borderBottom: '1px solid var(--line)' }}>
            <button className={'chip' + (showBlame ? ' active' : ' soft')} onClick={() => setShowBlame(true)}>Blame</button>
            <button className={'chip' + (!showBlame ? ' active' : ' soft')} onClick={() => setShowBlame(false)}>Source</button>
            <span style={{ flex: 1 }} />
            <button className="btn sm">Raw</button>
            <button className="btn sm">{I.copy}</button>
            <button className="btn sm">History</button>
            <button className="btn sm primary">Edit</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: showBlame ? '180px 1fr' : '1fr' }}>
            {showBlame && (
              <div style={{ borderRight: '1px solid var(--line)', background: 'var(--surface-2)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                {OG_FILE_CONTENT.map((line, i) => {
                  const prevAuthor = i > 0 ? OG_FILE_CONTENT[i - 1].author : null;
                  const newBlock = line.author && line.author !== prevAuthor;
                  return (
                    <div key={i} style={{ padding: '0 10px', height: 22, display: 'flex', alignItems: 'center', borderTop: newBlock ? '1px solid var(--line)' : 'none', color: 'var(--ink-3)' }}>
                      {newBlock && (
                        <>
                          <div className="av sm" style={{ width: 14, height: 14, fontSize: 8 }}>{line.author?.[0]?.toUpperCase()}</div>
                          <span style={{ marginLeft: 6, fontSize: 11 }}>{line.author}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-4)' }}>{line.age}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <pre style={{ margin: 0, padding: 0, fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: '22px', overflowX: 'auto' }}>
              {OG_FILE_CONTENT.map(line => (
                <div key={line.n} style={{ display: 'flex', minHeight: 22 }}>
                  <span style={{ width: 50, paddingRight: 14, color: 'var(--ink-4)', textAlign: 'right', userSelect: 'none', flexShrink: 0 }}>{line.n}</span>
                  <span style={{ flex: 1, padding: '0 16px', color: 'var(--ink-1)' }} dangerouslySetInnerHTML={{ __html: highlightRust(line.t) }} />
                </div>
              ))}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}

function highlightRust(t) {
  if (!t) return '&nbsp;';
  return t
    .replace(/(\/\/.*$)/g, '<span style="color: var(--code-comment)">$1</span>')
    .replace(/\b(use|fn|let|mut|async|await|pub|mod|return|impl|self|crate|as|const|struct|enum|match|if|else|for|in)\b/g, '<span style="color: var(--code-keyword); font-weight: 500">$1</span>')
    .replace(/(".*?")/g, '<span style="color: var(--code-string)">$1</span>')
    .replace(/\b([A-Z][a-zA-Z]*)\b/g, '<span style="color: var(--code-fn)">$1</span>')
    .replace(/(#\[.*?\])/g, '<span style="color: var(--code-comment); font-style: italic">$1</span>');
}

Object.assign(window, { Repo, FileView });
