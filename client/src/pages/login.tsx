import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LogIn, UserPlus, Building2 } from "lucide-react";

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
    onSuccess: (user: User) => onLogin(user),
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
    onError: (err: Error) => setRegError(err.message),
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
    <div className="min-h-screen flex items-center justify-center login-gradient p-4 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#14d9c5]/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-[#d4a853]/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-[#0f9580]/3 blur-2xl" />
      </div>

      <div className="w-full max-w-[420px] space-y-8 relative z-10">
        {/* ─── Premium Logo Header ─── */}
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-xl border border-border/30 bg-[#0a1a14]">
            <img
              src="/logo-icon.jpg"
              alt="Kashyap Builders"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <h1 className="text-[26px] font-bold tracking-[-0.03em] text-foreground" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
              DocQ
            </h1>
            <p className="text-[13px] text-muted-foreground tracking-wide uppercase" style={{ letterSpacing: '0.12em' }}>
              Site Intelligence System
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#1F6B38]/40" />
              <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#1F6B38]"
                 style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Kashyap Builders
              </p>
              <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-[#1F6B38]/40" />
            </div>
          </div>
        </div>

        {/* ─── Auth Card ─── */}
        <Card className="p-6 shadow-xl border-border/40 backdrop-blur-sm bg-card/95">
          {mode === "select" ? (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-[15px] font-semibold tracking-tight">Welcome back</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Select your profile to continue
                </p>
              </div>

              {users.length > 0 ? (
                <>
                  <div>
                    <Label className="text-xs mb-1.5 block font-medium">Your Profile</Label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#14d9c5]/30 focus:border-[#14d9c5]/50 transition-all"
                      data-testid="select-login-user"
                    >
                      <option value="">Choose your name...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.username}>
                          {u.displayName} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    onClick={handleLogin}
                    disabled={!selectedUser || loginMutation.isPending}
                    className="w-full bg-gradient-to-r from-[#0f9580] to-[#14d9c5] hover:from-[#0d856f] hover:to-[#12c4b1] text-white shadow-lg shadow-[#14d9c5]/10 transition-all duration-200"
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {loginMutation.isPending ? "Signing in..." : "Continue"}
                  </Button>

                  {loginMutation.isError && (
                    <p className="text-xs text-destructive text-center">
                      {(loginMutation.error as Error).message}
                    </p>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                      <span className="bg-card px-3 text-muted-foreground">or</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#14d9c5]/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#14d9c5]" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No team members registered yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your profile to get started
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setMode("register")}
                className="w-full border-dashed hover:border-[#14d9c5]/40 hover:bg-[#14d9c5]/5 transition-all"
                data-testid="button-go-register"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create New Profile
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center">
                <h2 className="text-[15px] font-semibold tracking-tight">Create Profile</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  One-time setup — use your username to log in anytime
                </p>
              </div>

              <div>
                <Label htmlFor="reg-username" className="text-xs font-medium">
                  Username <span className="text-[#14d9c5]">*</span>
                </Label>
                <Input
                  id="reg-username"
                  placeholder="e.g. vraj, kishan01"
                  value={regUsername}
                  onChange={(e) => { setRegUsername(e.target.value.toLowerCase().replace(/\s/g, "")); setRegError(""); }}
                  className="mt-1.5 focus:ring-2 focus:ring-[#14d9c5]/30 focus:border-[#14d9c5]/50"
                  required
                  data-testid="input-reg-username"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Lowercase, no spaces. This is your login ID.
                </p>
              </div>

              <div>
                <Label htmlFor="reg-name" className="text-xs font-medium">
                  Full Name <span className="text-[#14d9c5]">*</span>
                </Label>
                <Input
                  id="reg-name"
                  placeholder="e.g. Vraj Patel"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  className="mt-1.5 focus:ring-2 focus:ring-[#14d9c5]/30 focus:border-[#14d9c5]/50"
                  required
                  data-testid="input-reg-name"
                />
              </div>

              <div>
                <Label htmlFor="reg-role" className="text-xs font-medium">Role</Label>
                <select
                  id="reg-role"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14d9c5]/30 focus:border-[#14d9c5]/50 transition-all"
                  data-testid="select-reg-role"
                >
                  <option value="engineer">Site Engineer</option>
                  <option value="supervisor">Site Supervisor</option>
                  <option value="admin">Admin / Manager</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {regRole === "admin" && (
                <div>
                  <Label htmlFor="reg-pin" className="text-xs font-medium">
                    Admin PIN <span className="text-muted-foreground">(4+ digits)</span>
                  </Label>
                  <Input
                    id="reg-pin"
                    type="password"
                    placeholder="e.g. 1234"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    className="mt-1.5 focus:ring-2 focus:ring-[#14d9c5]/30"
                    data-testid="input-reg-pin"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Used to access admin settings like API key config.
                  </p>
                </div>
              )}

              {regError && (
                <p className="text-xs text-destructive">{regError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("select")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!regUsername || !regDisplayName || registerMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#0f9580] to-[#14d9c5] hover:from-[#0d856f] hover:to-[#12c4b1] text-white"
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? "Creating..." : "Create & Login"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* ─── Footer ─── */}
        <div className="text-center space-y-1">
          <p className="text-[10px] text-muted-foreground/60 tracking-wide">
            Powered by GPT-4o Vision
          </p>
          <p className="text-[9px] text-muted-foreground/40 tracking-wider uppercase">
            Government Infrastructure Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
