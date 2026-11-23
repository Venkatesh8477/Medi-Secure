const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const multer = require('multer');
const { chatJson } = require('../services/carecheck/llmService');
const { createAiSuggestionsHandler } = require('../services/carecheck/controller');
const path = require('path');
const fs = require('fs');

// Mongoose Models
const User = require('../models/User');
const { Patient, Doctor, Nurse } = require('../models/RoleProfiles');
const { Appointment, Diagnosis, VitalSign, PatientDocument, DailyProgress } = require('../models/Clinical');
const { Medication, Prescription, LabRequest } = require('../models/PharmacyAndLab');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'patient_documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================
// DOCTOR ENDPOINTS
// ============================================

router.get('/doctor/my-patients', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
    try {
        const doc = await Doctor.findOne({ user: req.user.id || req.user.user_id });
        if (!doc) return res.json({ success: true, patients: [] });
        
        const appointments = await Appointment.find({ doctor: doc._id }).select('patient').lean();
        const patientIds = [...new Set(appointments.map(a => a.patient.toString()))];
        
        const patients = await Patient.find({ _id: { $in: patientIds } }).populate('user').lean();
        
        const formatted = patients.map(p => ({
            id: p._id,
            user_id: p.user?._id,
            first_name: p.user?.first_name,
            last_name: p.user?.last_name,
            email: p.user?.email,
            blood_group: p.blood_group,
            date_of_birth: p.date_of_birth,
            phone: p.phone
        })).sort((a,b) => (a.first_name||'').localeCompare(b.first_name||''));
        
        res.json({ success: true, patients: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/doctor/patient/:patientId', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId).populate('user').lean();
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        
        const diagnoses = await Diagnosis.find({ patient: req.params.patientId }).sort('-created_at').lean();
        const prescriptionsList = await Prescription.find({ patient: req.params.patientId }).populate('medication').sort('-created_at').limit(5).lean();
        const prescriptions = prescriptionsList.map(pr => ({ ...pr, medication_name: pr.medication?.name, strength: pr.medication?.strength }));
        const vitals = await VitalSign.find({ patient: req.params.patientId }).sort('-recorded_at').limit(5).lean();
        const appointments = await Appointment.find({ patient: req.params.patientId }).sort('-appointment_date').limit(5).lean();
        
        res.json({
            success: true,
            patient: { ...patient.user, ...patient, id: patient._id },
            diagnoses, prescriptions, vitals, appointments
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/doctor/patient/:patientId/ai-suggestions', authMiddleware, roleMiddleware('doctor'), createAiSuggestionsHandler());

router.post('/doctor/diagnoses', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
    try {
        const doc = await Doctor.findOne({ user: req.user.id || req.user.user_id });
        if (!doc) return res.status(403).json({ error: 'Not authorized' });
        
        const diagnosis = new Diagnosis({
            patient: req.body.patientId, doctor: doc._id, diagnosis_name: req.body.diagnosis_name,
            icd_code: req.body.icd_code, severity: req.body.severity, description: req.body.description
        });
        await diagnosis.save();
        res.json({ success: true, diagnosisId: diagnosis._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/doctor/prescriptions', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
    try {
        const doc = await Doctor.findOne({ user: req.user.id || req.user.user_id });
        if (!doc) return res.status(403).json({ error: 'Not authorized' });
        
        const presc = new Prescription({
            patient: req.body.patientId, doctor: doc._id, medication: req.body.medication_id,
            dosage: req.body.dosage, frequency: req.body.frequency, duration: req.body.duration
        });
        await presc.save();
        res.json({ success: true, prescriptionId: presc._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/doctor/appointments', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
    try {
        const doc = await Doctor.findOne({ user: req.user.id || req.user.user_id });
        if (!doc) return res.json({ success: true, appointments: [] });
        
        const appointmentsList = await Appointment.find({ doctor: doc._id }).populate({ path: 'patient', populate: { path: 'user' } }).sort('-appointment_date').lean();
        const formatted = appointmentsList.map(a => ({
            ...a, patient_id: a.patient?._id, first_name: a.patient?.user?.first_name, last_name: a.patient?.user?.last_name
        }));
        res.json({ success: true, appointments: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PART END


// ============================================
// PATIENT ENDPOINTS
// ============================================

router.get('/patient/my-records', authMiddleware, roleMiddleware('patient'), async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user.id || req.user.user_id });
        if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
        
        const diagnoses = await Diagnosis.find({ patient: patient._id }).sort('-created_at').lean();
        const prescriptionsList = await Prescription.find({ patient: patient._id }).populate('medication').sort('-created_at').lean();
        const prescriptions = prescriptionsList.map(pr => ({ ...pr, medication_name: pr.medication?.name, strength: pr.medication?.strength }));
        
        const vitals = await VitalSign.find({ patient: patient._id }).sort('-recorded_at').lean();
        const labRequests = await LabRequest.find({ patient: patient._id }).sort('-created_at').lean();
        
        res.json({ success: true, diagnoses, prescriptions, vitals, labRequests });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/patient/prescription/:prescriptionId/ai-analysis', authMiddleware, roleMiddleware('patient'), async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user.id || req.user.user_id });
        if (!patient) return res.status(404).json({ error: 'Patient profile' });
        
        let prescriptionData = null;
        let isUploadedDoc = false;
        
        const presc = await Prescription.findOne({ _id: req.params.prescriptionId, patient: patient._id }).populate('medication').lean();
        if (presc) {
            prescriptionData = {
                medication: presc.medication?.name, strength: presc.medication?.strength, dosage: presc.dosage, 
                frequency: presc.frequency, duration: presc.duration, instructions: presc.notes || 'None', source: 'database'
            };
        } else {
            const doc = await PatientDocument.findOne({ _id: req.params.prescriptionId, patient: patient._id, document_type: 'prescription' }).lean();
            if(!doc) return res.status(404).json({ error: 'Not found' });
            
            isUploadedDoc = true;
            prescriptionData = {
                medication: doc.file_name, strength: 'See document', dosage: 'See document', frequency: 'See document',
                duration: 'See document', instructions: 'See document', source: 'uploaded', uploadDate: doc.upload_date, filename: doc.file_name
            };
        }

        const allergies = patient.allergies || 'Not recorded';
        const { value: aiAnalysis } = await chatJson({ role: 'prescription explanation',
            system: 'Explain only the supplied prescription information in patient-friendly language. Do not provide or alter dosage instructions not explicitly supplied. Do not diagnose. State that the prescriber or pharmacist should answer questions. Return JSON with howToTake and importantNotes array.',
            user: JSON.stringify({ prescription: prescriptionData, allergies }) });
        
        res.json({ success: true, analysis: aiAnalysis, prescription: prescriptionData });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/patient/prescriptions/ai-suggestions', authMiddleware, roleMiddleware('patient'), async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user.id || req.user.user_id });
        if (!patient) return res.status(404).json({ error: 'Patient profile' });
        
        const prescriptionsList = await Prescription.find({ patient: patient._id }).populate('medication').sort('-created_at').lean();
        const uploadedDocs = await PatientDocument.find({ patient: patient._id, document_type: 'prescription' }).sort('-upload_date').lean();
        
        if (prescriptionsList.length === 0 && uploadedDocs.length === 0) {
            return res.json({ success: true, suggestions: { message: 'No prescriptions', instructions: [] }});
        }
        
        res.json({ success: true, suggestions: { instructions: [], warnings: [] }, prescriptionCount: prescriptionsList.length + uploadedDocs.length });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/patient/profile', authMiddleware, roleMiddleware('patient'), async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user.id || req.user.user_id }).populate('user').lean();
        if (!patient) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, patient: { ...patient.user, ...patient, id: patient._id } });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/patient/appointments', authMiddleware, roleMiddleware('patient'), async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user.id || req.user.user_id });
        if (!patient) return res.json({ success: true, appointments: [] });
        
        const appointments = await Appointment.find({ patient: patient._id }).populate({ path: 'doctor', populate: { path: 'user' } }).sort('-appointment_date').lean();
        const formatted = appointments.map(a => ({
            ...a, specialization: a.doctor?.specialization, first_name: a.doctor?.user?.first_name, last_name: a.doctor?.user?.last_name
        }));
        res.json({ success: true, appointments: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// NURSE ENDPOINTS
// ============================================

router.post('/nurse/vital-signs', authMiddleware, roleMiddleware('nurse'), async (req, res) => {
    try {
        const { patientId, temperature, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, oxygen_saturation } = req.body;
        const vs = new VitalSign({ patient: patientId, temperature, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, oxygen_saturation });
        await vs.save();
        res.json({ success: true, vitalSignId: vs._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/nurse/patients', authMiddleware, roleMiddleware('nurse'), async (req, res) => {
    try {
        const patients = await Patient.find().populate('user').lean();
        const formatted = patients.map(p => ({
            id: p._id, first_name: p.user?.first_name, last_name: p.user?.last_name, blood_group: p.blood_group, email: p.user?.email
        })).sort((a,b)=> (a.first_name||'').localeCompare(b.first_name||''));
        res.json({ success: true, patients: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/nurse/dashboard/stats', authMiddleware, roleMiddleware('nurse'), async (req, res) => {
    try {
        const totalPatients = await Patient.countDocuments();
        const vitalRecordings = await VitalSign.countDocuments();
        const progressNotesAdded = await DailyProgress.countDocuments();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const monitored = await VitalSign.distinct('patient', { recorded_at: { $gte: yesterday } });
        
        res.json({ success: true, stats: { totalPatients, vitalRecordings, progressNotesAdded, patientsMonitored: monitored.length } });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/nurse/daily-progress', authMiddleware, roleMiddleware('nurse'), async (req, res) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id || req.user.user_id });
        if (!nurse) return res.status(403).json({ error: 'Not authorized' });
        
        const prog = new DailyProgress({
            patient: req.body.patientId, nurse: nurse._id, appetite: req.body.appetite,
            sleep_hours: req.body.sleep_hours, mood: req.body.mood, pain_level: req.body.pain_level, notes: req.body.notes
        });
        await prog.save();
        res.json({ success: true, progressId: prog._id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/nurse/vitals/:patientId', authMiddleware, roleMiddleware('nurse'), async (req, res) => {
    try {
        const vitals = await VitalSign.find({ patient: req.params.patientId }).sort('-recorded_at').limit(50).lean();
        res.json({ success: true, vitals });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/nurse/progress/:patientId', authMiddleware, roleMiddleware('nurse'), async (req, res) => {
    try {
        const progressNotes = await DailyProgress.find({ patient: req.params.patientId }).sort('-progress_date').limit(50).lean();
        res.json({ success: true, progressNotes });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/nurse/patient/:patientId/vitals', authMiddleware, roleMiddleware('nurse'), async (req, res) => {
    try {
        const vitals = await VitalSign.find({ patient: req.params.patientId }).sort('-recorded_at').lean();
        res.json({ success: true, vitals });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// PART END

// ============================================
// ADMIN ENDPOINTS
// ============================================
const { StaffAttendance } = require('../models/System');

router.get('/admin/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-password_hash').sort('-created_at').lean();
        res.json({ success: true, users: users.map(u => ({ ...u, id: u._id })) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/statistics', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalPatients = await Patient.countDocuments();
        const totalDoctors = await Doctor.countDocuments();
        const totalAppointments = await Appointment.countDocuments();
        const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
        const lowStockMeds = await Medication.countDocuments({ $expr: { $lte: ["$stock_quantity", "$reorder_level"] } });
        
        res.json({ success: true, stats: { totalUsers, totalPatients, totalDoctors, totalAppointments, completedAppointments, lowStockMeds } });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/appointments', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const appointmentsList = await Appointment.find().populate({ path: 'patient', populate: { path: 'user' } }).populate({ path: 'doctor', populate: { path: 'user' }}).sort('-appointment_date').lean();
        const formatted = appointmentsList.map(a => ({
            ...a, patient_first_name: a.patient?.user?.first_name, patient_last_name: a.patient?.user?.last_name,
            doctor_first_name: a.doctor?.user?.first_name, doctor_last_name: a.doctor?.user?.last_name
        }));
        res.json({ success: true, appointments: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/diagnoses', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const diagnosesList = await Diagnosis.find().populate({ path: 'patient', populate: { path: 'user' } }).populate({ path: 'doctor', populate: { path: 'user' }}).sort('-created_at').lean();
        const formatted = diagnosesList.map(d => ({
            ...d, patient_name: d.patient?.user?.first_name, doctor_name: d.doctor?.user?.first_name
        }));
        res.json({ success: true, diagnoses: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/medications', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const medications = await Medication.find().sort('name').lean();
        res.json({ success: true, medications });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/medications/low-stock', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const medications = await Medication.find({ $expr: { $lte: ["$stock_quantity", "$reorder_level"] } }).sort('stock_quantity').lean();
        res.json({ success: true, medications });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/admin/medications/:medicationId', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        await Medication.findByIdAndUpdate(req.params.medicationId, { stock_quantity: req.body.stock_quantity });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/admin/staff-attendance', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const attendance = await StaffAttendance.find().populate('user').sort('-attendance_date').limit(50).lean();
        const formatted = attendance.map(a => ({
            ...a, username: a.user?.username, first_name: a.user?.first_name, last_name: a.user?.last_name, role: a.user?.role
        }));
        res.json({ success: true, attendance: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// SHARED ENDPOINTS
// ============================================

router.get('/medications', authMiddleware, async (req, res) => {
    try {
        const medications = await Medication.find().sort('name').lean();
        res.json({ success: true, medications });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/doctors', authMiddleware, async (req, res) => {
    try {
        const doctors = await Doctor.find().populate('user').lean();
        const formatted = doctors.map(d => ({
            id: d._id, specialization: d.specialization, department: d.department, first_name: d.user?.first_name, last_name: d.user?.last_name, email: d.user?.email
        })).sort((a,b)=> (a.first_name||'').localeCompare(b.first_name||''));
        res.json({ success: true, doctors: formatted });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/dashboard-summary', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.user_id;
        const role = req.user?.role;
        let summary = {};
        
        if (role === 'doctor') {
            const doc = await Doctor.findOne({ user: userId });
            if (doc) {
                const appointments = await Appointment.find({ doctor: doc._id }).lean();
                const uniquePatients = new Set(appointments.map(a => a.patient?.toString())).size;
                const diagnosesCount = await Diagnosis.countDocuments({ doctor: doc._id });
                summary = { patientCount: uniquePatients, upcomingAppointments: appointments.length, diagnosesCount };
            }
        } else if (role === 'patient') {
            const patient = await Patient.findOne({ user: userId });
            if (patient) {
                const upcomingAppointments = await Appointment.countDocuments({ patient: patient._id });
                const diagnosesCount = await Diagnosis.countDocuments({ patient: patient._id });
                const prescriptionsCount = await Prescription.countDocuments({ patient: patient._id });
                summary = { upcomingAppointments, diagnosesCount, prescriptionsCount };
            }
        } else if (role === 'admin') {
            summary = {
                totalUsers: await User.countDocuments(),
                totalPatients: await Patient.countDocuments(),
                pendingAppointments: await Appointment.countDocuments()
            };
        }
        res.json({ success: true, summary });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// PATIENT DOCUMENT MANAGEMENT
// ============================================

router.post('/patient/documents/upload', authMiddleware, roleMiddleware('patient'), upload.single('fileContent'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        
        let patient = await Patient.findOne({ user: req.user.id || req.user.user_id });
        if (!patient) return res.status(404).json({ error: "Patient not found" });

        const doc = new PatientDocument({
            patient: patient._id, document_type: req.body.documentType || 'general',
            file_name: req.file.originalname, file_path: req.file.path,
            uploaded_by: req.user.id || req.user.user_id, // We need objectId really
            description: req.body.description || ''
        });
        await doc.save();

        res.json({ success: true, message: 'Document uploaded successfully', documentId: doc._id, filename: req.file.originalname });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/patient/documents', authMiddleware, roleMiddleware('patient'), async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user.id || req.user.user_id });
        if (!patient) return res.json({ success: true, documents: [] });

        const documents = await PatientDocument.find({ patient: patient._id }).sort('-upload_date').lean();
        res.json({ success: true, documents: documents.map(d => ({ ...d, id: d._id, filename: d.file_name })) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/patient/documents/:documentId', authMiddleware, roleMiddleware('patient'), async (req, res) => {
    try {
        const patient = await Patient.findOne({ user: req.user.id || req.user.user_id });
        if(!patient) return res.status(403).json({ error: "No patient" });
        const doc = await PatientDocument.findOne({ _id: req.params.documentId, patient: patient._id });
        if (!doc || !fs.existsSync(doc.file_path)) return res.status(404).json({ error: 'Document not found' });
        
        res.download(doc.file_path, doc.file_name);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/doctor/patient/:patientId/documents', authMiddleware, roleMiddleware('doctor'), async (req, res) => {
    try {
        const documents = await PatientDocument.find({ patient: req.params.patientId }).sort('-upload_date').lean();
        res.json({ success: true, documents: documents.map(d => ({ ...d, id: d._id, filename: d.file_name })) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// ROUTE ALIASES FOR COMPATIBILITY
// ============================================

router.get('/nurse/assigned-patients', authMiddleware, roleMiddleware('nurse'), (req, res) => {
    res.redirect('/api/nurse/patients');
});
router.get('/nurse/vitals', authMiddleware, roleMiddleware('nurse'), (req, res) => {
    res.redirect('/api/nurse/vitals/' + (req.query.patientId || ''));
});
router.get('/patient/my-appointments', authMiddleware, roleMiddleware('patient'), (req, res) => {
    res.redirect('/api/patient/appointments');
});
router.get('/patient/medical-records', authMiddleware, roleMiddleware('patient'), (req, res) => {
    res.redirect('/api/patient/my-records');
});
router.get('/lab-technician/requests', authMiddleware, roleMiddleware('lab_technician'), (req, res) => {
    res.redirect('/api/lab-technician/test-requests');
});
router.get('/receptionist/patients', authMiddleware, roleMiddleware('receptionist'), (req, res) => {
    res.redirect('/api/receptionist/patients');
});
router.get('/pharmacist/prescriptions', authMiddleware, roleMiddleware('pharmacist'), (req, res) => {
    res.redirect('/api/pharmacist/prescriptions');
});

module.exports = router;

