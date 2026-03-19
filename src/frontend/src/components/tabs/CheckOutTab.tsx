import { Button } from "@/components/ui/button";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ImageIcon,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { AttendanceRecord, Worker } from "../../backend";
import { useActor } from "../../hooks/useActor";
import {
  useRecordCheckOut,
  useTodayCheckIns,
  useWorkers,
} from "../../hooks/useQueries";
import {
  dataURLtoFile,
  getCurrentPosition,
  uploadPhotoFile,
} from "../../utils/photoUtils";

type Step = "select" | "capture" | "summary";

function formatTime(ns: bigint): string {
  const ms = Number(ns / 1000000n);
  return new Date(ms).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CheckOutTab() {
  const { data: workers = [] } = useWorkers();
  const { data: todayCheckIns = [], refetch } = useTodayCheckIns();
  const recordCheckOut = useRecordCheckOut();
  const { actor } = useActor();

  const [step, setStep] = useState<Step>("select");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [checkOutPhotoUrl, setCheckOutPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const workerMap = Object.fromEntries(workers.map((w) => [w.employeeId, w]));
  // Only workers who checked in but not yet checked out
  const pendingCheckOuts = todayCheckIns.filter((r) => !r.checkOutTime);

  function handleSelect(record: AttendanceRecord) {
    setSelectedRecord(record);
    setSelectedWorker(workerMap[record.workerId] ?? null);
    setCheckOutPhotoUrl("");
    setStep("capture");
  }

  async function handlePhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCheckOutPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleConfirmCheckOut() {
    if (!selectedRecord || !checkOutPhotoUrl || !actor) return;
    setSaving(true);
    try {
      const file = dataURLtoFile(checkOutPhotoUrl, "checkout.jpg");
      const photoId = await uploadPhotoFile(file, actor);
      let lat = 0;
      let lng = 0;
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        /* GPS optional */
      }
      const checkOutTime = BigInt(Date.now()) * 1000000n;
      await recordCheckOut.mutateAsync({
        recordId: selectedRecord.recordId,
        checkOutPhotoId: photoId,
        checkOutTime,
        lat,
        lng,
      });
      toast.success(`${selectedWorker?.name ?? "Worker"} checked out!`);
      setStep("summary");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Check-out failed");
    } finally {
      setSaving(false);
    }
  }

  function resetFlow() {
    setStep("select");
    setSelectedRecord(null);
    setSelectedWorker(null);
    setCheckOutPhotoUrl("");
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        {step !== "select" && (
          <button
            type="button"
            onClick={resetFlow}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h2 className="text-xl font-display font-bold">Check-Out</h2>
          <p className="text-xs text-muted-foreground">Evening check-out</p>
        </div>
      </div>

      {/* Select Worker */}
      {step === "select" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Workers pending check-out ({pendingCheckOuts.length}):
          </p>
          {pendingCheckOuts.length === 0 ? (
            <div
              data-ocid="checkout.empty_state"
              className="flex flex-col items-center justify-center py-16 gap-3 text-center"
            >
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                All workers have checked out today,
                <br />
                or no one has checked in yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingCheckOuts.map((record, i) => {
                const worker = workerMap[record.workerId];
                if (!worker) return null;
                return (
                  <button
                    type="button"
                    key={record.recordId}
                    data-ocid={`checkout.item.${i + 1}`}
                    onClick={() => handleSelect(record)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/50 text-left transition-all"
                  >
                    {worker.enrollmentPhotoId ? (
                      <img
                        src={worker.enrollmentPhotoId}
                        alt={worker.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-muted-foreground">
                          {worker.name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {worker.employeeId}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>In: {formatTime(record.checkInTime)}</span>
                        {record.checkInLat !== 0 && (
                          <>
                            <MapPin className="h-3 w-3 ml-1" />
                            <span className="truncate">
                              {record.checkInLat.toFixed(4)},{" "}
                              {record.checkInLng.toFixed(4)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Capture Photo */}
      {step === "capture" && selectedWorker && selectedRecord && (
        <div className="space-y-4">
          {/* Worker Info Card */}
          <div className="rounded-xl border border-border bg-card p-3 flex gap-3">
            {selectedWorker.enrollmentPhotoId ? (
              <img
                src={selectedWorker.enrollmentPhotoId}
                alt={selectedWorker.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-0.5">
              <p className="font-semibold">{selectedWorker.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedWorker.employeeId} · {selectedWorker.jobTitle}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Check-in: {formatTime(selectedRecord.checkInTime)}</span>
              </div>
              {selectedRecord.checkInLat !== 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {selectedRecord.checkInLat.toFixed(5)},{" "}
                    {selectedRecord.checkInLng.toFixed(5)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {checkOutPhotoUrl ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Check-out Photo
              </p>
              <img
                src={checkOutPhotoUrl}
                alt="checkout"
                className="w-full max-h-56 rounded-xl object-cover border border-border"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCheckOutPhotoUrl("")}
                  className="h-11"
                >
                  Retake
                </Button>
                <Button
                  data-ocid="checkout.confirm_button"
                  onClick={handleConfirmCheckOut}
                  disabled={saving}
                  className="h-11 font-semibold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Confirm Check-Out"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground">
                Capture check-out photo:
              </p>
              <div className="flex gap-2">
                <Button
                  data-ocid="checkout.upload_button"
                  type="button"
                  variant="outline"
                  className="flex-1 gap-1.5 h-11"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> Take Photo
                </Button>
                <Button
                  data-ocid="checkout.dropzone"
                  type="button"
                  variant="outline"
                  className="flex-1 gap-1.5 h-11"
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
            </>
          )}
        </div>
      )}

      {/* Summary */}
      {step === "summary" && selectedWorker && selectedRecord && (
        <div data-ocid="checkout.success_state" className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-lg font-display font-bold">
              Check-Out Complete!
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedWorker.name}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Employee ID</p>
                <p className="font-semibold font-mono text-xs">
                  {selectedWorker.employeeId}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Title</p>
                <p className="font-semibold text-xs">
                  {selectedWorker.jobTitle}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Check-in Time</p>
                <p className="font-semibold text-xs">
                  {formatTime(selectedRecord.checkInTime)}
                </p>
              </div>
              {selectedRecord.checkOutTime && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Check-out Time
                  </p>
                  <p className="font-semibold text-xs">
                    {formatTime(selectedRecord.checkOutTime)}
                  </p>
                </div>
              )}
              {selectedRecord.checkInLat !== 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Check-in Location
                  </p>
                  <p className="font-mono text-xs">
                    {selectedRecord.checkInLat.toFixed(5)},{" "}
                    {selectedRecord.checkInLng.toFixed(5)}
                  </p>
                </div>
              )}
            </div>
          </div>
          <Button
            data-ocid="checkout.primary_button"
            onClick={resetFlow}
            className="w-full h-11 font-semibold"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
