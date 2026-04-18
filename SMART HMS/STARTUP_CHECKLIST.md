# ✅ STARTUP CHECKLIST - Hospital Management System

## 🎯 Pre-Startup Verification

### System Requirements
- [ ] Node.js 14+ installed (`node --version`)
- [ ] MySQL 5.7+ installed and running (`mysql --version`)
- [ ] Git installed (optional for version control)
- [ ] 8GB RAM available
- [ ] 500MB disk space free

### Ports Available
- [ ] Port 3000 free (frontend)
- [ ] Port 5000 free (backend)
- [ ] Port 3306 free (MySQL)

---

## 📋 Setup Checklist

### Step 1: Backend Installation

```powershell
# Navigate to backend
cd backend

# ✓ Check if package.json exists
# Should show: hospital-management-system-backend

# Install dependencies
npm install
# ✓ Should see: added X packages

# Verify installation
npm ls
# ✓ Should list: express, mysql2, jsonwebtoken, bcryptjs, dotenv

# Check .env file
type .env
# ✓ Should have: DB_HOST, DB_USER, JWT_SECRET, etc
```

### Step 2: Database Setup

```powershell
# Start MySQL
net start MySQL
# ✓ Should see: The MySQL service is starting...

# Create database
mysql -u root -p

# Inside MySQL:
CREATE DATABASE hospital_management_system;
# ✓ Should see: Query OK, 1 row affected

USE hospital_management_system;
SHOW TABLES;
# ✓ Should be empty (0 rows)

EXIT;

# Import schema
mysql -u root -p hospital_management_system < backend/database/schema.sql
# ✓ Should complete without errors

# Verify tables created
mysql -u root -p hospital_management_system
SHOW TABLES;
# ✓ Should show 14 tables

SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'hospital_management_system';
# ✓ Should return: 18 rows (14 main + 4 information_schema)

EXIT;
```

### Step 3: Backend Startup

```powershell
# In backend directory
npm start
# ✓ Should see:
# ✓ Hospital Management System Backend
# ✓ Server running on http://localhost:5000
# ✓ ZKP Authentication enabled
```

### Step 4: Backend Verification

```powershell
# In another terminal/PowerShell window
# Test backend is running
curl http://localhost:5000/api/health
# ✓ Should return: {"status":"OK","timestamp":"..."}

# Or use browser:
# Visit: http://localhost:5000/api/health
```

### Step 5: Frontend Installation

```powershell
# In new terminal/PowerShell window
cd frontend

# Install dependencies
npm install
# ✓ Should see: added X packages

# Verify installation
npm ls react react-dom
# ✓ Should show version numbers
```

### Step 6: Frontend Startup

```powershell
# In frontend directory
npm start
# ✓ Should see:
# ✓ Compiled successfully!
# ✓ App opens at http://localhost:3000
```

### Step 7: Frontend Verification

```
1. ✓ Browser opens http://localhost:3000
2. ✓ Login page displays
3. ✓ Register button works
4. ✓ Login button works
5. ✓ No JavaScript errors (check F12 console)
```

---

## 🧪 Functional Testing

### Test 1: Registration

```
1. Go to http://localhost:3000/register
2. Fill form:
   ✓ First Name: Test
   ✓ Last Name: User
   ✓ Username: testuser123
   ✓ Email: test@hospital.com
   ✓ Role: patient
   ✓ Password: TestPass@123
   ✓ Confirm: TestPass@123
3. Click "Create Account"
4. ✓ See success message
5. ✓ Redirect to login after 2 seconds
```

### Test 2: Login

```
1. Go to http://localhost:3000/login
2. Enter credentials:
   ✓ Username: testuser123
   ✓ Password: TestPass@123
3. Click "Sign In"
4. ✓ See "Verifying your identity with ZKP..."
5. ✓ Spinner displays
6. ✓ After 2-3 seconds, redirect to dashboard
7. ✓ Dashboard displays user info
```

### Test 3: Dashboard Display

```
1. ✓ User info shows (username and role)
2. ✓ Navbar displays with username
3. ✓ "Your Role" shows "PATIENT"
4. ✓ "Authentication" shows "ZKP Secured"
5. ✓ "Status" shows "Active"
6. ✓ Features section shows patient features
7. ✓ Security information displays
8. ✓ Logout button visible
```

### Test 4: Logout

```
1. Click "Logout" button
2. ✓ Redirect to login page
3. ✓ Token cleared from localStorage
4. ✓ Session cleared
5. ✓ Cannot access /dashboard (redirects to login)
```

