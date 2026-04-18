# Hospital Management System - Complete Architecture

## TABLE OF CONTENTS
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Endpoints](#api-endpoints)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Frontend Structure](#frontend-structure)
8. [Implementation Steps](#implementation-steps)

---

# SYSTEM OVERVIEW

## Project Goals
- Simple, scalable hospital management system
- Role-based access control
- Patient-centric workflow
- Real-time data updates
- Document/file management

## Key Users & Workflows

```
┌─────────────────────────────────────────────────────────────┐
│ HOSPITAL MANAGEMENT SYSTEM - User Roles & Workflows         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. ADMIN                                                     │
│    └─ Manage users, view reports, system settings            │
│                                                              │
│ 2. RECEPTIONIST                                              │
│    └─ Register patients → Book appointments → Mark absence   │
│                                                              │
│ 3. DOCTOR                                                    │
│    └─ View assigned patients → Update diagnosis, checks      │
│                                                              │
│ 4. NURSE                                                     │
│    └─ View assigned patients → Update vitals, medication     │
│                                                              │
│ 5. PHARMACIST                                                │
│    └─ Manage medicines → Process prescriptions              │
│                                                              │
│ 6. LAB TECHNICIAN                                            │
│    └─ Track samples → Upload test reports                    │
│                                                              │
│ 7. PATIENT                                                   │
│    └─ View records → Upload prescriptions → Download reports │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# ARCHITECTURE DIAGRAM

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                             │
├─────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐ │
│ │  Admin   │ │ Doctor  │ │ Nurse  │ │Patient   │ │ Receptionist │ │
│ │ Dashboard│ │Dashboard│ │Dashboard│ │ Portal  │ │  Dashboard   │ │
│ └──────────┘ └─────────┘ └────────┘ └──────────┘ └──────────────┘ │
│ ┌──────────┐ ┌─────────┐                                            │
│ │Pharmacist│ │Lab Tech │                                            │
│ │Dashboard │ │Dashboard│                                            │
│ └──────────┘ └─────────┘                                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  REST API         │
                    │  (Express.js)     │
                    │                   │
                    │ ├─ Auth Routes    │
                    │ ├─ Patient Routes │
                    │ ├─ Doctor Routes  │
                    │ ├─ Nurse Routes   │
                    │ ├─ Pharma Routes  │
                    │ ├─ Lab Routes     │
                    │ └─ Admin Routes   │
                    └─────────┬─────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
           ┌────────┐   ┌──────────┐   ┌─────────┐
           │  SQL   │   │ File     │   │ Session │
           │Database│   │ Storage  │   │ Cache   │
           │(MySQL) │   │(Server)  │   │(Redis)  │
           └────────┘   └──────────┘   └─────────┘
```

---

# TECHNOLOGY STACK

## Frontend
```
Framework:      React 18+
State Management: Redux / Context API
Styling:        Tailwind CSS / Material-UI
HTTP Client:    Axios
Charts:         Chart.js / Recharts (for reports)
Authentication: JWT tokens stored in localStorage
File Upload:    Multer (backend), file input (frontend)
```

## Backend
```
Runtime:        Node.js
Framework:      Express.js
Authentication: JWT
Password Hash:  bcryptjs
File Upload:    Multer
Validation:     Joi / Express-validator
CORS:           CORS middleware
```

## Database
```
Primary DB:     MySQL (SQL)
Why MySQL?
├─ Relational data (perfect for hospital records)
├─ ACID compliance (critical for medical data)
├─ Complex queries (appointments, patient history)
├─ Better for structured data
├─ Proven reliability
├─ Easy backup & recovery

Alternative: MongoDB (if you prefer NoSQL)
├─ More flexible schema
├─ Good for unstructured data
├─ Easier horizontal scaling
├─ But less ideal for relational medical data
```

### Recommendation: **USE MySQL** for this project
- Medical data is highly relational
- Referential integrity is critical (patient → doctor → prescription)
- Transaction support needed
- Better audit trails

---

# DATABASE DESIGN

## ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE SCHEMA                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  users ─────────┐                                            │
│  patients ──────┼──── appointments ─────── doctors          │
│  doctor_shifts ─┤                                            │
│  prescriptions ─┼──── medicines                              │
│  lab_requests ──┼──── lab_tests                              │
│  vitals ────────┤                                            │
│                 └──── audit_log                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database Tables (MySQL)

### 1. USERS Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician', 'receptionist', 'patient') NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    department VARCHAR(100),  -- for doctor, nurse
    status ENUM('active', 'inactive', 'leave') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

Indexes:
- PRIMARY KEY (id)
- UNIQUE (username, email)
- INDEX (role)
```

### 2. PATIENTS Table
```sql
CREATE TABLE patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,  -- Optional: link to users table if patient has login
    patient_id VARCHAR(20) UNIQUE NOT NULL,  -- Auto-generated ID like PAT001
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('M', 'F', 'Other') NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(50),
    state VARCHAR(50),
    postal_code VARCHAR(10),
    blood_group VARCHAR(5),
    allergies TEXT,  -- comma-separated or JSON
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    medical_history TEXT,  -- JSON or TEXT with previous conditions
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registered_by INT,  -- receptionist who registered
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (registered_by) REFERENCES users(id)
);

Indexes:
- PRIMARY KEY (id)
- UNIQUE (patient_id, user_id)
- INDEX (first_name, last_name)
- INDEX (registration_date)
```

### 3. APPOINTMENTS Table
```sql
CREATE TABLE appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    reason VARCHAR(255),
    status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    notes TEXT,
    booked_by INT,  -- receptionist who booked
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (booked_by) REFERENCES users(id)
);

