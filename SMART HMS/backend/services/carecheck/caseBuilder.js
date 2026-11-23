const { Types } = require('mongoose');
const { randomUUID } = require('crypto');

function clean(value) {
    if (value === undefined || value === null || value === '') return null;
    return value;
}

function deidentifyText(value, patientUser = {}) {
    if (typeof value !== 'string') return clean(value);
    let text = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
        .replace(/(?:\+?\d[\d\s().-]{8,}\d)/g, '[redacted phone]')
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[redacted date]');
    for (const name of [patientUser.first_name, patientUser.last_name]) {
        if (typeof name === 'string' && name.trim().length > 1) {
            text = text.replace(new RegExp(name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[redacted name]');
        }
    }
    return text;
}

function ageFrom(dateOfBirth, now = new Date()) {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > now) return null;
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
    return age;
}

function daysAgo(date, now = new Date()) {
    if (!date || Number.isNaN(new Date(date).getTime())) return null;
    return Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 86400000));
}

async function buildClinicalCase({ patientId, models, now = new Date() }) {
    if (!Types.ObjectId.isValid(patientId)) {
        const error = new Error('Invalid patient ID.'); error.status = 400; throw error;
    }
    const { Patient, Doctor, Appointment, Diagnosis, Prescription, VitalSign } = models;
    const doctor = await Doctor.findOne({ user: models.doctorUserId });
    if (!doctor) { const error = new Error('Doctor profile not found.'); error.status = 403; throw error; }
    const patient = await Patient.findById(patientId).populate('user').lean();
    if (!patient) { const error = new Error('Patient not found.'); error.status = 404; throw error; }
    const access = await Appointment.exists({ doctor: doctor._id, patient: patient._id });
    if (!access) { const error = new Error('You are not authorized to review this patient.'); error.status = 403; throw error; }

    const [diagnoses, prescriptions, vitals] = await Promise.all([
        Diagnosis.find({ patient: patient._id }).sort('-created_at').limit(20).lean(),
        Prescription.find({ patient: patient._id, status: { $ne: 'cancelled' } }).populate('medication').sort('-created_at').limit(20).lean(),
        VitalSign.find({ patient: patient._id }).sort('-recorded_at').limit(10).lean()
    ]);
    const issues = [];
    const patientUser = patient.user || {};
    const allergies = deidentifyText(patient.allergies, patientUser);
    if (!allergies) issues.push('Allergy information is not recorded; do not interpret as no known allergies.');
    if (!diagnoses.length) issues.push('No diagnoses are recorded.');
    if (!prescriptions.length) issues.push('No current prescriptions are recorded.');
    if (!vitals.length) issues.push('No recent vital signs are recorded.');
    if (prescriptions.some(p => !p.medication?.name)) issues.push('At least one prescription has incomplete medication details.');
    if (patient.date_of_birth && ageFrom(patient.date_of_birth, now) === null) issues.push('Date of birth is inconsistent or invalid.');

    return {
        patientDisplayName: [patientUser.first_name, patientUser.last_name].filter(Boolean).join(' ') || 'Patient',
        patientData: { diagnosesCount: diagnoses.length, prescriptionsCount: prescriptions.length },
        clinicalCase: {
        caseId: `case-${randomUUID()}`,
        demographics: { age: ageFrom(patient.date_of_birth, now), gender: clean(patient.gender), bloodGroup: clean(patient.blood_group) },
        allergies,
        medicalHistory: deidentifyText(patient.medical_history, patientUser),
        diagnoses: diagnoses.map(d => ({ name: deidentifyText(d.diagnosis_name, patientUser), code: clean(d.icd_code), severity: clean(d.severity), description: deidentifyText(d.description, patientUser), daysAgo: daysAgo(d.created_at, now) })),
        currentPrescriptions: prescriptions.map(p => ({
            medication: clean(p.medication?.name), strength: clean(p.medication?.strength), dosage: clean(p.dosage),
            frequency: clean(p.frequency), duration: clean(p.duration), notes: deidentifyText(p.notes, patientUser)
        })),
        recentVitals: vitals.map(v => ({ daysAgo: daysAgo(v.recorded_at, now), temperature: clean(v.temperature), heartRate: clean(v.heart_rate),
            bloodPressureSystolic: clean(v.blood_pressure_systolic), bloodPressureDiastolic: clean(v.blood_pressure_diastolic),
            oxygenSaturation: clean(v.oxygen_saturation), glucose: clean(v.glucose_level), weight: clean(v.weight), height: clean(v.height) })),
        dataQualityIssues: issues
        }
    };
}

module.exports = { buildClinicalCase, ageFrom, deidentifyText };
