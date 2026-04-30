// wf-app.jsx — assemble everything into the design canvas + tweaks panel

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "darkSketch": false,
  "annotations": true,
  "dense": false
}/*EDITMODE-END*/;

function applyBodyClasses(t) {
  document.body.classList.toggle('dark', !!t.darkSketch);
  document.body.classList.toggle('no-annotations', !t.annotations);
  document.body.classList.toggle('dense', !!t.dense);
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyBodyClasses(tweaks); }, [tweaks]);

  const W = 360, H = 270;

  const row = (rowId, title, subtitle, items) => (
    <DCSection id={rowId} title={title} subtitle={subtitle}>
      {items.map(([id, label, Comp]) => (
        <DCArtboard key={id} id={id} label={label} width={W} height={H}>
          <Comp />
        </DCArtboard>
      ))}
    </DCSection>
  );

  return (
    <>
      <DesignCanvas>
        {row('auth-login', 'Auth · /login', '4 takes on the single-method Google sign-in', [
          ['login-a', 'A · centered minimal', AuthLogin_A],
          ['login-b', 'B · split + activity', AuthLogin_B],
          ['login-c', 'C · terminal vibe', AuthLogin_C],
          ['login-d', 'D · bold one-button', AuthLogin_D],
        ])}
        {row('auth-new', 'Repo create · /new', 'Form · live preview · wizard · slash command', [
          ['new-a', 'A · classic form', NewRepo_A],
          ['new-b', 'B · live preview', NewRepo_B],
          ['new-c', 'C · 3-step wizard', NewRepo_C],
          ['new-d', 'D · slash command', NewRepo_D],
        ])}
        {row('auth-dash-empty', 'Dashboard · empty state', 'How a brand-new account looks', [
          ['de-a', 'A · 3-pane shell', DashEmpty_A],
          ['de-b', 'B · 3-step checklist', DashEmpty_B],
          ['de-c', 'C · illustrated empty', DashEmpty_C],
          ['de-d', 'D · social-first feed', DashEmpty_D],
        ])}
        {row('repo-code', 'Repo · Code tab', 'Tree+readme · pill nav · icon rail · readme-first', [
          ['rc-a', 'A · classic 3-pane', RepoCode_A],
          ['rc-b', 'B · pill tabs', RepoCode_B],
          ['rc-c', 'C · icon rail · stats', RepoCode_C],
          ['rc-d', 'D · readme-first', RepoCode_D],
        ])}
        {row('repo-blob', 'Repo · file viewer', 'Blame, history, raw — different orderings', [
          ['rb-a', 'A · tree + buttons', RepoBlob_A],
          ['rb-b', 'B · chip mode switch', RepoBlob_B],
          ['rb-c', 'C · blame side-rail', RepoBlob_C],
          ['rb-d', 'D · keyboard / vim', RepoBlob_D],
        ])}
        {row('issues-list', 'Issues · list', 'Density, IA & grouping variants', [
          ['il-a', 'A · classic dense list', IssuesList_A],
          ['il-b', 'B · card grid', IssuesList_B],
          ['il-c', 'C · filter rail', IssuesList_C],
          ['il-d', 'D · grouped by milestone', IssuesList_D],
        ])}
        {row('issues-detail', 'Issues · detail', 'Timeline-first vs metadata-first', [
          ['id-a', 'A · timeline-first', IssueDetail_A],
          ['id-b', 'B · metadata-first', IssueDetail_B],
          ['id-c', 'C · activity sidebar', IssueDetail_C],
          ['id-d', 'D · status banner', IssueDetail_D],
        ])}
        {row('prs-list', 'Pulls · list', 'Linear · grouped · kanban · my-queue', [
          ['pl-a', 'A · linear', PRList_A],
          ['pl-b', 'B · grouped', PRList_B],
          ['pl-c', 'C · kanban board', PRList_C],
          ['pl-d', 'D · my-queue tabs', PRList_D],
        ])}
        {row('prs-detail', 'Pulls · detail', 'Mergeability · diff summary · split diff · narrative', [
          ['pd-a', 'A · ready-to-merge focus', PRDetail_A],
          ['pd-b', 'B · diff summary', PRDetail_B],
          ['pd-c', 'C · files + split diff', PRDetail_C],
          ['pd-d', 'D · review-led', PRDetail_D],
        ])}
        {row('actions-list', 'Actions · runs', 'Classic · health · timeline · filter chips', [
          ['al-a', 'A · classic', ActionsList_A],
          ['al-b', 'B · health-first', ActionsList_B],
          ['al-c', 'C · timeline', ActionsList_C],
          ['al-d', 'D · filter chips', ActionsList_D],
        ])}
        {row('actions-run', 'Actions · run detail', 'Logs · gantt · log focus · summary', [
          ['ar-a', 'A · jobs + log', ActionRun_A],
          ['ar-b', 'B · job gantt', ActionRun_B],
          ['ar-c', 'C · log focus', ActionRun_C],
          ['ar-d', 'D · summary', ActionRun_D],
        ])}
        {row('dash', 'Dashboard (active user)', 'Activity · inbox · stats · recent-work', [
          ['d-a', 'A · activity', Dash_A],
          ['d-b', 'B · inbox-as-dash', Dash_B],
          ['d-c', 'C · stats led', Dash_C],
          ['d-d', 'D · recent work', Dash_D],
        ])}
        {row('inbox', 'Notifications · /notifications', 'Triage models', [
          ['n-a', 'A · grouped by repo', Notif_A],
          ['n-b', 'B · tile triage', Notif_B],
          ['n-c', 'C · filter rail', Notif_C],
          ['n-d', 'D · one-at-a-time', Notif_D],
        ])}
        {row('settings', 'Repo settings', 'Access, branches, webhooks, pages', [
          ['s-access-a', 'access · A list', Access_A],
          ['s-access-b', 'access · B matrix', Access_B],
          ['s-branches-a', 'branches · A rules', Branches_A],
          ['s-branches-b', 'branches · B rulesets', Branches_B],
          ['s-hooks-a', 'webhooks · A list', Webhooks_A],
          ['s-hooks-b', 'webhooks · B log', Webhooks_B],
          ['s-pages-a', 'pages · A status', Pages_A],
          ['s-pages-b', 'pages · B pipeline', Pages_B],
        ])}
        {row('search', 'Search & discovery', 'Tabs · palette · faceted · file-focused', [
          ['sr-a', 'A · tabbed', Search_A],
          ['sr-b', 'B · command palette', Search_B],
          ['sr-c', 'C · faceted', Search_C],
          ['sr-d', 'D · file-focused', Search_D],
        ])}
        {row('profiles', 'Profiles & orgs', 'User · org · team views', [
          ['pf-a', 'profile · A classic', Profile_A],
          ['pf-b', 'profile · B stat-led', Profile_B],
          ['pf-c', 'profile · C readme-bio', Profile_C],
          ['pf-d', 'profile · D activity', Profile_D],
          ['org-a', 'org · A overview', Org_A],
          ['org-b', 'org · B pulse', Org_B],
          ['team-a', 'team · A members', Team_A],
          ['team-b', 'team · B nested', Team_B],
        ])}
        {row('disc-wiki-proj', 'Discussions · Wiki · Projects', 'Long-tail surfaces', [
          ['disc-a', 'discussions · A categories', Disc_A],
          ['disc-b', 'discussions · B helpful', Disc_B],
          ['wiki-a', 'wiki · A reader', Wiki_A],
          ['wiki-b', 'wiki · B graph', Wiki_B],
          ['proj-a', 'projects · A board', Project_A],
          ['proj-b', 'projects · B roadmap', Project_B],
        ])}
        {row('mobile', 'Mobile · follow-up', 'Pocket-sized for the same surfaces', [
          ['m-dash', 'mobile · dashboard', Mob_Dash],
          ['m-repo', 'mobile · repo', Mob_Repo],
          ['m-pr', 'mobile · pull', Mob_PR],
          ['m-inbox', 'mobile · inbox', Mob_Inbox],
        ])}
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="display">
          <TweakToggle label="dark sketch mode" value={tweaks.darkSketch} onChange={v => setTweak('darkSketch', v)} />
          <TweakToggle label="annotation stickers" value={tweaks.annotations} onChange={v => setTweak('annotations', v)} />
          <TweakToggle label="dense type" value={tweaks.dense} onChange={v => setTweak('dense', v)} />
        </TweakSection>
        <TweakSection title="legend">
          <div style={{ fontFamily: 'var(--body)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-3)' }}>
            17 sections × 2–8 variations = 70+ wireframes.<br />
            Drag artboards to reorder · double-click a label to rename · click ⤢ to focus.
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