Indexes:
- PRIMARY KEY (id)
- UNIQUE (appointment_id)
- INDEX (patient_id, appointment_date)
- INDEX (doctor_id, appointment_date)
- INDEX (status)
```

### 4. DIAGNOSES Table (Doctor updates)
```sql
CREATE TABLE diagnoses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    diagnosis_text TEXT NOT NULL,  -- chief complaint, physical exam, assessment
    icd_code VARCHAR(20),  -- Medical coding
    severity ENUM('mild', 'moderate', 'severe') DEFAULT 'moderate',
    observations TEXT,  -- Additional observations
    treatment_plan TEXT,
    referred_to VARCHAR(100),  -- if referral needed
    diagnosis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id)
);

Indexes:
- PRIMARY KEY (id)
- INDEX (patient_id)
- INDEX (doctor_id, diagnosis_date)
```

### 5. VITAL_SIGNS Table (Nurse updates)
```sql
CREATE TABLE vital_signs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    recorded_by INT NOT NULL,  -- nurse
    temperature DECIMAL(5,2),  -- in Celsius
    heart_rate INT,  -- beats per minute
    blood_pressure VARCHAR(10),  -- e.g., "120/80"
    respiratory_rate INT,  -- breaths per minute
    oxygen_saturation DECIMAL(5,2),  -- O2 %
    blood_glucose INT,  -- mg/dL
    weight DECIMAL(6,2),  -- kg
    height DECIMAL(5,2),  -- cm
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

Indexes:
- PRIMARY KEY (id)
- INDEX (patient_id, recorded_at)
- INDEX (recorded_by)
```

### 6. MEDICATIONS Table
```sql
CREATE TABLE medications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    medicine_name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150),
    strength VARCHAR(50),  -- e.g., "500mg"
    form VARCHAR(50),  -- tablet, capsule, syrup, injection
    manufacturer VARCHAR(100),
    expiry_date DATE,
    stock_quantity INT DEFAULT 0,
    reorder_level INT,
    unit_price DECIMAL(10,2),
    batch_number VARCHAR(50),
    side_effects TEXT,  -- comma-separated
    contraindications TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

Indexes:
- PRIMARY KEY (id)
- UNIQUE INDEX (medicine_name, strength, batch_number)
- INDEX (stock_quantity)
```

### 7. PRESCRIPTIONS Table
```sql
CREATE TABLE prescriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    prescription_id VARCHAR(20) UNIQUE NOT NULL,
    appointment_id INT NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    medicine_id INT NOT NULL,
    dosage VARCHAR(100),  -- e.g., "1 tablet"
    frequency VARCHAR(100),  -- e.g., "twice daily"
    duration VARCHAR(100),  -- e.g., "5 days"
    instructions TEXT,  -- special instructions
    quantity INT,  -- number of medicines
    status ENUM('pending', 'dispensed', 'cancelled') DEFAULT 'pending',
    prescribed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispensed_at TIMESTAMP NULL,
    dispensed_by INT,  -- pharmacist
    notes TEXT,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (medicine_id) REFERENCES medications(id),
    FOREIGN KEY (dispensed_by) REFERENCES users(id)
);

