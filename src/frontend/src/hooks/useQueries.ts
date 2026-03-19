import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttendanceRecord, Work, Worker, WorkerInput } from "../backend";
import { useActor } from "./useActor";

/* ─── Workers ─────────────────────────────────────────────── */
export function useWorkers() {
  const { actor, isFetching } = useActor();
  return useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWorkers();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useAddWorker() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: WorkerInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.addWorker(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workers"] }),
  });
}

export function useUpdateWorker() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      worker,
    }: { employeeId: string; worker: Worker }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateWorker(employeeId, worker);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workers"] }),
  });
}

export function useDeleteWorker() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeWorker(employeeId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workers"] }),
  });
}

export function useUploadPhoto() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!actor) throw new Error("Not connected");
      const { uploadPhotoFile } = await import("../utils/photoUtils");
      return uploadPhotoFile(file, actor);
    },
  });
}

/* ─── Works ───────────────────────────────────────────────── */
export function useWorks() {
  const { actor, isFetching } = useActor();
  return useQuery<Work[]>({
    queryKey: ["works"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWorks();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useAddWork() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (work: Work) => {
      if (!actor) throw new Error("Not connected");
      return actor.addWork(work);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["works"] }),
  });
}

export function useUpdateWork() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workId, work }: { workId: string; work: Work }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateWork(workId, work);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["works"] }),
  });
}

export function useDeleteWork() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeWork(workId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["works"] }),
  });
}

/* ─── Attendance ──────────────────────────────────────────── */
export function useTodayCheckIns() {
  const { actor, isFetching } = useActor();
  const today = new Date().toISOString().split("T")[0];
  return useQuery<AttendanceRecord[]>({
    queryKey: ["checkIns", today],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTodayCheckIns(today);
    },
    enabled: !!actor && !isFetching,
    staleTime: 15_000,
  });
}

export function useRecordCheckIn() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      recordId: string;
      workerId: string;
      workId: string;
      checkInPhotoId: string;
      checkInTime: bigint;
      lat: number;
      lng: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.recordCheckIn(
        params.recordId,
        params.workerId,
        params.workId,
        params.checkInPhotoId,
        params.checkInTime,
        params.lat,
        params.lng,
      );
    },
    onSuccess: () => {
      const today = new Date().toISOString().split("T")[0];
      qc.invalidateQueries({ queryKey: ["checkIns", today] });
    },
  });
}

export function useRecordCheckOut() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      recordId: string;
      checkOutPhotoId: string;
      checkOutTime: bigint;
      lat: number;
      lng: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.recordCheckOut(
        params.recordId,
        params.checkOutPhotoId,
        params.checkOutTime,
        params.lat,
        params.lng,
      );
    },
    onSuccess: () => {
      const today = new Date().toISOString().split("T")[0];
      qc.invalidateQueries({ queryKey: ["checkIns", today] });
    },
  });
}
