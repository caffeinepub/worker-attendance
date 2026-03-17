import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { Worker } from "../backend";
import { useAddWorker, useUpdateWorker } from "../hooks/useQueries";

interface WorkerFormProps {
  open: boolean;
  onClose: () => void;
  worker?: Worker | null;
}

type FormValues = Worker;

const emptyWorker: Worker = {
  name: "",
  jobTitle: "",
  employeeId: "",
  phone: "",
  husbandFatherName: "",
  caste: "",
  village: "",
  aadhaarNumber: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankName: "",
  enrollmentPhotoId: "",
};

export default function WorkerForm({ open, onClose, worker }: WorkerFormProps) {
  const addWorker = useAddWorker();
  const updateWorker = useUpdateWorker();
  const isEditing = !!worker;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: worker ?? emptyWorker,
  });

  useEffect(() => {
    if (open) {
      reset(worker ?? emptyWorker);
    }
  }, [open, worker, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEditing) {
        await updateWorker.mutateAsync({
          employeeId: worker!.employeeId,
          worker: data,
        });
        toast.success("Worker updated");
      } else {
        await addWorker.mutateAsync(data);
        toast.success("Worker added");
      }
      onClose();
    } catch {
      toast.error(`Failed to ${isEditing ? "update" : "add"} worker`);
    }
  };

  const isPending = addWorker.isPending || updateWorker.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" data-ocid="worker.form.dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEditing ? "Edit Worker" : "Add New Worker"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Full Name" error={errors.name?.message}>
            <Input
              {...register("name", { required: "Name is required" })}
              placeholder="e.g. Ramesh Kumar"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field label="Employee ID" error={errors.employeeId?.message}>
            <Input
              {...register("employeeId", {
                required: "Employee ID is required",
              })}
              placeholder="e.g. EMP-001"
              disabled={isEditing}
              data-ocid="worker.form.input"
            />
          </Field>

          <Field
            label="Husband's / Father's Name"
            error={errors.husbandFatherName?.message}
          >
            <Input
              {...register("husbandFatherName")}
              placeholder="e.g. Suresh Kumar"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field label="Caste" error={errors.caste?.message}>
            <Input
              {...register("caste")}
              placeholder="e.g. General / OBC / SC / ST"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field label="Village" error={errors.village?.message}>
            <Input
              {...register("village")}
              placeholder="e.g. Rampur, Agra"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field label="Aadhaar Number" error={errors.aadhaarNumber?.message}>
            <Input
              {...register("aadhaarNumber", {
                pattern: { value: /^\d{0,12}$/, message: "Must be 12 digits" },
              })}
              placeholder="12-digit Aadhaar number"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field
            label="Bank Account Number"
            error={errors.bankAccountNumber?.message}
          >
            <Input
              {...register("bankAccountNumber")}
              placeholder="e.g. 0123456789"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field label="IFSC Code" error={errors.bankIfsc?.message}>
            <Input
              {...register("bankIfsc")}
              placeholder="e.g. SBIN0001234"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field label="Bank Name" error={errors.bankName?.message}>
            <Input
              {...register("bankName")}
              placeholder="e.g. State Bank of India"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field label="Job Title" error={errors.jobTitle?.message}>
            <Input
              {...register("jobTitle", { required: "Job title is required" })}
              placeholder="e.g. Mason"
              data-ocid="worker.form.input"
            />
          </Field>

          <Field label="Phone Number" error={errors.phone?.message}>
            <Input
              {...register("phone")}
              placeholder="e.g. +91 98765 43210"
              type="tel"
              data-ocid="worker.form.input"
            />
          </Field>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              data-ocid="worker.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground"
              disabled={isPending}
              data-ocid="worker.form.submit_button"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isEditing ? "Save Changes" : "Add Worker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && (
        <p
          className="text-xs text-destructive"
          data-ocid="worker.form.error_state"
        >
          {error}
        </p>
      )}
    </div>
  );
}
