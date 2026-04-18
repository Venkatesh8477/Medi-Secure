const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointment_date: { type: Date, required: true },
    reason: String,
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
    notes: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
appointmentSchema.index({ doctor: 1, appointment_date: 1 });
appointmentSchema.index({ patient: 1 });

const diagnosisSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    diagnosis_name: { type: String, required: true, maxLength: 255 },
    icd_code: { type: String, maxLength: 20 },
    severity: { type: String, enum: ['mild', 'moderate', 'severe', 'critical'], default: 'moderate' },
    description: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
diagnosisSchema.index({ patient: 1 });
diagnosisSchema.index({ doctor: 1 });

const vitalSignSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    nurse: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
    temperature: Number,
    heart_rate: Number,
    blood_pressure_systolic: Number,
    blood_pressure_diastolic: Number,
    oxygen_saturation: Number,
    glucose_level: Number,
    weight: Number,
    height: Number,
    notes: String,
    recorded_at: { type: Date, default: Date.now }
});
vitalSignSchema.index({ patient: 1, recorded_at: 1 });

const patientDocumentSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    document_type: { type: String, maxLength: 100 },
    file_name: { type: String, maxLength: 255 },
    file_path: { type: String, maxLength: 255 },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    upload_date: { type: Date, default: Date.now }
});
patientDocumentSchema.index({ patient: 1 });

const dailyProgressSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    nurse: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse', required: true },
    progress_date: { type: Date, default: Date.now },
    shift: { type: String, maxLength: 20 },
    appetite: { type: String, maxLength: 100 },
    sleep_hours: Number,
    mood: { type: String, maxLength: 100 },
    pain_level: Number,
    notes: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
dailyProgressSchema.index({ patient: 1 });

module.exports = {
    Appointment: mongoose.model('Appointment', appointmentSchema),
    Diagnosis: mongoose.model('Diagnosis', diagnosisSchema),
    VitalSign: mongoose.model('VitalSign', vitalSignSchema),
    PatientDocument: mongoose.model('PatientDocument', patientDocumentSchema),
    DailyProgress: mongoose.model('DailyProgress', dailyProgressSchema)
};
