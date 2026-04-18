const User = require('../models/User');
const { Patient } = require('../models/RoleProfiles');
const { Diagnosis, VitalSign } = require('../models/Clinical');

class PatientController {
    /**
     * Register new patient
     */
    static async registerPatient(req, res) {
        try {
            const { userId, dateOfBirth, gender, bloodGroup, phone, address, city, state, postalCode, emergencyContactName, emergencyContactPhone } = req.body;
            
            const patient = new Patient({
                user: userId,
                date_of_birth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                gender,
                blood_group: bloodGroup,
                phone,
                address,
                city,
                state,
                postal_code: postalCode,
                emergency_contact_name: emergencyContactName,
                emergency_contact_phone: emergencyContactPhone
            });
            await patient.save();

            res.status(201).json({
                success: true,
                message: 'Patient registered successfully',
                patientId: patient._id
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to register patient: ' + error.message });
        }
    }

    /**
     * Get patient details
     */
    static async getPatientDetails(req, res) {
        try {
            const { patientId } = req.params;
            
            let patient;
            // Handle possibility of frontend passing user_id instead of patient_id sometimes
            // Since we don't know for sure, let's look up by patient ID first, then try user ID
            try {
                patient = await Patient.findById(patientId).populate('user').lean();
            } catch (e) {
                patient = await Patient.findOne({ user: patientId }).populate('user').lean();
            }
            if(!patient) {
                patient = await Patient.findOne({ user: patientId }).populate('user').lean();
            }
            
            if (!patient) {
                return res.status(404).json({ error: 'Patient not found' });
            }
            
            res.json({
                success: true,
                patient: { 
                    ...patient.user, 
                    ...patient, 
                    id: patient.user._id,
                    user_id: patient.user._id,
                    patient_id: patient._id
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get patient: ' + error.message });
        }
    }

    /**
     * Get all patients (for doctor/admin)
     */
    static async getAllPatients(req, res) {
        try {
            const patients = await Patient.find().populate('user').lean();
            
            const formatted = patients.map(p => ({
                id: p.user?._id,
                username: p.user?.username,
                email: p.user?.email,
                first_name: p.user?.first_name,
                last_name: p.user?.last_name,
                patient_id: p._id,
                date_of_birth: p.date_of_birth,
                gender: p.gender,
                blood_group: p.blood_group,
                phone: p.phone
            })).sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));
            
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
     * Get patient medical records
     */
    static async getPatientRecords(req, res) {
        try {
            const { patientId } = req.params;
            
            const diagnoses = await Diagnosis.find({ patient: patientId }).sort('-created_at').lean();
            const vitals = await VitalSign.find({ patient: patientId }).sort('-recorded_at').limit(10).lean();
            
            res.json({
                success: true,
                diagnoses,
                vital_signs: vitals
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get records: ' + error.message });
        }
    }
}

module.exports = PatientController;
