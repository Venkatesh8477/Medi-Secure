# Quick Test: Register a Receptionist 👤

## Step-by-Step Instructions

### 1. Open Registration Page
```
http://localhost:3000/register
```

### 2. Fill Out Form
| Field | Value |
|-------|-------|
| First Name | John |
| Last Name | Doe |
| Username | receptionist_john |
| Email | john@hospital.local |
| **Role** | **Receptionist** ⭐ |
| Password | Password123 |
| Confirm Password | Password123 |

### 3. Click "Create Account"

### 4. You Should See:
✅ "Registration successful! Redirecting to login..."

### 5. Login With:
- Username: `receptionist_john`
- Password: `Password123`

### 6. You Should See:
✅ Receptionist Dashboard with tabs:
- 📊 Dashboard (overview)
- 👥 Register Patient
- 📅 Book Appointment  
- ⚠️ Mark Staff Absence
- 👥 Patients List
- 📋 Appointments
- 👨‍💼 Staff Members

---

## If It Still Doesn't Work

### Check 1: Backend Running?
```powershell
cd "c:\Users\nbhar\SMART HMS\backend"
npm start
```

### Check 2: Database Tables Exist?
Connect to MySQL and run:
```sql
SHOW TABLES;
-- Should see: receptionists table
DESCRIBE receptionists;
-- Should show: id, user_id, department, phone_extension, created_at, updated_at
```

### Check 3: Browser Console
Open DevTools (F12) → Console tab → Check for errors

### Check 4: Backend Logs
Check terminal where backend is running for error messages

---

## Success Indicators ✅

- ✅ Registration form accepts "Receptionist" role
- ✅ "Create Account" button submits successfully
- ✅ Redirected to login page
- ✅ Can login with new credentials
- ✅ Dashboard loads without errors
- ✅ Can register patients
- ✅ Can book appointments

---

## Related Users to Test With

| Username | Password | Role |
|----------|----------|------|
| receptionist_john | Password123 | Receptionist |
| receptionist_priya | Receptionist@123 | Receptionist (pre-existing) |
| nurse_sarah | Nurse@123 | Nurse (pre-existing) |
| doctor_smith | Doctor@123 | Doctor (pre-existing) |

---

## Files Changed

1. `backend/database/schema.sql` - Added receptionists, pharmacists, lab_technicians tables
2. `backend/controllers/authController.js` - Auto-create role-specific records on registration

---

## Next Steps After Testing

1. ✅ Verify receptionist can register
2. ✅ Verify receptionist can login
3. ✅ Verify receptionist dashboard loads
4. ✅ Test receptionist features:
   - Register patient
   - Book appointment
   - Mark staff absence
5. ✅ Test API endpoints work correctly