Indexes:
- PRIMARY KEY (id)
- UNIQUE (prescription_id)
- INDEX (patient_id, prescribed_date)
- INDEX (status, dispensed_by)
```

### 8. LAB_REQUESTS Table
```sql
CREATE TABLE lab_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_id INT,
    test_type VARCHAR(100),  -- e.g., "Blood Test", "Urine Test"
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sample_collection_status ENUM('pending', 'collected', 'processing', 'completed') DEFAULT 'pending',
    sample_collected_at TIMESTAMP NULL,
    collected_by INT,  -- lab technician
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    urgency ENUM('normal', 'urgent') DEFAULT 'normal',
    special_instructions TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (collected_by) REFERENCES users(id)
);

Indexes:
- PRIMARY KEY (id)
- UNIQUE (request_id)
- INDEX (patient_id, requested_date)
- INDEX (sample_collection_status)
```

### 9. LAB_RESULTS Table
```sql
CREATE TABLE lab_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_request_id INT NOT NULL,
    patient_id INT NOT NULL,
    test_name VARCHAR(150),
    result_value VARCHAR(100),
    reference_range VARCHAR(100),
    unit VARCHAR(50),
    status ENUM('normal', 'abnormal', 'critical') DEFAULT 'normal',
    notes TEXT,
    uploaded_by INT,  -- lab technician
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    result_file_path VARCHAR(255),  -- path to uploaded PDF/document
    FOREIGN KEY (lab_request_id) REFERENCES lab_requests(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

Indexes:
- PRIMARY KEY (id)
- INDEX (lab_request_id)
- INDEX (patient_id, uploaded_at)
```

### 10. MEDICATIONS_ADMINISTRATION Table (Nurse logs)
```sql
CREATE TABLE medication_administration {
    id INT PRIMARY KEY AUTO_INCREMENT,
    prescription_id INT NOT NULL,
    patient_id INT NOT NULL,
    administered_by INT NOT NULL,  -- nurse
    administration_date DATE NOT NULL,
    administration_time TIME NOT NULL,
    quantity_given INT,
    route VARCHAR(50),  -- oral, injection, IV
    site VARCHAR(100),  -- injection site if applicable
    patient_response TEXT,  -- any side effects observed
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (administered_by) REFERENCES users(id)
};

Indexes:
- PRIMARY KEY (id)
- INDEX (patient_id, administration_date)
- INDEX (administered_by)
```

### 11. DAILY_PROGRESS Table (Nurse updates)
```sql
CREATE TABLE daily_progress {
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    recorded_by INT NOT NULL,  -- nurse
    shift ENUM('morning', 'afternoon', 'night'),
    general_condition VARCHAR(100),  -- alert, drowsy, etc.
    appetite VARCHAR(100),
    sleep_hours DECIMAL(4,2),
    bowel_movement VARCHAR(50),
    urine_output VARCHAR(50),
    skin_condition TEXT,
    mood TEXT,
    pain_level INT,  -- 1-10
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
};

Indexes:
- PRIMARY KEY (id)
- INDEX (patient_id, recorded_at)
```

### 12. PATIENT_DOCUMENTS Table (Uploaded prescriptions, reports)
```sql
CREATE TABLE patient_documents {
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    document_type VARCHAR(50),  -- 'prescription', 'lab_report', 'scan', 'insurance', 'other'
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT,  -- patient or staff
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    visible_to_doctor BOOLEAN DEFAULT TRUE,
    visible_to_patient BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
};

Indexes:
- PRIMARY KEY (id)
- INDEX (patient_id)
- INDEX (document_type)
```

### 13. STAFF_ATTENDANCE Table (Receptionist marks)
```sql
CREATE TABLE staff_attendance {
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'leave', 'half_day') DEFAULT 'present',
    check_in_time TIME,
    check_out_time TIME,
    marked_by INT,  -- receptionist
    reason_for_absence VARCHAR(255),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, attendance_date),
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (marked_by) REFERENCES users(id)
};

Indexes:
- PRIMARY KEY (id)
- UNIQUE (staff_id, attendance_date)
```

### 14. AUDIT_LOG Table
```sql
CREATE TABLE audit_log{
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id INT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
};

