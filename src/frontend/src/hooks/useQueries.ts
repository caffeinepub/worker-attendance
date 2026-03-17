import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AttendanceRecord,
  UserProfile,
  UserRole,
  Work,
  Worker,
} from "../backend";
import { useActor } from "./useActor";

// ─── Workers ────────────────────────────────────────────────
export function useGetAllWorkers() {
  const { actor, isFetching } = useActor();
  return useQuery<Worker[]>({
    queryKey: ["workers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWorkers();
    },
    enabled: !!actor && !isFetching,
  });
}

export type WorkerInput = Omit<Worker, "employeeId">;

export function useAddWorker() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation<string, Error, WorkerInput>({
    mutationFn: async (worker: WorkerInput) => {
      if (!actor) throw new Error("Not connected");
      // Backend returns auto-generated employeeId (EMP-NNN)
      const result = await (actor as any).addWorker(worker);
      return typeof result === "string" ? result : "";
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workers"] }),
  });
}

export function useGetMyId() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["myId"],
    queryFn: async () => {
      if (!actor) return "USR";
      try {
        return await (actor as any).getMyId();
      } catch {
        return "USR";
      }
    },
    enabled: !!actor && !isFetching,
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

export function useRemoveWorker() {
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

// ─── Works ──────────────────────────────────────────────────
export function useGetAllWorks() {
  const { actor, isFetching } = useActor();
  return useQuery<Work[]>({
    queryKey: ["works"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWorks();
    },
    enabled: !!actor && !isFetching,
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

export function useRemoveWork() {
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

// ─── Attendance ──────────────────────────────────────────────
export function useGetAttendanceByWork(workId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", workId],
    queryFn: async () => {
      if (!actor || !workId) return [];
      return actor.getAttendanceByWork(workId);
    },
    enabled: !!actor && !isFetching && !!workId,
  });
}

export function useGetTodayCheckIns(today: string) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["todayCheckIns", today],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTodayCheckIns(today);
    },
    enabled: !!actor && !isFetching && !!today,
    refetchInterval: 30000,
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
      checkInLat: number;
      checkInLng: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.recordCheckIn(
        params.recordId,
        params.workerId,
        params.workId,
        params.checkInPhotoId,
        params.checkInTime,
        params.checkInLat,
        params.checkInLng,
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["attendance", vars.workId] });
      qc.invalidateQueries({ queryKey: ["todayCheckIns"] });
    },
  });
}

export function useRecordCheckOut() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      recordId: string;
      workId: string;
      checkOutPhotoId: string;
      checkOutTime: bigint;
      checkOutLat: number;
      checkOutLng: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.recordCheckOut(
        params.recordId,
        params.checkOutPhotoId,
        params.checkOutTime,
        params.checkOutLat,
        params.checkOutLng,
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["attendance", vars.workId] });
      qc.invalidateQueries({ queryKey: ["todayCheckIns"] });
    },
  });
}

// ─── Auth / Role ─────────────────────────────────────────────
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();
  return useQuery<UserRole>({
    queryKey: ["userRole"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["currentUserProfile"] }),
  });
}

// ─── Master Entry Permission ──────────────────────────────────
export function useHasMasterEntryPermission() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["masterEntryPermission"],
    queryFn: async () => {
      if (!actor) return false;
      return (actor as any).hasMasterEntryPermission();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMasterEntryGrantees() {
  const { actor, isFetching } = useActor();
  return useQuery<import("@icp-sdk/core/principal").Principal[]>({
    queryKey: ["masterEntryGrantees"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getMasterEntryGrantees();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRegisteredUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<
    Array<
      [
        import("@icp-sdk/core/principal").Principal,
        import("../backend").UserProfile,
      ]
    >
  >({
    queryKey: ["registeredUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getRegisteredUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGrantMasterEntryPermission() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: import("@icp-sdk/core/principal").Principal) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).grantMasterEntryPermission(user);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["masterEntryGrantees"] });
    },
  });
}

export function useRevokeMasterEntryPermission() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user: import("@icp-sdk/core/principal").Principal) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).revokeMasterEntryPermission(user);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["masterEntryGrantees"] });
    },
  });
}
