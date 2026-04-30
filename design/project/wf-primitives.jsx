// wf-primitives.jsx — shared sketchy primitives used by every surface.

const Glyph = ({ ch = '·', sq, sm, lg, solid, accent, style }) => {
  const cls = ['glyph'];
  if (sq) cls.push('sq');
  if (sm) cls.push('sm');
  if (lg) cls.push('lg');
  if (solid) cls.push('solid');
  if (accent) cls.push('accent');
  return <span className={cls.join(' ')} style={style}>{ch}</span>;
};

const Avatar = ({ ch = 'A', size, style }) => {
  const cls = ['av'];
  if (size === 'sm') cls.push('sm');
  if (size === 'lg') cls.push('lg');
  if (size === 'xl') cls.push('xl');
  return <span className={cls.join(' ')} style={style}>{ch}</span>;
};

const Btn = ({ children, primary, sm, style, ...rest }) => {
  const cls = ['btn'];
  if (primary) cls.push('primary');
  if (sm) cls.push('sm');
  return <button className={cls.join(' ')} style={style} {...rest}>{children}</button>;
};

const Chip = ({ children, active, soft, style }) => {
  const cls = ['chip'];
  if (active) cls.push('active');
  if (soft) cls.push('soft');
  return <span className={cls.join(' ')} style={style}>{children}</span>;
};

const Lbl = ({ children, style }) => <div className="lbl" style={style}>{children}</div>;
const Hand = ({ children, style, size = 18 }) => <div style={{ fontFamily: 'var(--hand)', fontSize: size, lineHeight: 1.1, ...style }}>{children}</div>;
const Mono = ({ children, style }) => <span className="mono" style={style}>{children}</span>;

const Ph = ({ children, style, h = 60, label }) => (
  <div className="ph" style={{ height: h, ...style }}>{label || children}</div>
);

const HR = ({ dashed, style }) => <hr className={dashed ? 'hr-h' : 'hr-solid'} style={style} />;
const Squiggle = ({ style }) => <div className="squiggle" style={style} />;

// Sketchy box with optional fill
const Box = ({ children, style, soft, accent, dashed, thick, thin, wobble, className = '' }) => {
  const cls = ['sketch'];
  if (soft) cls.push('fill-soft');
  if (accent) cls.push('fill-accent');
  if (dashed) cls.push('dashed');
  if (thick) cls.push('thick');
  if (thin) cls.push('thin');
  if (wobble) cls.push('wobble');
  if (className) cls.push(className);
  return <div className={cls.join(' ')} style={style}>{children}</div>;
};

// Annotation pin
const Annot = ({ children, top, left, right, bottom, dir = 'rt', style }) => (
  <div className={`annot ${dir}`} style={{ top, left, right, bottom, ...style }}>{children}</div>
);

// Frame: outer container of any wireframe screen — rounded, ink border, full size, body inside
const Frame = ({ children, style }) => (
  <div className="artboard" style={style}>{children}</div>
);

