const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema({
    category: { type: String, required: true, maxLength: 80 },
    severity: { type: String, required: true, maxLength: 40 },
    description: { type: String, required: true, maxLength: 2000 },
    medicineNames: [{ type: String, maxLength: 150 }],
    evidence: [{ type: mongoose.Schema.Types.Mixed }],
    confidence: { type: String, required: true, maxLength: 40 }
}, { _id: false });

const modelResultSchema = new mongoose.Schema({
    provider: { type: String, enum: ['gemini', 'ollama'], required: true },
    modelName: { type: String, required: true },
    modelVersion: { type: String, default: null },
    status: { type: String, enum: ['completed', 'failed', 'partial'], required: true },
    findings: [findingSchema],
    missingInformation: [{ type: String, maxLength: 500 }],
    conflicts: [{ type: String, maxLength: 1000 }],
    evidence: [{ type: mongoose.Schema.Types.Mixed }],
    error: { type: String, default: null, maxLength: 500 },
    durationMs: { type: Number, min: 0 }
}, { _id: false });

const agentResultSchema = new mongoose.Schema({
    agentName: { type: String, required: true, maxLength: 80 },
    provider: { type: String, enum: ['gemini', 'ollama'], required: true },
    modelName: { type: String, required: true },
    status: { type: String, enum: ['completed', 'failed'], required: true },
    findings: [findingSchema],
    missingInformation: [{ type: String, maxLength: 500 }],
    evidence: [{ type: mongoose.Schema.Types.Mixed }],
    error: { type: String, default: null, maxLength: 500 },
    durationMs: { type: Number, min: 0 }
}, { _id: false });

const prescriptionAnalysisSchema = new mongoose.Schema({
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
    sourceDocumentName: { type: String, maxLength: 255, default: null },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    agentMode: { type: String, enum: ['single', 'multi'], required: true },
    providerMode: { type: String, enum: ['gemini', 'ollama', 'both'], required: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'partial'], default: 'pending' },
    modelResults: [modelResultSchema],
    agentResults: [agentResultSchema],
    documentExtraction: { type: mongoose.Schema.Types.Mixed, default: null },
    comparison: { type: mongoose.Schema.Types.Mixed, default: null },
    doctorReview: {
        status: { type: String, enum: ['pending', 'reviewed', 'follow_up_required', 'not_actionable'], default: 'pending' },
        notes: { type: String, maxLength: 4000, default: '' },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null }
    }
}, { timestamps: true });

prescriptionAnalysisSchema.index({ prescription: 1, doctor: 1, createdAt: -1 });
prescriptionAnalysisSchema.index({ patient: 1, doctor: 1, createdAt: -1 });
prescriptionAnalysisSchema.index({ doctor: 1, createdAt: -1 });

module.exports = mongoose.models.PrescriptionAnalysis ||
    mongoose.model('PrescriptionAnalysis', prescriptionAnalysisSchema);
