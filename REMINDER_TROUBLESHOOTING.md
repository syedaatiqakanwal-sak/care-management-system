# Reminder Email Troubleshooting Guide

## Important: Reminders Don't Send Automatically

The reminder system **does NOT run automatically every 10 minutes**. You must **manually click the "Process Reminders" button** in the Reference Analytics Dashboard.

## Steps to Test Reminders

1. **Create a reference** (or use an existing one)
2. **Wait 10+ minutes** after the reference was created
3. **Go to Reference Analytics Dashboard**: `http://72.62.199.119:81/dashboard/references/analytics`
4. **Click the "Process Reminders" button** (orange button in top right)
5. **Check the notification** for results

## Requirements for a Reference to Receive a Reminder

A reference must meet ALL of these criteria:

1. ✅ **Status = "Pending"** (not "Submitted" or "Opened")
2. ✅ **Created more than 10 minutes ago** (in test mode)
3. ✅ **Reminder count < 3** (hasn't reached the maximum reminder limit)
4. ✅ **Has a secure token** (references created with the new system)

## Common Issues

### Issue 1: "No Reminders to Send"
**Cause**: No references meet all the criteria above.

**Solutions**:
- Check that the reference status is "Pending" (not "Submitted")
- Verify the reference was created more than 10 minutes ago
- Check the reminder count (should be less than 3)
- Make sure you're using the new reference system (not legacy PDF attachments)

### Issue 2: "Error Sending Reminder"
**Cause**: Email service configuration issue or missing token.

**Solutions**:
- Check backend logs for detailed error messages
- Verify email service is configured correctly (SMTP settings)
- Ensure the reference has a secure token (new system only)
- Check that `APP_BASE_URL` or `FRONTEND_URL` is set correctly

### Issue 3: Email Not Received
**Cause**: Email might be in spam folder or email service issue.

**Solutions**:
- Check spam/junk folder
- Verify the email address is correct
- Check backend logs to see if email was actually sent
- Test email service configuration

## How to Check Reference Status

1. Go to Reference Analytics Dashboard
2. Look at the "All References" table
3. Check:
   - **Status** column: Should be "Pending" (yellow badge)
   - **Email Sent** column: Shows when reference was created
   - **Reminders** column: Shows current reminder count

## Debugging Steps

1. **Check Backend Logs**: Look for `[REMINDER TEST]` messages in the console/logs
2. **Check the Notification**: The UI will show detailed results after clicking "Process Reminders"
3. **Check Reference Details**: Click "View" on a reference to see full details
4. **Verify Email Service**: Make sure SMTP settings are correct in backend `.env`

## Testing Checklist

- [ ] Reference was created more than 10 minutes ago
- [ ] Reference status is "Pending"
- [ ] Reminder count is less than 3
- [ ] Reference has a secure token (new system)
- [ ] Clicked "Process Reminders" button manually
- [ ] Checked notification for results
- [ ] Checked spam folder for email
- [ ] Verified email address is correct
- [ ] Checked backend logs for errors

## After Testing

Remember to revert the 10-minute change back to 3 days as documented in `TESTING_REMINDER_REVERT.md`.
