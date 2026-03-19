import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  public type OldActor = {
    workers : Map.Map<Text, OldWorker>;
    works : Map.Map<Text, OldWork>;
    attendanceRecords : Map.Map<Text, OldAttendanceRecord>;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    workerOwnership : Map.Map<Text, Principal>;
    masterEntryGrantees : Map.Map<Principal, Bool>;
    adminIds : Map.Map<Principal, Text>;
  };

  public type OldWorker = {
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

  public type OldWork = {
    workId : Text;
    name : Text;
    category : Text;
    jobTitle : Text;
    locationDescription : Text;
    date : Text;
  };

  public type OldAttendanceRecord = {
    recordId : Text;
    workerId : Text;
    workId : Text;
    checkInPhotoId : Text;
    checkInTime : Int;
    checkInLat : Float;
    checkInLng : Float;
    checkOutPhotoId : ?Text;
    checkOutTime : ?Int;
    checkOutLat : ?Float;
    checkOutLng : ?Float;
  };

  public type OldUserProfile = {
    name : Text;
    employeeId : ?Text;
  };

  public type NewActor = {
    workers : Map.Map<Text, OldWorker>;
    works : Map.Map<Text, OldWork>;
    attendanceRecords : Map.Map<Text, OldAttendanceRecord>;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    workerOwnership : Map.Map<Text, Principal>;
    masterEntryGrantees : Map.Map<Principal, Bool>;
    adminIds : Map.Map<Principal, Text>;
  };

  public func run(old : OldActor) : NewActor {
    let validWorkers = old.workers.filter(
      func(_, worker) { worker.name.size() > 0 }
    );

    // Clean up workerOwnership map
    let validWorkerOwnership = old.workerOwnership.filter(
      func(workerId, _) { validWorkers.containsKey(workerId) }
    );

    // Clean up attendanceRecords
    let validAttendanceRecords = old.attendanceRecords.filter(
      func(_, record) { validWorkers.containsKey(record.workerId) }
    );

    // Clean up masterEntryGrantees
    let validGrantees = Map.empty<Principal, Bool>();
    for (p in old.masterEntryGrantees.keys()) {
      if (not validGrantees.containsKey(p)) {
        validGrantees.add(p, true);
      };
    };

    // Retain existing works
    let validWorks = old.works;
    let tempUserProfiles = old.userProfiles;

    // Remove duplicate entries
    let uniqueAdminIds = Map.empty<Principal, Text>();
    for ((principal, adminId) in old.adminIds.entries()) {
      if (not uniqueAdminIds.containsKey(principal)) {
        uniqueAdminIds.add(principal, adminId);
      };
    };

    {
      workers = validWorkers;
      workerOwnership = validWorkerOwnership;
      attendanceRecords = validAttendanceRecords;
      masterEntryGrantees = validGrantees;
      works = validWorks;
      userProfiles = tempUserProfiles;
      adminIds = uniqueAdminIds;
    };
  };
};