### Test 5: Database Verification

```powershell
# Connect to database
mysql -u root -p hospital_management_system

# Check users were created
SELECT * FROM users;
# ✓ Should show testuser123

# Check ZKP credentials stored
SELECT * FROM zkp_credentials;
# ✓ Should show public_key and encrypted secret

# Check login sessions
SELECT * FROM zkp_sessions;
# ✓ Should be empty (sessions deleted after login)

# Exit
EXIT;
```

### Test 6: API Endpoints

```powershell
# Get current user (need token)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/me

# Register new user
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "username":"doctor1",
    "email":"doctor@test.com",
    "password":"DocPass@123",
    "role":"doctor",
    "firstName":"John",
    "lastName":"Doctor"
  }'
# ✓ Should return: success: true
```

---

## 🔍 Troubleshooting During Startup

### Issue: "ECONNREFUSED" on npm install

**Solution:**
```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -r node_modules package-lock.json

# Try again
npm install
```

### Issue: MySQL won't start

**Solution:**
```powershell
# Restart MySQL
net stop MySQL
net start MySQL

# Or check status
sc query MySQL
```

### Issue: Port 5000 or 3000 already in use

**Solution:**
```powershell
# Find process using port
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F

# Or change port in .env (PORT=5001)
```

### Issue: Database connection failed

**Solution:**
```powershell
# Check database exists
mysql -u root -p
SHOW DATABASES;
# Should show hospital_management_system

# Check tables exist
USE hospital_management_system;
SHOW TABLES;
# Should show 14 tables

# Check .env credentials
type backend\.env
# Verify DB_USER, DB_PASSWORD, DB_NAME
```

### Issue: Login fails with "Session not found"

**Solution:**
```
1. Session expires after 5 minutes
2. Register a new user if session expired
3. Try login immediately after registration
4. Check server console for detailed error
```

---

## ✅ Final Verification Checklist

Before Considering Complete:

- [ ] Backend server running on http://localhost:5000
- [ ] Frontend app running on http://localhost:3000
- [ ] Database has 14 tables
- [ ] Register page loads and works
- [ ] Login page loads and works
- [ ] ZKP proof generation works (spinner shows)
- [ ] Dashboard displays after login
- [ ] Logout works
- [ ] Database records created for user
- [ ] No JavaScript errors in console (F12)
- [ ] No errors in backend terminal
- [ ] MySQL queries work (can inspect DB)

---

## 🚀 Go-Live Checklist

When Ready to Test with Others:

- [ ] Backend security configured
- [ ] Database backups setup
- [ ] Error logging enabled
- [ ] Production .env configured
- [ ] JWT_SECRET updated (strong random)
- [ ] Database password secured
- [ ] HTTPS certificates ready (for production)
- [ ] Rate limiting considered
- [ ] Load testing performed
- [ ] Documentation reviewed
- [ ] Monitoring setup
- [ ] Disaster recovery plan

---

## 📞 Common First Steps

### I'm all set up, what now?

```
1. ✓ Create test accounts for each role
2. ✓ Test role-based access
3. ✓ Verify database contains records
4. ✓ Test all role dashboards
5. ✓ Customize UI with your branding
6. ✓ Add hospital-specific data
```

### I want to add features

```
1. ✓ Add new endpoint in backend routes
2. ✓ Add controller function
3. ✓ Test with curl or Postman
4. ✓ Create React component
5. ✓ Add routing
6. ✓ Test UI
```

### I want to deploy

```
1. ✓ Update all configuration
2. ✓ Use production database
3. ✓ Setup SSL/HTTPS
4. ✓ Configure domain names
5. ✓ Setup backups
6. ✓ Monitor performance
```

---

## 📚 Next Documentation to Read

After Setup Complete:

1. **QUICK_REFERENCE.md** - Quick commands
2. **README.md** - Feature overview
3. **Hospital_Management_System_Architecture.md** - System design
4. **ZKP_Flow_Alice_Example.md** - Understanding authentication
5. **COMPLETE_SETUP_GUIDE.md** - Detailed instructions

---

## 🎉 You're Ready!

Once all checkmarks are complete:
- ✅ System is running
- ✅ All features working
- ✅ Ready to test
- ✅ Ready to customize
- ✅ Ready to deploy

---

**System Status: ✅ READY TO USE**

For issues, check COMPLETE_SETUP_GUIDE.md or QUICK_REFERENCE.md
