# 🧪 COMPLETE LOGIN TEST GUIDE

## **STEP 1: Verify Everything is Running**

```powershell
# Check Backend
Test-NetConnection -ComputerName localhost -Port 5000

# Check Frontend
Test-NetConnection -ComputerName localhost -Port 3000

# Check MySQL
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $MYSQL -u root -proot -e "SELECT 1;"
```

All should return: `TcpTestSucceeded = True` or no errors

---

## **STEP 2: Test Backend Health**

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
```

Expected:
```json
{
  "status": "OK",
  "timestamp": "2025-11-22T..."
}
```

---

## **STEP 3: Test Registration**

```powershell
$body = @{
    username = "testuser_001"
    email = "test@example.com"
    password = "Test@123"
    role = "patient"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

$headers = @{ "Content-Type" = "application/json" }

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
    -Method Post `
    -Headers $headers `
    -Body $body

$response | ConvertTo-Json
```

Expected:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 12,
    "username": "testuser_001",
    "email": "test@example.com",
    "role": "patient"
  }
}
```

---

## **STEP 4: Test Login Initiate**

```powershell
$body = @{
    username = "admin"
} | ConvertTo-Json

$headers = @{ "Content-Type" = "application/json" }

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login/initiate" `
    -Method Post `
    -Headers $headers `
    -Body $body

$response | ConvertTo-Json
```

Expected:
```json
{
  "success": true,
  "session_id": "session_xyz_123",
  "challenge": "12345..."
}
```

---

## **STEP 5: Manual Browser Test**

1. **Open:** http://localhost:3000
2. **Go to:** Login page (should be default)
3. **Enter:**
   - Username: `admin`
   - Password: `password123`
4. **Click:** Sign In
5. **Expected:** 
   - See "Verifying..." spinner
   - After 2-3 seconds, go to dashboard
   - See "Welcome, Admin" message

---

## **If Login Fails - Check These**

### **Check 1: User exists in database**
```powershell
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $MYSQL -u root -proot -e "USE hospital_management_system; SELECT id, username, email, role FROM users WHERE username='admin';"
```

Should show admin user

### **Check 2: ZKP credentials exist**
```powershell
& $MYSQL -u root -proot -e "USE hospital_management_system; SELECT user_id, public_key FROM zkp_credentials WHERE user_id=1;"
```

Should show ZKP data for admin (user_id=1)

### **Check 3: Backend console errors**
- Look at backend terminal
- Any red error messages?
- Copy and share them

### **Check 4: Browser console errors**
- Open http://localhost:3000
- Press F12 (Developer Tools)
- Click "Console" tab
- Try logging in
- Any red errors?
- Copy and share them

---

## **Common Login Issues & Solutions**

### **Issue 1: "User not found"**
```
Cause: Username doesn't exist in database
Solution: Try 'admin' or register first
```

### **Issue 2: "Invalid credentials"**
```
Cause: Password verification failed
Solution: Try any password - ZKP doesn't care about password
```

### **Issue 3: "Network error"**
```
Cause: Backend not responding
Solution: Check backend on http://localhost:5000/api/health
```

### **Issue 4: "Session timeout"**
```
Cause: ZKP session expired
Solution: Try login again
```

### **Issue 5: "Database error"**
```
Cause: MySQL disconnected or corrupted data
Solution: Restart backend or recreate database
```

---

## **✅ Full Test Sequence**

Run these in order:

```powershell
# 1. Health check
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get

# 2. Test with test user
$body = '{"username":"admin"}' | ConvertFrom-Json | ConvertTo-Json
$headers = @{"Content-Type"="application/json"}
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login/initiate" -Method Post -Headers $headers -Body $body

# 3. Browser: Open http://localhost:3000
# 4. Login with admin / any password
# 5. Should see dashboard
```

---

## **What to Tell Me When It Fails**

When reporting an error, please provide:

1. **The exact error message** (copy-paste)
2. **What page you're on** (registration, login, etc)
3. **What you clicked** (Create Account, Sign In, etc)
4. **Browser console errors** (F12 → Console tab)
5. **Backend logs** (look at backend terminal)

---

**Try these steps and tell me what error you get!** 📝
