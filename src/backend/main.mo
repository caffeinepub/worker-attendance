import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Mixin authorization and storage components
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

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

  type Worker = {
    name : Text;
    employeeId : Text;
    department : Text;
    jobTitle : Text;
    phone : Text;
    enrollmentPhotoId : Text;
  };

  public type Work = {
    workId : Text;
    name : Text;
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
  // Map from employeeId to Principal for ownership verification
  let workerOwnership = Map.empty<Text, Principal>();

  // Helper function to check if caller can manage attendance for a worker
  func canManageWorkerAttendance(caller : Principal, workerId : Text) : Bool {
    // Admins can manage any worker's attendance
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return true;
    };

    // Check if caller is linked to this worker via their profile
    switch (workerOwnership.get(workerId)) {
      case (?owner) { owner == caller };
      case (null) { false };
    };
  };

  // User Profile Management (required by frontend)
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

    // If user links to an employeeId, establish ownership
    switch (profile.employeeId) {
      case (?empId) {
        if (workers.containsKey(empId)) {
          workerOwnership.add(empId, caller);
        };
      };
      case (null) {};
    };
  };

  // Worker Management (Admin only)
  public shared ({ caller }) func addWorker(worker : Worker) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can manage workers");
    };
    if (workers.containsKey(worker.employeeId)) {
      Runtime.trap("Worker already exists");
    };
    workers.add(worker.employeeId, worker);
  };

  public shared ({ caller }) func updateWorker(employeeId : Text, updatedWorker : Worker) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can manage workers");
    };
    if (not workers.containsKey(employeeId)) {
      Runtime.trap("Worker not found");
    };
    workers.add(employeeId, updatedWorker);
  };

  public shared ({ caller }) func removeWorker(employeeId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can manage workers");
    };
    workers.remove(employeeId);
    workerOwnership.remove(employeeId);
  };

  public query ({ caller }) func getWorker(employeeId : Text) : async Worker {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view worker details");
    };
    switch (workers.get(employeeId)) {
      case (null) { Runtime.trap("Worker not found") };
      case (?worker) { worker };
    };
  };

  public query ({ caller }) func getAllWorkers() : async [Worker] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view all workers");
    };
    workers.values().toArray().sort();
  };

  // Work Management (Admin only)
  public shared ({ caller }) func addWork(work : Work) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can manage works");
    };
    if (works.containsKey(work.workId)) {
      Runtime.trap("Work already exists");
    };
    works.add(work.workId, work);
  };

  public shared ({ caller }) func updateWork(workId : Text, updatedWork : Work) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can manage works");
    };
    if (not works.containsKey(workId)) {
      Runtime.trap("Work not found");
    };
    works.add(workId, updatedWork);
  };

  public shared ({ caller }) func removeWork(workId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can manage works");
    };
    works.remove(workId);
  };

  public query ({ caller }) func getWork(workId : Text) : async Work {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view work details");
    };
    switch (works.get(workId)) {
      case (null) { Runtime.trap("Work not found") };
      case (?work) { work };
    };
  };

  public query ({ caller }) func getAllWorks() : async [Work] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view all works");
    };
    works.values().toArray().sort();
  };

  // Attendance (Check-In/Check-Out)
  public shared ({ caller }) func recordCheckIn(recordId : Text, workerId : Text, workId : Text, checkInPhotoId : Text, checkInTime : Time.Time, checkInLat : Float, checkInLng : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can record check-in");
    };
    if (not workers.containsKey(workerId)) {
      Runtime.trap("Worker not found");
    };
    if (not works.containsKey(workId)) {
      Runtime.trap("Work not found");
    };
    if (attendanceRecords.containsKey(recordId)) {
      Runtime.trap("Record already exists");
    };

    // Verify caller has permission to record attendance for this worker
    if (not canManageWorkerAttendance(caller, workerId)) {
      Runtime.trap("Unauthorized: You can only record attendance for your own worker profile");
    };

    let newRecord : AttendanceRecord = {
      recordId;
      workerId;
      workId;
      checkInPhotoId;
      checkInTime;
      checkInLat;
      checkInLng;
      checkOutPhotoId = null;
      checkOutTime = null;
      checkOutLat = null;
      checkOutLng = null;
    };
    attendanceRecords.add(recordId, newRecord);
  };

  public shared ({ caller }) func recordCheckOut(recordId : Text, checkOutPhotoId : Text, checkOutTime : Time.Time, checkOutLat : Float, checkOutLng : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can record check-out");
    };

    switch (attendanceRecords.get(recordId)) {
      case (null) { Runtime.trap("Record not found") };
      case (?existing) {
        // Verify caller has permission to record attendance for this worker
        if (not canManageWorkerAttendance(caller, existing.workerId)) {
          Runtime.trap("Unauthorized: You can only record check-out for your own worker profile");
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
      Runtime.trap("Unauthorized: Only authenticated users can view attendance");
    };

    let matchingRecords = List.empty<AttendanceRecord>();
    for ((recordId, record) in attendanceRecords.entries()) {
      if (record.workId == workId) {
        matchingRecords.add(record);
      };
    };
    matchingRecords.toArray().sort();
  };

  public query ({ caller }) func getAttendanceByWorker(workerId : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view attendance");
    };

    // Users can only view attendance for their own worker, admins can view any
    if (not canManageWorkerAttendance(caller, workerId)) {
      Runtime.trap("Unauthorized: You can only view attendance for your own worker profile");
    };

    let matchingRecords = List.empty<AttendanceRecord>();
    for ((recordId, record) in attendanceRecords.entries()) {
      if (record.workerId == workerId) {
        matchingRecords.add(record);
      };
    };
    matchingRecords.toArray().sort();
  };

  public query ({ caller }) func getAttendanceByDate(date : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all attendance by date");
    };

    let matchingRecords = List.empty<AttendanceRecord>();
    for ((recordId, record) in attendanceRecords.entries()) {
      let timestampText = record.checkInTime.toText();
      if (timestampText.contains(#text date)) {
        matchingRecords.add(record);
      };
    };
    matchingRecords.toArray().sort();
  };

  public query ({ caller }) func getTodayCheckIns(today : Text) : async [AttendanceRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view today's check-ins");
    };

    let todayRecords = List.empty<AttendanceRecord>();
    for ((recordId, record) in attendanceRecords.entries()) {
      let timestampText = record.checkInTime.toText();
      if (timestampText.contains(#text today) and record.checkOutTime == null) {
        todayRecords.add(record);
      };
    };
    todayRecords.toArray().sort();
  };

  // Blob Storage for Photos
  public shared ({ caller }) func uploadPhoto(blob : Storage.ExternalBlob) : async Storage.ExternalBlob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can upload photos");
    };
    blob;
  };
};
