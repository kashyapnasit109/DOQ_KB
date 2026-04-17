import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/use-profile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Clock,
  FileWarning,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Building2,
  Calendar,
} from "lucide-react";
import type { Document, Site } from "@shared/schema";
import { format } from "date-fns";
import SiteSelector from "@/components/site-selector";

export default function DocumentsPage() {
  const { profile } = useUserProfile();
  const [dragActive, setDragActive] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedDocDetail, setSelectedDocDetail] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadSiteId, setUploadSiteId] = useState<number | null>(null);
  const [uploadDate, setUploadDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: docs = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    refetchInterval: 3000, // Poll for processing status
  });

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, siteId, reportDate }: { file: File; siteId: number; reportDate: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", siteId.toString());
      formData.append("reportDate", reportDate);
      formData.append("uploadedBy", profile?.name || "Unknown");

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setShowUploadForm(false);
      setPendingFile(null);
      setUploadSiteId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setSelectedDoc(null);
      setSelectedDocDetail(null);
    },
  });

  const handleFileSelected = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.type)) {
      setPendingFile(file);
      setShowUploadForm(true);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelected(e.dataTransfer.files);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFile || !uploadSiteId || !uploadDate) return;
    uploadMutation.mutate({
      file: pendingFile,
      siteId: uploadSiteId,
      reportDate: uploadDate,
    });
  };

  const openDocDetail = async (doc: Document) => {
    setSelectedDoc(doc);
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      const data = await res.json();
      setSelectedDocDetail(data);
    } catch {
      setSelectedDocDetail(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "ready":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "processing":
        return "Processing with AI...";
      case "ready":
        return "Parsed";
      case "error":
        return "Error";
      default:
        return status;
    }
  };

  const getFileIcon = (doc: Document) => {
    if (doc.fileType === "image") return <ImageIcon className="w-5 h-5 text-primary" />;
    return <FileText className="w-5 h-5 text-primary" />;
  };

  const getSiteName = (doc: Document) => {
    if (!doc.siteId) return null;
    const site = sites.find((s) => s.id === doc.siteId);
    return site ? `${site.code} — ${site.name}` : null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">Documents</h1>
          <p className="text-sm text-muted-foreground">
            {docs.length} document{docs.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          data-testid="button-upload"
          size="sm"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-1.5" />
          )}
          Upload Report
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files)}
          data-testid="input-file-upload"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Drop zone */}
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-colors cursor-pointer ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
          onClick={() => fileInputRef.current?.click()}
          data-testid="dropzone"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">
              Drop daily report here or click to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDFs and images (JPEG, PNG) of handwritten reports — up to 50MB
            </p>
          </div>
        </div>

        {/* Document list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileWarning className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-medium mb-1">No documents yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Upload your first daily report (PDF or photo) to start parsing construction data.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <Card
                key={doc.id}
                className="flex items-center gap-4 p-4 hover:bg-accent/40 transition-colors cursor-pointer"
                onClick={() => openDocDetail(doc)}
                data-testid={`card-document-${doc.id}`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {getFileIcon(doc)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {getSiteName(doc) && (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium">
                        <Building2 className="w-3 h-3" />
                        {getSiteName(doc)}
                      </span>
                    )}
                    {doc.reportDate && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(doc.reportDate), "MMM d, yyyy")}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      doc.status === "ready" ? "secondary" :
                      doc.status === "error" ? "destructive" : "outline"
                    }
                    className="text-xs gap-1"
                  >
                    {statusIcon(doc.status)}
                    {statusLabel(doc.status)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Form Dialog — appears when file is selected */}
      <Dialog open={showUploadForm} onOpenChange={(open) => {
        if (!open) {
          setShowUploadForm(false);
          setPendingFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Daily Report
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-5">
            {/* File info */}
            {pendingFile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                {pendingFile.type.startsWith("image/") ? (
                  <ImageIcon className="w-5 h-5 text-primary" />
                ) : (
                  <FileText className="w-5 h-5 text-primary" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(pendingFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}

            {/* Site selector */}
            <SiteSelector value={uploadSiteId} onChange={setUploadSiteId} />

            {/* Date picker */}
            <div>
              <Label htmlFor="report-date" className="text-sm font-medium mb-1.5 block">
                Report Date
              </Label>
              <Input
                id="report-date"
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                required
                data-testid="input-report-date"
              />
            </div>

            {/* Error message */}
            {uploadMutation.isError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">
                  {(uploadMutation.error as Error).message}
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowUploadForm(false);
                  setPendingFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!pendingFile || !uploadSiteId || !uploadDate || uploadMutation.isPending}
                data-testid="button-submit-upload"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1.5" />
                    Upload & Parse with AI
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document detail dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => { setSelectedDoc(null); setSelectedDocDetail(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          {selectedDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  {getFileIcon(selectedDoc)}
                  {selectedDoc.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {getSiteName(selectedDoc) && (
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <Building2 className="w-4 h-4" />
                    {getSiteName(selectedDoc)}
                  </span>
                )}
                {selectedDoc.reportDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedDoc.reportDate), "MMMM d, yyyy")}
                  </span>
                )}
                <span>{selectedDoc.pageCount} page{selectedDoc.pageCount !== 1 ? "s" : ""}</span>
                <Badge
                  variant={selectedDoc.status === "ready" ? "secondary" : "destructive"}
                  className="text-xs gap-1"
                >
                  {statusIcon(selectedDoc.status)}
                  {statusLabel(selectedDoc.status)}
                </Badge>
              </div>

              {selectedDoc.errorMessage && (
                <Card className="p-3 border-destructive/30 bg-destructive/5">
                  <p className="text-sm text-destructive">{selectedDoc.errorMessage}</p>
                </Card>
              )}

              {/* Structured Data View */}
              {selectedDocDetail?.reports?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Eye className="w-4 h-4" />
                    Parsed Data (AI Extracted)
                  </h3>
                  <ScrollArea className="h-[350px] rounded-lg border border-border bg-muted/30 p-4">
                    {selectedDocDetail.reports.map((report: any, idx: number) => (
                      <div key={idx} className="space-y-3">
                        <StructuredDataView data={report.structuredData} />
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Raw Extracted Text fallback */}
              {(!selectedDocDetail?.reports?.length) && selectedDoc.extractedText && (
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Eye className="w-4 h-4" />
                    Extracted Text
                  </h3>
                  <ScrollArea className="h-[300px] rounded-lg border border-border bg-muted/30 p-4">
                    <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground">
                      {selectedDoc.extractedText || "No text extracted."}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(selectedDoc.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-doc"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Structured Data Viewer Component ──────────────────────────────────────

function StructuredDataView({ data }: { data: any }) {
  if (!data) return <p className="text-sm text-muted-foreground">No data</p>;

  return (
    <div className="space-y-4 text-sm">
      {/* Equipment */}
      {data.equipment_usage?.length > 0 && (
        <Section title="🚜 Equipment Usage">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 font-medium">Equipment</th>
                <th className="text-right py-1 font-medium">Hours</th>
                <th className="text-right py-1 font-medium">Diesel</th>
              </tr>
            </thead>
            <tbody>
              {data.equipment_usage.map((e: any, i: number) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5">{e.equipment}</td>
                  <td className="text-right py-1.5 font-mono">{e.working_hours ?? "—"}</td>
                  <td className="text-right py-1.5">{e.diesel_used || "Nil"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Materials */}
      {data.material_usage?.length > 0 && (
        <Section title="🧱 Material Usage">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 font-medium">Material</th>
                <th className="text-right py-1 font-medium">Used</th>
                <th className="text-right py-1 font-medium">Unit</th>
                <th className="text-right py-1 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.material_usage.map((m: any, i: number) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5">{m.material}</td>
                  <td className="text-right py-1.5 font-mono font-semibold">{m.quantity_used ?? "—"}</td>
                  <td className="text-right py-1.5">{m.unit}</td>
                  <td className="text-right py-1.5 font-mono">{m.balance ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Centering */}
      {data.centering_work?.length > 0 && (
        <Section title="🔩 Centering / Shuttering">
          {data.centering_work.map((c: any, i: number) => (
            <div key={i} className="flex justify-between text-xs py-1">
              <span>{c.work_type}</span>
              <span className="font-mono">{c.mistri_count}M / {c.helper_count}H</span>
            </div>
          ))}
        </Section>
      )}

      {/* Department Labour */}
      {data.department_labour?.tasks?.length > 0 && (
        <Section title="👷 Department Labour">
          <ul className="space-y-0.5 text-xs">
            {data.department_labour.tasks.map((t: string, i: number) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-xs font-medium">
            Total: {data.department_labour.total_labour} labour
            {data.department_labour.curing_labour > 0 && ` + ${data.department_labour.curing_labour} for curing`}
          </div>
        </Section>
      )}

      {/* Masonry */}
      {data.masonry_rokdi && (
        <Section title="🧱 Masonry (Rokdi)">
          <div className="text-xs space-y-1">
            <div className="flex justify-between font-medium">
              <span>Total: {data.masonry_rokdi.total_mistri} Mistri, {data.masonry_rokdi.total_helper} Helper</span>
              {data.masonry_rokdi.total_payment && (
                <span className="text-green-600 dark:text-green-400">₹{data.masonry_rokdi.total_payment?.toLocaleString()}</span>
              )}
            </div>
            {data.masonry_rokdi.breakdown?.map((b: any, i: number) => (
              <div key={i} className="flex justify-between pl-3 text-muted-foreground">
                <span>{b.location}</span>
                <span className="font-mono">{b.mistri}M / {b.helper}H</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Payments */}
      {data.individual_payments?.length > 0 && (
        <Section title="💰 Payments">
          {data.individual_payments.map((p: any, i: number) => (
            <div key={i} className="flex justify-between text-xs py-1">
              <span>{p.category} {p.person ? `(${p.person})` : ""}</span>
              <span className="font-mono text-green-600 dark:text-green-400">
                {p.amount != null ? `₹${p.amount.toLocaleString()}` : "—"}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Summary */}
      {data.summary && (
        <Section title="📊 Summary">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>Cement Bags: <span className="font-mono font-semibold">{data.summary.total_cement_bags}</span></div>
            <div>Equipment Hrs: <span className="font-mono font-semibold">{data.summary.equipment_hours}</span></div>
            <div>Total Mistri: <span className="font-mono font-semibold">{data.summary.total_mistri}</span></div>
            <div>Total Helpers: <span className="font-mono font-semibold">{data.summary.total_helpers}</span></div>
            <div>Total Labour: <span className="font-mono font-semibold">{data.summary.total_labour}</span></div>
            <div>Total Payments: <span className="font-mono font-semibold text-green-600 dark:text-green-400">₹{data.summary.total_payments?.toLocaleString()}</span></div>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <h4 className="text-xs font-semibold text-primary mb-2">{title}</h4>
      {children}
    </div>
  );
}
