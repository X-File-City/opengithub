// wf-auth.jsx — Auth + onboarding wireframes (login, /new, dashboard empty state)

const AuthLogin_A = () => (
  <Frame>
    <BrowserBar url="opengithub.namuh.co/login" />
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, height: '100%' }}>
      <Glyph ch="◆" lg solid />
      <Hand size={28} style={{ marginTop: 4 }}>opengithub</Hand>
      <div className="body-sm" style={{ color: 'var(--ink-3)', textAlign: 'center', maxWidth: 220 }}>Sign in to continue. We use Google — that's it.</div>
      <Box style={{ width: 240, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <Glyph ch="G" />
        <Hand size={16}>Continue with Google</Hand>
      </Box>
      <div style={{ flex: 1 }} />
      <div className="body-sm" style={{ color: 'var(--ink-3)' }}>by signing in you agree to <span className="underline-h">terms</span></div>
    </div>
  </Frame>
);

const AuthLogin_B = () => (
  <Frame>
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, padding: 18, borderRight: '1.5px dashed var(--line)' }}>
        <Glyph ch="◆" lg solid />
        <Hand size={26} style={{ marginTop: 14 }}>welcome back.</Hand>
        <div className="body-sm" style={{ marginTop: 6, color: 'var(--ink-3)', maxWidth: 180 }}>One sign-in method. Less surface area to break.</div>
        <Box style={{ marginTop: 18, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Glyph ch="G" sm />
          <Hand size={14}>Continue with Google</Hand>
          <span style={{ marginLeft: 'auto' }}>→</span>
        </Box>
        <div className="mono" style={{ marginTop: 14, fontSize: 9, color: 'var(--ink-4)' }}>← /api/auth/google/start</div>
      </div>
      <div style={{ flex: 1, background: 'var(--paper-2)', padding: 18, position: 'relative' }}>
        <Lbl>recent activity</Lbl>
        <div className="rail" style={{ marginTop: 10 }}>
          {['ashley pushed to main', 'CI: 142 jobs ok', '+ 3 PRs merged today', 'webhook delivered'].map((t, i) => (
            <div className="item" key={i}><span className="dot" /><div className="body-sm" style={{ paddingLeft: 4 }}>{t}</div></div>
          ))}
        </div>
      </div>
    </div>
  </Frame>
);

const AuthLogin_C = () => (
  <Frame>
    <div style={{ padding: 18, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Mono style={{ color: 'var(--ink-3)' }}>$ opengithub login</Mono>
      <Box soft style={{ marginTop: 10, padding: 10, fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.6 }}>
        <div>opening browser…</div>
        <div style={{ color: 'var(--ink-3)' }}>┌─ Google OAuth ────────┐</div>
        <div style={{ color: 'var(--ink-3)' }}>│ scope: profile, email │</div>
        <div style={{ color: 'var(--ink-3)' }}>│ redirect: :3016/cb    │</div>
        <div style={{ color: 'var(--ink-3)' }}>└───────────────────────┘</div>
        <div style={{ color: 'var(--accent)' }}>▌ awaiting callback...</div>
      </Box>
      <div className="hand" style={{ marginTop: 16 }}>terminal-first feel for devs</div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <Btn primary>Continue with Google</Btn>
        <Btn>cancel</Btn>
      </div>
    </div>
    <Sticker>terminal vibe</Sticker>
  </Frame>
);

const AuthLogin_D = () => (
  <Frame>
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
      <Box thick wobble style={{ padding: 18, position: 'relative' }}>
        <div className="hand" style={{ fontSize: 26, fontWeight: 700 }}>sign in.</div>
        <div className="body-sm" style={{ marginTop: 4 }}>One option, no choices, no friction.</div>
        <div style={{ marginTop: 14, padding: 10, border: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent)', color: 'white' }}>
          <Glyph ch="G" style={{ background: 'white', color: 'var(--ink)' }} />
          <Hand size={16}>Continue with Google</Hand>
        </div>
        <div className="mono" style={{ marginTop: 12, fontSize: 9, color: 'var(--ink-3)' }}>tip: bookmark /login if you sign out a lot</div>
      </Box>
      <div className="body-sm" style={{ textAlign: 'center', color: 'var(--ink-3)' }}>need a personal access token? <span className="underline-h">later, in settings</span></div>
    </div>
    <Sticker rotate={4} top={12} right={14}>extra-bold variant</Sticker>
  </Frame>
);

// /new — create repository

const NewRepo_A = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 18 }}>
      <Hand size={24}>create a new repository</Hand>
      <div className="body-sm" style={{ color: 'var(--ink-3)', marginTop: 4 }}>contains all project files, history, settings.</div>
      <HR />
      <Lbl>owner / repository name</Lbl>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <Box style={{ padding: '4px 8px', minWidth: 80 }}><Mono>ashley ▾</Mono></Box>
        <Mono style={{ alignSelf: 'center' }}>/</Mono>
        <Box style={{ padding: '4px 8px', flex: 1 }}><Mono style={{ color: 'var(--ink-3)' }}>my-cool-thing</Mono></Box>
      </div>
      <div className="body-sm" style={{ marginTop: 10 }}>description <span style={{ color: 'var(--ink-3)' }}>(optional)</span></div>
      <Box style={{ padding: 6, marginTop: 4 }}><Ph h={20} label="placeholder text" /></Box>
      <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="check on" /><Hand size={14}>public</Hand></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="check" /><Hand size={14}>private</Hand></div>
      </div>
      <HR dashed />
      <Lbl>initialize with</Lbl>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {['README.md', '.gitignore', 'license'].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="check" /><Mono>{t}</Mono></div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn>cancel</Btn>
        <Btn primary>create repository</Btn>
      </div>
    </div>
  </Frame>
);

const NewRepo_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 14, display: 'flex', gap: 14, height: 'calc(100% - 36px)' }}>
      <div style={{ flex: 1.1 }}>
        <Hand size={20}>new repo</Hand>
        <div className="body-sm" style={{ color: 'var(--ink-3)' }}>fill in. preview updates →</div>
        <Box style={{ marginTop: 10, padding: 8 }}>
          <Lbl>name</Lbl><Mono>my-cool-thing</Mono>
          <HR dashed />
          <Lbl>visibility</Lbl>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <Chip active>public</Chip><Chip soft>private</Chip>
          </div>
          <HR dashed />
          <Lbl>template</Lbl>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <Chip soft>blank</Chip>
            <Chip soft>node + ts</Chip>
            <Chip>rust crate</Chip>
            <Chip soft>static site</Chip>
          </div>
        </Box>
      </div>
      <div style={{ flex: 1, background: 'var(--paper-2)', padding: 10, border: '1.5px dashed var(--line)' }}>
        <Lbl>preview</Lbl>
        <div style={{ marginTop: 8, padding: 6, border: '1.5px solid var(--line)', background: 'var(--paper)' }}>
          <Mono>ashley/my-cool-thing</Mono>
          <HR dashed />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {['Cargo.toml', 'src/', 'README.md', '.gitignore'].map(f => (
              <Mono key={f} style={{ color: 'var(--ink-3)' }}>📄 {f}</Mono>
            ))}
          </div>
        </div>
      </div>
    </div>
    <Sticker rotate={3}>live preview</Sticker>
  </Frame>
);

