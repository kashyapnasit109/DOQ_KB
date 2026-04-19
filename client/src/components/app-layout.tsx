import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import { MessageSquare, FileText, Settings, Sun, Moon } from "lucide-react";
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border bg-gradient-to-br from-[#14d9c5]/5 to-transparent flex items-center justify-center">
          <img
            src="/logo-text.png"
            alt="Kashyap Builders"
            className="w-full max-w-[150px] h-auto object-contain drop-shadow-md"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isActive
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

        {/* Theme toggle */}
        <div className="px-3 py-3 border-t border-sidebar-border">
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
