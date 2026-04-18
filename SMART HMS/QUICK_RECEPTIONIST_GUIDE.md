# Quick Start: Implement Receptionist Module (30 minutes)

## Step 1: Add Test Receptionist User (1 minute)

Run in terminal:
```bash
cd c:\Users\nbhar\SMART HMS\backend
node -e "
const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function addReceptionist() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'hospital_management_system'
  });

  const hash1 = crypto.createHash('sha256').update('Receptionist@123').digest('hex');
  const hash = crypto.createHash('sha256').update(hash1 + 'hospital2025').digest('hex');

  await conn.execute(
    'INSERT INTO users (username, email, role, first_name, last_name, auth_type, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
    ['receptionist_priya', 'priya@hospital.com', 'receptionist', 'Priya', 'Verma', 'simple_hash', hash]
  );

  console.log('✅ Receptionist created: receptionist_priya / Receptionist@123');
  await conn.end();
}

addReceptionist();
"
```

---

## Step 2: Create Receptionist Table (1 minute)

```sql
CREATE TABLE IF NOT EXISTS receptionists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  department VARCHAR(50) DEFAULT 'Reception',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO receptionists (user_id, department) 
SELECT id, 'Reception' FROM users WHERE username = 'receptionist_priya';
```

---

## Step 3: Create Receptionist Routes (5 minutes)

Create file: `backend/routes/receptionistRoutes.js`

```javascript
const express = require('express');
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const crypto = require('crypto');

const router = express.Router();

function hashPassword(password) {
    const hash1 = crypto.createHash('sha256').update(password).digest('hex');
    return crypto.createHash('sha256').update(hash1 + 'hospital2025').digest('hex');
}

// Register new patient
router.post('/patients/register', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const { firstName, lastName, age, gender, bloodGroup, address, city, postalCode, medicalHistory, allergies, emergencyContact, email, phone } = req.body;

    // Create unique username and temporary password
    const tempUsername = `patient_${Date.now()}`;
    const tempPassword = `Temp@${Math.random().toString(36).substring(7)}`;
    const hash = hashPassword(tempPassword);

    // Create user account
    const [userResult] = await db.query(
      `INSERT INTO users (username, email, role, first_name, last_name, password_hash, auth_type, is_active) 
       VALUES (?, ?, 'patient', ?, ?, ?, 'simple_hash', TRUE)`,
      [tempUsername, email || `${tempUsername}@hospital.local`, firstName, lastName, hash]
    );

    // Create patient record
    const [patientResult] = await db.query(
      `INSERT INTO patients (user_id, age, gender, blood_group, address, city, postal_code, medical_history, allergies, emergency_contact, phone, registered_by_receptionist_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userResult.insertId, age, gender, bloodGroup, address, city, postalCode, medicalHistory, allergies, emergencyContact, phone, req.user.id]
    );

    res.json({
      success: true,
      message: 'Patient registered successfully',
      patientId: patientResult.insertId,
      userId: userResult.insertId,
      tempUsername,
      tempPassword,
      instructions: 'Share these credentials with the patient. They can change password on first login.'
    });
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

