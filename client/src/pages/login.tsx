import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, ShieldAlert, Cpu } from "lucide-react";

interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"select" | "register">("select");
  const [selectedUser, setSelectedUser] = useState<string>("");

  // Register form
  const [regUsername, setRegUsername] = useState("");
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regRole, setRegRole] = useState<string>("engineer");
  const [regPin, setRegPin] = useState("");
  const [regError, setRegError] = useState("");

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/auth/users"],
  });

  const loginMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiRequest("POST", "/api/auth/login", { username });
      return res.json();
    },
    onSuccess: (user: User) => {
      onLogin(user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; displayName: string; role: string; pin?: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (user: User) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      onLogin(user);
    },
    onError: (err: Error) => {
      setRegError(err.message);
    },
  });

  const handleLogin = () => {
    if (selectedUser) loginMutation.mutate(selectedUser);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!regUsername || !regDisplayName) return;
    registerMutation.mutate({
      username: regUsername,
      displayName: regDisplayName,
      role: regRole,
      pin: regRole === "admin" ? regPin : undefined,
    });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0A0A0A]">
      {/* Immersive Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#1F6B38]/10 rounded-full blur-[120px] mix-blend-screen mix-blend-lighten" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#4A8F96]/10 rounded-full blur-[100px] mix-blend-screen mix-blend-lighten" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,#0A0A0A_100%)] z-0" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGgyNHYyNEgwem0xIDFhMSAxIDAgMSAwIDAgMiAxIDEgMCAwIDAgMC0yeiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-50 z-0 mix-blend-overlay" />

      <div className="w-full max-w-md space-y-8 z-10 p-6">
        {/* Branding Area */}
        <div className="flex flex-col items-center">
          <div className="mb-8 p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1F6B38]/20 to-[#4A8F96]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl blur-xl" />
            <img
              src="/logo-text.png"
              alt="Kashyap Builders"
              className="w-full max-w-[280px] h-auto object-contain relative z-10"
            />
          </div>
          
          <div className="space-y-1.5 text-center">
            <h1 className="text-3xl font-light tracking-widest text-white/90">
              SMART<span className="font-bold text-white">OS</span>
            </h1>
            <p className="text-sm font-medium tracking-[0.2em] text-[#4A8F96] uppercase">
              Site Intelligence Platform
            </p>
          </div>
        </div>

        {/* Auth Container */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle line at top of card */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#1F6B38]/50 to-transparent" />
          
          {mode === "select" ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-medium text-white/80">System Access</h2>
                <p className="text-sm text-white/40 mt-1 font-light">Identify yourself to access the platform</p>
              </div>

              {users.length > 0 ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-white/50 block ml-1">Select Identity</Label>
                    <div className="relative">
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#4A8F96]/50 focus:border-transparent transition-all"
                      >
                        <option value="" className="bg-[#0A0A0A]">Select personnel...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.username} className="bg-[#0A0A0A]">
                            {u.displayName} — {u.role.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <Cpu className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleLogin}
                    disabled={!selectedUser || loginMutation.isPending}
                    className="w-full bg-[#1F6B38] hover:bg-[#155328] text-white shadow-[0_0_20px_rgba(31,107,56,0.2)] hover:shadow-[0_0_30px_rgba(31,107,56,0.4)] transition-all h-12 rounded-xl border border-white/10"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {loginMutation.isPending ? "AUTHENTICATING..." : "INITIATE LINK"}
                  </Button>

                  {loginMutation.isError && (
                    <p className="text-sm text-red-400 text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                      {(loginMutation.error as Error).message}
                    </p>
                  )}

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                    <span className="text-[10px] uppercase tracking-widest text-white/30">unregistered?</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-white/5 rounded-xl border border-white/5">
                  <ShieldAlert className="w-12 h-12 text-[#4A8F96]/50 mx-auto mb-3" />
                  <p className="text-sm text-white/60 font-light">
                    No active personnel found in the database.
                  </p>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={() => setMode("register")}
                className="w-full hover:bg-white/5 text-white/60 hover:text-white transition-colors h-12 rounded-xl"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register New Profile
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-lg font-medium text-white/80">Personnel Registration</h2>
                <p className="text-sm text-white/40 mt-1 font-light">Enter credentials for secure platform access</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="text-xs uppercase tracking-wider text-white/50 block ml-1">
                    System ID <span className="text-[#4A8F96]">*</span>
                  </Label>
                  <Input
                    id="reg-username"
                    placeholder="e.g. jdoe01"
                    value={regUsername}
                    onChange={(e) => { setRegUsername(e.target.value.toLowerCase().replace(/\s/g, "")); setRegError(""); }}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-[#4A8F96] rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-xs uppercase tracking-wider text-white/50 block ml-1">
                    Full Name <span className="text-[#4A8F96]">*</span>
                  </Label>
                  <Input
                    id="reg-name"
                    placeholder="e.g. John Doe"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-[#4A8F96] rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-role" className="text-xs uppercase tracking-wider text-white/50 block ml-1">Role Designation</Label>
                  <select
                    id="reg-role"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full appearance-none h-12 bg-white/5 border border-white/10 text-white rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-[#4A8F96] transition-all"
                  >
                    <option value="engineer" className="bg-[#0A0A0A]">Site Engineer</option>
                    <option value="supervisor" className="bg-[#0A0A0A]">Site Supervisor</option>
                    <option value="admin" className="bg-[#0A0A0A]">Admin / Commander</option>
                    <option value="other" className="bg-[#0A0A0A]">Other</option>
                  </select>
                </div>

                {regRole === "admin" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="reg-pin" className="text-xs uppercase tracking-wider text-[#4A8F96] block ml-1 flex items-center gap-2">
                      <ShieldAlert className="w-3 h-3" /> Security PIN
                    </Label>
                    <Input
                      id="reg-pin"
                      type="password"
                      placeholder="Enter 4+ digit PIN"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      className="h-12 bg-[#4A8F96]/10 border-[#4A8F96]/30 text-[#4A8F96] placeholder:text-[#4A8F96]/30 focus-visible:ring-[#4A8F96] rounded-xl"
                    />
                  </div>
                )}
              </div>

              {regError && (
                <p className="text-sm text-red-400 text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                  {regError}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("select")}
                  className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 text-white/70"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!regUsername || !regDisplayName || registerMutation.isPending}
                  className="flex-[2] h-12 rounded-xl bg-[#4A8F96] hover:bg-[#3B7A81] text-white shadow-[0_0_20px_rgba(74,143,150,0.2)] hover:shadow-[0_0_30px_rgba(74,143,150,0.4)] transition-all border border-white/10"
                >
                  {registerMutation.isPending ? "REGISTERING..." : "REGISTER & LINK"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-[10px] tracking-widest text-white/30 uppercase font-mono">
            SECURE CONNECTION • ENCRYPTED
          </p>
        </div>
      </div>
    </div>
  );
}
