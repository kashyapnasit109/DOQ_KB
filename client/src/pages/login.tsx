import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { HardHat, LogIn, UserPlus, Building2, ChevronDown } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <img
            src="/logo.png"
            alt="Kashyap Builders"
            className="mx-auto w-20 h-20 rounded-2xl object-contain shadow-md border border-amber-200/30"
          />
          <h1 className="text-2xl font-bold tracking-tight">DocQ</h1>
          <p className="text-sm text-muted-foreground">
            Construction Site Intelligence System
          </p>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Kashyap Builders
          </p>
        </div>

        {/* Login / Register Card */}
        <Card className="p-6 shadow-lg border-border/60">
          {mode === "select" ? (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-base font-semibold">Welcome back</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Select your name to continue
                </p>
              </div>

              {users.length > 0 ? (
                <>
                  <div>
                    <Label className="text-sm mb-1.5 block">Select User</Label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                      data-testid="select-login-user"
                    >
                      <option value="">Choose your profile...</option>
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
                    className="w-full"
                    data-testid="button-login"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {loginMutation.isPending ? "Logging in..." : "Continue"}
                  </Button>

                  {loginMutation.isError && (
                    <p className="text-xs text-destructive text-center">
                      {(loginMutation.error as Error).message}
                    </p>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No users registered yet. Create your profile to get started.
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setMode("register")}
                className="w-full"
                data-testid="button-go-register"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create New Profile
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-semibold">Create Profile</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Set up your account once — use it to log in anytime
                </p>
              </div>

              <div>
                <Label htmlFor="reg-username" className="text-sm">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-username"
                  placeholder="e.g. vraj, kishan01"
                  value={regUsername}
                  onChange={(e) => { setRegUsername(e.target.value.toLowerCase().replace(/\s/g, "")); setRegError(""); }}
                  className="mt-1"
                  required
                  data-testid="input-reg-username"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Lowercase, no spaces. This is your login ID.
                </p>
              </div>

              <div>
                <Label htmlFor="reg-name" className="text-sm">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-name"
                  placeholder="e.g. Vraj Patel"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  className="mt-1"
                  required
                  data-testid="input-reg-name"
                />
              </div>

              <div>
                <Label htmlFor="reg-role" className="text-sm">Role</Label>
                <select
                  id="reg-role"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
                  <Label htmlFor="reg-pin" className="text-sm">
                    Admin PIN <span className="text-muted-foreground">(4+ digits)</span>
                  </Label>
                  <Input
                    id="reg-pin"
                    type="password"
                    placeholder="e.g. 1234"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    className="mt-1"
                    data-testid="input-reg-pin"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
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
                  className="flex-1"
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? "Creating..." : "Create & Login"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          Powered by GPT-4o Vision • Kashyap Builders
        </p>
      </div>
    </div>
  );
}
