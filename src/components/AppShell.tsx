import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownUp,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Eraser,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  WalletCards,
} from "lucide-react";

import { useClearCache } from "../api/queries";
import { useAuth } from "../auth/AuthProvider";
import { LedgerTimezoneProvider } from "../lib/ledgerTimezone";
import { newFlowPath, useKeystroke } from "../lib/keystroke";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/accounts", label: "Accounts", icon: WalletCards },
  { to: "/transactions", label: "Transactions", icon: ArrowDownUp },
  { to: "/months", label: "Months", icon: CalendarDays },
  { to: "/years", label: "Years", icon: CalendarRange },
];

export function AppShell() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useKeystroke("n", () => {
    const next = newFlowPath(location.pathname, location.search);
    if (next) {
      navigate(next);
    }
  });

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <NavItem to="/settings" label="Settings" icon={Settings} />
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-insight">
            <BarChart3 size={18} />
            <span>Read the whole picture.</span>
          </div>
          <div className="account-footer">
            <div className="avatar">{session?.email.slice(0, 1).toUpperCase()}</div>
            <div className="account-footer-copy">
              <strong>{session?.email.split("@")[0]}</strong>
              <span>{session?.email}</span>
            </div>
            <button
              className="icon-button subtle"
              title="Sign out"
              aria-label="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="mobile-header">
          <Brand compact />
          <MobileMenu />
        </header>
        <LedgerTimezoneProvider>
          <Outlet />
        </LedgerTimezoneProvider>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-symbol">F</span>
      <span className="brand-wordmark">Financy</span>
    </div>
  );
}

function MobileMenu() {
  const { signOut } = useAuth();
  const clearCache = useClearCache();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      clearCache.reset();
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, clearCache.reset]);

  return (
    <div className="mobile-menu" ref={menuRef}>
      <button
        className="icon-button subtle"
        aria-label="Menu"
        title="Menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Menu size={20} />
      </button>
      {open && (
        <div className="mobile-menu-panel" role="menu">
          <NavLink
            to="/settings"
            className="mobile-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Settings size={16} />
            Settings
          </NavLink>
          <button
            type="button"
            className="mobile-menu-item"
            role="menuitem"
            disabled={clearCache.isPending}
            onClick={() => {
              void clearCache.mutateAsync().then(
                () => setOpen(false),
                () => undefined,
              );
            }}
          >
            <Eraser size={16} />
            {clearCache.isPending ? "Clearing…" : "Clear Cache"}
          </button>
          {clearCache.isError && (
            <p className="mobile-menu-error">
              {clearCache.error instanceof Error
                ? clearCache.error.message
                : "Could not clear cache."}
            </p>
          )}
          <button
            type="button"
            className="mobile-menu-item"
            role="menuitem"
            onClick={() => void signOut()}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end = false,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `nav-item ${isActive ? "nav-item-active" : ""}`
      }
    >
      <Icon size={19} strokeWidth={1.8} />
      <span>{label}</span>
    </NavLink>
  );
}

