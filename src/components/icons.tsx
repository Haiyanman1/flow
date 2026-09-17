import type { SVGProps } from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icon = (props: SVGProps<SVGSVGElement> & { children: React.ReactNode }) => {
  const { children, ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...rest}>
      {children}
    </svg>
  );
};

export const PlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M7 4.5v15l13-7.5-13-7.5Z" fill="currentColor" stroke="none" />
  </Icon>
);

export const PauseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
  </Icon>
);

export const ResetIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 12a8 8 0 1 1 2.6 5.9" />
    <path d="M4 20v-6h6" />
  </Icon>
);

export const SkipIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 5v14l10-7L6 5Z" fill="currentColor" stroke="none" />
    <path d="M18 5v14" />
  </Icon>
);

export const EyeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const EyeOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.6A10.6 10.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a13.7 13.7 0 0 1-3.1 3.9M6.5 7.4C4 9.1 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.6 9.6 0 0 0 3.4-.6" />
    <path d="M9.5 12a2.5 2.5 0 0 0 3.6 2.24" />
  </Icon>
);

export const VolumeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 9.5v5h4l5 4v-13l-5 4H4Z" />
    <path d="M17 9a4.5 4.5 0 0 1 0 6" />
  </Icon>
);

export const MuteIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 9.5v5h4l5 4v-13l-5 4H4Z" />
    <path d="M16 10l4 4M20 10l-4 4" />
  </Icon>
);

export const PinIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 2.5c-3 0-5.4 2.4-5.4 5.4 0 3.8 5.4 13.6 5.4 13.6s5.4-9.8 5.4-13.6c0-3-2.4-5.4-5.4-5.4Z" />
    <circle cx="12" cy="7.9" r="2.2" />
  </Icon>
);

export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const SettingsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3.5H9l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1L9 20.5h6l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z" />
  </Icon>
);

export const DashboardIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.3" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.3" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.3" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.3" />
  </Icon>
);

export const HistoryIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 2.8-6.5" />
    <path d="M3 4v4.5h4.5" />
    <path d="M12 8v4.5l3 2" />
  </Icon>
);

export const FocusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.2" />
  </Icon>
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19.5 7" />
  </Icon>
);

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const FilmIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M3 15h18M8 4v16M16 4v16" />
  </Icon>
);

export const ImageIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M3.5 16.5l4.8-4.2a2 2 0 0 1 2.7.06L15 16m1.6-1.4a2 2 0 0 1 2.7-.05l1.2 1.05" />
  </Icon>
);

export const GridIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.3" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.3" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.3" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.3" />
  </Icon>
);

export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const TargetIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </Icon>
);

export const PencilIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M14.5 6.5l3 3" />
  </Icon>
);

export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V7M6 7l1 12.7c.05.7.65 1.3 1.3 1.3h7.4c.7 0 1.25-.55 1.3-1.3L18 7" />
  </Icon>
);