// browser chrome bar (sketchy URL bar)
const BrowserBar = ({ url = 'opengithub.namuh.co/...' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1.5px solid var(--line)', background: 'var(--paper-2)' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.2px solid var(--line)' }} />
    <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.2px solid var(--line)' }} />
    <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.2px solid var(--line)' }} />
    <div style={{ flex: 1, marginLeft: 10, padding: '2px 8px', border: '1.2px solid var(--line)', borderRadius: 12, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>{url}</div>
  </div>
);

// Top "OpenGitHub" app shell header — abstract; sketchy
const AppHeader = ({ url, crumbs }) => (
  <div className="navbar" style={{ padding: '6px 12px' }}>
    <Glyph ch="◆" sq solid />
    <Hand size={16} style={{ fontWeight: 700 }}>opengithub</Hand>
    {crumbs && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 6 }}>{crumbs}</span>}
    <Box thin soft style={{ flex: 1, padding: '2px 8px', marginLeft: 12, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
      ⌕ jump to repo, file, issue…  <span style={{ float: 'right', opacity: 0.5 }}>⌘K</span>
    </Box>
    <Glyph ch="+" sm />
    <Glyph ch="⊙" sm />
    <Glyph ch="⊠" sm />
    <Avatar ch="A" size="sm" />
  </div>
);

// Tab bar
const TabBar = ({ tabs = [], active = 0, style }) => (
  <div className="tabs" style={style}>
    {tabs.map((t, i) => (
      <div key={i} className={i === active ? 'active' : ''}>{t}</div>
    ))}
  </div>
);

// Sidebar item
const SideItem = ({ ch = '·', label, active, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, background: active ? 'var(--paper-2)' : 'transparent', borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent', fontFamily: 'var(--body)', fontSize: 12 }}>
    <Glyph ch={ch} sm />
    <span style={{ flex: 1 }}>{label}</span>
    {count != null && <Mono style={{ color: 'var(--ink-3)' }}>{count}</Mono>}
  </div>
);

// Code line (file viewer placeholder)
const CodeLine = ({ n, indent = 0, kind = 'normal', text, style }) => {
  const widthMap = { normal: 70, short: 30, long: 90, blank: 0, comment: 50 };
  const w = widthMap[kind] ?? 60;
  const isComment = kind === 'comment';
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0 6px', minHeight: 14, ...style }}>
      <Mono style={{ color: 'var(--ink-4)', minWidth: 18, textAlign: 'right' }}>{n}</Mono>
      <div style={{ flex: 1, paddingLeft: indent * 12 }}>
        {text ? (
          <Mono style={{ color: isComment ? 'var(--ink-3)' : 'var(--ink-2)', fontStyle: isComment ? 'italic' : 'normal' }}>{text}</Mono>
        ) : kind === 'blank' ? null : (
          <div style={{
            height: 4, width: `${w}%`, borderRadius: 1,
            background: isComment ? 'var(--line-soft)' : 'var(--ink-2)',
            opacity: isComment ? 0.5 : 0.85,
          }} />
        )}
      </div>
    </div>
  );
};

// Repeated code snippet in placeholder mode
const CodeBlock = ({ lines = 14, style }) => {
  const seed = [
    ['short'], ['normal', 1], ['long', 2], ['comment', 1], ['short', 2], ['blank'],
    ['normal'], ['long', 1], ['short', 2], ['normal', 1], ['blank'], ['comment'],
    ['long'], ['short', 1], ['normal', 2], ['short', 1],
  ];
  return (
    <div style={{ background: 'var(--paper-2)', padding: '6px 0', borderRadius: 3, ...style }}>
      {Array.from({ length: lines }, (_, i) => {
        const [kind, indent] = seed[i % seed.length];
        return <CodeLine key={i} n={i + 1} kind={kind} indent={indent || 0} />;
      })}
    </div>
  );
};

// Stat pill
const Stat = ({ label, value, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 8px', borderRight: '1px dashed var(--line-soft)' }}>
    <Lbl>{label}</Lbl>
    <Hand size={20} style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}>{value}</Hand>
  </div>
);

// Annotation pinned to a corner of an artboard
const Sticker = ({ children, top = 8, right = 8, rotate = -3 }) => (
  <div style={{
    position: 'absolute', top, right,
    background: 'var(--highlight)',
    padding: '4px 8px',
    fontFamily: 'var(--hand)', fontSize: 13,
    border: '1px solid var(--line)', borderRadius: 2,
    transform: `rotate(${rotate}deg)`,
    boxShadow: '1px 1px 0 var(--line-soft)',
    zIndex: 4,
  }}>
    {children}
  </div>
);

// Section divider strip (between rows of Frame content)
const StripDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderTop: '1.5px solid var(--line)', borderBottom: '1.5px solid var(--line)', background: 'var(--paper-2)' }}>
    <Lbl>{label}</Lbl>
  </div>
);

Object.assign(window, {
  Glyph, Avatar, Btn, Chip, Lbl, Hand, Mono, Ph, HR, Squiggle, Box, Annot,
  Frame, BrowserBar, AppHeader, TabBar, SideItem, CodeLine, CodeBlock, Stat, Sticker, StripDivider,
});