Indexes:
- PRIMARY KEY (id)
- INDEX (user_id, created_at)
- INDEX (table_name)
```

---

# API ENDPOINTS

## Authentication Endpoints

```
POST   /api/auth/register           (public - receptionist registers patient)
POST   /api/auth/login              (public)
POST   /api/auth/logout             (private)
POST   /api/auth/refresh-token      (private)
GET    /api/auth/me                 (private - get current user)
PUT    /api/auth/change-password    (private)
```

## Patient Endpoints

```
GET    /api/patients                (admin, doctor, receptionist - list all)
GET    /api/patients/:id            (private - get patient details)
POST   /api/patients                (receptionist - register new patient)
PUT    /api/patients/:id            (receptionist - update patient info)
GET    /api/patients/:id/records    (doctor, nurse, patient - medical records)
POST   /api/patients/:id/documents  (patient, staff - upload document)
GET    /api/patients/:id/documents  (patient, staff - list documents)
DELETE /api/patients/:id/documents/:docId (patient - delete own document)
```

## Appointment Endpoints

```
POST   /api/appointments            (receptionist - create appointment)
GET    /api/appointments            (doctor - list assigned appointments)
GET    /api/appointments/:id        (private - get appointment details)
PUT    /api/appointments/:id        (receptionist - update appointment)
DELETE /api/appointments/:id        (receptionist - cancel appointment)
GET    /api/appointments/doctor/:doctorId (admin - doctor's schedule)
```

## Doctor Endpoints

```
GET    /api/doctor/patients         (doctor - list assigned patients)
GET    /api/doctor/patients/:id     (doctor - get patient details)
POST   /api/doctor/diagnoses        (doctor - add diagnosis)
PUT    /api/doctor/diagnoses/:id    (doctor - update diagnosis)
GET    /api/doctor/diagnoses/:id    (doctor - get diagnosis)
POST   /api/doctor/prescriptions    (doctor - create prescription)
GET    /api/doctor/patients/:id/history (doctor - patient history)
```

## Nurse Endpoints

```
GET    /api/nurse/patients          (nurse - list assigned patients)
GET    /api/nurse/patients/:id      (nurse - get patient details)
POST   /api/nurse/vitals            (nurse - record vital signs)
GET    /api/nurse/vitals/:patientId (nurse - get patient vitals)
POST   /api/nurse/progress          (nurse - record daily progress)
GET    /api/nurse/progress/:patientId (nurse - get progress notes)
POST   /api/nurse/medication-admin  (nurse - log medication given)
GET    /api/nurse/prescriptions/:patientId (nurse - patient prescriptions)
```

## Pharmacist Endpoints

```
GET    /api/pharmacist/medicines    (pharmacist - list medicines)
POST   /api/pharmacist/medicines    (pharmacist - add medicine)
PUT    /api/pharmacist/medicines/:id (pharmacist - update medicine)
GET    /api/pharmacist/medicines/:id (pharmacist - get medicine details)
GET    /api/pharmacist/prescriptions (pharmacist - pending prescriptions)
PUT    /api/pharmacist/prescriptions/:id (pharmacist - mark as dispensed)
PUT    /api/pharmacist/medicines/:id/stock (pharmacist - update stock)
```

## Lab Technician Endpoints

```
GET    /api/lab/requests            (lab tech - list requests)
PUT    /api/lab/requests/:id/collect (lab tech - mark sample collected)
POST   /api/lab/results             (lab tech - upload results)
PUT    /api/lab/results/:id         (lab tech - update results)
GET    /api/lab/requests/:id/results (lab tech - view results)
```

## Receptionist Endpoints

```
POST   /api/receptionist/patients   (receptionist - register patient)
POST   /api/receptionist/appointments (receptionist - book appointment)
GET    /api/receptionist/appointments (receptionist - today's appointments)
PUT    /api/receptionist/attendance/:staffId (receptionist - mark attendance)
GET    /api/receptionist/schedule   (receptionist - staff schedule)
```

## Admin Endpoints

```
GET    /api/admin/users             (admin - list all users)
POST   /api/admin/users             (admin - create user)
PUT    /api/admin/users/:id         (admin - update user)
DELETE /api/admin/users/:id         (admin - deactivate user)
GET    /api/admin/dashboard         (admin - statistics, reports)
GET    /api/admin/audit-log         (admin - view activity log)
GET    /api/admin/medicines         (admin - medicine management)
```

## Patient Portal Endpoints

```
GET    /api/patient/profile         (patient - own profile)
GET    /api/patient/appointments    (patient - own appointments)
GET    /api/patient/records         (patient - own medical records)
GET    /api/patient/prescriptions   (patient - own prescriptions)
GET    /api/patient/lab-results     (patient - own lab results)
POST   /api/patient/documents       (patient - upload prescription)
GET    /api/patient/documents       (patient - download documents)
```

---

# USER ROLES & PERMISSIONS

## Role-Based Access Control (RBAC)

```
┌──────────────────┬─────────────┬──────────┬──────────┬────────────┐
│ Feature          │ Admin       │ Doctor   │ Nurse    │ Pharmacist │
├──────────────────┼─────────────┼──────────┼──────────┼────────────┤
│ View All Users   │ ✓           │ ✗        │ ✗        │ ✗          │
│ Manage Users     │ ✓           │ ✗        │ ✗        │ ✗          │
│ Register Patient │ ✓           │ ✗        │ ✗        │ ✗          │
│ View Patients    │ ✓           │ Own      │ Own      │ Rx only    │
│ Update Diagnosis │ ✗           │ ✓        │ ✗        │ ✗          │
│ Record Vitals    │ ✗           │ ✗        │ ✓        │ ✗          │
│ Manage Medicines │ ✓           │ ✗        │ ✗        │ ✓          │
│ Process Rx       │ ✗           │ ✗        │ ✗        │ ✓          │
│ Upload Lab Test  │ ✗           │ ✗        │ ✗        │ ✗          │
└──────────────────┴─────────────┴──────────┴──────────┴────────────┘

Continued...

┌──────────────────┬─────────────┬─────────────┬────────────┬──────────┐
│ Feature          │ Lab Tech    │ Receptionist│ Patient    │ Pharmacist│
├──────────────────┼─────────────┼─────────────┼────────────┼──────────┤
│ View All Users   │ ✗           │ ✗           │ ✗          │ ✗        │
│ Upload Lab Test  │ ✓           │ ✗           │ ✗          │ ✗        │
│ View Patients    │ ✗           │ All         │ Own        │ Rx only  │
│ Book Appointment │ ✗           │ ✓           │ ✗          │ ✗        │
│ Mark Attendance  │ ✗           │ ✓           │ ✗          │ ✗        │
│ Update Stock     │ ✗           │ ✗           │ ✗          │ ✓        │
│ View Prescription│ ✓           │ ✓           │ Own        │ ✓        │
│ Download Rx      │ ✗           │ ✗           │ ✓          │ ✗        │
└──────────────────┴─────────────┴─────────────┴────────────┴──────────┘
```

## Permission Matrix

```javascript
const permissions = {
    admin: [
        'manage_users',
        'view_all_patients',
        'register_patient',
        'manage_medicines',
        'view_reports',
        'manage_staff',
        'view_audit_log'
    ],
    doctor: [
        'view_assigned_patients',
        'add_diagnosis',
        'create_prescription',
        'view_patient_history',
        'record_observations'
    ],
    nurse: [
        'view_assigned_patients',
        'record_vitals',
        'record_daily_progress',
        'log_medication_admin',
        'view_prescriptions'
    ],
    pharmacist: [
        'manage_medicines',
        'view_pending_prescriptions',
        'mark_prescription_dispensed',
        'update_stock'
    ],
    lab_technician: [
        'view_lab_requests',
        'mark_sample_collected',
        'upload_lab_results'
    ],
    receptionist: [
        'register_patient',
        'book_appointment',
        'view_appointments',
        'mark_staff_attendance',
        'manage_schedules'
    ],
    patient: [
        'view_own_profile',
        'view_own_appointments',
        'view_own_records',
        'upload_documents',
        'download_reports'
    ]
};
```

---

# FRONTEND STRUCTURE

## React Folder Organization

```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginForm.jsx
│   │   ├── LogoutBtn.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   ├── Common/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Footer.jsx
│   │   ├── Navbar.jsx
│   │   └── LoadingSpinner.jsx
│   │
│   ├── Admin/
│   │   ├── Dashboard.jsx
│   │   ├── UserManagement.jsx
│   │   ├── Reports.jsx
│   │   └── AuditLog.jsx
│   │
│   ├── Doctor/
│   │   ├── Dashboard.jsx
│   │   ├── PatientList.jsx
│   │   ├── PatientDetail.jsx
│   │   ├── AddDiagnosis.jsx
│   │   ├── CreatePrescription.jsx
│   │   └── PatientHistory.jsx
│   │
│   ├── Nurse/
│   │   ├── Dashboard.jsx
│   │   ├── PatientList.jsx
│   │   ├── RecordVitals.jsx
│   │   ├── RecordProgress.jsx
│   │   └── LogMedication.jsx
│   │
│   ├── Pharmacist/
│   │   ├── Dashboard.jsx
│   │   ├── MedicineManagement.jsx
│   │   ├── PrescriptionList.jsx
│   │   └── StockManagement.jsx
│   │
│   ├── LabTechnician/
│   │   ├── Dashboard.jsx
│   │   ├── RequestList.jsx
│   │   ├── CollectSample.jsx
│   │   └── UploadResults.jsx
│   │
│   ├── Receptionist/
│   │   ├── Dashboard.jsx
│   │   ├── RegisterPatient.jsx
│   │   ├── BookAppointment.jsx
│   │   ├── AppointmentsList.jsx
│   │   └── MarkAttendance.jsx
│   │
│   └── Patient/
│       ├── Dashboard.jsx
│       ├── MyAppointments.jsx
│       ├── MyRecords.jsx
│       ├── MyPrescriptions.jsx
│       ├── UploadDocument.jsx
│       └── DownloadRecords.jsx
│
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── NotFound.jsx
│
├── services/
│   ├── api.js                    -- Axios setup
│   ├── authService.js
│   ├── patientService.js
│   ├── doctorService.js
│   ├── nurseService.js
│   ├── pharmacistService.js
│   ├── labService.js
│   ├── receptionistService.js
│   └── adminService.js
│
├── hooks/
│   ├── useAuth.js
│   ├── useFetch.js
│   └── useForm.js
│
├── context/
│   ├── AuthContext.jsx
│   └── NotificationContext.jsx
│
├── utils/
│   ├── constants.js
│   ├── helpers.js
│   ├── validators.js
│   └── formatters.js
│
├── styles/
│   ├── globals.css
│   └── tailwind.config.js
│
└── App.jsx
```

---

# BACKEND STRUCTURE

## Express.js Folder Organization

```
backend/
├── config/
│   ├── database.js              -- MySQL connection
│   ├── env.js                   -- Environment variables
│   └── constants.js
│
├── controllers/
│   ├── authController.js
│   ├── patientController.js
│   ├── doctorController.js
│   ├── nurseController.js
│   ├── pharmacistController.js
│   ├── labController.js
│   ├── receptionistController.js
│   └── adminController.js
│
├── routes/
│   ├── authRoutes.js
│   ├── patientRoutes.js
│   ├── doctorRoutes.js
│   ├── nurseRoutes.js
│   ├── pharmacistRoutes.js
│   ├── labRoutes.js
│   ├── receptionistRoutes.js
│   └── adminRoutes.js
│
├── middleware/
│   ├── authMiddleware.js         -- JWT verification
│   ├── roleMiddleware.js         -- Role-based access control
│   ├── errorHandler.js
│   ├── validateInput.js
│   └── auditLog.js
│
├── models/
│   ├── User.js
│   ├── Patient.js
│   ├── Appointment.js
│   ├── Diagnosis.js
│   ├── Prescription.js
│   ├── Medicine.js
│   ├── VitalSigns.js
│   ├── LabRequest.js
│   └── ... (other models)
│
├── services/
│   ├── authService.js
│   ├── patientService.js
│   ├── doctorService.js
│   ├── nurseService.js
│   ├── pharmacistService.js
│   ├── labService.js
│   ├── receptionistService.js
│   └── adminService.js
│
├── utils/
│   ├── logger.js
│   ├── validators.js
│   ├── helpers.js
│   └── idGenerator.js            -- Generate PAT001, APT001, etc.
│
├── uploads/                      -- File storage
│   ├── documents/
│   ├── lab_reports/
│   └── prescriptions/
│
├── .env                          -- Environment variables
├── .env.example
├── server.js                     -- Entry point
└── package.json
```

---

# IMPLEMENTATION STEPS

## Phase 1: Setup & Database (Week 1)

### Step 1: Initialize Project
```bash
# Backend
mkdir hospital-management
cd hospital-management
npm init -y
npm install express cors dotenv mysql2 jsonwebtoken bcryptjs multer joi

# Frontend
npx create-react-app hospital-management-ui
cd hospital-management-ui
npm install axios react-router-dom tailwindcss
```

### Step 2: Create MySQL Database
```sql
-- Create database
CREATE DATABASE hospital_management_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_management_db;

-- Execute all table creation scripts from above
```

### Step 3: Setup Backend Structure
- Create folder structure
- Setup `.env` file with database credentials
- Create `server.js` with Express setup
- Setup CORS middleware

## Phase 2: Authentication (Week 1)

### Step 4: Implement Auth System
- User registration endpoint
- Login endpoint with JWT
- Token refresh logic
- Password hashing with bcryptjs
- Protected routes middleware

### Step 5: Role-Based Access Control
- Create `roleMiddleware.js`
- Implement permission checking
- Test with different user roles

## Phase 3: Core Features (Week 2-3)

### Step 6: Patient Management
- Register patient (receptionist)
- View patient records (doctor, nurse)
- Upload/download documents

### Step 7: Doctor Workflow
- View assigned patients
- Add/update diagnosis
- Create prescriptions

### Step 8: Nurse Workflow
- View assigned patients
- Record vital signs
- Log medication administration
- Record daily progress

### Step 9: Pharmacist Workflow
- Manage medicines
- Process prescriptions
- Track stock

### Step 10: Lab Technician Workflow
- View lab requests
- Mark sample collection
- Upload test reports

### Step 11: Receptionist Workflow
- Register patients
- Book appointments
- Mark staff attendance

## Phase 4: Frontend Development (Week 3-4)

### Step 12: Create React Components
- Auth components (Login, Protected Routes)
- Role-specific dashboards
- Data entry forms
- List views with pagination
- Document upload/download

### Step 13: Setup API Service Layer
- Create Axios instance
- Create service files for each role
- Implement error handling
- Setup token management

### Step 14: Styling & UI
- Setup Tailwind CSS
- Create reusable components
- Responsive design

## Phase 5: Testing & Deployment (Week 4)

### Step 15: Testing
- Test each role workflow
- Test API endpoints
- Test file uploads
- Test error handling

### Step 16: Deployment
- Deploy backend (Heroku, AWS, DigitalOcean)
- Deploy frontend (Vercel, Netlify, GitHub Pages)

---

# DATABASE RELATIONSHIP SUMMARY

```
users (all staff and patients with logins)
  ├─ HAVE MANY: appointments (as doctor or patient)
  ├─ HAVE MANY: diagnoses (as doctor)
  ├─ HAVE MANY: prescriptions (as doctor)
  ├─ HAVE MANY: vital_signs (as nurse)
  ├─ HAVE MANY: medication_administration (as nurse)
  ├─ HAVE MANY: lab_results (as lab tech)
  └─ HAVE MANY: audit_log (any user)

patients
  ├─ HAS MANY: appointments
  ├─ HAS MANY: diagnoses
  ├─ HAS MANY: prescriptions
  ├─ HAS MANY: vital_signs
  ├─ HAS MANY: medication_administration
  ├─ HAS MANY: lab_requests
  ├─ HAS MANY: lab_results
  ├─ HAS MANY: daily_progress
  └─ HAS MANY: documents

appointments
  ├─ BELONGS TO: patient
  ├─ BELONGS TO: doctor
  ├─ HAS MANY: diagnoses
  ├─ HAS MANY: prescriptions
  └─ HAS MANY: lab_requests

diagnoses
  ├─ BELONGS TO: appointment
  ├─ BELONGS TO: patient
  └─ BELONGS TO: doctor

prescriptions
  ├─ BELONGS TO: appointment
  ├─ BELONGS TO: patient
  ├─ BELONGS TO: doctor
  ├─ BELONGS TO: medicine
  └─ HAS MANY: medication_administration

medicines
  └─ HAS MANY: prescriptions

lab_requests
  ├─ BELONGS TO: patient
  ├─ BELONGS TO: doctor
  ├─ HAS MANY: lab_results
  └─ BELONGS TO: lab_technician (collected_by)

lab_results
  ├─ BELONGS TO: lab_request
  ├─ BELONGS TO: patient
  └─ BELONGS TO: lab_technician
```

---

# SAMPLE CODE SNIPPETS

## Backend: Express Setup

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/database');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes'));
app.use('/api/nurse', require('./routes/nurseRoutes'));
app.use('/api/pharmacist', require('./routes/pharmacistRoutes'));
app.use('/api/lab', require('./routes/labRoutes'));
app.use('/api/receptionist', require('./routes/receptionistRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## Backend: Auth Middleware

```javascript
// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = authMiddleware;
```

## Backend: Role Middleware

```javascript
// middleware/roleMiddleware.js
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
    };
};

