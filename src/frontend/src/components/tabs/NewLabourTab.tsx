import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Camera,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Worker, WorkerInput } from "../../backend";
import { useAppContext } from "../../context/AppContext";
import { lookupBankFromIfsc, lookupBranch } from "../../data/ifscData";
import { INDIAN_BANKS } from "../../data/indianBanks";
import { useActor } from "../../hooks/useActor";
import {
  useAddWorker,
  useDeleteWorker,
  useUpdateWorker,
  useWorkers,
} from "../../hooks/useQueries";
import { dataURLtoFile, uploadPhotoFile } from "../../utils/photoUtils";

const EMPTY_FORM: WorkerInput = {
  name: "",
  husbandFatherName: "",
  caste: "",
  village: "",
  phone: "",
  aadhaarNumber: "",
  jobTitle: "",
  bankName: "",
  bankIfsc: "",
  bankBranchName: "",
  bankAccountNumber: "",
  enrollmentPhotoId: "",
};

export default function NewLabourTab() {
  const { data: workers = [], isLoading } = useWorkers();
  const addWorker = useAddWorker();
  const updateWorker = useUpdateWorker();
  const deleteWorker = useDeleteWorker();
  const { actor } = useActor();
  const { isAdmin } = useAppContext();

  const [showForm, setShowForm] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState<WorkerInput>(EMPTY_FORM);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [showBankPicker, setShowBankPicker] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function openAdd() {
    setForm(EMPTY_FORM);
    setPhotoDataUrl("");
    setEditWorker(null);
    setShowForm(true);
  }

  function openEdit(w: Worker) {
    setForm({
      name: w.name,
      husbandFatherName: w.husbandFatherName,
      caste: w.caste,
      village: w.village,
      phone: w.phone,
      aadhaarNumber: w.aadhaarNumber,
      jobTitle: w.jobTitle,
      bankName: w.bankName,
      bankIfsc: w.bankIfsc,
      bankBranchName: w.bankBranchName,
      bankAccountNumber: w.bankAccountNumber,
      enrollmentPhotoId: w.enrollmentPhotoId,
    });
    setPhotoDataUrl(w.enrollmentPhotoId || "");
    setEditWorker(w);
    setShowForm(true);
  }

  function set(key: keyof WorkerInput, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "bankIfsc") {
        const upper = value.toUpperCase();
        if (upper.length >= 4) {
          const bank = lookupBankFromIfsc(upper);
          if (bank) next.bankName = bank;
        }
        if (upper.length === 11) {
          const branch = lookupBranch(upper);
          next.bankBranchName = branch ?? "";
        }
        return { ...next, bankIfsc: value.toUpperCase() };
      }
      return next;
    });
  }

  async function handlePhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!actor) {
      toast.error("Not connected");
      return;
    }
    setSaving(true);
    try {
      let photoId = form.enrollmentPhotoId;
      if (photoDataUrl?.startsWith("data:")) {
        setUploading(true);
        const file = dataURLtoFile(photoDataUrl, "enrollment.jpg");
        photoId = await uploadPhotoFile(file, actor);
        setUploading(false);
      }
      const payload = { ...form, enrollmentPhotoId: photoId };
      if (editWorker) {
        await updateWorker.mutateAsync({
          employeeId: editWorker.employeeId,
          worker: { ...editWorker, ...payload },
        });
        toast.success("Worker updated");
      } else {
        const id = await addWorker.mutateAsync(payload);
        toast.success(`Worker saved — ${id}`);
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleDelete(w: Worker) {
    if (!confirm(`Delete ${w.name}?`)) return;
    try {
      await deleteWorker.mutateAsync(w.employeeId);
      toast.success("Worker deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  }

  const filteredBanks = INDIAN_BANKS.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase()),
  );

  const isBankAutoFilled =
    form.bankIfsc.length >= 4 &&
    lookupBankFromIfsc(form.bankIfsc) === form.bankName;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">New Labour</h2>
          <p className="text-xs text-muted-foreground">
            {workers.length} worker{workers.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button
          data-ocid="labour.primary_button"
          size="sm"
          onClick={openAdd}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Worker
        </Button>
      </div>

      {/* Workers List */}
      {isLoading ? (
        <div
          data-ocid="labour.loading_state"
          className="flex justify-center py-12"
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : workers.length === 0 ? (
        <div
          data-ocid="labour.empty_state"
          className="flex flex-col items-center justify-center py-16 text-center gap-3"
        >
          <UserPlus className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No workers registered yet.
            <br />
            Tap "Add Worker" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workers.map((w, i) => (
            <div
              key={w.employeeId}
              data-ocid={`labour.item.${i + 1}`}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                {w.enrollmentPhotoId ? (
                  <img
                    src={w.enrollmentPhotoId}
                    alt={w.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-muted"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-muted-foreground">
                      {w.name[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {w.name}
                      </p>
                      <p className="text-xs text-primary font-mono">
                        {w.employeeId}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          data-ocid={`labour.edit_button.${i + 1}`}
                          onClick={() => openEdit(w)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          data-ocid={`labour.delete_button.${i + 1}`}
                          onClick={() => handleDelete(w)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{w.jobTitle}</p>
                  <p className="text-xs text-muted-foreground">{w.phone}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {w.village}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {editWorker ? "Edit Worker" : "Add Worker"}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="px-4 pb-4 space-y-4">
            {/* Photo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Enrollment Photo
              </Label>
              {photoDataUrl ? (
                <div className="relative w-32 h-32 mx-auto">
                  <img
                    src={photoDataUrl}
                    alt="preview"
                    className="w-32 h-32 rounded-xl object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl("")}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    data-ocid="labour.upload_button"
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => cameraRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" /> Take Photo
                  </Button>
                  <Button
                    data-ocid="labour.dropzone"
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => galleryRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" /> From Gallery
                  </Button>
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handlePhoto(e.target.files[0])
                    }
                  />
                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && handlePhoto(e.target.files[0])
                    }
                  />
                </div>
              )}
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Full Name *
                </Label>
                <Input
                  data-ocid="labour.input"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Full Name"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Husband / Father Name
                </Label>
                <Input
                  value={form.husbandFatherName}
                  onChange={(e) => set("husbandFatherName", e.target.value)}
                  placeholder="Father/Husband"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Caste</Label>
                <Input
                  value={form.caste}
                  onChange={(e) => set("caste", e.target.value)}
                  placeholder="Caste"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Village</Label>
                <Input
                  value={form.village}
                  onChange={(e) => set("village", e.target.value)}
                  placeholder="Village"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="Phone"
                  type="tel"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Aadhaar Number
                </Label>
                <Input
                  value={form.aadhaarNumber}
                  onChange={(e) => set("aadhaarNumber", e.target.value)}
                  placeholder="XXXX XXXX XXXX"
                  className="bg-input border-border"
                />
              </div>
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
            </div>

            {/* Bank Details */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bank Details
              </p>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Bank Name
                </Label>
                <button
                  type="button"
                  data-ocid="labour.select"
                  onClick={() => {
                    setBankSearch("");
                    setShowBankPicker(true);
                  }}
                  className="w-full h-9 px-3 text-left text-sm rounded-md bg-input border border-border text-foreground flex items-center justify-between"
                >
                  <span
                    className={form.bankName ? "" : "text-muted-foreground"}
                  >
                    {form.bankName || "Select Bank"}
                    {isBankAutoFilled && (
                      <span className="ml-1.5 text-xs text-primary/70 font-normal">
                        (auto)
                      </span>
                    )}
                  </span>
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  IFSC Code
                </Label>
                <Input
                  value={form.bankIfsc}
                  onChange={(e) => set("bankIfsc", e.target.value)}
                  placeholder="SBIN0001234"
                  maxLength={11}
                  className="bg-input border-border font-mono uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  Branch Name
                  {form.bankIfsc.length === 11 && form.bankBranchName && (
                    <span className="text-xs text-primary/70 font-normal">
                      (auto)
                    </span>
                  )}
                </Label>
                <Input
                  value={form.bankBranchName}
                  onChange={(e) => set("bankBranchName", e.target.value)}
                  placeholder="Auto-filled from IFSC"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Account Number
                </Label>
                <Input
                  value={form.bankAccountNumber}
                  onChange={(e) => set("bankAccountNumber", e.target.value)}
                  placeholder="Account Number"
                  className="bg-input border-border"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              data-ocid="labour.submit_button"
              onClick={handleSave}
              disabled={saving}
              className="w-full h-11 font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading photo..." : "Saving..."}
                </>
              ) : editWorker ? (
                "Update Worker"
              ) : (
                "Save Worker"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Picker Dialog */}
      <Dialog open={showBankPicker} onOpenChange={setShowBankPicker}>
        <DialogContent className="max-w-sm w-[90vw] bg-card border-border p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Select Bank</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-ocid="labour.search_input"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Search banks..."
                className="pl-9 bg-input border-border"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="h-72">
            <div className="px-2 pb-4">
              {filteredBanks.map((bank) => (
                <button
                  type="button"
                  key={bank.name}
                  onClick={() => {
                    set("bankName", bank.name);
                    setShowBankPicker(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{bank.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">
                    {bank.code}
                  </span>
                </button>
              ))}
              {filteredBanks.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">
                  No banks found
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
