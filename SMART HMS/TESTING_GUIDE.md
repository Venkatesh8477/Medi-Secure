# 🧪 COMPLETE TESTING GUIDE

## **STEP 1: Start Backend Server**

```powershell
# Open Terminal 1
cd "C:\Users\nbhar\SMART HMS\backend"
npm start
```

**Expected Output:**
```
Hospital Management System Backend
Server running on http://localhost:5000
Database connected ✓
```

✅ If you see this, backend is working!

---

## **STEP 2: Start Frontend Server**

```powershell
# Open Terminal 2
cd "C:\Users\nbhar\SMART HMS\frontend"
npm start
```

**Expected Output:**
```
Compiled successfully!
Local: http://localhost:3000
```

✅ Browser will automatically open http://localhost:3000

---

## **STEP 3: Test Backend Connection**

In your browser or PowerShell, test the health endpoint:

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-11-22T..."
}
```

✅ Backend is connected to database!

---

## **STEP 4: Test Registration (Create New User)**

### **Via Frontend:**

1. Visit: **http://localhost:3000**
2. Click **"Create Account"** or go to `/register`
3. Fill in the form:
   ```
   First Name: John
   Last Name: Doe
   Username: john_test_001
   Email: john@test.com
   Password: Test@123
   Confirm Password: Test@123
   Role: patient
   ```
4. Click **"Create Account"**

**Expected Result:**
```
✓ Success message appears
✓ Auto-redirect to login page after 2 seconds
```

---

## **STEP 5: Test Login (ZKP Authentication)**

### **Via Frontend:**

1. You're on login page: **http://localhost:3000/login**
2. Enter credentials:
   ```
   Username: john_test_001 (from step 4)
   Password: Test@123
   ```
3. Click **"Sign In"**

**Expected Result:**
```
✓ "Verifying your identity with ZKP..." spinner shows
✓ After 2-3 seconds, redirects to dashboard
✓ Dashboard shows your name and role
```

✅ ZKP Authentication worked!

---

## **STEP 6: Test With Pre-Created Users**

You have 11 test users already in database. Try them:

### **Admin Account**
```
Username: admin
Password: any_password (uses ZKP)
```

### **Doctor Account**
```
Username: dr_smith
Password: any_password (uses ZKP)
```

### **Patient Account**
```
Username: patient_john
Password: any_password (uses ZKP)
```

### **Steps:**
1. Visit http://localhost:3000/login
2. Enter username: `admin`
3. Enter password: `test123` (or any password)
4. Click "Sign In"
5. You should see dashboard with admin role

---

## **STEP 7: Test Dashboard**

After login, you'll see:

### **Admin Dashboard Shows:**
- Welcome message
- Your name and role
- Auth status: "ZKP Secured"
- Account status: "Active"
- Security features list
- Available features grid

### **Different Roles Show Different Features:**

**Doctor Dashboard:**
- View Patients button
- Add Diagnosis button
- Prescriptions button

**Nurse Dashboard:**
- Vital Signs button
- Medications button
- Progress Notes button

**Patient Dashboard:**
- Medical Records button
- Appointments button
- Prescriptions button

---

## **STEP 8: Verify Database with MySQL**

Open new PowerShell and check database directly:

```powershell
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# Check all tables
& $MYSQL -u root -proot -e "USE hospital_management_system; SHOW TABLES;" 2>&1 | grep -v Warning

# Check all users
& $MYSQL -u root -proot -e "USE hospital_management_system; SELECT id, username, email, role FROM users;" 2>&1 | grep -v Warning

# Check appointments
& $MYSQL -u root -proot -e "USE hospital_management_system; SELECT * FROM appointments;" 2>&1 | grep -v Warning
```

---

## **STEP 9: Test API Endpoints**

### **Test Registration Endpoint**

```powershell
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    username = "test_user_123"
    email = "test@example.com"
    password = "Test@123"
    role = "patient"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
    -Method Post `
    -Headers $headers `
    -Body $body

$response
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 12,
    "username": "test_user_123",
    "email": "test@example.com",
    "role": "patient"
  }
}
```

---

## **STEP 10: Test Login API Endpoint**

### **Test Login Initiate**

```powershell
$headers = @{ "Content-Type" = "application/json" }