module.exports = roleMiddleware;
```

## Frontend: API Service

```javascript
// services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
```

## Frontend: Protected Route

```javascript
// components/Auth/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    
    if (!user) return <Navigate to="/login" />;
    
    if (requiredRole && !requiredRole.includes(user.role)) {
        return <Navigate to="/unauthorized" />;
    }
    
    return children;
};

export default ProtectedRoute;
```

---

# KEY FEATURES SUMMARY

## ✓ Complete Features Implemented

```
Authentication & Authorization
├─ User login/logout
├─ Role-based access control
├─ JWT token management
└─ Password hashing

Patient Management
├─ Register patients (receptionist)
├─ View patient records
├─ Upload medical documents
└─ Download prescriptions

Doctor Workflow
├─ View assigned patients
├─ Add diagnosis & observations
├─ Create prescriptions
└─ View patient history

Nurse Workflow
├─ Record vital signs
├─ Log medication administration
├─ Record daily progress
└─ View patient prescriptions

Pharmacist Workflow
├─ Manage medicine inventory
├─ Process prescriptions
├─ Track stock levels
└─ Update dispensing status

Lab Technician Workflow
├─ Track sample collection
├─ Upload test reports
└─ Manage lab requests

Receptionist Workflow
├─ Register new patients
├─ Book appointments
├─ Mark staff attendance
└─ Manage schedules

