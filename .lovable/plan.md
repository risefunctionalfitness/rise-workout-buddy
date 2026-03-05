

## Fix: `check-course-attendance` Email Filter Bug

The UI toggle logic in `UserProfile.tsx` is already correct -- it prevents both channels from being off simultaneously. The notification problem is in the **backend**.

### The Bug

In `supabase/functions/check-course-attendance/index.ts` (line 148):
```typescript
}).filter(p => p.email) || []
```

This filters out any user whose `profiles.email` is null. Since ~91% of users only have their email in `auth.users` (not in `profiles`), they never receive any notification -- neither email nor WhatsApp -- when a course is cancelled due to low attendance.

This was identified in the previous analysis but the fix was not applied to this file.

### Fix

1. Remove `.filter(p => p.email)` 
2. After building the participants list from profiles, fetch actual emails from `auth.users` using `supabase.auth.admin.getUserById()` for each user
3. Attach the auth email to each participant
4. Only exclude participants where `notification_method` would be `'none'` (which the UI now prevents, but as a safety net)

### File to Modify
- `supabase/functions/check-course-attendance/index.ts` -- Remove email filter, fetch auth emails

