import { DashboardIcon, FocusIcon, HistoryIcon, SettingsIcon } from "./icons";

export type MainView = "focus" | "dashboard" | "history" | "settings";

const ITEMS: { id: MainView; label: string; icon: typeof FocusIcon }[] = [
  { id: "focus", label: "Focus", icon: FocusIcon },
  { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

interface NavRailProps {
  active: MainView;
  onChange: (view: MainView) => void;
}

export default function NavRail({ active, onChange }: NavRailProps) {
  return (
    <nav className="glass flex flex-col items-center gap-1 rounded-2xl p-2 animate-fade-in">
      {ITEMS.map(({ id, label, icon: ItemIcon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-current={isActive}
            onClick={() => onChange(id)}
            className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
              isActive ? "bg-white/15 text-ink" : "text-ink-faint hover:text-ink hover:bg-white/8"
            }`}
          >
            <ItemIcon width={19} height={19} />
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-black/80 px-2.5 py-1 text-xs text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