Admin Dashboard
├─ User management
├─ View system reports
├─ Audit logs
└─ System settings

Patient Portal
├─ View own records
├─ Upload prescriptions
├─ Download reports
└─ Manage appointments
```

---

# DATABASE CHOICE RECOMMENDATION

## MySQL ✓ RECOMMENDED

**Pros:**
- ACID compliance (critical for medical data)
- Strong referential integrity
- Complex JOIN queries for patient history
- Proven reliability for healthcare
- Better for structured, relational data
- Excellent backup/recovery mechanisms
- Mature ecosystem

**Cons:**
- Less flexible schema (fixed columns)
- Vertical scaling only
- Not ideal for very large scale

## MongoDB (Alternative)

**Pros:**
- Flexible schema
- Horizontal scaling
- Good for unstructured data
- Easier to modify structures

**Cons:**
- No built-in referential integrity (risky for medical data)
- No ACID transactions (in early versions)
- Harder to ensure data consistency
- More prone to data anomalies

**VERDICT: Use MySQL for this hospital system** ✅

---

# SECURITY CONSIDERATIONS

```
1. Authentication
   - Use JWT for stateless auth
   - Secure token storage (httpOnly cookies preferred)
   - Token expiration (15 min) + refresh tokens (7 days)

2. Authorization
   - Implement RBAC on all endpoints
   - Check permissions on backend (never trust client)
   - Log unauthorized access attempts

