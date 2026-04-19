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
        <div className="px-5 py-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.jpg"
              alt="Kashyap Builders"
              className="w-10 h-10 rounded shadow-[0_0_15px_rgba(31,107,56,0.5)] object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="text-lg font-light tracking-widest text-white/90 block">
                SMART<span className="font-bold text-white">OS</span>
              </span>
              <span className="text-[9px] tracking-[0.2em] text-[#4A8F96] uppercase leading-none block mt-0.5">
                Kashyap Builders
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              return (
                <Link key={item.path} href={item.path}>
                  <a
                    className={`flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                      isActive
                        ? "bg-[#1F6B38]/20 text-white font-medium border border-[#1F6B38]/30 shadow-[inset_0_0_10px_rgba(31,107,56,0.2)]"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90 hover:border hover:border-white/5 border border-transparent"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-3 ${isActive ? "text-[#4A8F96] drop-shadow-[0_0_5px_rgba(74,143,150,0.8)]" : "text-white/40"}`} />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10 bg-black/40 mt-auto">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1F6B38] to-[#4A8F96] flex items-center justify-center shrink-0 border border-white/20 shadow-[0_0_10px_rgba(74,143,150,0.3)]">
                <span className="text-sm font-semibold text-white">
                  {profile.displayName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white/90 truncate">
                  {profile.displayName}
                </p>
                <p className="text-[10px] text-[#4A8F96] uppercase tracking-wider truncate">
                  {profile.role}
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full bg-white/5 border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-white/60 transition-all rounded-lg h-8 text-xs"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0A0A0A] relative text-white">
        {/* Main content background glow */}
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[#4A8F96]/5 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1F6B38]/5 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
