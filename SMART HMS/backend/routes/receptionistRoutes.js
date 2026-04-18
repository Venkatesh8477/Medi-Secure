const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { Patient, Doctor, Nurse, Pharmacist, LabTechnician, Receptionist } = require('../models/RoleProfiles');
const { Appointment } = require('../models/Clinical');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const mongoose = require('mongoose');
const staffAbsenceSchema = new mongoose.Schema({
    staff_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    absence_type: String,
    start_date: Date,
    end_date: Date,
    reason: String
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
const StaffAbsence = mongoose.models.StaffAbsence || mongoose.model('StaffAbsence', staffAbsenceSchema);

function hashPassword(password) {
    const hash1 = crypto.createHash('sha256').update(password).digest('hex');
    return crypto.createHash('sha256').update(hash1 + 'hospital2025').digest('hex');
}

// Register new patient
router.post('/patients/register', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const { firstName, lastName, age, gender, bloodGroup, address, city, postalCode, medicalHistory, allergies, emergencyContact, email, phone } = req.body;

    const tempUsername = `patient_${Date.now()}`;
    const tempPassword = `Temp@${Math.random().toString(36).substring(7)}`;
    const hash = hashPassword(tempPassword);

    const user = new User({
        username: tempUsername,
        email: email || `${tempUsername}@hospital.local`,
        role: 'patient',
        first_name: firstName,
        last_name: lastName,
        password_hash: hash,
        auth_type: 'simple_hash',
        is_active: true
    });
    await user.save();

    const patient = new Patient({
        user: user._id,
        gender,
        blood_group: bloodGroup,
        address,
        city,
        postal_code: postalCode,
        medical_history: medicalHistory,
        allergies,
        emergency_contact_phone: emergencyContact,
        phone,
        emergency_contact_name: emergencyContact // Loose mapping
    });
    await patient.save();

    res.json({
      success: true,
      message: 'Patient registered successfully',
      patientId: patient._id.toString(),
      userId: user._id.toString(),
      tempUsername,
      tempPassword,
      instructions: 'Share these credentials with the patient. They can change password on first login.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all patients - SIMPLE VERSION
router.get('/patients-all', async (req, res) => {
  try {
    const patients = await Patient.find().populate('user').lean();
    
    const formatted = patients.map(p => ({
        id: p._id.toString(),
        first_name: p.user?.first_name,
        last_name: p.user?.last_name,
        email: p.user?.email,
        blood_group: p.blood_group,
        gender: p.gender,
        phone: p.phone,
        created_at: p.created_at
    }));
    
    res.json({ success: true, patients: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all patients
router.get('/patients', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const patients = await Patient.find().populate('user').limit(100).lean();
    
    const formatted = patients.map(p => ({
        id: p._id.toString(),
        first_name: p.user?.first_name,
        last_name: p.user?.last_name,
        email: p.user?.email,
        blood_group: p.blood_group,
        gender: p.gender,
        phone: p.phone
    }));

    res.json({ success: true, patients: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available doctors
router.get('/doctors/available', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('user').lean();
    
    const formatted = doctors.map(d => ({
        id: d._id.toString(),
        first_name: d.user?.first_name,
        last_name: d.user?.last_name,
        email: d.user?.email,
        specialization: d.specialization,
        available_slots: d.available_slots
    }));

    res.json({ success: true, doctors: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Book appointment
router.post('/appointments/book', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!mongoose.isValidObjectId(patientId) || !mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ error: 'Invalid patient or doctor ID' });
    }

    const appointmentDateTime = new Date(appointmentDate);
    if (Number.isNaN(appointmentDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(400).json({ error: 'Patient not found' });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(400).json({ error: 'Doctor not found' });

    const appointment = new Appointment({
        patient: patient._id,
        doctor: doctor._id,
        appointment_date: appointmentDateTime,
        reason,
        status: 'scheduled'
    });
    await appointment.save();

    res.json({ success: true, message: 'Appointment booked successfully', appointmentId: appointment._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all appointments
router.get('/appointments', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const appointments = await Appointment.find()
        .populate({ path: 'patient', populate: { path: 'user' } })
        .populate({ path: 'doctor', populate: { path: 'user' } })
        .sort({ appointment_date: -1 })
        .lean();
        
    const formatted = appointments.map(a => ({
        id: a._id.toString(),
        appointment_date: a.appointment_date,
        reason: a.reason,
        status: a.status,
        patient_id: a.patient?._id?.toString(),
        patient_name: a.patient?.user?.first_name,
        patient_last_name: a.patient?.user?.last_name,
        doctor_id: a.doctor?._id?.toString(),
        doctor_name: a.doctor?.user?.first_name,
        doctor_last_name: a.doctor?.user?.last_name,
        specialization: a.doctor?.specialization
    }));
    
    res.json({ success: true, appointments: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all staff members
router.get('/staff', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const users = await User.find({ 
        role: { $in: ['doctor', 'nurse', 'pharmacist', 'lab_technician', 'receptionist'] },
        is_active: true
    }).sort({ first_name: 1 }).lean();
    
    // We can infer departments without heavy separate collection populates exactly as original did broadly
    const formatted = users.map(u => {
        let dept = 'General';
        if (u.role === 'pharmacist') dept = 'Pharmacy';
        if (u.role === 'lab_technician') dept = 'Laboratory';
        if (u.role === 'receptionist') dept = 'Reception';
        if (u.role === 'doctor') dept = 'Medicine'; // Loose as missing specific join
        if (u.role === 'nurse') dept = 'Nursing';
        
        return {
            id: u._id.toString(),
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            role: u.role,
            department: dept
        };
    });

    res.json({ success: true, staff: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark staff absence
router.post('/staff-absence/mark', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const { staffId, absenceType, startDate, endDate, reason } = req.body;

    if (!staffId || !absenceType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const absence = new StaffAbsence({
        staff_id: staffId,
        absence_type: absenceType,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        reason
    });
    await absence.save();

    res.json({
      success: true,
      message: 'Staff absence marked successfully',
      absenceId: absence._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff absences
router.get('/staff-absences', authMiddleware, roleMiddleware('receptionist'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const absences = await StaffAbsence.find({
        start_date: { $lte: today },
        end_date: { $gte: today }
    }).populate('staff_id').sort({ start_date: -1 }).lean();
    
    const formatted = absences.map(sa => ({
        id: sa._id,
        staff_id: sa.staff_id?._id,
        absence_type: sa.absence_type,
        start_date: sa.start_date,
        end_date: sa.end_date,
        reason: sa.reason,
        first_name: sa.staff_id?.first_name,
        last_name: sa.staff_id?.last_name,
        department: sa.staff_id?.role // Simplification over joins
    }));

    res.json({ success: true, absences: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