3. Data Protection
   - Use HTTPS/TLS in production
   - Hash passwords with bcryptjs
   - Encrypt sensitive data at rest
   - Use parameterized queries (prevent SQL injection)

4. Privacy
   - Only show data user has permission to see
   - Audit all access to medical records
   - HIPAA compliance (if applicable)
   - Data retention policies

5. File Uploads
   - Validate file types
   - Scan for malware
   - Store outside web root
   - Use secure file names

6. API Security
   - Rate limiting
   - Input validation
   - CORS configuration
   - SQL injection prevention
```

---

# DEPLOYMENT CHECKLIST

```
Backend Deployment:
├─ [ ] Set environment variables
├─ [ ] Configure database (hosted or local)
├─ [ ] Setup file storage (AWS S3 or local)
├─ [ ] Enable HTTPS
├─ [ ] Configure CORS
├─ [ ] Setup monitoring/logging
├─ [ ] Create database backups
└─ [ ] Test all endpoints

Frontend Deployment:
├─ [ ] Set API endpoint URL
├─ [ ] Build optimized bundle
├─ [ ] Test all user workflows
├─ [ ] Setup error tracking
├─ [ ] Configure CDN
├─ [ ] Enable gzip compression
└─ [ ] Test on mobile devices
```

---

This architecture provides a solid, scalable foundation for your hospital management system. Start with Phase 1, and gradually implement other phases. Keep it simple initially, and add complexity as needed!

