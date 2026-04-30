// og-icons.jsx — minimal stroke icons (Lucide-style, hand-tuned)

const Icon = ({ d, size = 16, stroke = 1.5, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const I = {
  // structural
  search: <Icon d="M11 19a8 8 0 1 1 5.3-14M21 21l-4.35-4.35" />,
  bell: <Icon d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" />,
  plus: <Icon d="M12 5v14M5 12h14" />,
  command: <Icon d="M18 6a3 3 0 1 0-3 3M6 6a3 3 0 1 1 3 3M6 18a3 3 0 1 0 3-3M18 18a3 3 0 1 1-3-3M9 9h6v6H9z" />,
  x: <Icon d="M18 6 6 18M6 6l12 12" />,
  check: <Icon d="M20 6 9 17l-5-5" />,
  chev_d: <Icon d="m6 9 6 6 6-6" />,
  chev_r: <Icon d="m9 6 6 6-6 6" />,
  arrow_r: <Icon d="M5 12h14M13 6l6 6-6 6" />,
  arrow_l: <Icon d="M19 12H5M11 18l-6-6 6-6" />,
  // repo
  book: <Icon d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />,
  branch: <Icon d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9" />,
  fork: <Icon d="M12 2v8m0 0a4 4 0 0 0 4 4v0M12 10a4 4 0 0 1-4 4v0M5 18a3 3 0 1 0 3-3 3 3 0 0 0-3 3ZM13 18a3 3 0 1 0 3-3 3 3 0 0 0-3 3Z" />,
  star: <Icon d="m12 2 3.1 6.3 7 1-5 4.9 1.1 6.9L12 17.8l-6.2 3.3 1.2-6.9-5-4.9 7-1z" />,
  eye: <Icon d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" />,
  folder: <Icon d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  file: <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />,
  // pulls / issues
  pr_open: <Icon d="M6 6v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M18 9v3a3 3 0 0 1-3 3h-3" />,
  pr_merged: <Icon d="M6 6v12 M18 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 12a6 6 0 0 1-6 6" />,
  pr_closed: <Icon d="M18 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M6 12v3 M18 12v3" />,
  issue_open: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v4M12 16h.01" />,
  issue_closed: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M9 12l2 2 4-4" />,
  comment: <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  // actions
  play: <Icon d="m5 4 14 8-14 8z" />,
  pause: <Icon d="M6 4h4v16H6zM14 4h4v16h-4z" />,
  rerun: <Icon d="M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5" />,
  // misc
  clock: <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" />,
  user: <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
  settings: <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />,
  log: <Icon d="M4 6h16M4 12h16M4 18h10" />,
  more: <Icon d="M5 12h.01M12 12h.01M19 12h.01" stroke="2.5" />,
  download: <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />,
  copy: <Icon d="M9 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4 M5 9h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />,
  flame: <Icon d="M8 14a4 4 0 0 0 4 4 6 6 0 0 0 6-6c0-7-6-9-6-9 0 4-3 5-3 9a4 4 0 0 0 4 4M9 14a3 3 0 0 1 0-6" />,
  sparkle: <Icon d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7Z M19 3v3M22 4.5h-6 M5 19v3M8 20.5H2" />,
  arrow_up: <Icon d="M12 19V5M5 12l7-7 7 7" />,
  arrow_dn: <Icon d="M12 5v14M19 12l-7 7-7-7" />,
};

const Logo = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M12 2v6 M12 16v6 M2 12h6 M16 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

Object.assign(window, { Icon, I, Logo });
