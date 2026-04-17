import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Plus, Building2, ChevronDown } from "lucide-react";
import type { Site } from "@shared/schema";

interface SiteSelectorProps {
  value: number | null;
  onChange: (siteId: number | null) => void;
}

export default function SiteSelector({ value, onChange }: SiteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSiteCode, setNewSiteCode] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteLocation, setNewSiteLocation] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const createSiteMutation = useMutation({
    mutationFn: async (data: { code: string; name: string; location: string }) => {
      const res = await apiRequest("POST", "/api/sites", data);
      return res.json();
    },
    onSuccess: (newSite: Site) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      onChange(newSite.id);
      setShowCreateDialog(false);
      setNewSiteCode("");
      setNewSiteName("");
      setNewSiteLocation("");
      setOpen(false);
    },
  });

  // Filter sites based on search query
  const filteredSites = sites.filter((site) => {
    const q = searchQuery.toLowerCase();
    return (
      site.code.toLowerCase().includes(q) ||
      site.name.toLowerCase().includes(q) ||
      (site.location || "").toLowerCase().includes(q)
    );
  });

  const selectedSite = sites.find((s) => s.id === value);

  // Close dropdown on click outside (but not when create-site dialog is open)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showCreateDialog) return; // Don't close dropdown while dialog is open
      const target = event.target as Node;
      // Check if click is inside a Radix portal (dialog overlay/content)
      const radixPortal = (target as HTMLElement).closest?.("[role='dialog'], [data-radix-portal]");
      if (radixPortal) return;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCreateDialog]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Label className="text-sm font-medium mb-1.5 block">Construction Site</Label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background hover:bg-accent/50 transition-colors"
        data-testid="site-selector-trigger"
      >
        {selectedSite ? (
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="font-medium">{selectedSite.code}</span>
            <span className="text-muted-foreground">— {selectedSite.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Select a site...</span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Search by code, name, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-sm"
              autoFocus
              data-testid="site-search-input"
            />
          </div>

          {/* Site list */}
          <div className="max-h-[200px] overflow-y-auto">
            {filteredSites.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                {searchQuery ? `No sites match "${searchQuery}"` : "No sites yet"}
              </div>
            ) : (
              filteredSites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    onChange(site.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/60 transition-colors text-left ${
                    site.id === value ? "bg-primary/10" : ""
                  }`}
                  data-testid={`site-option-${site.id}`}
                >
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">{site.code}</span>
                      <span className="truncate">{site.name}</span>
                    </div>
                    {site.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {site.location}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create new site button */}
          <div className="border-t border-border p-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent/60 transition-colors text-primary font-medium"
                  data-testid="button-create-site"
                >
                  <Plus className="w-4 h-4" />
                  Add New Site
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Add New Construction Site
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newSiteCode && newSiteName) {
                      createSiteMutation.mutate({
                        code: newSiteCode,
                        name: newSiteName,
                        location: newSiteLocation,
                      });
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="site-code" className="text-sm">
                      Site Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="site-code"
                      placeholder="e.g. SOU, METRO-AHD"
                      value={newSiteCode}
                      onChange={(e) => setNewSiteCode(e.target.value.toUpperCase())}
                      className="mt-1.5"
                      required
                      data-testid="input-site-code"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Short unique code. Everyone must use the same code for the same site.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="site-name" className="text-sm">
                      Full Site Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="site-name"
                      placeholder="e.g. Statue of Unity"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      className="mt-1.5"
                      required
                      data-testid="input-site-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="site-location" className="text-sm">
                      Location
                    </Label>
                    <Input
                      id="site-location"
                      placeholder="e.g. Kevadia, Gujarat"
                      value={newSiteLocation}
                      onChange={(e) => setNewSiteLocation(e.target.value)}
                      className="mt-1.5"
                      data-testid="input-site-location"
                    />
                  </div>
                  {createSiteMutation.isError && (
                    <p className="text-sm text-destructive">
                      {(createSiteMutation.error as Error).message}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!newSiteCode || !newSiteName || createSiteMutation.isPending}
                      data-testid="button-submit-site"
                    >
                      {createSiteMutation.isPending ? "Creating..." : "Create Site"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}
