import type { ReactNode, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

const make =
  (nodes: ReactNode, displayName: string) =>
  ({ size = 20, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {nodes}
    </svg>
  );

export const IPlus = make(<path d="M12 5v14M5 12h14" />, "IPlus");
export const IMinus = make(<path d="M5 12h14" />, "IMinus");
export const IX = make(<path d="M18 6 6 18M6 6l12 12" />, "IX");
export const ICheck = make(<path d="M20 6 9 17l-5-5" />, "ICheck");
export const IChevronDown = make(<path d="m6 9 6 6 6-6" />, "IChevronDown");
export const IChevronRight = make(<path d="m9 18 6-6-6-6" />, "IChevronRight");
export const IChevronLeft = make(<path d="m15 18-6-6 6-6" />, "IChevronLeft");
export const ITrash = make(
  <>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6M14 11v6" />
  </>,
  "ITrash"
);
export const IUndo = make(
  <>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </>,
  "IUndo"
);
export const IRedo = make(
  <>
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
  </>,
  "IRedo"
);
export const IPencil = make(<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />, "IPencil");
export const IDownload = make(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </>,
  "IDownload"
);
export const IUpload = make(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5" />
    <path d="M12 3v12" />
  </>,
  "IUpload"
);
export const ISliders = make(
  <>
    <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3" />
    <path d="M14 2v4M8 10v4M16 18v4" />
  </>,
  "ISliders"
);
export const IGrid = make(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </>,
  "IGrid"
);
export const IList = make(<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />, "IList");
export const ISearch = make(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </>,
  "ISearch"
);
export const ISun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </>,
  "ISun"
);
export const IMoon = make(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />, "IMoon");
export const IMonitor = make(
  <>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </>,
  "IMonitor"
);
export const IFile = make(
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </>,
  "IFile"
);
export const ICode = make(<path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />, "ICode");
export const ICoffee = make(
  <>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <path d="M6 2v2M10 2v2M14 2v2" />
  </>,
  "ICoffee"
);
export const IHeart = make(
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.51 4.04 3 5.5l7 7Z" />,
  "IHeart"
);
export const IAlert = make(
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
  "IAlert"
);
export const IInfo = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </>,
  "IInfo"
);
export const IPlay = make(<path d="m6 3 14 9-14 9z" />, "IPlay");
export const IExternal = make(
  <>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </>,
  "IExternal"
);
export const ILink = make(
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>,
  "ILink"
);
export const ICopy = make(
  <>
    <rect x="8" y="8" width="14" height="14" rx="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </>,
  "ICopy"
);
export const IClipboard = make(
  <>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </>,
  "IClipboard"
);
export const IArrowUp = make(<path d="M12 19V5m-7 7 7-7 7 7" />, "IArrowUp");
export const IArrowDown = make(<path d="M12 5v14m7-7-7 7-7-7" />, "IArrowDown");
export const IChildNode = make(
  <>
    <path d="m15 10 5 5-5 5" />
    <path d="M4 4v7a4 4 0 0 0 4 4h12" />
  </>,
  "IChildNode"
);
export const ISiblingNode = make(
  <>
    <path d="M6 3v12" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </>,
  "ISiblingNode"
);
export const IDatabase = make(
  <>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" />
    <path d="M3 12a9 3 0 0 0 18 0" />
  </>,
  "IDatabase"
);
export const IShield = make(
  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  "IShield"
);
export const IWifi = make(
  <>
    <path d="M12 20h.01" />
    <path d="M2 8.82a15 15 0 0 1 20 0" />
    <path d="M5 12.86a10 10 0 0 1 14 0" />
    <path d="M8.5 16.43a5 5 0 0 1 7 0" />
  </>,
  "IWifi"
);
export const IWifiOff = make(
  <>
    <path d="M12 20h.01" />
    <path d="M8.5 16.43a5 5 0 0 1 7 0" />
    <path d="M5 12.86a10 10 0 0 1 5.24-2.76" />
    <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
    <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
    <path d="m2 2 20 20" />
  </>,
  "IWifiOff"
);
export const IMore = make(<path d="M12 5v.01M12 12v.01M12 19v.01" strokeWidth={3} />, "IMore");
export const IClock = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
  "IClock"
);
export const IKeyboard = make(
  <>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </>,
  "IKeyboard"
);
export const IBook = make(
  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />,
  "IBook"
);
export const IStar = make(
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01Z" />,
  "IStar"
);
export const IFlag = make(
  <>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <path d="M4 22v-7" />
  </>,
  "IFlag"
);
export const IBulb = make(
  <>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5A6 6 0 1 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6M10 22h4" />
  </>,
  "IBulb"
);
export const IGlobe = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </>,
  "IGlobe"
);
export const ITarget = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </>,
  "ITarget"
);
export const IFit = make(
  <>
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </>,
  "IFit"
);
export const IZoomIn = make(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
    <path d="M11 8v6M8 11h6" />
  </>,
  "IZoomIn"
);
export const IZoomOut = make(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
    <path d="M8 11h6" />
  </>,
  "IZoomOut"
);
export const ITemplate = make(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </>,
  "ITemplate"
);
export const IEye = make(
  <>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
  "IEye"
);
export const ILock = make(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
  "ILock"
);
export const IBack = make(<path d="m12 19-7-7 7-7M19 12H5" />, "IBack");
export const ISave = make(
  <>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </>,
  "ISave"
);
export const IInbox = make(
  <>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </>,
  "IInbox"
);
export const IFold = make(<path d="m7 20 5-5 5 5M7 4l5 5 5-5" />, "IFold");
export const ISparkle = make(
  <path d="M9.94 15.5a2 2 0 0 0-1.44-1.44l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94a2 2 0 0 0 1.44-1.44l1.58-6.13a.5.5 0 0 1 .96 0l1.58 6.13a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96l-6.13 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z" />,
  "ISparkle"
);
export const IArrowRight = make(<path d="M5 12h14m-7-7 7 7-7 7" />, "IArrowRight");
export const IDot = make(<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />, "IDot");
export const IMenuGlyph = make(<path d="M4 6h16M4 12h16M4 18h16" />, "IMenuGlyph");

/* ---------- brand ---------- */
export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="var(--accent)" />
    <path d="M22 42V30a8 8 0 0 1 8-8h10" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M22 42c0-6 10-4 18-12" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" opacity=".65" />
    <circle cx="22" cy="45" r="5.5" fill="#fff" />
    <circle cx="44" cy="22" r="5.5" fill="#fff" />
    <circle cx="44" cy="34" r="4.5" fill="#fff" opacity=".85" />
  </svg>
);

/* ---------- node meta icons (used inside mind map nodes) ---------- */
export const NODE_ICON_KEYS = ["star", "flag", "check", "bulb", "heart", "book", "code", "globe", "target", "clock"] as const;
export type NodeIconKey = (typeof NODE_ICON_KEYS)[number];

const NODE_ICONS: Record<NodeIconKey, (p: IconProps) => ReactNode> = {
  star: IStar,
  flag: IFlag,
  check: ICheck,
  bulb: IBulb,
  heart: IHeart,
  book: IBook,
  code: ICode,
  globe: IGlobe,
  target: ITarget,
  clock: IClock,
};

export const NodeIcon = ({ icon, size = 14, ...props }: { icon: string } & IconProps) => {
  const C = NODE_ICONS[icon as NodeIconKey];
  if (!C) return null;
  return <>{C({ size, strokeWidth: 2.4, ...props })}</>;
};