$body = @{
    username = "test_user_123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login/initiate" `
    -Method Post `
    -Headers $headers `
    -Body $body

$response
```

**Expected Response:**
```json
{
  "success": true,
  "session_id": "session_xyz_123",
  "challenge": 12345
}
```

---

## **✅ COMPLETE TEST CHECKLIST**

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Health check endpoint works (http://localhost:5000/api/health)
- [ ] Registration page loads (http://localhost:3000/register)
- [ ] Can create new user via registration form
- [ ] Can login with new user
- [ ] ZKP spinner shows during login
- [ ] Dashboard appears after login
- [ ] Logout button works
- [ ] Can login with test user (admin, dr_smith, etc)
- [ ] Different roles show different dashboards
- [ ] MySQL database has 21 tables
- [ ] MySQL database has 11+ users
- [ ] API endpoints respond correctly

---

## **🐛 TROUBLESHOOTING**

### **Backend Won't Start**

```powershell
# Check port is not in use
Get-NetTCPConnection -LocalPort 5000 | Select-Object State, OwningProcess

# Kill process on port 5000
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force

# Try starting again
npm start
```

### **Frontend Won't Start**

```powershell
# Clear cache
rmdir /s /q node_modules
del package-lock.json
npm install
npm start
```

### **Can't Login**

1. Check backend is running: `http://localhost:5000/api/health`
2. Check username exists in database
3. Check MySQL connection: `mysql -u root -proot -e "SELECT 1;"`
4. Check .env has correct DB credentials

### **Database Not Found**

```powershell
# Create database
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $MYSQL -u root -proot -e "CREATE DATABASE hospital_management_system;"

# Import schema
Get-Content "C:\Users\nbhar\SMART HMS\backend\database\schema_with_data.sql" | & $MYSQL -u root -proot
```

---

## **📊 TEST DATA REFERENCE**

### **Test Users Available**

| Username | Password | Role |
|----------|----------|------|
| admin | any | Admin |
| dr_smith | any | Doctor |
| dr_jones | any | Doctor |
| nurse_sarah | any | Nurse |
| nurse_mike | any | Nurse |
| pharmacist_bob | any | Pharmacist |
| lab_tech_alice | any | Lab Technician |
| receptionist_emma | any | Receptionist |
| patient_john | any | Patient |
| patient_jane | any | Patient |
| patient_bob | any | Patient |

*Note: Any password works with ZKP authentication*

---

## **📋 TEST SCENARIOS**

### **Scenario 1: Full Registration & Login Flow**

1. Register new user at http://localhost:3000/register
2. Fill all fields
3. Click Create Account
4. Auto-redirected to login
5. Enter same username & password
6. See dashboard
7. Click logout
8. Redirected to login

**Expected:** All steps work smoothly

### **Scenario 2: Doctor Workflow**

1. Login as dr_smith
2. See doctor features
3. Click "View Patients"
4. See patient list
5. Click on patient
6. Add diagnosis
7. Add prescription
8. Logout

**Expected:** All actions work

### **Scenario 3: Patient Workflow**

1. Login as patient_john
2. See patient features
3. View appointments
4. View medical records
5. View prescriptions
6. Logout

**Expected:** All patient data shows

### **Scenario 4: Admin Workflow**

1. Login as admin
2. See admin features
3. View all users
4. View reports
5. View audit logs
6. Logout

**Expected:** All admin features work

---

## **📈 PERFORMANCE TESTING**

### **Test Response Time**

```powershell
# Measure login time
$start = Get-Date
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
$end = Get-Date
$duration = ($end - $start).TotalMilliseconds
Write-Host "Response time: $duration ms"
```

**Expected:** < 100ms

---

## **🔒 Security Testing**

### **Test Unauthorized Access**

```powershell
# Try to access without token
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method Get -ErrorAction SilentlyContinue
```

**Expected:** Error 401 Unauthorized

### **Test Invalid Role**

Create user as patient, try to access doctor endpoints - should fail

---

## **✨ SUCCESS INDICATORS**

You'll know everything is working when:

```
✓ http://localhost:5000 → Backend running
✓ http://localhost:3000 → Frontend running
✓ Registration works → New users created
✓ Login works → ZKP authentication succeeds
✓ Dashboard loads → Role-based UI shows
✓ Logout works → Session cleared
✓ Database has data → 21 tables, 11+ users
✓ API responds → Endpoints work correctly
```

---

**Start with STEP 1 and work your way down. Report any errors and we'll fix them!** 🚀
