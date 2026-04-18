# 📊 Database Setup & Test Data Guide

## **Quick Setup (2 minutes)**

### **Option 1: Using Batch Script (Easiest)**

```powershell
# Run the setup script
cd c:\Users\nbhar\SMART\ HMS\backend\database
.\setup_db.bat
# Follow the prompts
```

### **Option 2: Manual Setup**

```powershell
# Import the schema with test data
mysql -u root -p hospital_management_system < "C:\Users\nbhar\SMART HMS\backend\database\schema_with_data.sql"
```

### **Option 3: Using MySQL CLI**

```sql
-- Open MySQL
mysql -u root -p

-- Run all commands from schema_with_data.sql file
-- Or copy and paste the entire SQL script
```

---

## **📋 18 Tables Created**

### **Core Tables**
1. **users** - All staff and patient accounts
2. **zkp_credentials** - ZKP authentication data
3. **zkp_sessions** - Active login sessions

### **Role-Specific Tables**
4. **patients** - Patient information
5. **doctors** - Doctor information
6. **nurses** - Nurse information
7. **pharmacists** - Pharmacist information
8. **lab_technicians** - Lab technician information
9. **receptionists** - Receptionist information

### **Medical Records**
10. **appointments** - Patient appointments
11. **diagnoses** - Medical diagnoses
12. **vital_signs** - Patient vital signs (BP, HR, etc)
13. **medications** - Available medications in inventory
14. **prescriptions** - Prescribed medications
15. **lab_requests** - Lab test requests
16. **lab_results** - Lab test results
17. **medication_administration** - Drug administration logs

### **Operational Tables**
18. **daily_progress** - Patient daily progress notes
19. **patient_documents** - Document storage
20. **staff_attendance** - Staff attendance tracking
21. **audit_log** - System audit trail

---

## **👥 Test Users Created (11 Total)**

### **Admin (1)**
```
Username: admin
Email: admin@hospital.com
Role: Administrator
Password: [Use ZKP during registration]
```

### **Doctors (2)**
```
1. Username: dr_smith
   Email: smith@hospital.com
   Specialization: Cardiology
   License: LIC001
   Department: Cardiology

2. Username: dr_jones
   Email: jones@hospital.com
   Specialization: Pediatrics
   License: LIC002
   Department: Pediatrics
```

### **Nurses (2)**
```
1. Username: nurse_sarah
   Email: sarah@hospital.com
   License: NURSE001
   Department: ICU
   Shift: Day

2. Username: nurse_mike
   Email: mike@hospital.com
   License: NURSE002
   Department: General Ward
   Shift: Night
```

### **Pharmacist (1)**
```
Username: pharmacist_bob
Email: bob@hospital.com
License: PHARM001
Department: Pharmacy
```

### **Lab Technician (1)**
```
Username: lab_tech_alice
Email: alice@hospital.com
License: LAB001
Department: Laboratory
```

### **Receptionist (1)**
```
Username: receptionist_emma
Email: emma@hospital.com
Department: Front Desk
Extension: 100
```

### **Patients (3)**
```
1. Username: patient_john
   Email: john.patient@hospital.com
   DOB: 1985-05-15
   Blood Type: O+
   Allergies: Penicillin

2. Username: patient_jane
   Email: jane.patient@hospital.com
   DOB: 1990-08-22
   Blood Type: A+
   Allergies: Shellfish

3. Username: patient_bob
   Email: bob.patient@hospital.com
   DOB: 1980-03-10
   Blood Type: B+
   Allergies: None
```

---

## **💊 Sample Medications (5)**

```
1. Aspirin 500mg - 1000 units in stock - $0.50 each
2. Amoxicillin 250mg - 500 units in stock - $2.00 each
3. Metformin 500mg - 800 units in stock - $1.50 each
4. Lisinopril 10mg - 600 units in stock - $2.50 each
5. Ibuprofen 200mg - 1200 units in stock - $0.75 each
```

---

## **📅 Sample Data Included**

### **Appointments: 3**
- John Doe with Dr. Smith (Nov 25 - Regular Checkup)
- Jane Smith with Dr. Smith (Nov 26 - Heart Palpitation)
- Bob Johnson with Dr. Jones (Nov 27 - Pediatric Checkup)

### **Diagnoses: 2**
- Jane Smith: Hypertension (ICD-10: I10) - Moderate
- Bob Johnson: Upper Respiratory Infection (ICD-10: J06.9) - Mild

### **Vital Signs: 3 Records**
- Temperature, Heart Rate, Blood Pressure, O2 Saturation, Glucose Levels

### **Prescriptions: 3**
- Lisinopril for John (BP management)
- Aspirin for Jane (pain relief)
- Ibuprofen for Bob (fever management)

### **Lab Requests: 3**
- Blood Test for John (Completed)
- ECG for Jane (Processing)
- Blood Test for Bob (Requested)

### **Lab Results: 2**
- WBC Count: 7.8 K/uL (Normal)
- Heart Rate: 125 bpm (Slightly Elevated)

### **Daily Progress: 3 Records**
- Patient progress notes with mood, appetite, sleep hours

