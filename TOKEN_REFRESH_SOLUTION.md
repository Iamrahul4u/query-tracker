# Token Refresh Solution

## Problem

Google OAuth tokens expire after 1 hour, causing 401/500 errors and forcing users to re-login.

## Current Implementation

- Chrome extension uses `chrome.identity.getAuthToken()`
- Only access token is stored (no refresh token)
- Token expires after 1 hour
- No automatic refresh mechanism

## Solution Options

### Option 1: Use Chrome Extension Token Refresh (RECOMMENDED)

**How it works:**

- Chrome extension's `chrome.identity.getAuthToken()` automatically refreshes tokens
- Web app requests new token from extension when current expires
- No backend changes needed

**Implementation:**

1. Add message passing between web app and extension
2. Web app detects 401 error
3. Sends message to extension: `chrome.runtime.sendMessage({action: "getToken"})`
4. Extension calls `chrome.identity.getAuthToken({interactive: false})`
5. Returns fresh token to web app
6. Web app retries failed request

**Pros:**

- Simple, no backend needed
- Chrome handles refresh automatically
- Secure (no refresh token in localStorage)

**Cons:**

- Only works when extension is installed
- Requires extension to be running

---

### Option 2: Implement Refresh Token Flow

**How it works:**

- Request offline access in OAuth flow
- Store refresh token securely
- Backend endpoint exchanges refresh token for new access token
- Frontend calls backend when token expires

**Implementation:**

1. Update OAuth scopes to include `access_type=offline`
2. Store refresh token in secure httpOnly cookie
3. Create `/api/auth/refresh` endpoint
4. Frontend calls refresh endpoint before token expires
5. Update stored access token

**Pros:**

- Works without extension
- Industry standard approach
- More control over token lifecycle

**Cons:**

- Requires backend endpoint
- More complex implementation
- Security considerations for refresh token storage

---

### Option 3: Extend Token Lifetime (NOT RECOMMENDED)

**How it works:**

- Use service account instead of OAuth
- Tokens don't expire

**Pros:**

- No refresh needed

**Cons:**

- Less secure
- No user-specific permissions
- Not suitable for multi-user apps

---

## Recommended Approach

**For Chrome Extension Users:**
Implement Option 1 (Extension Token Refresh)

**For Web-Only Users:**
Implement Option 2 (Refresh Token Flow)

---

## Current Status

### ✅ Already Implemented:

- 401 error detection in SyncManager
- Automatic logout on token expiry
- Token validation in useAuth hook

### 🚧 Needs Implementation:

- Extension message passing for token refresh
- OR Backend refresh token endpoint
- Automatic token refresh before expiry

---

## Quick Fix (Temporary)

**Increase session duration by:**

1. Detecting token expiry before it happens
2. Prompting user to re-authenticate
3. Showing "Session expiring soon" notification at 50 minutes

**Implementation:**

```typescript
// In useAuth.ts
useEffect(() => {
  const checkExpiry = setInterval(() => {
    const expiry = localStorage.getItem("token_expiry");
    if (expiry && Date.now() >= Number(expiry) - 5 * 60 * 1000) {
      // 5 minutes before expiry
      showToast("Session expiring soon. Please refresh.", "warning");
    }
  }, 60000); // Check every minute

  return () => clearInterval(checkExpiry);
}, []);
```

---

## API 500 Errors

The current 500 errors are NOT token expiry issues. They indicate:

1. Google Sheets API quota exceeded
2. Spreadsheet permissions issue
3. Invalid spreadsheet ID
4. Network/connectivity problem

**To debug:**

1. Check server logs for detailed error
2. Verify spreadsheet ID is correct
3. Check Google Cloud Console for API quotas
4. Verify service account has spreadsheet access

---

## Next Steps

1. **Immediate:** Add better error messages to identify 500 error cause
2. **Short-term:** Implement Option 1 (Extension token refresh)
3. **Long-term:** Implement Option 2 (Refresh token flow) for web-only users
