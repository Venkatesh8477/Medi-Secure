# Step-by-Step Implementation Guide for Missing Modules

## Phase 1: Add Missing Roles to Database

### Step 1: Update users table to include new roles
```sql
ALTER TABLE users MODIFY COLUMN role ENUM(
  'admin',
  'doctor', 
  'nurse',
  'patient',
  'receptionist',
  'pharmacist',
  'lab_technician',
  'inventory_manager'
) NOT NULL;
```

### Step 2: Create new role-specific tables

#### A. Receptionists Table
```sql
CREATE TABLE receptionists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  department VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert receptionist for existing data
INSERT INTO receptionists (user_id, department) VALUES (1, 'Reception');
```

#### B. Pharmacists Table
```sql
CREATE TABLE pharmacists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  license_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### C. Lab Technicians Table
```sql
CREATE TABLE lab_technicians (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  certification VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### D. Inventory Managers Table
```sql
CREATE TABLE inventory_managers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### E. Patient Documents Table
```sql
CREATE TABLE patient_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  document_type ENUM('prescription','medical_report','lab_result','discharge_summary','other'),
  file_name VARCHAR(255),
  file_path VARCHAR(255),
  file_size INT,
  uploaded_by_user_id INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);
```

#### F. Medicine Stock Transaction Table
```sql
CREATE TABLE medicine_stock_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  medication_id INT NOT NULL,
  transaction_type ENUM('purchase','issued','return','damage','adjustment'),
  quantity INT NOT NULL,
  reason TEXT,
  managed_by_user_id INT,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (medication_id) REFERENCES medications(id),
  FOREIGN KEY (managed_by_user_id) REFERENCES users(id)
);

-- Update medication stock when transaction happens
CREATE TRIGGER update_med_stock AFTER INSERT ON medicine_stock_transactions
FOR EACH ROW
BEGIN
  IF NEW.transaction_type = 'purchase' THEN
    UPDATE medications SET stock_quantity = stock_quantity + NEW.quantity WHERE id = NEW.medication_id;
  ELSEIF NEW.transaction_type IN ('issued', 'damage') THEN
    UPDATE medications SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.medication_id;
  END IF;