const NewRepo_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 18 }}>
      <Hand size={20}>step 2 of 3 · name your repo</Hand>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ flex: 1, height: 6, background: i <= 2 ? 'var(--accent)' : 'var(--line-soft)', borderRadius: 1 }} />)}
      </div>
      <Box wobble style={{ marginTop: 18, padding: 14 }}>
        <Lbl>repo name</Lbl>
        <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 16, borderBottom: '1.5px solid var(--line)', paddingBottom: 4 }}>my-cool-thing<span style={{ color: 'var(--accent)' }}>▌</span></div>
        <div className="body-sm" style={{ color: 'var(--ink-3)', marginTop: 6 }}>great name. <span className="underline-h">checked</span> — available.</div>
      </Box>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <Btn>← back</Btn>
        <Btn primary>next: visibility →</Btn>
      </div>
    </div>
    <Sticker rotate={-4}>guided wizard</Sticker>
  </Frame>
);

const NewRepo_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 14 }}>
      <Hand size={20}>quick create</Hand>
      <div className="body-sm" style={{ color: 'var(--ink-3)' }}>type a slash command. press enter.</div>
      <Box thick style={{ marginTop: 10, padding: 8, fontFamily: 'var(--mono)', fontSize: 12 }}>
        / new ashley/my-cool-thing --public --template rust<span style={{ color: 'var(--accent)' }}>▌</span>
      </Box>
      <Box soft style={{ marginTop: 10, padding: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>
        suggestions:<br />
        ↳ /new &lt;name&gt; --public --template &lt;blank|rust|node|static&gt;<br />
        ↳ /import &lt;url&gt;<br />
        ↳ /fork &lt;owner&gt;/&lt;repo&gt;
      </Box>
      <div style={{ marginTop: 14 }}>
        <Hand size={14}>or use the form →</Hand>
      </div>
    </div>
    <Sticker rotate={4}>command-driven</Sticker>
  </Frame>
);

// Dashboard empty state

const DashEmpty_A = () => (
  <Frame>
    <AppHeader />
    <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
      <div style={{ width: 140, borderRight: '1.5px solid var(--line)', padding: 8 }}>
        <Lbl>repositories</Lbl>
        <Box dashed soft style={{ marginTop: 8, padding: 8, textAlign: 'center' }}>
          <Hand size={14}>none yet</Hand>
          <div className="body-sm" style={{ color: 'var(--ink-3)', marginTop: 4 }}>+ new</div>
        </Box>
      </div>
      <div style={{ flex: 1, padding: 18 }}>
        <Hand size={26}>welcome, ashley.</Hand>
        <div className="body-sm" style={{ color: 'var(--ink-3)' }}>your home for code lives here.</div>
        <Box dashed style={{ marginTop: 14, padding: 18, textAlign: 'center' }}>
          <Hand size={20}>start with a repo</Hand>
          <div className="body-sm" style={{ color: 'var(--ink-3)', marginTop: 6 }}>create one, import from elsewhere, or clone a starter.</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center' }}>
            <Btn primary>+ new</Btn>
            <Btn>import</Btn>
            <Btn>browse starters</Btn>
          </div>
        </Box>
        <Hand size={14} style={{ marginTop: 14 }}>recent activity</Hand>
        <Box soft dashed style={{ padding: 18, textAlign: 'center', marginTop: 6 }}>
          <Mono style={{ color: 'var(--ink-3)' }}>nothing yet — push something!</Mono>
        </Box>
      </div>
    </div>
  </Frame>
);

const DashEmpty_B = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 18 }}>
      <Hand size={26}>3 things to do →</Hand>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
        {[
          { n: '01', h: 'create a repo', sub: 'or import an existing one' },
          { n: '02', h: 'invite a teammate', sub: 'set up an org' },
          { n: '03', h: 'add a SSH/PAT', sub: 'so you can push' },
        ].map(c => (
          <Box key={c.n} style={{ padding: 12, position: 'relative' }}>
            <Mono style={{ color: 'var(--accent)' }}>{c.n}</Mono>
            <Hand size={16} style={{ marginTop: 4 }}>{c.h}</Hand>
            <div className="body-sm" style={{ color: 'var(--ink-3)', marginTop: 4 }}>{c.sub}</div>
            <div style={{ marginTop: 10 }}><Btn sm>start →</Btn></div>
          </Box>
        ))}
      </div>
      <HR dashed style={{ marginTop: 18 }} />
      <Hand size={16}>or jump in</Hand>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {['fork a starter', 'browse trending', 'docs', 'CLI install'].map(t => <Chip soft key={t}>{t}</Chip>)}
      </div>
    </div>
    <Sticker rotate={4}>checklist style</Sticker>
  </Frame>
);

