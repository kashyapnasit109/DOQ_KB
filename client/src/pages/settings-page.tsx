import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, CheckCircle2, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  const { data: settingsData, isLoading } = useQuery<{
    openaiKeySet: boolean;
    openaiKeyPreview: string | null;
  }>({
    queryKey: ["/api/settings"],
  });

  const saveMutation = useMutation({
    mutationFn: async (key: string) => {
      await apiRequest("POST", "/api/settings", { openaiApiKey: key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setApiKey("");
      toast({
        title: "API key saved",
        description: "Your OpenAI API key has been stored securely on the server.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to save",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    saveMutation.mutate(apiKey.trim());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold" data-testid="text-page-title">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your API keys and preferences
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-lg space-y-6">
          {/* OpenAI API Key */}
          <Card className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Key className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">OpenAI API Key</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Universal key for all team members. Set once, used by everyone.
                </p>
              </div>
            </div>

            {settingsData?.openaiKeySet && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  Key configured: {settingsData.openaiKeyPreview}
                </span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <Label htmlFor="apiKey" className="text-xs font-medium">
                  {settingsData?.openaiKeySet ? "Replace API Key" : "API Key"}
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="mt-1 text-sm font-mono"
                  data-testid="input-api-key"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={!apiKey.trim() || saveMutation.isPending}
                data-testid="button-save-key"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : null}
                Save Key
              </Button>
            </form>
          </Card>

          {/* Security note */}
          <Card className="p-4 border-border/50">
            <div className="flex gap-3 items-start">
              <Shield className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-medium">Security</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Your API key is stored on this server's database and used only
                  to make requests to OpenAI when you ask questions. It is never
                  exposed to the browser or sent to any third party.
                </p>
              </div>
            </div>
          </Card>

          {/* About */}
          <Card className="p-4 border-border/50">
            <h3 className="text-sm font-medium mb-2">About DocQ</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              DocQ is a document intelligence tool that lets you upload PDFs and ask
              questions about their content using AI. It extracts text from your documents
              and uses OpenAI to provide accurate answers grounded in your data.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">PDF Text Extraction</Badge>
              <Badge variant="secondary" className="text-xs">AI Q&A</Badge>
              <Badge variant="secondary" className="text-xs">Document Memory</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
