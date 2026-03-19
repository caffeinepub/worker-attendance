import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Work } from "../../backend";
import { useAppContext } from "../../context/AppContext";
import {
  useAddWork,
  useDeleteWork,
  useUpdateWork,
  useWorks,
} from "../../hooks/useQueries";
import { getCurrentPosition } from "../../utils/photoUtils";

const now = () => new Date();
const dateStr = (d: Date) => d.toISOString().split("T")[0];

function emptyWork(): Work {
  const d = now();
  return {
    workId: Date.now().toString(),
    name: "",
    jobTitle: "",
    category: "",
    locationDescription: "",
    date: dateStr(d),
  };
}

export default function WorksTab() {
  const { data: works = [], isLoading } = useWorks();
  const addWork = useAddWork();
  const updateWork = useUpdateWork();
  const deleteWork = useDeleteWork();
  const { selectedWork, setSelectedWork, isAdmin } = useAppContext();

  const [showForm, setShowForm] = useState(false);
  const [editWork, setEditWork] = useState<Work | null>(null);
  const [form, setForm] = useState<Work>(emptyWork());
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  async function openAdd() {
    const w = emptyWork();
    setForm(w);
    setEditWork(null);
    setShowForm(true);
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setForm((prev) => ({
        ...prev,
        locationDescription: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
      }));
    } catch {
      // ignore GPS fail
    } finally {
      setLocating(false);
    }
  }

  function openEdit(w: Work) {
    setForm({ ...w });
    setEditWork(w);
    setShowForm(true);
  }

  function set(key: keyof Work, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Work name is required");
      return;
    }
    setSaving(true);
    try {
      if (editWork) {
        await updateWork.mutateAsync({ workId: editWork.workId, work: form });
        toast.success("Work updated");
      } else {
        await addWork.mutateAsync(form);
        toast.success("Work saved");
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(w: Work) {
    if (!confirm(`Delete "${w.name}"?`)) return;
    try {
      await deleteWork.mutateAsync(w.workId);
      if (selectedWork?.workId === w.workId) setSelectedWork(null);
      toast.success("Work deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">Works</h2>
          <p className="text-xs text-muted-foreground">
            {works.length} work{works.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Button
          data-ocid="works.primary_button"
          size="sm"
          onClick={openAdd}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Work
        </Button>
      </div>

      {selectedWork && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-sm text-primary font-medium flex-1 truncate">
            Active: {selectedWork.name}
          </p>
          <button
            type="button"
            onClick={() => setSelectedWork(null)}
            className="text-primary/70 hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <div
          data-ocid="works.loading_state"
          className="flex justify-center py-12"
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : works.length === 0 ? (
        <div
          data-ocid="works.empty_state"
          className="flex flex-col items-center justify-center py-16 text-center gap-3"
        >
          <Briefcase className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No works added yet.
            <br />
            Tap "Add Work" to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {works.map((w, i) => {
            const isSelected = selectedWork?.workId === w.workId;
            return (
              <button
                key={w.workId}
                type="button"
                data-ocid={`works.item.${i + 1}`}
                onClick={() => setSelectedWork(isSelected ? null : w)}
                className={`w-full rounded-xl border p-3 cursor-pointer transition-all text-left ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="font-semibold text-sm truncate">{w.name}</p>
                      {isSelected && (
                        <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {w.jobTitle} {w.category ? `· ${w.category}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground ml-6">
                      {w.date}
                    </p>
                    {w.locationDescription && (
                      <p className="text-xs text-muted-foreground ml-6 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">
                          {w.locationDescription}
                        </span>
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div
                      className="flex gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        data-ocid={`works.edit_button.${i + 1}`}
                        onClick={() => openEdit(w)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        data-ocid={`works.delete_button.${i + 1}`}
                        onClick={() => handleDelete(w)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md w-[95vw] bg-card border-border p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle>{editWork ? "Edit Work" : "Add Work"}</DialogTitle>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="px-4 pb-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Work Name *
              </Label>
              <Input
                data-ocid="works.input"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Work Name"
                className="bg-input border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Job Title
                </Label>
                <Input
                  value={form.jobTitle}
                  onChange={(e) => set("jobTitle", e.target.value)}
                  placeholder="Job Title"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Category
                </Label>
                <Input
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="Category"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className="bg-input border-border"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Location{" "}
                {locating && <Loader2 className="h-3 w-3 animate-spin" />}
              </Label>
              <Input
                value={form.locationDescription}
                onChange={(e) => set("locationDescription", e.target.value)}
                placeholder="Auto-captured or enter manually"
                className="bg-input border-border"
              />
            </div>
            <Button
              data-ocid="works.submit_button"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-11 font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editWork ? (
                "Update Work"
              ) : (
                "Save Work"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
