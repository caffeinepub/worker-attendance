import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  LogOut,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useCamera } from "../camera/useCamera";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddWork,
  useAddWorker,
  useGetAllWorkers,
  useGetAllWorks,
  useGetAttendanceByWork,
  useGetTodayCheckIns,
  useIsCallerAdmin,
  useRecordCheckIn,
  useRecordCheckOut,
  useRemoveWork,
  useRemoveWorker,
} from "../hooks/useQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCoord(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

async function getGPS(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────
interface CameraModalProps {
  open: boolean;
  title: string;
  onCapture: (file: File) => void;
  onClose: () => void;
}

function CameraModal({ open, title, onCapture, onClose }: CameraModalProps) {
  const cam = useCamera({ facingMode: "environment" });

  useEffect(() => {
    if (open) {
      cam.startCamera();
    } else {
      cam.stopCamera();
    }
  }, [open, cam.startCamera, cam.stopCamera]);

  const handleCapture = async () => {
    const file = await cam.capturePhoto();
    if (file) {
      onCapture(file);
      cam.stopCamera();
    } else {
      toast.error("Failed to capture photo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-4" data-ocid="camera.dialog">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="camera-preview-wrapper">
            <video
              ref={cam.videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={cam.canvasRef} className="hidden" />
          </div>
          {cam.error && (
            <p className="text-xs text-destructive text-center">
              {cam.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onClose}
              data-ocid="camera.cancel_button"
            >
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleCapture}
              disabled={!cam.isActive}
              data-ocid="camera.primary_button"
            >
              <Camera className="w-4 h-4 mr-1" /> Capture
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 1: New Labour ────────────────────────────────────────────────────────
function NewLabourTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: workers = [], isLoading } = useGetAllWorkers();
  const addWorker = useAddWorker();
  const removeWorker = useRemoveWorker();
  const { actor } = useActor();

  const [form, setForm] = useState({
    name: "",
    employeeId: "",
    department: "",
    jobTitle: "",
    phone: "",
  });
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoCapture = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setCameraOpen(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.employeeId || !form.department || !form.jobTitle) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!photoFile) {
      toast.error("Please capture an enrollment photo");
      return;
    }
    if (!actor) return;

    setUploading(true);
    try {
      const bytes = new Uint8Array(await photoFile.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      const uploaded = await actor.uploadPhoto(blob);
      const photoId = uploaded.getDirectURL();

      await addWorker.mutateAsync({
        name: form.name,
        employeeId: form.employeeId,
        department: form.department,
        jobTitle: form.jobTitle,
        phone: form.phone,
        enrollmentPhotoId: photoId,
      });

      setForm({
        name: "",
        employeeId: "",
        department: "",
        jobTitle: "",
        phone: "",
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success("Worker registered successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to register worker");
    } finally {
      setUploading(false);
    }
  };

  const field = (
    key: keyof typeof form,
    label: string,
    placeholder: string,
    required = true,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-secondary border-border text-foreground"
        data-ocid={`labour.${key}.input`}
      />
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Register New Labour
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground text-center">
              Admin access required to register workers.
            </div>
          )}
          {isAdmin && (
            <>
              {field("name", "Full Name", "e.g. Ramesh Kumar")}
              {field("employeeId", "Employee ID", "e.g. EMP001")}
              {field("department", "Department", "e.g. Civil")}
              {field("jobTitle", "Job Title", "e.g. Mason")}
              {field("phone", "Phone Number", "e.g. +91 98765 43210", false)}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Enrollment Photo
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full aspect-video object-cover rounded-lg border border-border"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 h-7 w-7 p-0"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      data-ocid="labour.photo.delete_button"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed border-border flex flex-col gap-1 text-muted-foreground"
                    onClick={() => setCameraOpen(true)}
                    data-ocid="labour.photo.upload_button"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs">Tap to capture photo</span>
                  </Button>
                )}
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground font-semibold"
                onClick={handleSubmit}
                disabled={addWorker.isPending || uploading}
                data-ocid="labour.submit_button"
              >
                {addWorker.isPending || uploading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />{" "}
                    Registering...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Register Worker
                  </span>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="w-4 h-4" /> Registered Workers ({workers.length})
        </h3>
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-muted animate-pulse"
                data-ocid="labour.loading_state"
              />
            ))}
          </div>
        )}
        {!isLoading && workers.length === 0 && (
          <div
            className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg"
            data-ocid="labour.empty_state"
          >
            No workers registered yet.
          </div>
        )}
        <div className="space-y-2">
          {workers.map((w, i) => (
            <motion.div
              key={w.employeeId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              data-ocid={`labour.item.${i + 1}`}
            >
              <Card className="border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  {w.enrollmentPhotoId ? (
                    <img
                      src={w.enrollmentPhotoId}
                      alt={w.name}
                      className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.employeeId} · {w.department}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.jobTitle}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
                      onClick={() => removeWorker.mutate(w.employeeId)}
                      data-ocid={`labour.delete_button.${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <CameraModal
        open={cameraOpen}
        title="Capture Enrollment Photo"
        onCapture={handlePhotoCapture}
        onClose={() => setCameraOpen(false)}
      />
    </div>
  );
}

// ─── Tab 2: Works ─────────────────────────────────────────────────────────────
function WorksTab({
  isAdmin,
  selectedWorkId,
  onSelectWork,
}: {
  isAdmin: boolean;
  selectedWorkId: string | null;
  onSelectWork: (id: string) => void;
}) {
  const { data: works = [], isLoading } = useGetAllWorks();
  const addWork = useAddWork();
  const removeWork = useRemoveWork();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    locationDescription: "",
    date: todayString(),
  });

  const handleAddWork = async () => {
    if (!form.name || !form.locationDescription || !form.date) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await addWork.mutateAsync({
        workId: `work-${Date.now()}`,
        name: form.name,
        locationDescription: form.locationDescription,
        date: form.date,
      });
      setForm({ name: "", locationDescription: "", date: todayString() });
      setShowForm(false);
      toast.success("Work added!");
    } catch {
      toast.error("Failed to add work");
    }
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Briefcase className="w-4 h-4" /> Works ({works.length})
        </h3>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            data-ocid="works.open_modal_button"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Work
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">New Work Entry</h4>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Work Name *
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Road Construction Phase 1"
                    className="bg-secondary"
                    data-ocid="works.name.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Location *
                  </Label>
                  <Input
                    value={form.locationDescription}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        locationDescription: e.target.value,
                      }))
                    }
                    placeholder="e.g. NH-48, Near Toll Plaza"
                    className="bg-secondary"
                    data-ocid="works.location.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Date *
                  </Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, date: e.target.value }))
                    }
                    className="bg-secondary"
                    data-ocid="works.date.input"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                    data-ocid="works.cancel_button"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleAddWork}
                    disabled={addWork.isPending}
                    data-ocid="works.submit_button"
                  >
                    {addWork.isPending ? "Saving..." : "Save Work"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-muted animate-pulse"
              data-ocid="works.loading_state"
            />
          ))}
        </div>
      )}
      {!isLoading && works.length === 0 && (
        <div
          className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg"
          data-ocid="works.empty_state"
        >
          No works added yet.
        </div>
      )}
      <div className="space-y-2">
        {works.map((w, i) => {
          const isSelected = selectedWorkId === w.workId;
          return (
            <motion.div
              key={w.workId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              data-ocid={`works.item.${i + 1}`}
            >
              <Card
                className={`border cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => onSelectWork(w.workId)}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {w.locationDescription}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {w.date}
                    </p>
                  </div>
                  {isSelected && (
                    <Badge className="shrink-0 text-xs">Selected</Badge>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWork.mutate(w.workId);
                      }}
                      data-ocid={`works.delete_button.${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab 3: Attendance (Morning Check-In) ─────────────────────────────────────
function AttendanceTab({
  selectedWorkId,
  onGoToWorks,
}: {
  selectedWorkId: string | null;
  onGoToWorks: () => void;
}) {
  const today = todayString();
  const { data: workers = [] } = useGetAllWorkers();
  const { data: works = [] } = useGetAllWorks();
  const { data: workAttendance = [] } = useGetAttendanceByWork(
    selectedWorkId || "",
  );
  const recordCheckIn = useRecordCheckIn();
  const { actor } = useActor();

  const selectedWork = works.find((w) => w.workId === selectedWorkId);

  // Workers already checked in for this work today
  const checkedInWorkerIds = new Set(
    workAttendance
      .filter((r) => {
        const recDate = new Date(Number(r.checkInTime / 1_000_000n))
          .toISOString()
          .split("T")[0];
        return recDate === today;
      })
      .map((r) => r.workerId),
  );

  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(
    new Set(),
  );
  const [flow, setFlow] = useState<"idle" | "capturing" | "done">("idle");
  const [flowQueue, setFlowQueue] = useState<string[]>([]);
  const [flowIndex, setFlowIndex] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<Record<string, "success" | "error">>(
    {},
  );

  const toggleWorker = (id: string) => {
    setSelectedWorkerIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const startAttendance = () => {
    if (!selectedWorkId) {
      toast.error("Select a work first");
      return;
    }
    const queue = Array.from(selectedWorkerIds).filter(
      (id) => !checkedInWorkerIds.has(id),
    );
    if (queue.length === 0) {
      toast.error("No workers selected or all already checked in");
      return;
    }
    setFlowQueue(queue);
    setFlowIndex(0);
    setResults({});
    setFlow("capturing");
    setCameraOpen(true);
  };

  const handlePhotoForCurrentWorker = async (file: File) => {
    if (!actor || !selectedWorkId) return;
    const workerId = flowQueue[flowIndex];
    setProcessing(true);
    setCameraOpen(false);
    try {
      const [gps, bytes] = await Promise.all([
        getGPS().catch(() => ({ lat: 0, lng: 0 })),
        file.arrayBuffer().then((ab) => new Uint8Array(ab)),
      ]);
      const blob = ExternalBlob.fromBytes(bytes);
      const uploaded = await actor.uploadPhoto(blob);
      const photoId = uploaded.getDirectURL();
      const recordId = `${selectedWorkId}-${workerId}-${Date.now()}`;
      const now = BigInt(Date.now()) * 1_000_000n;
      await recordCheckIn.mutateAsync({
        recordId,
        workerId,
        workId: selectedWorkId,
        checkInPhotoId: photoId,
        checkInTime: now,
        checkInLat: gps.lat,
        checkInLng: gps.lng,
      });
      setResults((p) => ({ ...p, [workerId]: "success" }));
      toast.success(
        `Check-in recorded for ${workers.find((w) => w.employeeId === workerId)?.name || workerId}`,
      );
    } catch (e: any) {
      setResults((p) => ({ ...p, [workerId]: "error" }));
      toast.error(`Failed: ${e?.message || "Unknown error"}`);
    } finally {
      setProcessing(false);
      const next = flowIndex + 1;
      if (next < flowQueue.length) {
        setFlowIndex(next);
        setCameraOpen(true);
      } else {
        setFlow("done");
      }
    }
  };

  const currentFlowWorker =
    flow === "capturing"
      ? workers.find((w) => w.employeeId === flowQueue[flowIndex])
      : null;

  const availableWorkers = workers.filter(
    (w) => !checkedInWorkerIds.has(w.employeeId),
  );
  const checkedInWorkers = workers.filter((w) =>
    checkedInWorkerIds.has(w.employeeId),
  );

  return (
    <div className="space-y-4 page-enter">
      {/* Selected Work Banner */}
      {selectedWork ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary">Selected Work</p>
              <p className="text-sm font-semibold truncate">
                {selectedWork.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedWork.locationDescription} · {selectedWork.date}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No work selected</p>
            <Button
              size="sm"
              variant="outline"
              onClick={onGoToWorks}
              data-ocid="attendance.works.link"
            >
              <ChevronRight className="w-3.5 h-3.5 mr-1" /> Go to Works Tab
            </Button>
          </CardContent>
        </Card>
      )}

      {flow === "done" && (
        <Card className="border-green-800 bg-green-950/30">
          <CardContent className="p-3 text-center space-y-1">
            <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto" />
            <p className="text-sm font-semibold text-green-400">
              Attendance Recorded!
            </p>
            <p className="text-xs text-muted-foreground">
              {Object.values(results).filter((r) => r === "success").length}{" "}
              workers checked in.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFlow("idle");
                setSelectedWorkerIds(new Set());
              }}
              data-ocid="attendance.reset.button"
            >
              Start New
            </Button>
          </CardContent>
        </Card>
      )}

      {processing && (
        <div
          className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg"
          data-ocid="attendance.loading_state"
        >
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">Processing check-in...</p>
        </div>
      )}

      {flow === "idle" && selectedWork && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Workers ({availableWorkers.length} available)
            </h3>
            <Button
              size="sm"
              onClick={startAttendance}
              disabled={selectedWorkerIds.size === 0}
              data-ocid="attendance.primary_button"
            >
              <Camera className="w-3.5 h-3.5 mr-1" /> Take Attendance (
              {selectedWorkerIds.size})
            </Button>
          </div>

          {availableWorkers.length === 0 && (
            <div
              className="p-6 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg"
              data-ocid="attendance.empty_state"
            >
              All workers have already checked in today.
            </div>
          )}

          <div className="space-y-2">
            {availableWorkers.map((w, i) => (
              <Card
                key={w.employeeId}
                className="border-border"
                data-ocid={`attendance.item.${i + 1}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <Checkbox
                    id={`ck-${w.employeeId}`}
                    checked={selectedWorkerIds.has(w.employeeId)}
                    onCheckedChange={() => toggleWorker(w.employeeId)}
                    data-ocid={`attendance.checkbox.${i + 1}`}
                  />
                  <label
                    htmlFor={`ck-${w.employeeId}`}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    {w.enrollmentPhotoId ? (
                      <img
                        src={w.enrollmentPhotoId}
                        alt={w.name}
                        className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.department} · {w.jobTitle}
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            ))}
          </div>

          {checkedInWorkers.length > 0 && (
            <>
              <Separator />
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Checked
                In Today ({checkedInWorkers.length})
              </h3>
              <div className="space-y-2">
                {checkedInWorkers.map((w, i) => (
                  <Card
                    key={w.employeeId}
                    className="border-border opacity-70"
                    data-ocid={`attendance.checkedin.item.${i + 1}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {w.enrollmentPhotoId ? (
                        <img
                          src={w.enrollmentPhotoId}
                          alt={w.name}
                          className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{w.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.department}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-green-400 border-green-800 text-xs shrink-0"
                      >
                        ✓ In
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {cameraOpen && currentFlowWorker && (
        <CameraModal
          open={cameraOpen}
          title={`Check-In Photo: ${currentFlowWorker.name} (${flowIndex + 1}/${flowQueue.length})`}
          onCapture={handlePhotoForCurrentWorker}
          onClose={() => {
            setCameraOpen(false);
            setFlow("done");
          }}
        />
      )}
    </div>
  );
}

// ─── Tab 4: Check-Out (Evening) ────────────────────────────────────────────────
function CheckOutTab() {
  const today = todayString();
  const { data: works = [] } = useGetAllWorks();
  const { data: workers = [] } = useGetAllWorkers();
  const [selectedWorkId, setSelectedWorkId] = useState<string>("");
  const { data: workAttendance = [] } = useGetAttendanceByWork(selectedWorkId);
  const recordCheckOut = useRecordCheckOut();
  const { actor } = useActor();

  // Workers checked in today but not checked out
  const pendingRecords = workAttendance.filter((r) => {
    const recDate = new Date(Number(r.checkInTime / 1_000_000n))
      .toISOString()
      .split("T")[0];
    return recDate === today && !r.checkOutTime;
  });

  const [checkoutTarget, setCheckoutTarget] = useState<
    (typeof workAttendance)[0] | null
  >(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{
    record: (typeof workAttendance)[0];
    worker: {
      name: string;
      employeeId: string;
      department: string;
      jobTitle: string;
      phone: string;
    };
    photoUrl: string;
    checkOutTime: bigint;
    checkOutLat: number;
    checkOutLng: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  const startCheckout = (record: (typeof workAttendance)[0]) => {
    setCheckoutTarget(record);
    setCheckoutResult(null);
    setCameraOpen(true);
  };

  const handleCheckoutPhoto = async (file: File) => {
    if (!actor || !checkoutTarget) return;
    setCameraOpen(false);
    setProcessing(true);
    try {
      const [gps, bytes] = await Promise.all([
        getGPS().catch(() => ({ lat: 0, lng: 0 })),
        file.arrayBuffer().then((ab) => new Uint8Array(ab)),
      ]);
      const blob = ExternalBlob.fromBytes(bytes);
      const uploaded = await actor.uploadPhoto(blob);
      const photoId = uploaded.getDirectURL();
      const now = BigInt(Date.now()) * 1_000_000n;

      const worker = workers.find(
        (w) => w.employeeId === checkoutTarget.workerId,
      );
      const previewUrl = URL.createObjectURL(file);

      setCheckoutResult({
        record: checkoutTarget,
        worker: worker || {
          name: checkoutTarget.workerId,
          employeeId: checkoutTarget.workerId,
          department: "",
          jobTitle: "",
          phone: "",
        },
        photoUrl: previewUrl,
        checkOutTime: now,
        checkOutLat: gps.lat,
        checkOutLng: gps.lng,
      });

      // Store photoId for submission
      setCheckoutTarget((prev) =>
        prev
          ? {
              ...prev,
              checkOutPhotoId: photoId,
              checkOutLat: gps.lat,
              checkOutLng: gps.lng,
              checkOutTime: now,
            }
          : null,
      );
    } catch (e: any) {
      toast.error(`Failed: ${e?.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const submitCheckOut = async () => {
    if (!checkoutTarget || !checkoutResult) return;
    try {
      await recordCheckOut.mutateAsync({
        recordId: checkoutTarget.recordId,
        workId: selectedWorkId,
        checkOutPhotoId: checkoutTarget.checkOutPhotoId || "",
        checkOutTime: checkoutResult.checkOutTime,
        checkOutLat: checkoutResult.checkOutLat,
        checkOutLng: checkoutResult.checkOutLng,
      });
      toast.success(`Check-out recorded for ${checkoutResult.worker.name}`);
      setCheckoutResult(null);
      setCheckoutTarget(null);
    } catch (e: any) {
      toast.error(`Failed: ${e?.message}`);
    }
  };

  const detailsText = checkoutResult
    ? `Worker: ${checkoutResult.worker.name}
Employee ID: ${checkoutResult.worker.employeeId}
Department: ${checkoutResult.worker.department}
Job Title: ${checkoutResult.worker.jobTitle}
Phone: ${checkoutResult.worker.phone || "N/A"}

Check-In Time: ${formatTime(checkoutResult.record.checkInTime)}
Check-In Location: ${formatCoord(checkoutResult.record.checkInLat, checkoutResult.record.checkInLng)}

Check-Out Time: ${formatTime(checkoutResult.checkOutTime)}
Check-Out Location: ${formatCoord(checkoutResult.checkOutLat, checkoutResult.checkOutLng)}`
    : "";

  return (
    <div className="space-y-4 page-enter">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5" /> Select Work
        </Label>
        <Select value={selectedWorkId} onValueChange={setSelectedWorkId}>
          <SelectTrigger
            className="bg-secondary border-border"
            data-ocid="checkout.select"
          >
            <SelectValue placeholder="Select a work..." />
          </SelectTrigger>
          <SelectContent>
            {works.map((w) => (
              <SelectItem key={w.workId} value={w.workId}>
                {w.name} — {w.date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedWorkId && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Pending Check-Out ({pendingRecords.length})
            </h3>
          </div>

          {pendingRecords.length === 0 && (
            <div
              className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-lg"
              data-ocid="checkout.empty_state"
            >
              No workers pending check-out.
            </div>
          )}

          {processing && (
            <div
              className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg"
              data-ocid="checkout.loading_state"
            >
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm">Processing...</p>
            </div>
          )}

          <div className="space-y-2">
            {pendingRecords.map((record, i) => {
              const worker = workers.find(
                (w) => w.employeeId === record.workerId,
              );
              return (
                <Card
                  key={record.recordId}
                  className="border-border"
                  data-ocid={`checkout.item.${i + 1}`}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {worker?.enrollmentPhotoId ? (
                      <img
                        src={worker.enrollmentPhotoId}
                        alt={worker.name}
                        className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {worker?.name || record.workerId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {worker?.department} · {worker?.jobTitle}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> In:{" "}
                        {formatTime(record.checkInTime)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => startCheckout(record)}
                      data-ocid={`checkout.primary_button.${i + 1}`}
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" /> Check Out
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Check-out result panel */}
      <AnimatePresence>
        {checkoutResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <Separator />
            <h3 className="text-sm font-bold text-foreground">
              Check-Out Details
            </h3>

            {/* Photo + Info side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold uppercase">
                  Evening Photo
                </p>
                <img
                  src={checkoutResult.photoUrl}
                  alt="Checkout"
                  className="w-full aspect-square object-cover rounded-lg border border-border"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold uppercase">
                  Worker
                </p>
                {checkoutResult.worker.employeeId &&
                workers.find((w) => w.enrollmentPhotoId) ? (
                  <img
                    src={
                      workers.find(
                        (w) =>
                          w.employeeId === checkoutResult.worker.employeeId,
                      )?.enrollmentPhotoId || ""
                    }
                    alt="Enrollment"
                    className="w-full aspect-square object-cover rounded-lg border border-border"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Details text box */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Full Details &amp;
                Coordinates
              </Label>
              <Textarea
                value={detailsText}
                readOnly
                className="font-mono text-xs bg-secondary border-border resize-none h-52 text-foreground"
                data-ocid="checkout.textarea"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCheckoutResult(null);
                  setCheckoutTarget(null);
                }}
                data-ocid="checkout.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={submitCheckOut}
                disabled={recordCheckOut.isPending}
                data-ocid="checkout.confirm_button"
              >
                {recordCheckOut.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />{" "}
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Confirm Check-Out
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {cameraOpen && (
        <CameraModal
          open={cameraOpen}
          title={`Evening Check-Out Photo: ${workers.find((w) => w.employeeId === checkoutTarget?.workerId)?.name || ""}`}
          onCapture={handleCheckoutPhoto}
          onClose={() => {
            setCameraOpen(false);
            setCheckoutTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { clear, identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: isAdmin = false, isLoading: adminLoading } = useIsCallerAdmin();
  const [activeTab, setActiveTab] = useState("labour");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);

  useEffect(() => {
    if (!identity) navigate({ to: "/" });
  }, [identity, navigate]);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">AttendTrack</h1>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? "Admin" : "Worker"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              clear();
              navigate({ to: "/" });
            }}
            data-ocid="nav.logout.button"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="w-full grid grid-cols-4 mb-4 sticky top-16 z-10 bg-background"
            data-ocid="dashboard.tab"
          >
            <TabsTrigger
              value="labour"
              className="flex flex-col items-center gap-0.5 py-2 h-auto text-xs"
              data-ocid="dashboard.labour.tab"
            >
              <UserPlus className="w-4 h-4" />
              <span>Labour</span>
            </TabsTrigger>
            <TabsTrigger
              value="works"
              className="flex flex-col items-center gap-0.5 py-2 h-auto text-xs"
              data-ocid="dashboard.works.tab"
            >
              <Briefcase className="w-4 h-4" />
              <span>Works</span>
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="flex flex-col items-center gap-0.5 py-2 h-auto text-xs"
              data-ocid="dashboard.attendance.tab"
            >
              <Users className="w-4 h-4" />
              <span>Attendance</span>
            </TabsTrigger>
            <TabsTrigger
              value="checkout"
              className="flex flex-col items-center gap-0.5 py-2 h-auto text-xs"
              data-ocid="dashboard.checkout.tab"
            >
              <LogOut className="w-4 h-4" />
              <span>Check-Out</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="labour">
            <NewLabourTab isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="works">
            <WorksTab
              isAdmin={isAdmin}
              selectedWorkId={selectedWorkId}
              onSelectWork={(id) => {
                setSelectedWorkId(id);
                toast.success("Work selected! Go to Attendance tab.");
              }}
            />
          </TabsContent>
          <TabsContent value="attendance">
            <AttendanceTab
              selectedWorkId={selectedWorkId}
              onGoToWorks={() => setActiveTab("works")}
            />
          </TabsContent>
          <TabsContent value="checkout">
            <CheckOutTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="underline hover:text-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
