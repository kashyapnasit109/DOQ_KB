import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import { useUserProfile } from "@/hooks/use-profile";
import { MessageSquare, FileText, Settings, Sun, Moon, User, HardHat, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { path: "/", label: "Chat", icon: MessageSquare },
  { path: "/documents", label: "Documents", icon: FileText },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { profile, clearProfile } = useUserProfile();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              aria-label="DocQ logo"
              className="shrink-0"
            >
              <rect width="32" height="32" rx="8" className="fill-primary" />
              <path
                d="M8 10h10a4 4 0 0 1 0 8H8V10z"
                className="stroke-primary-foreground"
                strokeWidth="2"
                fill="none"
              />
              <circle cx="22" cy="22" r="4" className="stroke-primary-foreground" strokeWidth="2" fill="none" />
              <path d="M25 25l3 3" className="stroke-primary-foreground" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-base font-semibold tracking-tight">DocQ</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User profile + theme toggle */}
        <div className="border-t border-sidebar-border">
          {/* User info */}
          {profile ? (
            <div className="px-3 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <HardHat className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{profile.displayName}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{profile.role}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={clearProfile}
                    className="p-1 rounded hover:bg-sidebar-accent/60 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Switch user</TooltipContent>
              </Tooltip>
            </div>
          ) : null}

          {/* Theme toggle */}
          <div className="px-3 py-2 border-t border-sidebar-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="w-full justify-start gap-2.5 text-muted-foreground"
                  data-testid="button-theme-toggle"
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Switch to {theme === "dark" ? "light" : "dark"} mode
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
