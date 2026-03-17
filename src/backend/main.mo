import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // Auto-increment counters
  var nextEmployeeSeqNo : Nat = 1;
  var nextAdminSeqNo : Nat = 1;

  // Helper to format sequential IDs
  func formatSeqId(prefix : Text, n : Nat) : Text {
    let s = n.toText();
    let padded = if (s.size() >= 3) { s } else if (s.size() == 2) { "0" # s } else { "00" # s };
    prefix # padded;
  };

  module Worker {
    public func compare(w1 : Worker, w2 : Worker) : Order.Order {
      Text.compare(w1.employeeId, w2.employeeId);
    };
  };

  module Work {
    public func compare(w1 : Work, w2 : Work) : Order.Order {
      Text.compare(w1.workId, w2.workId);
    };
  };

  module AttendanceRecord {
    public func compare(a1 : AttendanceRecord, a2 : AttendanceRecord) : Order.Order {
      Int.compare(a1.checkInTime, a2.checkInTime);
    };
  };

  public type Worker = {
    name : Text;
    husbandFatherName : Text;
    caste : Text;
    village : Text;
    aadhaarNumber : Text;
    bankAccountNumber : Text;
    bankIfsc : Text;
    bankName : Text;
    bankBranchName : Text;
    employeeId : Text;
    jobTitle : Text;
    phone : Text;
    enrollmentPhotoId : Text;
  };

  public type WorkerInput = {
    name : Text;
    husbandFatherName : Text;
    caste : Text;
    village : Text;
    aadhaarNumber : Text;
    bankAccountNumber : Text;
    bankIfsc : Text;
    bankName : Text;
    bankBranchName : Text;
    jobTitle : Text;
    phone : Text;
    enrollmentPhotoId : Text;
  };

  public type Work = {
    workId : Text;
    name : Text;
    category : Text;
    jobTitle : Text;
    locationDescription : Text;
    date : Text;
  };

  public type AttendanceRecord = {
    recordId : Text;
    workerId : Text;
    workId : Text;
    checkInPhotoId : Text;
    checkInTime : Time.Time;
    checkInLat : Float;
    checkInLng : Float;
    checkOutPhotoId : ?Text;
    checkOutTime : ?Time.Time;
    checkOutLat : ?Float;
    checkOutLng : ?Float;
  };

  public type UserProfile = {
    name : Text;
    employeeId : ?Text;
  };

  let workers = Map.empty<Text, Worker>();
  let works = Map.empty<Text, Work>();
  let attendanceRecords = Map.empty<Text, AttendanceRecord>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let workerOwnership = Map.empty<Text, Principal>();
  let masterEntryGrantees = Map.empty<Principal, Bool>();
  let adminIds = Map.empty<Principal, Text>();

  func hasMasterEntryPerm(p : Principal) : Bool {
    if (AccessControl.isAdmin(accessControlState, p)) return true;
    switch (masterEntryGrantees.get(p)) {
      case (?v) { v };
      case (null) { false };
    };
  };

  func canManageWorkerAttendance(caller : Principal, workerId : Text) : Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) { return true; };
    switch (workerOwnership.get(workerId)) {
      case (?owner) { owner == caller };
      case (null) { false };
    };
  };

  func getCallerWorkerId(caller : Principal) : ?Text {
    switch (userProfiles.get(caller)) {
      case (?profile) { profile.employeeId };
      case (null) { null };
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
    switch (profile.employeeId) {
      case (?empId) {
        if (workers.containsKey(empId)) {
          workerOwnership.add(empId, caller);
        };
      };
      case (null) {};
    };
  };

  // ID Management
  public query ({ caller }) func getMyId() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (AccessControl.isAdmin(accessControlState, caller)) {
      switch (adminIds.get(caller)) {
        case (?id) { return id };
        case (null) { return "ADM" };
      };
    };
    switch (userProfiles.get(caller)) {
      case (?profile) {
        switch (profile.employeeId) {
          case (?empId) { return empId };
          case (null) {};
        };
      };
      case (null) {};
    };
    "USR";
  };

  public shared ({ caller }) func assignAdminId(user : Principal) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can assign admin IDs");
    };
    switch (adminIds.get(user)) {
      case (?existing) { return existing };
      case (null) {};
    };
    let newId = formatSeqId("ADM-", nextAdminSeqNo);
    nextAdminSeqNo += 1;
    adminIds.add(user, newId);
    newId;
  };

  // Master Entry Permission Management
  public query ({ caller }) func hasMasterEntryPermission() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return false;
    };
    hasMasterEntryPerm(caller);
  };

  public shared ({ caller }) func grantMasterEntryPermission(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can grant Master Entry permission");
    };
    masterEntryGrantees.add(user, true);
  };

  public shared ({ caller }) func revokeMasterEntryPermission(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can revoke Master Entry permission");
    };
    masterEntryGrantees.remove(user);
  };

  public query ({ caller }) func getMasterEntryGrantees() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view Master Entry grantees");
    };
    let result = List.empty<Principal>();
    for ((p, granted) in masterEntryGrantees.entries()) {
      if (granted) { result.add(p) };
    };
    result.toArray();
  };

  public query ({ caller }) func getRegisteredUsers() : async [(Principal, UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can list registered users");
    };
    userProfiles.entries().toArray();
  };

  // Worker Management
  public shared ({ caller }) func addWorker(input : WorkerInput) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can add workers");
    };
    let newId = formatSeqId("EMP-", nextEmployeeSeqNo);
    nextEmployeeSeqNo += 1;
    let worker : Worker = {
      name = input.name;
      husbandFatherName = input.husbandFatherName;
      caste = input.caste;
      village = input.village;
      aadhaarNumber = input.aadhaarNumber;
      bankAccountNumber = input.bankAccountNumber;
      bankIfsc = input.bankIfsc;
      bankName = input.bankName;
      bankBranchName = input.bankBranchName;
      employeeId = newId;
      jobTitle = input.jobTitle;
      phone = input.phone;
      enrollmentPhotoId = input.enrollmentPhotoId;
    };
    workers.add(newId, worker);
    newId;
  };

  public shared ({ caller }) func updateWorker(employeeId : Text, updatedWorker : Worker) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can modify workers");
    };
    if (not workers.containsKey(employeeId)) {
      Runtime.trap("Worker not found");
    };
    workers.add(employeeId, updatedWorker);
  };

  public shared ({ caller }) func removeWorker(employeeId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can remove workers");
    };
    workers.remove(employeeId);
    workerOwnership.remove(employeeId);
  };

  public query ({ caller }) func getWorker(employeeId : Text) : async Worker {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (workers.get(employeeId)) {
      case (null) { Runtime.trap("Worker not found") };
      case (?worker) { worker };
    };
  };

  public query ({ caller }) func getAllWorkers() : async [Worker] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    workers.values().toArray().sort();
  };

  // Work Management
  public shared ({ caller }) func addWork(work : Work) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (works.containsKey(work.workId)) {
      Runtime.trap("Work already exists");
    };
    works.add(work.workId, work);
  };

  public shared ({ caller }) func updateWork(workId : Text, updatedWork : Work) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can modify works");
    };
    if (not works.containsKey(workId)) {
      Runtime.trap("Work not found");
    };
    works.add(workId, updatedWork);
  };

  public shared ({ caller }) func removeWork(workId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can remove works");
    };
    works.remove(workId);
  };

  public query ({ caller }) func getWork(workId : Text) : async Work {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (works.get(workId)) {
      case (null) { Runtime.trap("Work not found") };
      case (?work) { work };
    };
  };

  public query ({ caller }) func getAllWorks() : async [Work] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    works.values().toArray().sort();
  };

  // Attendance
  public shared ({ caller }) func recordCheckIn(recordId : Text, workerId : Text, workId : Text, checkInPhotoId : Text, checkInTime : Time.Time, checkInLat : Float, checkInLng : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not workers.containsKey(workerId)) { Runtime.trap("Worker not found") };
    if (not works.containsKey(workId)) { Runtime.trap("Work not found") };
    if (attendanceRecords.containsKey(recordId)) { Runtime.trap("Record already exists") };
    if (not canManageWorkerAttendance(caller, workerId)) {
      Runtime.trap("Unauthorized: You can only record attendance for your own worker profile");
    };
    let newRecord : AttendanceRecord = {
      recordId; workerId; workId; checkInPhotoId; checkInTime; checkInLat; checkInLng;
      checkOutPhotoId = null; checkOutTime = null; checkOutLat = null; checkOutLng = null;
    };
    attendanceRecords.add(recordId, newRecord);
  };

  public shared ({ caller }) func recordCheckOut(recordId : Text, checkOutPhotoId : Text, checkOutTime : Time.Time, checkOutLat : Float, checkOutLng : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (attendanceRecords.get(recordId)) {
      case (null) { Runtime.trap("Record not found") };
      case (?existing) {
        if (not canManageWorkerAttendance(caller, existing.workerId)) {
          Runtime.trap("Unauthorized");
        };
        let updatedRecord = {
          existing with
          checkOutPhotoId = ?checkOutPhotoId;
          checkOutTime = ?checkOutTime;
          checkOutLat = ?checkOutLat;
          checkOutLng = ?checkOutLng;
        };
        attendanceRecords.add(recordId, updatedRecord);
      };
    };
  };

  public query ({ caller }) func getAttendanceByWork(workId : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let callerWorkerId = getCallerWorkerId(caller);
    let matchingRecords = List.empty<AttendanceRecord>();
    for ((_, record) in attendanceRecords.entries()) {
      if (record.workId == workId) {
        if (isAdmin or (switch (callerWorkerId) {
          case (?wId) { wId == record.workerId };
          case (null) { false };
        })) {
          matchingRecords.add(record);
        };
      };
    };
    matchingRecords.toArray().sort();
  };

  public query ({ caller }) func getAttendanceByWorker(workerId : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not canManageWorkerAttendance(caller, workerId)) {
      Runtime.trap("Unauthorized");
    };
    let matchingRecords = List.empty<AttendanceRecord>();
    for ((_, record) in attendanceRecords.entries()) {
      if (record.workerId == workerId) { matchingRecords.add(record) };
    };
    matchingRecords.toArray().sort();
  };

  public query ({ caller }) func getAttendanceByDate(date : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    let matchingRecords = List.empty<AttendanceRecord>();
    for ((_, record) in attendanceRecords.entries()) {
      let timestampText = record.checkInTime.toText();
      if (timestampText.contains(#text date)) {
        matchingRecords.add(record);
      };
    };
    matchingRecords.toArray().sort();
  };

  public query ({ caller }) func getTodayCheckIns(today : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let callerWorkerId = getCallerWorkerId(caller);
    let todayRecords = List.empty<AttendanceRecord>();
    for ((_, record) in attendanceRecords.entries()) {
      let timestampText = record.checkInTime.toText();
      if (timestampText.contains(#text today) and record.checkOutTime == null) {
        if (isAdmin or (switch (callerWorkerId) {
          case (?wId) { wId == record.workerId };
          case (null) { false };
        })) {
          todayRecords.add(record);
        };
      };
    };
    todayRecords.toArray().sort();
  };

  public shared ({ caller }) func uploadPhoto(blob : Storage.ExternalBlob) : async Storage.ExternalBlob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    blob;
  };
};
