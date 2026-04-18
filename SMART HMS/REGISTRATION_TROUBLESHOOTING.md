# 🔧 REGISTRATION FAILED - TROUBLESHOOTING

## **Common Registration Errors & Solutions**

---

## **Error 1: "Database Connection Error"**

**Cause:** Backend can't reach MySQL

**Solution:**
```powershell
# Check MySQL is running
Get-Service MySQL80

# If stopped, start it
Start-Service MySQL80

# Restart backend
cd "C:\Users\nbhar\SMART HMS\backend"
npm start
```

---

## **Error 2: "Access denied for user 'root'@'localhost'"**

**Cause:** Wrong database credentials in .env

**Solution:**
Check `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=hospital_management_system
```

If password is wrong, update it and restart backend.

---

## **Error 3: "Username already exists"**

**Cause:** Username is taken

**Solution:**
- Use a different username
- Try: `testuser_` + random numbers

Example:
```
Username: testuser_12345
Email: test@example.com
Password: Test@123
```

---

## **Error 4: "Network Error" or "Can't connect to server"**

**Cause:** Backend not running or wrong port

**Solution:**
1. Check backend is running:
```powershell
Test-NetConnection -ComputerName localhost -Port 5000
```

2. If not running:
```powershell
cd "C:\Users\nbhar\SMART HMS\backend"
npm start
```

3. Check no other process on port 5000:
```powershell
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
```

---

## **Error 5: "Invalid Email Format"**

**Cause:** Email doesn't look valid

**Solution:**
Use format: `something@example.com`

Valid examples:
- test@example.com
- user123@test.com
- john.doe@hospital.com

---

## **Error 6: "Password Too Weak"**

**Cause:** Password doesn't meet requirements

**Solution:**
Use password with:
- At least 8 characters
- Mix of letters and numbers
- Special character (optional)

Valid examples:
- Test@123
- Password123!
- MySecurePass01

---

## **✅ CORRECT REGISTRATION FORM**

```
First Name:      John
Last Name:       Doe
Username:        johndoe_001
Email:           john@example.com
Password:        Test@123
Confirm Password: Test@123
Role:            patient
```

Then click: **Create Account**

Expected result:
- "✓ Registration successful!"
- Auto-redirect to login page after 2 seconds

---

## **🧪 TEST REGISTRATION STEPS**

1. **Go to registration page:**
   - http://localhost:3000/register

2. **Fill the form:**
   ```
   First Name: Test
   Last Name: User
   Username: testuser_001
   Email: testuser@example.com
   Password: Test@123
   Confirm: Test@123
   Role: patient
   ```

3. **Click "Create Account"**

4. **Check for errors:**
   - Look at error message
   - Check browser console (F12 → Console)
   - Check backend logs

---

## **📊 TEST WITH API**

Test registration directly with API:

```powershell
$headers = @{"Content-Type"="application/json"}

$body = @{
    username = "apitest_001"
    email = "apitest@example.com"
    password = "Test@123"
    role = "patient"
    firstName = "API"
    lastName = "Test"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
    -Method Post `
    -Headers $headers `
    -Body $body `
    -ErrorAction SilentlyContinue

$response | ConvertTo-Json
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 12,
    "username": "apitest_001",
    "email": "apitest@example.com",
    "role": "patient"
  }
}
```

---

## **🔍 DEBUG STEPS**

### **Step 1: Check Backend Running**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

Expected:
```json
{"status":"OK","timestamp":"..."}
```

### **Step 2: Check MySQL Connected**
```powershell
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $MYSQL -u root -proot -e "SELECT 1;"
```

Expected: No error

### **Step 3: Check Users Table**
```powershell
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $MYSQL -u root -proot -e "USE hospital_management_system; SELECT COUNT(*) FROM users;"
```

Expected: Number of users (should be 11+)

### **Step 4: Check Browser Console**
- Open http://localhost:3000
- Press F12 (Developer Tools)
- Click "Console" tab
- Try registering again
- Look for JavaScript errors

---

## **📋 FULL SETUP VERIFICATION**

```powershell
# 1. Check MySQL running
Get-Service MySQL80

# 2. Check database exists
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $MYSQL -u root -proot -e "SHOW DATABASES;" | findstr hospital

# 3. Check tables exist
& $MYSQL -u root -proot -e "USE hospital_management_system; SHOW TABLES;" | findstr users

# 4. Check backend running
Test-NetConnection -ComputerName localhost -Port 5000 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded

# 5. Check frontend running
Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded
```

All should show:
- ✓ MySQL80: Running
- ✓ Database: hospital_management_system found
- ✓ Tables: users found
- ✓ Backend: TcpTestSucceeded = True
- ✓ Frontend: TcpTestSucceeded = True

---

## **🚀 IF STILL NOT WORKING**

1. **Tell me the exact error message** you see
2. **Check browser console** (F12 → Console tab)
3. **Copy error text** and share it
4. **We'll debug together!**

---

## **✨ SUCCESSFUL REGISTRATION LOOKS LIKE:**

1. You see: "Registration successful ✓"
2. Page says: "Redirecting to login..."
3. After 2 seconds: Sent to login page
4. You can now login with new account

---

**What is the exact error message you see?** 📝
