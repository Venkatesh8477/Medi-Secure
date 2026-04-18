const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    date_of_birth: Date,
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    blood_group: { type: String, maxLength: 10 },
    phone: { type: String, maxLength: 20 },
    address: String,
    city: { type: String, maxLength: 50 },
    state: { type: String, maxLength: 50 },
    postal_code: { type: String, maxLength: 10 },
    emergency_contact_name: { type: String, maxLength: 100 },
    emergency_contact_phone: { type: String, maxLength: 20 },
    medical_history: String,
    allergies: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const doctorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialization: { type: String, maxLength: 100 },
    license_number: { type: String, maxLength: 50, unique: true, sparse: true },
    department: { type: String, maxLength: 100 },
    phone_extension: { type: String, maxLength: 10 },
    available_slots: { type: Number, default: 10 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ department: 1 });

const nurseSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    license_number: { type: String, maxLength: 50, unique: true, sparse: true },
    department: { type: String, maxLength: 100 },
    shift: { type: String, maxLength: 20 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
nurseSchema.index({ department: 1 });

const pharmacistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    license_number: { type: String, maxLength: 50, unique: true, sparse: true },
    department: { type: String, maxLength: 100 },
    shift: { type: String, maxLength: 20 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const labTechnicianSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    license_number: { type: String, maxLength: 50, unique: true, sparse: true },
    department: { type: String, maxLength: 100 },
    shift: { type: String, maxLength: 20 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const receptionistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: String, maxLength: 100 },
    phone_extension: { type: String, maxLength: 10 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = {
    Patient: mongoose.model('Patient', patientSchema),
    Doctor: mongoose.model('Doctor', doctorSchema),
    Nurse: mongoose.model('Nurse', nurseSchema),
    Pharmacist: mongoose.model('Pharmacist', pharmacistSchema),
    LabTechnician: mongoose.model('LabTechnician', labTechnicianSchema),
    Receptionist: mongoose.model('Receptionist', receptionistSchema)
};
