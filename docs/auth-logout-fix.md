# Authentication Logout Issue - Fix Implementation

## Date: February 4, 2026

## Problem Summary

Users were experiencing automatic logouts after approximately 1 hour, even though token refresh appeared to be working. The console showed:

- "auth_token missing but refresh_token exists, attempting refresh..."
- "Token refreshed. Expires in 3598s"
- Eventually user becomes "Guest" and gets logged out

## Root Causes Identified

### 1. **PRIMARY ISSUE: Missing `access_type=offline` in Backend Token Exchange**

- The backend token exchange (`app/api/auth/callback/route.ts`) was not including `access_type: "offline"` parameter
- Without this parameter, Google may not return a refresh_token
- Result: Sessions expire after 1 hour with no way to refresh

### 2. **SECONDARY ISSUE: No Refresh Token Validation**

- App didn't verify that refresh_token was actually received after login
- Silent failure led to unexpected logouts
- No user feedback when persistent sessions weren't available

### 3. **TERTIARY ISSUE: Insufficient Logging**

- Difficult to debug token lifecycle issues
- No visibility into when/why tokens expired
- No tracking of refresh attempts and failures

## Fixes Implemented

### 1. Backend Token Exchange Fix

**File:** `app/api/auth/callback/route.ts`

**Changes:**

- Added `access_type: "offline"` to token exchange request parameters
- Added comprehensive logging to track token exchange results
- Added warning when refresh_token is not received
- Added `has_refresh_token` flag in response for frontend validation

**Code:**

```typescript
body: new URLSearchParams({
  code,
  client_id: clientId,
  client_secret: clientSecret,
  redirect_uri: redirect_uri || "postmessage",
  grant_type: "authorization_code",
  access_type: "offline", // ← CRITICAL FIX
}),
```

**Logging Added:**

- 🔐 Token exchange successful/failed
- ✅/❌ Refresh token received status
- ⚠️ Warning if no refresh token (with explanation)
- Token expiry time in seconds and minutes

---

### 2. Backend Refresh Endpoint Logging

**File:** `app/api/auth/refresh/route.ts`

**Changes:**

- Added detailed logging for every refresh attempt
- Track refresh success/failure with reasons
- Log token expiry times

**Logging Added:**

- 🔄 Refresh requested
- ✅ Refresh successful with new expiry time
- ❌ Refresh failed with error details
- ❌ Refresh token invalid/revoked notification

---

### 3. Frontend Login Page Enhancements

**File:** `app/page.tsx`

**Changes:**

- Added comprehensive logging after token exchange
- Added validation that refresh_token was received
- Added warning to console if no refresh_token
- Added guidance for users to fix the issue

**Logging Added:**

- 🔐 Token exchange response details
- ✅ Refresh token stored confirmation
- ⚠️ Warning if no refresh token with fix instructions
- Token expiry timestamp

---

### 4. Frontend Auth Hook Comprehensive Logging

**File:** `app/hooks/useAuth.ts`

**Changes:**

- Added detailed logging to every auth lifecycle stage
- Track token validation, refresh attempts, and failures
- Log localStorage state on auth check
- Track system wake events and timer drift
- Log all logout events with reasons

**Logging Categories:**

#### Auth Check (Initial Load)

- 🔍 [AUTH-CHECK] Starting authentication check
- 🔍 [AUTH-CHECK] URL token found (extension flow)
- 🔍 [AUTH-CHECK] LocalStorage check (token/refresh/expiry status)
- ⏰ [AUTH-CHECK] Token expired X minutes ago
- ✅ [AUTH-CHECK] Token valid for X more minutes
- ❌ [AUTH-CHECK] No auth token found, redirecting to login

#### Token Refresh Timer

- 🔄 [REFRESH-TIMER] Starting token refresh timer
- 💤 [REFRESH-TIMER] System wake detected
- ⏰ [REFRESH-TIMER] Token expiring in X min, refreshing
- ❌ [REFRESH-TIMER] Token expired X min ago
- ✅ [REFRESH-TIMER] Token valid for X more minutes
- ❌ [REFRESH-TIMER] No refresh token available! User will be logged out

#### Token Refresh Function

- 🔄 [TOKEN-REFRESH] Starting token refresh
- ⚠️ [TOKEN-REFRESH] No refresh token available
- 🔄 [TOKEN-REFRESH] Validating current token with Google
- ✅ [TOKEN-REFRESH] Token validated/refreshed
- ❌ [TOKEN-REFRESH] Refresh failed with reason

#### Logout

- 🚪 [LOGOUT] User logging out
- 🚪 [LOGOUT] Clearing localStorage
- 🚪 [LOGOUT] Redirecting to login page

---

## How to Debug with New Logging

### 1. **Check Login Flow**

Look for these logs after login:

```
🔐 [LOGIN] Token exchange response received
🔐 [LOGIN] Access token: YES
🔐 [LOGIN] Refresh token: YES ✅  ← MUST BE YES
🔐 [LOGIN] Expires in: 3600s
✅ [LOGIN] Refresh token stored - persistent session enabled
```

**If you see:**

```
⚠️ [LOGIN] NO REFRESH TOKEN - Session will expire in 1 hour!
```

**Fix:** User needs to revoke app access in Google Account settings and re-login.

---

### 2. **Check Token Refresh**

Look for these logs every 5 minutes:

```
✅ [REFRESH-TIMER] Token valid for X more minutes
```

When token is about to expire:

```
⏰ [REFRESH-TIMER] Token expiring in 8.5 min, refreshing...
🔄 [TOKEN-REFRESH] Starting token refresh...
🔄 [TOKEN-REFRESH] Calling /api/auth/refresh...
✅ [TOKEN-REFRESH] Token refreshed! New token expires in 3600s at 3:45:30 PM
```

---

### 3. **Check for Logout Triggers**

If user gets logged out, look for:

```
❌ [TOKEN-REFRESH] Refresh failed: {...}
❌ [TOKEN-REFRESH] Refresh token invalid/revoked - re-authentication required
❌ [REFRESH-TIMER] Refresh failed, logging out user
🚪 [LOGOUT] User logging out...
```

---

### 4. **Check System Wake**

After computer sleep/wake:

```
💤 [REFRESH-TIMER] System wake detected (12.3 min elapsed), checking token immediately...
```

---

## Testing Checklist

### Test 1: Fresh Login

1. Clear localStorage
2. Login with Google
3. Check console for:
   - ✅ Refresh token received
   - ✅ Token expiry logged
4. **Expected:** Session persists beyond 1 hour

### Test 2: Token Refresh

1. Login and wait 50 minutes
2. Check console every 5 minutes
3. At 50 minutes, should see refresh attempt
4. **Expected:** Token refreshed automatically, no logout

### Test 3: System Sleep/Wake

1. Login
2. Put computer to sleep for 10 minutes
3. Wake computer
4. Check console for system wake detection
5. **Expected:** Token checked/refreshed immediately

### Test 4: No Refresh Token (Edge Case)

1. If user previously authorized app
2. Login may not return refresh_token
3. Check console for warning
4. **Expected:** Warning logged, session expires after 1 hour

---

## Google OAuth Configuration

### Required Scopes

```javascript
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");
```

### OAuth Client Configuration

- **Client Type:** Web Application
- **Authorized redirect URIs:** Must include your app domain
- **Access Type:** Offline (now properly configured)

---

## Known Edge Cases

### 1. **User Previously Authorized App**

- Google may not return refresh_token on subsequent logins
- **Solution:** User must revoke app access in Google Account settings and re-login
- **Detection:** Console will show warning

### 2. **Extension Flow**

- Chrome extension tokens don't have refresh_token
- **Behavior:** Token validated directly with Google
- **Limitation:** Session expires after token lifetime (50 min)

### 3. **Multiple Tabs**

- Token refresh in one tab updates localStorage
- Other tabs detect change via visibility API
- **Behavior:** All tabs stay in sync

### 4. **Network Failures**

- Refresh attempts may fail due to network issues
- **Behavior:** Retry on next timer check (5 min)
- **Fallback:** Logout if token fully expired

---

## Files Modified

1. `app/api/auth/callback/route.ts` - Added `access_type=offline`, comprehensive logging
2. `app/api/auth/refresh/route.ts` - Added detailed refresh logging
3. `app/page.tsx` - Added login flow logging and validation
4. `app/hooks/useAuth.ts` - Added comprehensive auth lifecycle logging

---

## Expected Console Output (Normal Flow)

### On Login:

```
🔐 [LOGIN] Token exchange response received
🔐 [LOGIN] Access token: YES
🔐 [LOGIN] Refresh token: YES ✅
🔐 [LOGIN] Expires in: 3600s
🔐 [LOGIN] User: user@example.com
✅ [LOGIN] Refresh token stored - persistent session enabled
🔐 [LOGIN] Token will expire at: 3:30:00 PM
✅ [LOGIN] Login complete. Redirecting to dashboard...
```

### On Page Load:

```
🔍 [AUTH-CHECK] Starting authentication check...
🔍 [AUTH-CHECK] LocalStorage check:
  - auth_token: EXISTS
  - refresh_token: EXISTS ✅
  - token_expiry: 3:30:00 PM
✅ [AUTH-CHECK] Token valid for 45 more minutes
🔍 [AUTH-CHECK] Initializing app with valid token...
✅ [AUTH-CHECK] Authentication check complete
```

### Every 5 Minutes:

```
✅ [REFRESH-TIMER] Token valid for 40 more minutes
```

### Before Expiry (50 min mark):

```
⏰ [REFRESH-TIMER] Token expiring in 9.8 min, refreshing...
🔄 [TOKEN-REFRESH] Starting token refresh...
🔄 [TOKEN-REFRESH] Calling /api/auth/refresh...
✅ [TOKEN-REFRESH] Token refreshed! New token expires in 3600s at 4:30:00 PM
```

---

## Status

✅ **COMPLETE** - All fixes implemented with comprehensive logging

## Next Steps

1. Deploy changes to production
2. Monitor console logs for any refresh token issues
3. If users still experience logouts, check console for specific error patterns
4. Consider adding user-facing notification when refresh_token is missing

---

## Troubleshooting Guide

### Issue: "NO REFRESH TOKEN" Warning

**Cause:** User previously authorized app, Google not returning refresh_token  
**Fix:**

1. Go to https://myaccount.google.com/permissions
2. Find your app and revoke access
3. Re-login to app

### Issue: Token Refresh Fails

**Cause:** Refresh token expired or revoked  
**Fix:** User must re-login

### Issue: Logout After System Wake

**Cause:** Token expired during sleep, refresh failed  
**Check:** Console logs for refresh attempt details  
**Fix:** Ensure refresh_token exists in localStorage

---

**All authentication lifecycle events are now fully logged and traceable.**
