const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
    name: { type: String, required: true, maxLength: 150 },
    generic_name: { type: String, maxLength: 150 },
    strength: { type: String, maxLength: 50 },
    form: { type: String, maxLength: 50 },
    manufacturer: { type: String, maxLength: 100 },
    stock_quantity: { type: Number, default: 0 },
    reorder_level: { type: Number, default: 20 },
    price: mongoose.Decimal128,
    expiry_date: Date
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
medicationSchema.index({ name: 1 });
medicationSchema.index({ expiry_date: 1 });

const prescriptionSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    medication: { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true },
    dosage: { type: String, required: true, maxLength: 100 },
    frequency: { type: String, required: true, maxLength: 50 },
    duration: { type: String, maxLength: 50 },
    quantity: Number,
    status: { type: String, enum: ['pending', 'dispensed', 'cancelled'], default: 'pending' },
    notes: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
prescriptionSchema.index({ patient: 1 });
prescriptionSchema.index({ status: 1 });

const labRequestSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    test_name: { type: String, required: true, maxLength: 150 },
    test_type: { type: String, maxLength: 100 },
    reason: String,
    status: { type: String, enum: ['pending', 'sample_collected', 'processing', 'completed'], default: 'pending' },
    sample_collection_date: Date
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
labRequestSchema.index({ patient: 1 });
labRequestSchema.index({ status: 1 });

const labResultSchema = new mongoose.Schema({
    lab_request: { type: mongoose.Schema.Types.ObjectId, ref: 'LabRequest', required: true },
    result_status: { type: String, enum: ['normal', 'abnormal', 'critical'], default: 'normal' },
    result_value: { type: String, maxLength: 255 },
    reference_range: { type: String, maxLength: 100 },
    unit: { type: String, maxLength: 50 },
    report_file_path: { type: String, maxLength: 255 },
    notes: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
labResultSchema.index({ lab_request: 1 });

const medicationAdministrationSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true },
    nurse: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse', required: true },
    administered_date: { type: Date, default: Date.now },
    time_administered: String,
    notes: String
}, { timestamps: { createdAt: 'created_at' } }); // MySQL had only created_at
medicationAdministrationSchema.index({ patient: 1 });

module.exports = {
    Medication: mongoose.model('Medication', medicationSchema),
    Prescription: mongoose.model('Prescription', prescriptionSchema),
    LabRequest: mongoose.model('LabRequest', labRequestSchema),
    LabResult: mongoose.model('LabResult', labResultSchema),
    MedicationAdministration: mongoose.model('MedicationAdministration', medicationAdministrationSchema)
};
