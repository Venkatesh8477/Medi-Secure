const express = require('express');
const PatientController = require('../controllers/patientController');
const DoctorController = require('../controllers/doctorController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { Appointment, Diagnosis, VitalSign } = require('../models/Clinical');
const { Medication, Prescription, LabRequest, LabResult } = require('../models/PharmacyAndLab');
const { Doctor } = require('../models/RoleProfiles');

const router = express.Router();

// ============================================
// PATIENT ROUTES
// ============================================
router.post('/patients/register', authMiddleware, roleMiddleware('receptionist', 'admin'), PatientController.registerPatient);
router.get('/patients', authMiddleware, roleMiddleware('doctor', 'admin', 'nurse'), PatientController.getAllPatients);
router.get('/patients/:patientId', authMiddleware, PatientController.getPatientDetails);
router.get('/patients/:patientId/medical-records', authMiddleware, PatientController.getPatientRecords);

router.get('/patients/:patientId/diagnoses', authMiddleware, async (req, res) => {
    try {
        const diagnoses = await Diagnosis.find({ patient: req.params.patientId }).sort('-created_at').lean();
        res.json({ success: true, diagnoses });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// DOCTOR ROUTES
// ============================================
router.get('/doctors', authMiddleware, roleMiddleware('admin', 'nurse'), async (req, res) => {
    try {
        const doctors = await Doctor.find().populate('user').lean();
        const formatted = doctors.map(d => ({
            ...d, username: d.user?.username, email: d.user?.email, first_name: d.user?.first_name, last_name: d.user?.last_name
        })).sort((a,b) => (a.first_name || '').localeCompare(b.first_name || ''));
        res.json({ success: true, doctors: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/doctors/:doctorId', authMiddleware, async (req, res) => {
    try {
        const doc = await Doctor.findById(req.params.doctorId).populate('user').lean();
        if (!doc) return res.status(404).json({ error: 'Doctor not found' });
        res.json({ 
            success: true, 
            doctor: { ...doc, username: doc.user?.username, email: doc.user?.email, first_name: doc.user?.first_name, last_name: doc.user?.last_name } 
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/doctors/my-patients', authMiddleware, roleMiddleware('doctor'), DoctorController.getDoctorPatients);
router.post('/diagnoses', authMiddleware, roleMiddleware('doctor'), DoctorController.addDiagnosis);

// ============================================
// APPOINTMENT ROUTES
// ============================================
router.get('/appointments', authMiddleware, async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('patient')
            .populate('doctor')
            .sort('-appointment_date').lean();
            
        const formatted = appointments.map(a => ({
            ...a, patient_id: a.patient?._id, doctor_id: a.doctor?._id
        }));
        res.json({ success: true, appointments: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/appointments', authMiddleware, roleMiddleware('admin', 'receptionist'), async (req, res) => {
    try {
        const { patientId, doctorId, appointmentDate, reason, status } = req.body;
        const appt = new Appointment({ patient: patientId, doctor: doctorId, appointment_date: new Date(appointmentDate), reason, status: status || 'scheduled' });
        await appt.save();
        res.json({ success: true, appointmentId: appt._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/appointments/:appointmentId', authMiddleware, roleMiddleware('admin', 'doctor', 'nurse'), async (req, res) => {
    try {
        await Appointment.findByIdAndUpdate(req.params.appointmentId, { status: req.body.status, notes: req.body.notes });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// PRESCRIPTION ROUTES
// ============================================
router.get('/prescriptions', authMiddleware, async (req, res) => {
    try {
        const prescriptions = await Prescription.find().populate('medication').sort('-created_at').lean();
        const formatted = prescriptions.map(p => ({
            ...p, medication_name: p.medication?.name
        }));
        res.json({ success: true, prescriptions: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/prescriptions', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
    try {
        const { patientId, doctorId, medicationId, dosage, frequency, duration, quantity } = req.body;
        const presc = new Prescription({ patient: patientId, doctor: doctorId, medication: medicationId, dosage, frequency, duration, quantity, status: 'pending' });
        await presc.save();
        res.json({ success: true, prescriptionId: presc._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/prescriptions/:prescriptionId', authMiddleware, roleMiddleware('admin', 'pharmacist'), async (req, res) => {
    try {
        await Prescription.findByIdAndUpdate(req.params.prescriptionId, { status: req.body.status });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// MEDICATION ROUTES
// ============================================
router.get('/medications', authMiddleware, async (req, res) => {
    try {
        const medications = await Medication.find().sort('name').lean();
        res.json({ success: true, medications });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/medications/low-stock', authMiddleware, roleMiddleware('admin', 'pharmacist'), async (req, res) => {
    try {
        const medications = await Medication.find({ $expr: { $lte: ["$stock_quantity", "$reorder_level"] } }).sort('stock_quantity').lean();
        res.json({ success: true, medications });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/medications/:medicationId', authMiddleware, roleMiddleware('admin', 'pharmacist'), async (req, res) => {
    try {
        await Medication.findByIdAndUpdate(req.params.medicationId, { stock_quantity: req.body.stockQuantity });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// VITAL SIGNS ROUTES
// ============================================
router.get('/vital-signs', authMiddleware, async (req, res) => {
    try {
        const query = req.query.patientId ? { patient: req.query.patientId } : {};
        const vitalSigns = await VitalSign.find(query).sort('-recorded_at').lean();
        res.json({ success: true, vitalSigns });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/vital-signs', authMiddleware, roleMiddleware('nurse', 'admin'), async (req, res) => {
    try {
        const { patientId, temperature, heartRate, bloodPressureSystolic, bloodPressureDiastolic, oxygenSaturation, glucoseLevel, weight, height, notes } = req.body;
        const vs = new VitalSign({
            patient: patientId, temperature, heart_rate: heartRate, blood_pressure_systolic: bloodPressureSystolic, 
            blood_pressure_diastolic: bloodPressureDiastolic, oxygen_saturation: oxygenSaturation, glucose_level: glucoseLevel, 
            weight, height, notes
        });
        await vs.save();
        res.json({ success: true, vitalSignId: vs._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// LAB ROUTES
// ============================================
router.get('/lab-requests', authMiddleware, async (req, res) => {
    try {
        const labRequests = await LabRequest.find().sort('-created_at').lean();
        res.json({ success: true, labRequests });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/lab-requests', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
    try {
        const { patientId, doctorId, testName, testType, reason } = req.body;
        const lr = new LabRequest({ patient: patientId, doctor: doctorId, test_name: testName, test_type: testType, reason, status: 'pending' });
        await lr.save();
        res.json({ success: true, labRequestId: lr._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/lab-results', authMiddleware, async (req, res) => {
    try {
        const labResults = await LabResult.find().populate('lab_request').sort('-created_at').lean();
        const formatted = labResults.map(lr => ({
            ...lr, test_name: lr.lab_request?.test_name
        }));
        res.json({ success: true, labResults: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
