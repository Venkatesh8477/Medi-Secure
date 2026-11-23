const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    title: { type: String, maxLength: 200, default: 'Health assistant conversation' },
    language: { type: String, enum: ['en', 'te'], default: 'en' },
    status: { type: String, enum: ['active', 'deleted'], default: 'active' }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientAIConversation', required: true, index: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    sender: { type: String, enum: ['patient', 'assistant'], required: true },
    message: { type: String, required: true, maxLength: 8000 },
    intent: { type: String, maxLength: 40, default: null },
    sources: [{ type: mongoose.Schema.Types.Mixed }],
    safety: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientAIConversation', default: null },
    file_name: { type: String, required: true, maxLength: 255 },
    mime_type: { type: String, required: true, maxLength: 100 },
    extraction_status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    medicine_fields: [{ type: mongoose.Schema.Types.Mixed }],
    sources: [{ type: mongoose.Schema.Types.Mixed }],
    uncertainty: [{ type: String, maxLength: 500 }]
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientAIConversation', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    status: { type: String, enum: ['requested', 'assigned', 'reviewed', 'closed'], default: 'requested' },
    reason: { type: String, required: true, maxLength: 1000 }
}, { timestamps: true });

const knowledgeChunkSchema = new mongoose.Schema({
    title: { type: String, required: true, maxLength: 200 },
    sourceUrl: { type: String, required: true, maxLength: 1000 },
    content: { type: String, required: true, maxLength: 5000 },
    embeddingModel: { type: String, required: true, maxLength: 150 },
    embedding: { type: [Number], required: true },
    active: { type: Boolean, default: true, index: true }
}, { timestamps: true });
knowledgeChunkSchema.index({ sourceUrl: 1, active: 1 });

module.exports = {
    PatientAIConversation: mongoose.models.PatientAIConversation || mongoose.model('PatientAIConversation', conversationSchema),
    PatientAIMessage: mongoose.models.PatientAIMessage || mongoose.model('PatientAIMessage', messageSchema),
    PatientAIDocument: mongoose.models.PatientAIDocument || mongoose.model('PatientAIDocument', documentSchema),
    PatientAIReview: mongoose.models.PatientAIReview || mongoose.model('PatientAIReview', reviewSchema),
    PatientAIKnowledgeChunk: mongoose.models.PatientAIKnowledgeChunk ||
        mongoose.model('PatientAIKnowledgeChunk', knowledgeChunkSchema)
};
