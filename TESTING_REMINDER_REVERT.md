# Testing Reminder System - Temporary Changes

## Current Status: TESTING MODE (10 minutes instead of 3 days)

The reminder system has been temporarily changed for testing purposes:
- **Changed from**: 3 days
- **Changed to**: 10 minutes
- **Location**: `backend/src/references/references.service.ts` - `processAutomatedReminders()` method

## How to Test

### Option 1: Use the Test Endpoint (Recommended)
Send a POST request to:
```
POST /api/v1/references/test-reminder-bilal
Headers: Authorization: Bearer <admin_token>
```

This will automatically find Bilal's reference and send a reminder email.

### Option 2: Use the Automated Reminder Endpoint
Send a POST request to:
```
POST /api/v1/references/process-reminders
Headers: Authorization: Bearer <admin_token>
```

This will process all pending references that are older than 10 minutes (instead of 3 days).

## Revert to Original (3 days)

After testing, revert the changes in `backend/src/references/references.service.ts`:

**Find this line (around line 1771-1772):**
```typescript
// TEMPORARY: Changed from 3 days to 10 minutes for testing
// TODO: Revert back to 3 days after testing
const tenMinutesAgo = new Date();
tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
```

**Replace with:**
```typescript
const threeDaysAgo = new Date();
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
```

**And update the filter (around line 1780-1782):**
```typescript
const referencesNeedingReminder = referencesToRemind.filter(ref => {
    const createdDate = new Date(ref.createdAt);
    return createdDate < threeDaysAgo && (ref.reminderCount || 0) < 3;
});
```

**Also remove the test endpoint** from `backend/src/references/references.controller.ts`:
- Remove the `sendTestReminderForBilal` method from the controller
- Remove the `sendTestReminderForBilal` method from the service (optional, but recommended)

## Notes

- The test endpoint `test-reminder-bilal` is admin-only
- The automated reminder system will now check every 10 minutes instead of 3 days
- After reverting, the system will go back to checking references older than 3 days
