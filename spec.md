# Worker Attendance App

## Current State
- Backend supports: Worker registration, attendance records (with photo, GPS, timestamp), blob storage, authorization.
- Frontend has: LoginPage, AdminDashboard (Workers tab + Attendance Log tab), CheckInPage (worker select, camera, submit), AttendanceHistoryPage.
- Attendance is a single check-in event. There is no work/site concept, no evening check-out.

## Requested Changes (Diff)

### Add
- **Work/Site management**: Admins can create named works/jobs (e.g., "Road Repair – Block 4"). Each work has id, name, location description, date.
- **Morning attendance (check-in)**: For a selected work, take attendance of labourers — select labourers, capture their photo, record check-in time + GPS.
- **Evening check-out**: In the evening, for each labourer who checked in, capture another photo while leaving. Display their complete details, evening photo, and GPS coordinates in a details text box.
- **New Labour Entry tab**: Register a new labourer with full details (name, employee ID, department, job title, phone) and an enrollment photo.
- **AttendanceRecord** now includes: workId, checkInPhotoId, checkInTime, checkInLat, checkInLng, checkOutPhotoId (optional), checkOutTime (optional), checkOutLat (optional), checkOutLng (optional).

### Modify
- Main dashboard after login now shows 4 tabs: **New Labour**, **Works**, **Attendance**, **Check-Out**.
- Admin dashboard retains worker management but is merged into the tabbed main view.
- Attendance recording backend updated to include workId and check-in/check-out distinction.

### Remove
- Separate CheckInPage and AttendanceHistoryPage (replaced by the tabbed dashboard).
- Old single-event Attendance type (replaced by richer AttendanceRecord).

## Implementation Plan
1. Backend: Add `Work` type with CRUD. Add `AttendanceRecord` type with check-in + check-out fields. Add `recordCheckIn`, `recordCheckOut`, `getAttendanceByWork`, `getAllWorks`, `addWork`, `removeWork` methods.
2. Backend: `getAllWorkers` open to all authenticated users (not just admin) so labourers can be listed during attendance.
3. Frontend: Replace routing with a single tabbed app (4 tabs after login): New Labour | Works | Attendance | Check-Out.
4. Frontend – New Labour tab: Form with name, employeeId, department, jobTitle, phone + camera for enrollment photo. Admin only.
5. Frontend – Works tab: List of works with add/remove. Each work shows name, location, date. Admin only.
6. Frontend – Attendance tab: Select a work -> list registered workers with checkboxes -> for each selected worker, open camera and capture morning check-in photo + GPS.
7. Frontend – Check-Out tab: Shows today's checked-in workers for a selected work. For each, tap to capture evening photo + GPS. Displays details + coordinates in a text box.