END;
```

---

## Phase 2: Backend API Implementation

### File Structure
```
backend/routes/
├── receptionistRoutes.js
├── pharmacistRoutes.js
├── labTechnicianRoutes.js
└── inventoryRoutes.js
```

### A. Receptionist Routes (`receptionistRoutes.js`)

```javascript
const express = require('express');
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Register new patient
router.post('/patients/register', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const {
      firstName, lastName, age, gender, bloodGroup,
      address, city, postalCode, medicalHistory, allergies, emergencyContact
    } = req.body;

    // Create patient user account
    const [userResult] = await db.query(
      `INSERT INTO users (username, email, role, first_name, last_name, password_hash, auth_type, is_active)
       VALUES (?, ?, 'patient', ?, ?, ?, 'simple_hash', TRUE)`,
      [
        `patient_${Date.now()}`, // auto-generated username
        `patient_${Date.now()}@hospital.local`,
        firstName, lastName,
        'default_password_hash' // Set default, patient changes on first login
      ]
    );

    const userId = userResult.insertId;

    // Create patient record
    const [patientResult] = await db.query(
      `INSERT INTO patients (user_id, age, gender, blood_group, address, city, postal_code, medical_history, allergies, emergency_contact, registered_by_receptionist_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, age, gender, bloodGroup, address, city, postalCode, medicalHistory, allergies, emergencyContact, req.user.id]
    );

    res.json({
      success: true,
      message: 'Patient registered successfully',
      patientId: patientResult.insertId,
      userId: userId,
      tempUsername: `patient_${Date.now()}`,
      tempPassword: 'Change_Me_On_First_Login'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book appointment
router.post('/appointments/book', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    // Check if doctor is available
    const [doctor] = await db.query('SELECT available_slots FROM doctors WHERE id = ?', [doctorId]);
    
    if (!doctor || doctor[0].available_slots <= 0) {
      return res.status(400).json({ error: 'Doctor has no available slots' });
    }

    // Create appointment
    const [result] = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason, status, booked_by_receptionist_id)
       VALUES (?, ?, ?, ?, 'scheduled', ?)`,
      [patientId, doctorId, appointmentDate, reason, req.user.id]
    );

    // Reduce available slots
    await db.query(
      'UPDATE doctors SET available_slots = available_slots - 1 WHERE id = ?',
      [doctorId]
    );

    res.json({
      success: true,
      message: 'Appointment booked successfully',
      appointmentId: result.insertId
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available doctors
router.get('/doctors/available', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const [doctors] = await db.query(
      `SELECT d.id, d.specialization, d.available_slots, u.first_name, u.last_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.available_slots > 0`
    );

    res.json({ success: true, doctors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all patients
router.get('/patients', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const [patients] = await db.query(
      `SELECT p.id, u.first_name, u.last_name, u.email, p.blood_group, p.age, p.phone, p.registered_date
       FROM patients p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.registered_date DESC`
    );

    res.json({ success: true, patients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all appointments
router.get('/appointments', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const [appointments] = await db.query(
      `SELECT a.id, a.appointment_date, a.reason, a.status, 
              p.id as patient_id, u1.first_name as patient_name, u1.last_name as patient_last_name,
              d.id as doctor_id, u2.first_name as doctor_name, u2.last_name as doctor_last_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u1 ON p.user_id = u1.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u2 ON d.user_id = u2.id
       ORDER BY a.appointment_date DESC`
    );

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### B. Pharmacist Routes (`pharmacistRoutes.js`)

```javascript
const express = require('express');
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// View all medications and stock
router.get('/medications', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const [medications] = await db.query(
      `SELECT id, name, strength, form, stock_quantity, expiry_date, manufacturer, unit_price
       FROM medications
       ORDER BY stock_quantity ASC`
    );

    res.json({ success: true, medications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update medication stock
router.post('/stock/transaction', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const { medicationId, transactionType, quantity, reason, notes } = req.body;

    const [result] = await db.query(
      `INSERT INTO medicine_stock_transactions (medication_id, transaction_type, quantity, reason, managed_by_user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [medicationId, transactionType, quantity, reason, req.user.id, notes]
    );

    res.json({ success: true, transactionId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending prescriptions (not yet dispensed)
router.get('/prescriptions/pending', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const [prescriptions] = await db.query(
      `SELECT pr.id, pr.dosage, pr.frequency, pr.duration, pr.notes,
              m.name as medication_name, m.strength,
              p.id as patient_id, u1.first_name as patient_name,
              d.id as doctor_id, u2.first_name as doctor_name,
              pr.created_at
       FROM prescriptions pr
       JOIN medications m ON pr.medication_id = m.id
       JOIN patients p ON pr.patient_id = p.id
       JOIN users u1 ON p.user_id = u1.id
       JOIN doctors d ON pr.doctor_id = d.id
       JOIN users u2 ON d.user_id = u2.id
       WHERE pr.status = 'active'
       ORDER BY pr.created_at ASC`
    );

    res.json({ success: true, prescriptions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dispense prescription
router.put('/prescriptions/:id/dispense', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const { notes } = req.body;

    await db.query(
      `UPDATE prescriptions SET status = 'completed' WHERE id = ?`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Prescription dispensed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock medications
router.get('/medications/low-stock', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const [medications] = await db.query(
      `SELECT id, name, strength, stock_quantity FROM medications WHERE stock_quantity < 10`
    );

    res.json({ success: true, medications, count: medications.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### C. Lab Technician Routes (`labTechnicianRoutes.js`)

```javascript
const express = require('express');
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const multer = require('multer');

const router = express.Router();
const upload = multer({ dest: 'uploads/lab_results/' });

// Get pending lab requests
router.get('/requests/pending', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    const [requests] = await db.query(
      `SELECT lr.id, lr.test_name, lr.status, lr.requested_date,
              p.id as patient_id, u1.first_name as patient_name,
              d.id as doctor_id, u2.first_name as doctor_name
       FROM lab_requests lr
       JOIN patients p ON lr.patient_id = p.id
       JOIN users u1 ON p.user_id = u1.id
       JOIN doctors d ON lr.doctor_id = d.id
       JOIN users u2 ON d.user_id = u2.id
       WHERE lr.status != 'completed'
       ORDER BY lr.requested_date ASC`
    );

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark sample as collected
router.put('/requests/:id/collect-sample', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    await db.query(
      `UPDATE lab_requests SET status = 'sample_collected' WHERE id = ?`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Sample marked as collected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload test result
router.post('/results/upload', authMiddleware, roleMiddleware('lab_technician'), upload.single('resultFile'), async (req, res) => {
  try {
    const { labRequestId, resultData, notes } = req.body;

    const [result] = await db.query(
      `INSERT INTO lab_results (lab_request_id, lab_technician_id, result_data, notes)
       VALUES (?, ?, ?, ?)`,
      [labRequestId, req.user.id, resultData, notes]
    );

    // Update request status
    await db.query(
      `UPDATE lab_requests SET status = 'completed' WHERE id = ?`,
      [labRequestId]
    );

    res.json({ success: true, resultId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### D. Register Routes in server.js

```javascript
// Add to backend/server.js
const receptionistRoutes = require('./routes/receptionistRoutes');
const pharmacistRoutes = require('./routes/pharmacistRoutes');
const labTechnicianRoutes = require('./routes/labTechnicianRoutes');

// Add these lines
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/pharmacist', pharmacistRoutes);
app.use('/api/lab', labTechnicianRoutes);
```

---

## Phase 3: Frontend Components

### A. Receptionist Dashboard Component

```jsx
// frontend/src/pages/Receptionist/ReceptionistDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ReceptionistDashboard() {
  const [activeTab, setActiveTab] = useState('register');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', age: '', gender: '', bloodGroup: '',
    address: '', city: '', postalCode: '', medicalHistory: '', allergies: '',
    emergencyContact: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const patientsRes = await axios.get('http://localhost:5000/api/receptionist/patients', { headers });
      const appointmentsRes = await axios.get('http://localhost:5000/api/receptionist/appointments', { headers });
      const doctorsRes = await axios.get('http://localhost:5000/api/receptionist/doctors/available', { headers });

      setPatients(patientsRes.data.patients);
      setAppointments(appointmentsRes.data.appointments);
      setDoctors(doctorsRes.data.doctors);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        'http://localhost:5000/api/receptionist/patients/register',
        formData,
        { headers }
      );

      alert(`Patient registered successfully!\nTemp username: ${response.data.tempUsername}\nTemp password: ${response.data.tempPassword}`);
      setFormData({
        firstName: '', lastName: '', age: '', gender: '', bloodGroup: '',
        address: '', city: '', postalCode: '', medicalHistory: '', allergies: '',
        emergencyContact: ''
      });
      loadData();
    } catch (error) {
      alert('Error registering patient: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Receptionist Dashboard</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('register')} style={{ marginRight: '10px', fontWeight: activeTab === 'register' ? 'bold' : 'normal' }}>
          📝 Register Patient
        </button>
        <button onClick={() => setActiveTab('appointments')} style={{ marginRight: '10px', fontWeight: activeTab === 'appointments' ? 'bold' : 'normal' }}>
          📅 View Appointments
        </button>
        <button onClick={() => setActiveTab('patients')} style={{ fontWeight: activeTab === 'patients' ? 'bold' : 'normal' }}>
          👥 View Patients
        </button>
      </div>

      {activeTab === 'register' && (
        <form onSubmit={handleRegisterPatient} style={{ maxWidth: '500px' }}>
          <h2>Register New Patient</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>First Name:</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Last Name:</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Age:</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Gender:</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            >
              <option>Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Blood Group:</label>
            <input
              type="text"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Address:</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              style={{ width: '100%', padding: '8px', height: '100px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>City:</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Postal Code:</label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Medical History:</label>
            <textarea
              value={formData.medicalHistory}
              onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
              style={{ width: '100%', padding: '8px', height: '80px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Allergies:</label>
            <input
              type="text"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Emergency Contact:</label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
            Register Patient
          </button>
        </form>
      )}

      {activeTab === 'patients' && (
        <div>
          <h2>Registered Patients ({patients.length})</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Age</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Blood Group</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Email</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Registered</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{patient.first_name} {patient.last_name}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{patient.age}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{patient.blood_group}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{patient.email}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(patient.registered_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div>
          <h2>Appointments ({appointments.length})</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Patient</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Doctor</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date & Time</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Reason</th>
                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{appt.patient_name} {appt.patient_last_name}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{appt.doctor_name} {appt.doctor_last_name}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(appt.appointment_date).toLocaleString()}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{appt.reason}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{appt.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReceptionistDashboard;
```

---

## Next Steps

1. **Create database tables** - Run the SQL commands above
2. **Implement backend routes** - Create the route files
3. **Update server.js** - Register new routes
4. **Create frontend components** - Build dashboard pages
5. **Update App.jsx** - Add routes for new roles
6. **Test each module** - Create test data and verify flows

This gives you a clear roadmap to complete the remaining 60% of the HMS!

