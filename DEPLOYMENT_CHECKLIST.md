# Deployment Checklist

## ✅ Pre-Deployment Verification

### Code Quality

- [x] All console statements removed
- [x] No TypeScript errors
- [x] Production build successful
- [x] All diagnostics clean

### Features Verified

- [x] Date format: DD/MM/YYYY (5/2/2026 = Feb 5th)
- [x] Deletion approval: Optimistic updates with rollback
- [x] Auto-save in AddQueryModal (10 seconds)
- [x] Compact pending deletions display
- [x] Searchable user dropdown in EditQueryModal
- [x] Assign dropdown scroll fix
- [x] Sort controls visibility fix
- [x] Detail view with multiple date badges
- [x] Bucket heights adjust with filter bar
- [x] Expanded bucket modal in linear view

### Environment Setup Required

1. **Environment Variables** (`.env.local`)

   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback
   SPREADSHEET_ID=your_spreadsheet_id
   ```

2. **Google OAuth Setup**
   - Enable Google Sheets API
   - Configure OAuth consent screen
   - Add authorized redirect URIs
   - Include offline access scope for refresh tokens

3. **Google Sheets Structure**
   - Queries sheet: Columns A-W (22 columns)
   - Users sheet: Columns A-F (6 columns including Display Name)
   - Preferences sheet: Columns A-E (5 columns)

## 🚀 Deployment Steps

### Option 1: Vercel (Recommended)

1. **Connect Repository**

   ```bash
   vercel
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all variables from `.env.local`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Manual Deployment

1. **Build**

   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## 📋 Post-Deployment Verification

### Critical Functionality

- [ ] Login with Google OAuth works
- [ ] Token refresh works (test after 1 hour)
- [ ] Queries load from Google Sheets
- [ ] Add query works
- [ ] Assign query works
- [ ] Edit query works
- [ ] Delete request works (Junior)
- [ ] Approve/Reject deletion works (Admin)
- [ ] Status transitions work
- [ ] Preferences save to localStorage and backend
- [ ] Auto-refresh works (60 seconds)

### UI/UX

- [ ] Bucket view displays correctly
- [ ] User view displays correctly
- [ ] Linear view works
- [ ] Detail view shows multiple dates
- [ ] Sorting works
- [ ] Filtering works
- [ ] Responsive on mobile
- [ ] Tooltips show audit trail
- [ ] Toast notifications appear

### Performance

- [ ] Initial load < 3 seconds
- [ ] Optimistic updates feel instant
- [ ] No console errors in browser
- [ ] No memory leaks (check after 30 minutes)

## 🔧 Troubleshooting

### Common Issues

**1. "Unauthorized" errors**

- Check Google OAuth credentials
- Verify redirect URI matches exactly
- Ensure refresh token is being received

**2. "Failed to fetch data"**

- Verify SPREADSHEET_ID is correct
- Check Google Sheets API is enabled
- Ensure service account has access

**3. Dates showing wrong**

- Verify Google Sheets uses DD/MM/YYYY format
- Check timezone settings (IST = UTC+5:30)

**4. Auto-logout issues**

- Ensure refresh token is being stored
- Check token refresh endpoint works
- Verify refresh happens before expiry

## 📊 Monitoring

### Key Metrics to Watch

- Login success rate
- API response times
- Error rates
- Token refresh success rate
- User session duration

### Logs to Monitor

- Authentication failures
- API errors
- Token refresh failures
- Google Sheets API rate limits

## 🔐 Security Checklist

- [ ] Environment variables not committed to git
- [ ] OAuth credentials secure
- [ ] HTTPS enabled in production
- [ ] CORS configured correctly
- [ ] Rate limiting considered
- [ ] Input validation in place

## 📝 Known Limitations

1. **Google Sheets API Limits**
   - 100 requests per 100 seconds per user
   - 500 requests per 100 seconds per project

2. **Token Expiry**
   - Access tokens expire after 1 hour
   - Refresh tokens must be obtained on first login

3. **Concurrent Edits**
   - Last write wins (no conflict resolution)
   - Consider implementing optimistic locking if needed

## 🎯 Success Criteria

Deployment is successful when:

- ✅ All users can login
- ✅ All CRUD operations work
- ✅ No console errors
- ✅ Performance is acceptable
- ✅ Auto-refresh works
- ✅ Token refresh works
- ✅ Mobile responsive

---

**Last Updated:** Ready for deployment
**Build Status:** ✅ Passing
**Console Logs:** ✅ All removed
**TypeScript:** ✅ No errors
