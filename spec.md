# Worker Attendance App - Reset

## Current State
Full-stack worker attendance management app with Motoko backend and React frontend. Has authorization, blob-storage components. Features: Labour Master Entry, Works management, Attendance check-in with side-by-side photo verification, Check-Out flow. Black/white theme toggle.

## Requested Changes (Diff)

### Add
- Clean rebuild of all features from scratch

### Modify
- Full reset and redeploy of entire codebase

### Remove
- Nothing removed functionally

## Implementation Plan
1. Regenerate backend with all required types and endpoints
2. Regenerate frontend with all tabs, forms, and UI features
3. Deploy

### Features to implement:
- Auth: Sign In / Sign Up with built-in username/password
- 4-tab dashboard: New Labour, Works, Attendance, Check-Out
- New Labour: register workers with full personal/bank details, enrollment photo (camera/gallery), auto-generated EMP-001 IDs (ADM-001 for admins)
- Works: add/manage work categories with auto-captured GPS, date, time; clickable cards
- Attendance: select work, select workers, capture check-in photo, side-by-side photo verification with master entry photo
- Check-Out: capture check-out photo, display full details with coordinates
- Bank details: searchable pop-up list of 42 Indian banks; IFSC auto-fills bank name (first 4 chars) and branch name (full 11 chars) offline
- Theme toggle (sun/moon) next to Logout; black theme default
- Any user can create entries; only Admins can edit/delete
- Edit and delete available to all users for worker names and assigned tasks