// Get available doctors
router.get('/doctors/available', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const [doctors] = await db.query(
      `SELECT d.id, d.specialization, d.available_slots, u.first_name, u.last_name, u.email
       FROM doctors d
       JOIN users u ON d.user_id = u.id`
    );
    res.json({ success: true, doctors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book appointment
router.post('/appointments/book', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    const [result] = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason, status, booked_by_receptionist_id)
       VALUES (?, ?, ?, ?, 'scheduled', ?)`,
      [patientId, doctorId, appointmentDate, reason, req.user.id]
    );

    res.json({ success: true, message: 'Appointment booked', appointmentId: result.insertId });
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
              d.id as doctor_id, u2.first_name as doctor_name, u2.last_name as doctor_last_name, d.specialization
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

---

## Step 4: Register Routes in Server (1 minute)

Edit `backend/server.js` and add:

```javascript
// Add after other route imports
const receptionistRoutes = require('./routes/receptionistRoutes');

// Add after other app.use routes (around line 38)
app.use('/api/receptionist', receptionistRoutes);
```

---

## Step 5: Create Frontend Component (15 minutes)

Create file: `frontend/src/pages/Receptionist/ReceptionistDashboard.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../../ComprehensiveDashboard.css';

function ReceptionistDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', age: '', gender: '', bloodGroup: '',
    address: '', city: '', postalCode: '', medicalHistory: '', allergies: '',
    emergencyContact: '', email: '', phone: ''
  });
  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '', doctorId: '', appointmentDate: '', reason: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [patientsRes, appointmentsRes, doctorsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/receptionist/patients', { headers }),
        axios.get('http://localhost:5000/api/receptionist/appointments', { headers }),
        axios.get('http://localhost:5000/api/receptionist/doctors/available', { headers })
      ]);

      setPatients(patientsRes.data.patients);
      setAppointments(appointmentsRes.data.appointments);
      setDoctors(doctorsRes.data.doctors);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
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

      alert(`✅ Patient registered!\n\nUsername: ${response.data.tempUsername}\nPassword: ${response.data.tempPassword}\n\n${response.data.instructions}`);
      setFormData({
        firstName: '', lastName: '', age: '', gender: '', bloodGroup: '',
        address: '', city: '', postalCode: '', medicalHistory: '', allergies: '',
        emergencyContact: '', email: '', phone: ''
      });
      loadAllData();
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post(
        'http://localhost:5000/api/receptionist/appointments/book',
        appointmentForm,
        { headers }
      );

      alert('✅ Appointment booked successfully!');
      setAppointmentForm({ patientId: '', doctorId: '', appointmentDate: '', reason: '' });
      loadAllData();
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>👨‍💼 Receptionist Dashboard</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 15px', fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal', backgroundColor: activeTab === 'dashboard' ? '#4CAF50' : '#f0f0f0', cursor: 'pointer' }}>
          📊 Dashboard
        </button>
        <button onClick={() => setActiveTab('register')} style={{ padding: '10px 15px', fontWeight: activeTab === 'register' ? 'bold' : 'normal', backgroundColor: activeTab === 'register' ? '#4CAF50' : '#f0f0f0', cursor: 'pointer' }}>
          📝 Register Patient
        </button>
        <button onClick={() => setActiveTab('book')} style={{ padding: '10px 15px', fontWeight: activeTab === 'book' ? 'bold' : 'normal', backgroundColor: activeTab === 'book' ? '#4CAF50' : '#f0f0f0', cursor: 'pointer' }}>
          📅 Book Appointment
        </button>
        <button onClick={() => setActiveTab('patients')} style={{ padding: '10px 15px', fontWeight: activeTab === 'patients' ? 'bold' : 'normal', backgroundColor: activeTab === 'patients' ? '#4CAF50' : '#f0f0f0', cursor: 'pointer' }}>
          👥 Patients ({patients.length})
        </button>
        <button onClick={() => setActiveTab('appointments')} style={{ padding: '10px 15px', fontWeight: activeTab === 'appointments' ? 'bold' : 'normal', backgroundColor: activeTab === 'appointments' ? '#4CAF50' : '#f0f0f0', cursor: 'pointer' }}>
          📋 Appointments ({appointments.length})
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>{patients.length}</div>
            <div>Registered Patients</div>
          </div>
          <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>{appointments.length}</div>
            <div>Total Appointments</div>
          </div>
          <div style={{ backgroundColor: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c' }}>{doctors.length}</div>
            <div>Available Doctors</div>
          </div>
        </div>
      )}

      {/* Register Patient Tab */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegisterPatient} style={{ maxWidth: '600px' }}>
          <h2>Register New Patient</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required style={{ padding: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required style={{ padding: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Age" type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} required style={{ padding: '8px', border: '1px solid #ddd' }} />
            <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} required style={{ padding: '8px', border: '1px solid #ddd' }}>
              <option>Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
            <input placeholder="Blood Group (A+, O-, etc.)" value={formData.bloodGroup} onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd' }} />
            <input placeholder="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Postal Code" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Emergency Contact" value={formData.emergencyContact} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} required style={{ padding: '8px', border: '1px solid #ddd' }} />
          </div>
          <textarea placeholder="Medical History" value={formData.medicalHistory} onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })} style={{ width: '100%', padding: '8px', marginTop: '10px', border: '1px solid #ddd', minHeight: '80px' }} />
          <textarea placeholder="Allergies (if any)" value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} style={{ width: '100%', padding: '8px', marginTop: '10px', border: '1px solid #ddd', minHeight: '60px' }} />
          <textarea placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={{ width: '100%', padding: '8px', marginTop: '10px', border: '1px solid #ddd', minHeight: '80px' }} />
          <button type="submit" style={{ marginTop: '15px', padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
            Register Patient
          </button>
        </form>
      )}

      {/* Book Appointment Tab */}
      {activeTab === 'book' && (
        <form onSubmit={handleBookAppointment} style={{ maxWidth: '600px' }}>
          <h2>Book Appointment</h2>
          <div style={{ marginBottom: '15px' }}>
            <label>Patient:</label>
            <select value={appointmentForm.patientId} onChange={(e) => setAppointmentForm({ ...appointmentForm, patientId: e.target.value })} required style={{ width: '100%', padding: '8px' }}>
              <option value="">Select Patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Doctor:</label>
            <select value={appointmentForm.doctorId} onChange={(e) => setAppointmentForm({ ...appointmentForm, doctorId: e.target.value })} required style={{ width: '100%', padding: '8px' }}>
              <option value="">Select Doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.first_name} {d.last_name} - {d.specialization}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Date & Time:</label>
            <input type="datetime-local" value={appointmentForm.appointmentDate} onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Reason:</label>
            <input placeholder="Reason for visit" value={appointmentForm.reason} onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
            Book Appointment
          </button>
        </form>
      )}

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div>
          <h2>Registered Patients ({patients.length})</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead style={{ backgroundColor: '#f0f0f0' }}>
              <tr>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Age</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Blood Group</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Phone</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Registered</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.first_name} {p.last_name}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.age}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.blood_group}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.email}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.phone}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(p.registered_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div>
          <h2>Appointments ({appointments.length})</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead style={{ backgroundColor: '#f0f0f0' }}>
              <tr>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Patient</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Doctor</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Date & Time</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Reason</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.slice(0, 20).map((a) => (
                <tr key={a.id}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{a.patient_name} {a.patient_last_name}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{a.doctor_name} {a.doctor_last_name} ({a.specialization})</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(a.appointment_date).toLocaleString()}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{a.reason}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    <span style={{ padding: '5px 10px', borderRadius: '4px', backgroundColor: a.status === 'completed' ? '#c8e6c9' : '#fff9c4', color: a.status === 'completed' ? '#2e7d32' : '#f57f17' }}>
                      {a.status}
                    </span>
                  </td>
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

## Step 6: Add Route to App.jsx (2 minutes)

Edit `frontend/src/App.jsx`:

```javascript
import ReceptionistDashboard from './pages/Receptionist/ReceptionistDashboard';

// Add to <Routes>
<Route path="/receptionist-dashboard" element={<ReceptionistDashboard />} />
```

---

## Step 7: Update Main Dashboard to Route Based on Role (3 minutes)

Edit `frontend/src/App.jsx` - modify the dashboard route:

```javascript
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      {localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role === 'receptionist' ? (
        <ReceptionistDashboard />
      ) : (
        <ComprehensiveDashboard />
      )}
    </ProtectedRoute>
  }
/>
```

---

## Step 8: Test It (5 minutes)

1. **Restart backend:**
   ```bash
   taskkill /F /IM node.exe
   cd c:\Users\nbhar\SMART HMS\backend
   npm start
   ```

2. **Go to browser:**
   - http://localhost:3000/login
   - Username: `receptionist_priya`
   - Password: `Receptionist@123`

3. **Test:**
   - Register a new patient
   - Book an appointment
   - View all patients and appointments

---

## Done! 🎉

You now have a working Receptionist module with:
- ✅ Patient registration
- ✅ Appointment booking
- ✅ Patient list view
- ✅ Appointment management

**Time taken: ~30 minutes**

