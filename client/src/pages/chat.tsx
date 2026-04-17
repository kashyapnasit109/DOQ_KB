import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Trash2, MessageSquare, AlertCircle, FileText, Building2, HardHat } from "lucide-react";
import type { Conversation, Document, Site } from "@shared/schema";

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: docs = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: systemStatus } = useQuery<{ apiKeyConfigured: boolean }>({
    queryKey: ["/api/system/status"],
  });

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/ask", { question: q });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setQuestion("");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/conversations");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, askMutation.isPending]);

  const readyDocs = docs.filter((d) => d.status === "ready");
  const reversedConvs = [...conversations].reverse();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || askMutation.isPending) return;
    askMutation.mutate(question.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Sample questions to help the user
  const sampleQuestions = [
    "How many bags of cement were used today?",
    "What was the total payment for Rokdi work?",
    "List all equipment usage with hours",
    "What is the labour breakdown for today?",
    "Show me all payments made today",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2" data-testid="text-page-title">
            <HardHat className="w-5 h-5 text-primary" />
            Site Data Assistant
          </h1>
          <p className="text-sm text-muted-foreground">
            {readyDocs.length} report{readyDocs.length !== 1 ? "s" : ""} parsed
            {sites.length > 0 && ` • ${sites.length} site${sites.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {conversations.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            data-testid="button-clear-history"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {!systemStatus?.apiKeyConfigured && (
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">System Not Configured</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The AI assistant is not yet set up. Contact your admin to configure the API key.
                </p>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-3/4 ml-auto" />
            <Skeleton className="h-24 w-3/4" />
          </div>
        ) : reversedConvs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-base font-medium mb-1">Ask about your construction data</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              {readyDocs.length > 0
                ? "Your reports are parsed and ready. Ask a question below to query your site data."
                : "Upload daily reports first, then ask questions about materials, labour, payments, and more."}
            </p>

            {/* Sample questions */}
            {readyDocs.length > 0 && (
              <div className="flex flex-wrap gap-2 max-w-md justify-center">
                {sampleQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          reversedConvs.map((conv) => (
            <div key={conv.id} className="space-y-3" data-testid={`conversation-${conv.id}`}>
              {/* Question */}
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[75%]">
                  <p className="text-sm">{conv.question}</p>
                </div>
              </div>
              {/* Answer */}
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    <FormattedAnswer text={conv.answer} />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {askMutation.isPending && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[75%]">
                <p className="text-sm">{question || "..."}</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                  </div>
                  Analyzing site data...
                </div>
              </div>
            </div>
          </div>
        )}

        {askMutation.isError && (
          <Card className="p-3 border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive">
              {(askMutation.error as Error).message}
            </p>
          </Card>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-6 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about materials, labour, equipment, payments..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            disabled={askMutation.isPending}
            data-testid="input-question"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!question.trim() || askMutation.isPending}
            data-testid="button-send"
            className="shrink-0 h-[44px] w-[44px]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

/**
 * Simple formatted answer component that handles basic markdown-like formatting
 */
function FormattedAnswer({ text }: { text: string }) {
  // Split into lines and render with basic formatting
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Bold headers (lines starting with **)
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return <p key={i} className="font-semibold mt-2 mb-1">{trimmed.replace(/\*\*/g, "")}</p>;
        }

        // Bullet points
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          return (
            <div key={i} className="flex items-start gap-1.5 ml-2">
              <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: formatInline(trimmed.substring(2)) }} />
            </div>
          );
        }

        // Table rows (containing |)
        if (trimmed.includes("|") && trimmed.startsWith("|")) {
          const cells = trimmed.split("|").filter(Boolean).map(c => c.trim());
          if (cells.every(c => c.match(/^[-:]+$/))) return null; // Skip separator rows
          return (
            <div key={i} className="flex gap-4 text-xs font-mono py-0.5">
              {cells.map((cell, j) => (
                <span key={j} className="flex-1" dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
              ))}
            </div>
          );
        }

        // Empty lines
        if (!trimmed) return <br key={i} />;

        // Normal text with inline formatting
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />;
      })}
    </>
  );
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/₹([\d,]+)/g, '<span class="text-green-600 dark:text-green-400 font-mono font-semibold">₹$1</span>');
}
