import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Principal "mo:core/Principal";

module {
  type OldAttendance = {
    workerId : Text;
    photoId : Text;
    latitude : Float;
    longitude : Float;
    locationName : Text;
    timestamp : Time.Time;
  };

  type OldActor = {
    workers : Map.Map<Text, {
      name : Text;
      employeeId : Text;
      department : Text;
      jobTitle : Text;
      phone : Text;
    }>;
    attendanceRecords : Map.Map<Text, List.List<OldAttendance>>;
    userProfiles : Map.Map<Principal, {
      name : Text;
      employeeId : ?Text;
    }>;
    workerOwnership : Map.Map<Text, Principal>;
  };

  type NewActor = {
    workers : Map.Map<Text, {
      name : Text;
      employeeId : Text;
      department : Text;
      jobTitle : Text;
      phone : Text;
      enrollmentPhotoId : Text;
    }>;
    works : Map.Map<Text, {
      workId : Text;
      name : Text;
      locationDescription : Text;
      date : Text;
    }>;
    attendanceRecords : Map.Map<Text, {
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
    }>;
    userProfiles : Map.Map<Principal, {
      name : Text;
      employeeId : ?Text;
    }>;
    workerOwnership : Map.Map<Text, Principal>;
  };

  public func run(old : OldActor) : NewActor {
    let newWorkers = old.workers.map<Text, { name : Text; employeeId : Text; department : Text; jobTitle : Text; phone : Text }, { name : Text; employeeId : Text; department : Text; jobTitle : Text; phone : Text; enrollmentPhotoId : Text }>(
      func(_id, oldWorker) {
        {
          oldWorker with
          enrollmentPhotoId = "";
        };
      }
    );

    let newAttendanceRecords = Map.empty<Text, { recordId : Text; workerId : Text; workId : Text; checkInPhotoId : Text; checkInTime : Time.Time; checkInLat : Float; checkInLng : Float; checkOutPhotoId : ?Text; checkOutTime : ?Time.Time; checkOutLat : ?Float; checkOutLng : ?Float }>();
    old.attendanceRecords.entries().forEach(
      func((workerId, oldAttendances)) {
        oldAttendances.values().forEach(
          func(oldAttendance) {
            let recordId = "legacy-" # workerId # "-" # oldAttendance.timestamp.toText();
            let newRecord : { recordId : Text; workerId : Text; workId : Text; checkInPhotoId : Text; checkInTime : Time.Time; checkInLat : Float; checkInLng : Float; checkOutPhotoId : ?Text; checkOutTime : ?Time.Time; checkOutLat : ?Float; checkOutLng : ?Float } = {
              recordId;
              workerId;
              workId = "legacy";
              checkInPhotoId = "";
              checkInTime = oldAttendance.timestamp;
              checkInLat = oldAttendance.latitude;
              checkInLng = oldAttendance.longitude;
              checkOutPhotoId = null;
              checkOutTime = null;
              checkOutLat = null;
              checkOutLng = null;
            };
            newAttendanceRecords.add(recordId, newRecord);
          }
        );
      }
    );

    {
      workers = newWorkers;
      works = Map.empty<Text, { workId : Text; name : Text; locationDescription : Text; date : Text }>();
      attendanceRecords = newAttendanceRecords;
      userProfiles = old.userProfiles;
      workerOwnership = old.workerOwnership;
    };
  };
};
