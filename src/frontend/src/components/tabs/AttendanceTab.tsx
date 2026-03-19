import { Button } from "@/components/ui/button";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ImageIcon,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Work, Worker } from "../../backend";
import { useAppContext } from "../../context/AppContext";
import { useActor } from "../../hooks/useActor";
import {
  useRecordCheckIn,
  useTodayCheckIns,
  useWorkers,
  useWorks,
} from "../../hooks/useQueries";
import {
  dataURLtoFile,
  getCurrentPosition,
  uploadPhotoFile,
} from "../../utils/photoUtils";

type Step = "select-worker" | "select-work" | "capture-photo" | "verify";

export default function AttendanceTab() {
  const { data: workers = [] } = useWorkers();
  const { data: works = [] } = useWorks();
  const { data: todayCheckIns = [] } = useTodayCheckIns();
  const recordCheckIn = useRecordCheckIn();
  const { actor } = useActor();
  const { selectedWork } = useAppContext();

  const [step, setStep] = useState<Step>("select-worker");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workForAttendance, setWorkForAttendance] = useState<Work | null>(
    selectedWork,
  );
  const [attendancePhotoUrl, setAttendancePhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Workers who already checked in today
  const checkedInIds = new Set(todayCheckIns.map((r) => r.workerId));

  function handleSelectWorker(w: Worker) {
    setSelectedWorker(w);
    if (selectedWork) {
      setWorkForAttendance(selectedWork);
      setStep("capture-photo");
    } else {
      setStep("select-work");
    }
  }

  function handleSelectWork(w: Work) {
    setWorkForAttendance(w);
    setStep("capture-photo");
  }

  async function handlePhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setAttendancePhotoUrl(reader.result as string);
      setStep("verify");
    };
    reader.readAsDataURL(file);
  }

  async function handleConfirmCheckIn() {
    if (!selectedWorker || !workForAttendance || !attendancePhotoUrl || !actor)
      return;
    setSaving(true);
    try {
      const file = dataURLtoFile(attendancePhotoUrl, "checkin.jpg");
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
      const recordId = `${selectedWorker.employeeId}_${Date.now()}`;
      const checkInTime = BigInt(Date.now()) * 1000000n;
      await recordCheckIn.mutateAsync({
        recordId,
        workerId: selectedWorker.employeeId,
        workId: workForAttendance.workId,
        checkInPhotoId: photoId,
        checkInTime,
        lat,
        lng,
      });
      toast.success(`${selectedWorker.name} checked in!`);
      // Reset
      setStep("select-worker");
      setSelectedWorker(null);
      setAttendancePhotoUrl("");
      setWorkForAttendance(selectedWork);
    } catch (e: any) {
      toast.error(e?.message ?? "Check-in failed");
    } finally {
      setSaving(false);
    }
  }

  function resetFlow() {
    setStep("select-worker");
    setSelectedWorker(null);
    setAttendancePhotoUrl("");
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        {step !== "select-worker" && (
          <button
            type="button"
            onClick={resetFlow}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h2 className="text-xl font-display font-bold">Attendance</h2>
          <p className="text-xs text-muted-foreground">Morning check-in</p>
        </div>
      </div>

      {/* Active Work Banner */}
      {selectedWork && step === "select-worker" && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-sm text-primary font-medium flex-1 truncate">
            Active Work: {selectedWork.name}
          </p>
        </div>
      )}

      {/* Step: Select Worker */}
      {step === "select-worker" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Select a worker to check in:
          </p>
          {workers.length === 0 ? (
            <div
              data-ocid="attendance.empty_state"
              className="text-center py-12"
            >
              <User className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No workers registered
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {workers.map((w, i) => {
                const alreadyIn = checkedInIds.has(w.employeeId);
                return (
                  <button
                    type="button"
                    key={w.employeeId}
                    data-ocid={`attendance.item.${i + 1}`}
                    onClick={() => !alreadyIn && handleSelectWorker(w)}
                    disabled={alreadyIn}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      alreadyIn
                        ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                        : "border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    }`}
                  >
                    {w.enrollmentPhotoId ? (
                      <img
                        src={w.enrollmentPhotoId}
                        alt={w.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-muted-foreground">
                          {w.name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.employeeId} · {w.jobTitle}
                      </p>
                    </div>
                    {alreadyIn && (
                      <span className="text-xs text-primary font-semibold">
                        Checked In
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step: Select Work */}
      {step === "select-work" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Select work for {selectedWorker?.name}:
          </p>
          {works.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No works available. Add works first.
            </p>
          ) : (
            <div className="space-y-2">
              {works.map((w, i) => (
                <button
                  type="button"
                  key={w.workId}
                  data-ocid={`attendance.work.item.${i + 1}`}
                  onClick={() => handleSelectWork(w)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/50 text-left transition-all"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.jobTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">{w.date}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Capture Photo */}
      {step === "capture-photo" && selectedWorker && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Worker</p>
            <p className="font-semibold">{selectedWorker.name}</p>
            <p className="text-xs text-muted-foreground">
              {workForAttendance?.name}
            </p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Capture check-in photo:
          </p>
          <div className="flex gap-2">
            <Button
              data-ocid="attendance.upload_button"
              type="button"
              variant="outline"
              className="flex-1 gap-1.5 h-11"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="h-4 w-4" /> Take Photo
            </Button>
            <Button
              data-ocid="attendance.dropzone"
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
        </div>
      )}

      {/* Step: Verify Side-by-Side */}
      {step === "verify" && selectedWorker && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-foreground">
            Photo Verification
          </p>
          <p className="text-xs text-muted-foreground">
            Compare master entry photo (left) with check-in photo (right).
            Confirm only if they match.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-center text-muted-foreground font-semibold uppercase tracking-wide">
                Master Photo
              </p>
              {selectedWorker.enrollmentPhotoId ? (
                <img
                  src={selectedWorker.enrollmentPhotoId}
                  alt="master"
                  className="w-full aspect-square rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-muted flex items-center justify-center">
                  <User className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-center text-muted-foreground font-semibold uppercase tracking-wide">
                Check-In Photo
              </p>
              <img
                src={attendancePhotoUrl}
                alt="checkin"
                className="w-full aspect-square rounded-xl object-cover border border-border"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              data-ocid="attendance.cancel_button"
              variant="outline"
              onClick={() => setStep("capture-photo")}
              className="h-11"
            >
              Retake
            </Button>
            <Button
              data-ocid="attendance.confirm_button"
              onClick={handleConfirmCheckIn}
              disabled={saving}
              className="h-11 font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm Check-In"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
