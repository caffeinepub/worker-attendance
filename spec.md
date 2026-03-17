# Worker Attendance

## Current State
- Workers stored with manually-supplied employeeId (Text field).
- Any logged-in user with Master Entry permission can add workers and works; only admins can edit/delete.
- No auto-increment counter for employee IDs.
- No distinction between admin and user ID formats.
- Frontend allows entry of arbitrary employeeId text.

## Requested Changes (Diff)

### Add
- Backend counter `nextEmployeeSeqNo` (stable Nat) that increments each time a new worker is added.
- `getNextEmployeeId` query that returns the next sequential ID string (EMP-001, EMP-002...) for display.
- Sequential employee IDs are generated server-side: format `EMP-NNN` (zero-padded to 3 digits, then 4+ as needed).
- Admin accounts show a distinct ID prefix `ADM-NNN` in their profile/display (derived from authorization role).
- Backend counter `nextAdminSeqNo` for admin ID sequence (ADM-001, ADM-002...).
- When a new admin is registered, assign and store their admin ID.
- Admin and user IDs stored separately so they never collide.

### Modify
- `addWorker` no longer accepts an `employeeId` from the caller; backend generates and assigns it.
- Worker type: `employeeId` still stored as Text, but now always auto-generated.
- Frontend New Labour form: remove the editable Employee ID field; show auto-generated ID as read-only after save.
- Ensure `updateWorker` and `removeWork`/`updateWork` are admin-only (already the case; verify and reinforce).
- Frontend should hide edit/delete buttons on Master Entry and Work cards for non-admin users.

### Remove
- Manual employeeId input from the New Labour form.

## Implementation Plan
1. Add `nextEmployeeSeqNo` stable counter to backend; `addWorker` auto-generates `EMP-NNN`.
2. Add `nextAdminSeqNo` stable counter; store admin IDs in a `adminIds` map (Principal -> Text).
3. Add `getMyId` query: returns the caller's ID (EMP-NNN for users, ADM-NNN for admins).
4. Update Worker type: remove employeeId from the input, generate server-side.
5. Update frontend New Labour tab: remove employeeId text input, show assigned ID after save.
6. Update frontend Work and Labour cards: hide edit/delete buttons for non-admin users.
