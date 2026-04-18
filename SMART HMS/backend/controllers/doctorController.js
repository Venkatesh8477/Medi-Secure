const User = require('../models/User');
const { Doctor, Patient } = require('../models/RoleProfiles');
const { Appointment, Diagnosis } = require('../models/Clinical');
const { Prescription } = require('../models/PharmacyAndLab');

class DoctorController {
    /**
     * Get doctor's patients
     */
    static async getDoctorPatients(req, res) {
        try {
            const userId = req.user.user_id || req.user.id;
            
            const doctor = await Doctor.findOne({ user: userId });
            if (!doctor) {
                return res.status(404).json({ error: 'Doctor record not found for user' });
            }
            
            const appointments = await Appointment.find({ doctor: doctor._id }).select('patient').lean();
            const patientIds = [...new Set(appointments.map(a => a.patient.toString()))];
            
            const patients = await Patient.find({ _id: { $in: patientIds } }).populate('user').lean();
            
            const formatted = patients.map(p => ({
                ...p,
                username: p.user?.username,
                email: p.user?.email,
                first_name: p.user?.first_name,
                last_name: p.user?.last_name
            }));
            
            res.json({
                success: true,
                patients: formatted,
                total: formatted.length
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get patients: ' + error.message });
        }
    }

    /**
     * Add diagnosis for patient
     */
    static async addDiagnosis(req, res) {
        try {
            const userId = req.user.user_id || req.user.id;
            const { patientId, diagnosisName, icdCode, severity, description } = req.body;
            
            const doctor = await Doctor.findOne({ user: userId });
            if (!doctor) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            const diagnosis = new Diagnosis({
                patient: patientId,
                doctor: doctor._id,
                diagnosis_name: diagnosisName,
                icd_code: icdCode,
                severity: severity || 'moderate',
                description
            });
            await diagnosis.save();
            
            res.status(201).json({
                success: true,
                message: 'Diagnosis added successfully',
                diagnosisId: diagnosis._id
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to add diagnosis: ' + error.message });
        }
    }

    /**
     * Create prescription
     */
    static async createPrescription(req, res) {
        try {
            const userId = req.user.user_id || req.user.id;
            const { patientId, medicationId, dosage, frequency, duration, quantity, notes } = req.body;
            
            const doctor = await Doctor.findOne({ user: userId });
            if (!doctor) {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            const prescription = new Prescription({
                patient: patientId,
                doctor: doctor._id,
                medication: medicationId,
                dosage,
                frequency,
                duration,
                quantity,
                notes
            });
            await prescription.save();
            
            res.status(201).json({
                success: true,
                message: 'Prescription created successfully',
                prescriptionId: prescription._id
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create prescription: ' + error.message });
        }
    }

    /**
     * Get available appointments
     */
    static async getAvailableSlots(req, res) {
        try {
            const userId = req.user.user_id || req.user.id;
            const { date } = req.query;
            
            if (!date) {
                return res.status(400).json({ error: 'Date required' });
            }
            
            const doctor = await Doctor.findOne({ user: userId });
            if (!doctor) {
                return res.json({ success: true, appointments: [], total: 0 });
            }
            
            const startOfDay = new Date(date);
            startOfDay.setHours(0,0,0,0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23,59,59,999);
            
            const appointments = await Appointment.find({
                doctor: doctor._id,
                appointment_date: { $gte: startOfDay, $lte: endOfDay },
                status: 'scheduled'
            }).lean();
            
            res.json({
                success: true,
                appointments,
                total: appointments.length
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get appointments: ' + error.message });
        }
    }

    /**
     * Get doctor's profile
     */
    static async getDoctorProfile(req, res) {
        try {
            const userId = req.user.user_id || req.user.id;
            
            const doctor = await Doctor.findOne({ user: userId }).populate('user').lean();
            
            if (!doctor) {
                return res.status(404).json({ error: 'Doctor not found' });
            }
            
            res.json({
                success: true,
                doctor: { ...doctor.user, ...doctor, id: doctor.user._id, doctor_id: doctor._id }
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get profile: ' + error.message });
        }
    }
}

module.exports = DoctorController;
