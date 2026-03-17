import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface AttendanceRecord {
    workerId: string;
    checkInPhotoId: string;
    checkInTime: Time;
    recordId: string;
    checkOutTime?: Time;
    workId: string;
    checkInLat: number;
    checkInLng: number;
    checkOutLat?: number;
    checkOutLng?: number;
    checkOutPhotoId?: string;
}
export type Time = bigint;
export interface Work {
    date: string;
    name: string;
    locationDescription: string;
    jobTitle: string;
    category: string;
    workId: string;
}
export interface Worker {
    bankAccountNumber: string;
    husbandFatherName: string;
    enrollmentPhotoId: string;
    caste: string;
    name: string;
    bankIfsc: string;
    bankName: string;
    jobTitle: string;
    employeeId: string;
    village: string;
    aadhaarNumber: string;
    phone: string;
    bankBranchName: string;
}
export interface UserProfile {
    name: string;
    employeeId?: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addWork(work: Work): Promise<void>;
    addWorker(worker: Worker): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllWorkers(): Promise<Array<Worker>>;
    getAllWorks(): Promise<Array<Work>>;
    getAttendanceByDate(date: string): Promise<Array<AttendanceRecord>>;
    getAttendanceByWork(workId: string): Promise<Array<AttendanceRecord>>;
    getAttendanceByWorker(workerId: string): Promise<Array<AttendanceRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMasterEntryGrantees(): Promise<Array<Principal>>;
    getRegisteredUsers(): Promise<Array<[Principal, UserProfile]>>;
    getTodayCheckIns(today: string): Promise<Array<AttendanceRecord>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWork(workId: string): Promise<Work>;
    getWorker(employeeId: string): Promise<Worker>;
    grantMasterEntryPermission(user: Principal): Promise<void>;
    hasMasterEntryPermission(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    recordCheckIn(recordId: string, workerId: string, workId: string, checkInPhotoId: string, checkInTime: Time, checkInLat: number, checkInLng: number): Promise<void>;
    recordCheckOut(recordId: string, checkOutPhotoId: string, checkOutTime: Time, checkOutLat: number, checkOutLng: number): Promise<void>;
    removeWork(workId: string): Promise<void>;
    removeWorker(employeeId: string): Promise<void>;
    revokeMasterEntryPermission(user: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateWork(workId: string, updatedWork: Work): Promise<void>;
    updateWorker(employeeId: string, updatedWorker: Worker): Promise<void>;
    uploadPhoto(blob: ExternalBlob): Promise<ExternalBlob>;
}
