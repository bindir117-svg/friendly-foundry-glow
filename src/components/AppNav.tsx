import { Link, useLocation } from "react-router-dom";
import { Home, User, BookOpen, MessageSquare, StickyNote, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const baseItems = [
  { to: "/", label: "Нүүр", icon: Home },
  { to: "/chat", label: "Чат", icon: MessageSquare },
  { to: "/learn", label: "Сургалт", icon: BookOpen },
  { to: "/notes", label: "Тэмдэглэл", icon: StickyNote },
  { to: "/profile", label: "Профайл", icon: User },
];

const useItems = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? [...baseItems, { to: "/admin", label: "Админ", icon: Shield }] : baseItems;
};

export const TopNav = () => {
  const { pathname } = useLocation();
  const items = useItems();
  return (
    <nav className="hidden md:flex items-center gap-1">
      {items.map((it) => {
        const active = pathname === it.to;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              active
                ? "bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.3)]"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            <it.icon className="w-3.5 h-3.5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
};

export const MobileNav = () => {
  const { pathname } = useLocation();
  const items = useItems();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/40 bg-background/85 backdrop-blur-xl">
      <ul className="flex items-center justify-around py-1.5 px-1">
        {items.map((it) => {
          const active = pathname === it.to;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[52px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <it.icon className="w-4 h-4" />
                <span className="text-[10px] leading-tight">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
