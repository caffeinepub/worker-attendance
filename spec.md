# Worker Attendance

## Current State
Master Entry (registering new labourers in the Labour tab) is currently restricted to admin users only. There is no mechanism for an admin to delegate this authority to other registered users.

## Requested Changes (Diff)

### Add
- `masterEntryGrantees` set in backend storing Principals who have been granted Master Entry permission
- `grantMasterEntryPermission(user: Principal)` backend function (admin only)
- `revokeMasterEntryPermission(user: Principal)` backend function (admin only)
- `hasMasterEntryPermission()` query function (returns true if caller is admin OR is in grantee set)
- `getMasterEntryGrantees()` query function (admin only, returns list of grantee Principals)
- Admin UI section in Labour tab: "Master Entry Access" — lists registered users and allows admin to grant/revoke permission per user

### Modify
- `addWorker` backend: allow callers who have master entry permission (admin OR grantee), not just admins
- `updateWorker` and `removeWorker` remain admin-only
- NewLabourTab frontend: show Master Entry form to any user with `hasMasterEntryPermission() == true`

### Remove
- Nothing removed

## Implementation Plan
1. Add `masterEntryGrantees` map in backend, implement `grantMasterEntryPermission`, `revokeMasterEntryPermission`, `hasMasterEntryPermission`, `getMasterEntryGrantees`
2. Relax `addWorker` to allow grantees
3. Frontend: call `hasMasterEntryPermission` hook; show Master Entry form if true
4. Admin Labour tab: add "Master Entry Access" panel showing registered users with grant/revoke toggle
