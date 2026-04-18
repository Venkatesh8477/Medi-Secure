# 🔧 MySQL Connection Setup - COMPLETE GUIDE

## **STEP 1: Find Your MySQL Root Password**

### **Option A: You Just Installed MySQL**
When you installed MySQL, you should have set a password. 

**Common defaults:**
- Windows MySQL: `root` has NO password
- Some installations: Password is blank
- Some installations: Password is set during installation

### **Option B: Reset MySQL Root Password**

If you forgot your password, follow these steps:

#### **For Windows (MySQL 8.0+):**

1. **Stop MySQL Service:**
```powershell
Stop-Service MySQL80
```

2. **Start MySQL without password:**
```powershell
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysqld --skip-grant-tables
```

3. **In a new PowerShell, connect without password:**
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root
```

4. **Inside MySQL, run:**
```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
EXIT;
```

5. **Restart MySQL Service:**
```powershell
Start-Service MySQL80
```

---

## **STEP 2: Update Your .env File**

Edit `c:\Users\nbhar\SMART HMS\backend\.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password    # ← Add your password here
DB_NAME=hospital_management_system
```

**Examples:**
```env
DB_PASSWORD=password123          # If password is "password123"
DB_PASSWORD=                     # If no password (leave blank)
DB_PASSWORD=root                 # If password is "root"
```

---

## **STEP 3: Test MySQL Connection**

### **Option A: Using PowerShell**

```powershell
# Replace YOUR_PASSWORD with your actual password
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $MYSQL_PATH -u root -pYOUR_PASSWORD -e "SELECT 1;"
```

**Examples:**
```powershell
# No password:
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -e "SELECT 1;"

# Password is "mypass":
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pmypass -e "SELECT 1;"
```

### **Option B: Using MySQL GUI**
- Open MySQL Workbench
- Click "Database" → "Manage Connections"
- Create new connection
- Hostname: localhost
- Port: 3306
- Username: root
- Password: [your password]
- Click "Test Connection"

---

## **STEP 4: Create Database with Test Data**

Once connected, run:

```powershell
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# Replace YOUR_PASSWORD with your actual password
& $MYSQL_PATH -u root -pYOUR_PASSWORD < "C:\Users\nbhar\SMART HMS\backend\database\schema_with_data.sql"
```

**If successful, you'll see no errors.**

---

## **STEP 5: Verify Database Created**

```powershell
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# Show all databases
& $MYSQL_PATH -u root -pYOUR_PASSWORD -e "SHOW DATABASES;"

# Show all tables in hospital_management_system
& $MYSQL_PATH -u root -pYOUR_PASSWORD -e "USE hospital_management_system; SHOW TABLES;"

# Show all users
& $MYSQL_PATH -u root -pYOUR_PASSWORD -e "USE hospital_management_system; SELECT id, username, email, role FROM users;"
```

---

## **🔑 What You Need to Know**

| Item | Details |
|------|---------|
| **Host** | localhost |
| **Port** | 3306 |
| **Username** | root |
| **Password** | ??? (Find below) |
| **Database** | hospital_management_system |

---

## **🔍 How to Find Your MySQL Password**

### **Method 1: Check MySQL Installer**
1. Look for MySQL Setup screenshots or notes
2. Check your email for MySQL installation confirmation
3. Check Windows Event Viewer for MySQL install logs

### **Method 2: Try Common Passwords**
```powershell
$passwords = @("", "root", "password", "mysql", "admin", "12345")
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

foreach ($pass in $passwords) {
    Write-Host "Trying password: '$pass'"
    & $MYSQL_PATH -u root "-p$pass" -e "SELECT 1;" 2>&1 | grep -i "access\|error"
}
```

### **Method 3: Check MySQL Configuration**
```powershell
Get-Content "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" | grep -i password
```

### **Method 4: Reset to Empty Password**
```powershell
# Stop MySQL
Stop-Service MySQL80

# Start without password verification
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysqld --skip-grant-tables

# In new PowerShell window:
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root

# Inside MySQL:
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
EXIT;

# Restart MySQL
Start-Service MySQL80
```

---

## **✅ Quick Test Script**

Create a file `test_mysql.ps1`:

```powershell
# Configuration - CHANGE THIS
$MYSQL_USER = "root"
$MYSQL_PASSWORD = "your_password_here"  # ← CHANGE THIS
$MYSQL_HOST = "localhost"
$MYSQL_PORT = 3306
$MYSQL_PATH = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Testing MySQL Connection" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Test 1: Show databases
Write-Host "Test 1: Checking Databases..." -ForegroundColor Yellow
& $MYSQL_PATH -u $MYSQL_USER "-p$MYSQL_PASSWORD" -e "SHOW DATABASES;" 2>&1

# Test 2: Create database if not exists
Write-Host "`nTest 2: Creating/Checking Hospital Database..." -ForegroundColor Yellow
& $MYSQL_PATH -u $MYSQL_USER "-p$MYSQL_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS hospital_management_system;"

# Test 3: Import test data
Write-Host "`nTest 3: Importing Test Data..." -ForegroundColor Yellow
& $MYSQL_PATH -u $MYSQL_USER "-p$MYSQL_PASSWORD" hospital_management_system < "C:\Users\nbhar\SMART HMS\backend\database\schema_with_data.sql" 2>&1

# Test 4: Verify tables
Write-Host "`nTest 4: Verifying Tables..." -ForegroundColor Yellow
& $MYSQL_PATH -u $MYSQL_USER "-p$MYSQL_PASSWORD" -e "USE hospital_management_system; SHOW TABLES;"

# Test 5: Count users
Write-Host "`nTest 5: Counting Test Users..." -ForegroundColor Yellow
& $MYSQL_PATH -u $MYSQL_USER "-p$MYSQL_PASSWORD" -e "USE hospital_management_system; SELECT COUNT(*) as 'Total Users' FROM users;"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✓ All tests completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
```

**Run it:**
```powershell
powershell -ExecutionPolicy Bypass -File "test_mysql.ps1"
```

---

## **📋 Full Setup Checklist**

- [ ] Find your MySQL root password
- [ ] Update `.env` file with password
- [ ] Test MySQL connection
- [ ] Create database with test data
- [ ] Verify all 18 tables created
- [ ] Verify 11 test users created
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Login at http://localhost:3000

---

## **🆘 Still Having Issues?**

### **Connection Refused**
```
MySQL Server might not be running
Solution: Start-Service MySQL80
```

### **Access Denied (wrong password)**
```
Your password is incorrect
Solution: Use Method 4 above to reset
```

### **MySQL not found**
```
MySQL might not be installed
Solution: Install MySQL from https://dev.mysql.com/downloads/mysql/
```

### **Tables not created**
```
Schema import failed
Solution: Check SQL syntax and try again with: 
& $MYSQL_PATH -u root -pPASSWORD < schema_with_data.sql
```

---

## **🚀 Once Connected**

Your `.env` will look like:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mypassword          # ← YOUR PASSWORD
DB_NAME=hospital_management_system
```

Then start backend:
```powershell
cd C:\Users\nbhar\SMART\ HMS\backend
npm start
```

You should see:
```
Hospital Management System Backend
Server running on http://localhost:5000
Database connected ✓
```

---

**Next: Tell me your MySQL password or use the reset method above.** 🔑
