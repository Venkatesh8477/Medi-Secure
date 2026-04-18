# 🚀 MYSQL CONNECTION - QUICK SETUP

## **YOUR SITUATION**

✗ MySQL is installed but needs password  
✗ Cannot connect without password  
✗ Need to create database and tables  
✓ Backend and Frontend are ready  

---

## **🔑 FIND YOUR MYSQL PASSWORD**

### **What you need to do:**

1. **Check where you installed MySQL** - Did you set a password?
2. **Look in your notes/emails** for MySQL setup details
3. **Try these common passwords:**
   - (empty - just press enter)
   - `root`
   - `password`
   - `mysql`
   - `admin`
   - Your Windows password

### **If you forgot it - RESET IT**

```powershell
# 1. Stop MySQL
Stop-Service MySQL80

# 2. Start without password check
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
.\mysqld --skip-grant-tables

# 3. In NEW PowerShell window, run:
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root

# 4. Paste this in MySQL:
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'password123';
EXIT;

# 5. Restart MySQL
Start-Service MySQL80

# Now your password is: password123
```

---

## **⚡ AUTO SETUP (EASIEST)**

Once you know your password, run this PowerShell script:

```powershell
cd "C:\Users\nbhar\SMART HMS\backend\database"
# If you know password:
.\setup_db.ps1
# Or pass password directly:
.\setup_db.ps1 -MySQLPassword "your_password_here"
```

**This will:**
- ✓ Test MySQL connection
- ✓ Create database (hospital_management_system)
- ✓ Create 18 tables
- ✓ Add 11 test users
- ✓ Add sample data

---

## **📝 MANUAL SETUP**

### **Step 1: Update .env file**

Edit: `C:\Users\nbhar\SMART HMS\backend\.env`

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here    # ← REPLACE THIS
DB_NAME=hospital_management_system
```

### **Step 2: Import Database**

```powershell
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$SCHEMA = "C:\Users\nbhar\SMART HMS\backend\database\schema_with_data.sql"

# Replace YOUR_PASSWORD with your actual password
& $MYSQL -u root -pYOUR_PASSWORD < $SCHEMA
```

### **Step 3: Verify It Worked**

```powershell
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# Show all tables
& $MYSQL -u root -pYOUR_PASSWORD -e "USE hospital_management_system; SHOW TABLES;"

# Show test users
& $MYSQL -u root -pYOUR_PASSWORD -e "USE hospital_management_system; SELECT username, role FROM users;"
```

**You should see 18 tables and 11 users**

---

## **✅ CHECKLIST**

Before moving forward:

- [ ] Found your MySQL password
- [ ] Updated `.env` with password
- [ ] Ran setup script (auto or manual)
- [ ] Verified 18 tables created
- [ ] Verified 11 test users created
- [ ] Can connect to MySQL from PowerShell

---

## **🏃 THEN RUN THIS**

### **Terminal 1 - Backend**
```powershell
cd "C:\Users\nbhar\SMART HMS\backend"
npm start
```

**You should see:**
```
Hospital Management System Backend
Server running on http://localhost:5000
Database connected ✓
```

### **Terminal 2 - Frontend**
```powershell
cd "C:\Users\nbhar\SMART HMS\frontend"
npm start
```

**Browser will open http://localhost:3000**

---

## **🧪 TEST LOGIN**

Visit: **http://localhost:3000**

Try any of these usernames:
```
admin, dr_smith, dr_jones, nurse_sarah, 
nurse_mike, pharmacist_bob, lab_tech_alice, 
receptionist_emma, patient_john, patient_jane, patient_bob
```

Password: Use ZKP authentication (any password works)

---

## **📞 TROUBLESHOOTING**

### **"Access denied for user 'root'@'localhost'"**
→ Your password is wrong. Use RESET method above

### **"mysql: command not found"**
→ MySQL not in PATH. Use full path:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pyourpass -e "SELECT 1;"
```

### **"Can't connect to MySQL server"**
→ MySQL not running. Start it:
```powershell
Start-Service MySQL80
```

### **"ERROR 2002: Can't connect to local MySQL server"**
→ MySQL crashed. Restart it:
```powershell
Stop-Service MySQL80
Start-Service MySQL80
Start-Sleep 3
# Try again
```

### **Tables not created**
→ Schema import failed. Check SQL file is correct:
```powershell
Test-Path "C:\Users\nbhar\SMART HMS\backend\database\schema_with_data.sql"
```

---

## **🎯 KEY FILES**

| File | Purpose |
|------|---------|
| `backend\.env` | Database credentials |
| `backend\database\schema_with_data.sql` | Database schema + test data |
| `backend\database\setup_db.ps1` | Auto setup script (PowerShell) |
| `backend\database\setup_db.bat` | Auto setup script (Batch) |

---

## **💾 DATABASE STRUCTURE**

**18 Tables:**
- Core: users, zkp_credentials, zkp_sessions
- Staff: doctors, nurses, pharmacists, lab_technicians, receptionists
- Patients: patients, appointments
- Medical: diagnoses, vital_signs
- Prescriptions: medications, prescriptions
- Lab: lab_requests, lab_results
- Admin: medication_administration, daily_progress, patient_documents, staff_attendance, audit_log

**11 Test Users:**
- 1 Admin
- 2 Doctors
- 2 Nurses
- 1 Pharmacist
- 1 Lab Technician
- 1 Receptionist
- 3 Patients

---

## **⏱️ EXPECTED TIMES**

| Task | Time |
|------|------|
| Find/set password | 2-5 min |
| Run auto setup | 1 min |
| Backend startup | 5 sec |
| Frontend startup | 10 sec |
| First login | 2 sec |
| **Total** | ~5-15 min |

---

## **🚀 READY TO GO?**

1. Tell me your MySQL password (or use reset method)
2. Run the setup script
3. Start both servers
4. Login at http://localhost:3000

**Any issues? Follow troubleshooting above or share your error message.** ✅

