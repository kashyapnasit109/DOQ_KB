import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Key, Eye, EyeOff, CheckCircle2, Lock, AlertCircle, HardHat } from "lucide-react";
import { useUserProfile } from "@/hooks/use-profile";

export default function SettingsPage() {
  const { profile } = useUserProfile();

  // Admin auth
  const [adminPin, setAdminPin] = useState("");
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [pinError, setPinError] = useState("");

  // API key form
  const [newApiKey, setNewApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // PIN management
  const [newPin, setNewPin] = useState("");
  const [oldPin, setOldPin] = useState("");

  const { data: systemStatus } = useQuery<{ apiKeyConfigured: boolean; apiKeySource: string }>({
    queryKey: ["/api/system/status"],
  });

  const verifyPinMutation = useMutation({
    mutationFn: async (pin: string) => {
      const res = await apiRequest("POST", "/api/admin/verify", { pin });
      return res.json();
    },
    onSuccess: () => {
      setIsAdminVerified(true);
      setPinError("");
    },
    onError: () => {
      setPinError("Invalid PIN. Contact system administrator.");
    },
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({ openaiApiKey: key }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/status"] });
      setNewApiKey("");
    },
  });

  const updatePinMutation = useMutation({
    mutationFn: async (data: { oldPin: string; newPin: string }) => {
      const res = await apiRequest("POST", "/api/auth/update-pin", {
        userId: profile?.id,
        oldPin: data.oldPin,
        newPin: data.newPin,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      setOldPin("");
      setNewPin("");
    },
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold" data-testid="text-page-title">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration</p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-xl">

        {/* ── Current User ─────────────────────────────────────── */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{profile?.displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">
                @{profile?.username} • {profile?.role}
              </p>
            </div>
          </div>
        </Card>

        {/* ── System Status ───────────────────────────────────────── */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">System Status</h2>
              <p className="text-xs text-muted-foreground">AI processing engine</p>
            </div>
          </div>

          {systemStatus?.apiKeyConfigured ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                AI system is active
                {systemStatus.apiKeySource === "environment" && (
                  <span className="text-xs text-muted-foreground ml-1">(server-managed)</span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>
                AI not configured yet.
                {profile?.role === "admin"
                  ? " Use admin panel below to set it up."
                  : " Contact your admin."}
              </span>
            </div>
          )}
        </Card>

        {/* ── Admin Configuration (only for admin role) ────────────── */}
        {profile?.role === "admin" && (
          <Card className="p-5 border-dashed">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">API key & PIN management</p>
              </div>
            </div>

            {!isAdminVerified ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="admin-pin" className="text-sm">Enter Your Admin PIN</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="admin-pin"
                      type="password"
                      placeholder="Your PIN"
                      value={adminPin}
                      onChange={(e) => { setAdminPin(e.target.value); setPinError(""); }}
                      className="max-w-[200px]"
                      data-testid="input-admin-pin"
                    />
                    <Button
                      onClick={() => verifyPinMutation.mutate(adminPin)}
                      disabled={!adminPin || verifyPinMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      Unlock
                    </Button>
                  </div>
                  {pinError && <p className="text-xs text-destructive mt-1">{pinError}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Admin panel unlocked
                </div>

                {/* API Key */}
                <div>
                  <Label htmlFor="api-key" className="text-sm font-medium">OpenAI API Key</Label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="relative flex-1">
                      <Input
                        id="api-key"
                        type={showKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        data-testid="input-api-key"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      onClick={() => saveApiKeyMutation.mutate(newApiKey)}
                      disabled={!newApiKey || saveApiKeyMutation.isPending}
                      size="sm"
                    >
                      Save
                    </Button>
                  </div>
                  {saveApiKeyMutation.isSuccess && (
                    <p className="text-xs text-green-600 mt-1">API key saved!</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Pro tip: Set <code className="bg-muted px-1 rounded text-[10px]">OPENAI_API_KEY</code> in
                    the server's <code className="bg-muted px-1 rounded text-[10px]">.env</code> file for automatic setup.
                  </p>
                </div>

                {/* Change PIN */}
                <div className="border-t border-border pt-4">
                  <Label className="text-sm font-medium">Change Admin PIN</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      type="password"
                      placeholder="Current PIN"
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value)}
                      className="max-w-[150px]"
                    />
                    <Input
                      type="password"
                      placeholder="New PIN"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="max-w-[150px]"
                    />
                    <Button
                      onClick={() => updatePinMutation.mutate({ oldPin, newPin })}
                      disabled={!newPin || updatePinMutation.isPending}
                      size="sm"
                      variant="outline"
                    >
                      Update
                    </Button>
                  </div>
                  {updatePinMutation.isSuccess && (
                    <p className="text-xs text-green-600 mt-1">PIN updated!</p>
                  )}
                  {updatePinMutation.isError && (
                    <p className="text-xs text-destructive mt-1">
                      {(updatePinMutation.error as Error).message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
