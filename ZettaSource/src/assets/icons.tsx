import React from "react";

interface IconProps {
  size?: number;
  className?: string;
}

export function IconChevronRight({ size = 12, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
      <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronDown({ size = 12, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFolder({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6L7.5 4H13.5A1 1 0 0 1 14.5 5V12.5A1 1 0 0 1 13.5 13.5H2.5A1 1 0 0 1 1.5 12.5V3.5Z"
        fill="var(--brand-1)" opacity="0.75" stroke="var(--brand-1)" strokeWidth="0.5" />
    </svg>
  );
}

export function IconFolderOpen({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6L7.5 4H13.5A1 1 0 0 1 14.5 5V7H1.5V3.5Z"
        fill="var(--brand-1)" opacity="0.85" />
      <path d="M1.5 7H14.5L13 13.5H3L1.5 7Z"
        fill="var(--brand-1)" opacity="0.65" />
    </svg>
  );
}

export function IconFileUz({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="1" width="10" height="14" rx="1.5" fill="var(--bg-elevated)" stroke="var(--brand-2)" strokeWidth="1.2" />
      <path d="M5 5H9M5 7.5H11M5 10H8" stroke="var(--brand-2)" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      <path d="M10 1v3.5H13.5" fill="none" stroke="var(--brand-2)" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

export function IconFileUp({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="1" width="10" height="14" rx="1.5" fill="var(--bg-elevated)" stroke="var(--brand-1)" strokeWidth="1.2" />
      <path d="M5 5H9M5 7.5H11M5 10H8" stroke="var(--brand-1)" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      <path d="M10 1v3.5H13.5" fill="none" stroke="var(--brand-1)" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

export function IconFileUpz({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="1" width="10" height="14" rx="1.5" fill="var(--bg-elevated)" stroke="#a78bfa" strokeWidth="1.2" />
      <path d="M5 5H9M5 7.5H11M5 10H8" stroke="#a78bfa" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      <path d="M10 1v3.5H13.5" fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

export function IconFileGeneric({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="1" width="10" height="14" rx="1.5" fill="var(--bg-elevated)" stroke="var(--text-muted)" strokeWidth="1.2" />
      <path d="M5 5H9M5 7.5H10M5 10H8" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      <path d="M10 1v3.5H13.5" fill="none" stroke="var(--text-muted)" strokeWidth="1" opacity="0.4"/>
    </svg>
  );
}

export function IconClose({ size = 10, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" className={className}>
      <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconNewFile({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M9 1H3.5A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15h9A1.5 1.5 0 0 0 14 13.5V6L9 1Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M8 9.5v3M6.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconOpenFolder({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6.5L8 4H14A1 1 0 0 1 15 5V6H1.5V3.5Z" stroke="currentColor" strokeWidth="1.1" fill="none" />
      <path d="M1.5 6H14L12.5 13H3L1.5 6Z" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSave({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M2 2.5A.5.5 0 0 1 2.5 2h8.5L13.5 4.5V13.5A.5.5 0 0 1 13 14H3A.5.5 0 0 1 2.5 13.5V2.5Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" />
      <rect x="5" y="2" width="5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.1" fill="none" />
      <rect x="4" y="8.5" width="8" height="4" rx="0.75" stroke="currentColor" strokeWidth="1.1" fill="none" />
    </svg>
  );
}

export function IconCompile({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M3 4L7 8L3 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 12H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconRun({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M4 3.5L13 8L4 12.5V3.5Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function IconSun({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconMoon({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M13.5 10A6 6 0 0 1 6 2.5a5.5 5.5 0 1 0 7.5 7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function IconExamples({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5.5h6M5 8h4M5 10.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconTerminal({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6l2 2-2 2M7.5 10.5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGit({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M5 3.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 0v7m0 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0-4h5m0 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0 0v4"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDiagnostics({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 1.5 1.8 12.5h12.4L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 6v3.5M8 11.8h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconOutput({ size = 16, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6.5h8M4 8.5h5M4 10.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconRefresh({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M13.5 7.5A5.5 5.5 0 1 1 11.8 4M13.5 2.5v5h-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrash({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M2.5 4h11M6 4V2.8h4V4m-6.5 0 .6 9.2a1 1 0 0 0 1 .8h5.8a1 1 0 0 0 1-.8L12.5 4"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.6 6.2v5.5M9.4 6.2v5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconExternal({ size = 14, className }: IconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M9.5 2.5H13.5V6.5M13.2 2.8L7.6 8.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