const DashEmpty_C = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 18 }}>
      <Box dashed wobble style={{ padding: 30, textAlign: 'center', position: 'relative' }}>
        <div style={{ fontSize: 60, fontFamily: 'var(--hand)', lineHeight: 1, color: 'var(--line-soft)' }}>?</div>
        <Hand size={22} style={{ marginTop: 6 }}>nothing to see — yet.</Hand>
        <div className="body-sm" style={{ color: 'var(--ink-3)', marginTop: 6 }}>push your first commit and we'll fill this page with everything you've been building.</div>
        <div style={{ marginTop: 14 }}><Btn primary>+ create your first repository</Btn></div>
        <div className="mono" style={{ marginTop: 8, fontSize: 10, color: 'var(--ink-3)' }}>or run: <span className="underline-h">git remote add origin …</span></div>
      </Box>
    </div>
    <Sticker rotate={-4}>illustrated empty</Sticker>
  </Frame>
);

const DashEmpty_D = () => (
  <Frame>
    <AppHeader />
    <div style={{ padding: 14, display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <Hand size={20}>your feed</Hand>
        <Box soft dashed style={{ marginTop: 8, padding: 18, textAlign: 'center' }}>
          <Mono style={{ color: 'var(--ink-3)' }}>follow people to see updates</Mono>
        </Box>
        <Hand size={14} style={{ marginTop: 14 }}>suggested for you</Hand>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {['rust-lang/rust', 'vercel/next.js', 'tokio-rs/axum'].map(r => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', border: '1px dashed var(--line)' }}>
              <Avatar ch={r[0]} size="sm" />
              <Mono style={{ flex: 1 }}>{r}</Mono>
              <Btn sm>★ star</Btn>
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 140 }}>
        <Lbl>quick actions</Lbl>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          <Btn sm>+ new repo</Btn>
          <Btn sm>↧ import</Btn>
          <Btn sm>+ org</Btn>
          <Btn sm>+ token</Btn>
        </div>
      </div>
    </div>
    <Sticker rotate={3}>social-first</Sticker>
  </Frame>
);

Object.assign(window, {
  AuthLogin_A, AuthLogin_B, AuthLogin_C, AuthLogin_D,
  NewRepo_A, NewRepo_B, NewRepo_C, NewRepo_D,
  DashEmpty_A, DashEmpty_B, DashEmpty_C, DashEmpty_D,
});