---

## **🔑 How to Login**

### **Step 1: Start the System**
```powershell
# Terminal 1: Backend
cd C:\Users\nbhar\SMART\ HMS\backend
npm start

# Terminal 2: Frontend
cd C:\Users\nbhar\SMART\ HMS\frontend
npm start
```

### **Step 2: Visit http://localhost:3000**

### **Step 3: Try Logging In**
```
Use any of the test usernames above
Example: dr_smith

Password: Any password (will be verified via ZKP)
```

---

## **🧪 Test Scenarios**

### **Scenario 1: Doctor Login & View Patients**
```
1. Login as: dr_smith
2. Go to Dashboard
3. See 3 patients (John, Jane, Bob)
4. View patient records
5. Add diagnosis or prescription
```

### **Scenario 2: Patient Login & View Records**
```
1. Login as: patient_john
2. Go to Dashboard
3. See personal appointments
4. View medical records
5. Check prescriptions
```

### **Scenario 3: Nurse Login & Update Vitals**
```
1. Login as: nurse_sarah
2. Go to Dashboard
3. View assigned patients
4. Record vital signs
5. Add daily progress notes
```

### **Scenario 4: Pharmacist & Medicine Management**
```
1. Login as: pharmacist_bob
2. View inventory
3. Check pending prescriptions
4. Dispense medications
5. Update stock levels
```

### **Scenario 5: Lab Technician & Results**
```
1. Login as: lab_tech_alice
2. View lab requests
3. Update test status
4. Enter lab results
5. Upload reports
```

---

## **📊 Verify Database Created**

### **Check All Tables**
```sql
USE hospital_management_system;
SHOW TABLES;
```

**Expected Output:**
```
+----------------------------------------------+
| Tables_in_hospital_management_system          |
+----------------------------------------------+
| users                                        |
| zkp_credentials                              |
| zkp_sessions                                 |
| patients                                     |
| doctors                                      |
| nurses                                       |
| pharmacists                                  |
| lab_technicians                              |
| receptionists                                |
| appointments                                 |
| diagnoses                                    |
| vital_signs                                  |
| medications                                  |
| prescriptions                                |
| lab_requests                                 |
| lab_results                                  |
| medication_administration                    |
| daily_progress                               |
| patient_documents                            |
| staff_attendance                             |
| audit_log                                    |
+----------------------------------------------+
21 rows in set
```

### **Check Users**
```sql
SELECT id, username, email, role FROM users;
```

**Expected Output:**
```
+----+-------------------+---------------------------+------------------+
| id | username          | email                     | role             |
+----+-------------------+---------------------------+------------------+
|  1 | admin             | admin@hospital.com        | admin            |
|  2 | dr_smith          | smith@hospital.com        | doctor           |
|  3 | dr_jones          | jones@hospital.com        | doctor           |
|  4 | nurse_sarah       | sarah@hospital.com        | nurse            |
|  5 | nurse_mike        | mike@hospital.com         | nurse            |
|  6 | pharmacist_bob    | bob@hospital.com          | pharmacist       |
|  7 | lab_tech_alice    | alice@hospital.com        | lab_technician   |
|  8 | receptionist_emma | emma@hospital.com         | receptionist     |
|  9 | patient_john      | john.patient@hospital.com | patient          |
| 10 | patient_jane      | jane.patient@hospital.com | patient          |
| 11 | patient_bob       | bob.patient@hospital.com  | patient          |
+----+-------------------+---------------------------+------------------+
```

### **Check Medications**
```sql
SELECT id, name, strength, stock_quantity FROM medications;
```

### **Check Appointments**
```sql
SELECT a.id, p.user_id, d.user_id, a.appointment_date, a.status 
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN doctors d ON a.doctor_id = d.id;
```

---

## **🚀 Next Steps**

1. ✅ Import database with test data
2. ✅ Verify all 18 tables created
3. ✅ Verify 11 test users created
4. ✅ Start backend: `npm start`
5. ✅ Start frontend: `npm start`
6. ✅ Login at http://localhost:3000
7. ✅ Test different roles
8. ✅ View database records
9. ✅ Test ZKP authentication
10. ✅ Begin customization

---

## **❓ Troubleshooting**

### **Database not created?**
```powershell
# Check MySQL is running
Get-Service MySQL80

# If not running, start it
Start-Service MySQL80
```

### **Can't login?**
```
- Make sure backend is running on port 5000
- Check .env file has correct DB credentials
- Try creating a new account via registration
```

### **No tables showing?**
```sql
-- Check database exists
SHOW DATABASES;

-- Make sure you're in the right database
USE hospital_management_system;
SHOW TABLES;
```

### **Getting permission errors?**
```powershell
# Use different MySQL user
mysql -u [username] -p [password] hospital_management_system < schema_with_data.sql
```

---

## **📞 Support**

- **Backend runs on:** http://localhost:5000
- **Frontend runs on:** http://localhost:3000
- **API Health Check:** http://localhost:5000/api/health
- **Database:** hospital_management_system

**Ready to test! Start with the batch script or manual import above.** 🎉
