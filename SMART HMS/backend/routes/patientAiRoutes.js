const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { getPatientForUser, requireOwnedConversation } = require('../middleware/patientAiAccess');
const { Patient, Doctor } = require('../models/RoleProfiles');
const { Appointment } = require('../models/Clinical');
const { PatientAIConversation, PatientAIMessage, PatientAIReview, PatientAIDocument, PatientAIKnowledgeChunk } = require('../models/PatientAI');
const { classifyIntent, safetyCheck, generateAnswer, retrieveMedicineEvidence, retrieveHealthKnowledge } = require('../services/patientAi/patientAiService');
const { embedTexts } = require('../services/patientAi/embeddingService');
const { splitIntoChunks } = require('../services/patientAi/ragService');
const { retrieveEvidence } = require('../services/prescriptionAnalysis/dailyMedService');
const { AuditLog } = require('../models/System');
const { extractPrescriptionText } = require('../services/prescriptionAnalysis/documentExtractor');
const { extractPrescriptionMedicines } = require('../services/prescriptionAnalysis/prescriptionParser');
const { deidentifyText } = require('../services/carecheck/caseBuilder');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype)) {
            return callback(Object.assign(new Error('Upload a PDF, PNG, or JPEG prescription.'), { status: 400 }));
        }
        callback(null, true);
    }
});

function requireAiEnabled(res) {
    if (process.env.PATIENT_AI_ENABLED !== 'true') {
        res.status(503).json({ success: false, error: 'Patient AI is disabled by server configuration.' });
        return false;
    }
    return true;
}

function requireExternalSharingApproval(res) {
    if (process.env.PATIENT_AI_EXTERNAL_DATA_SHARING_APPROVED !== 'true') {
        res.status(503).json({ success: false, error: 'Cloud AI is disabled until external patient-data sharing is explicitly approved.' });
        return false;
    }
    return true;
}

function redactPrescriptionText(text, patientUser) {
    return deidentifyText(text, patientUser)
        .replace(/\b(patient\s+name|patient\s+id|medical\s+record\s*(?:number|no\.?)|mrn|date\s+of\s+birth|dob|address|phone|email)(?:\s*[:#-]\s*|\s+)[^,;|]{1,120}/gi, '[redacted identifier]');
}

function sanitizeFileName(name) {
    const extension = String(name || '').match(/\.(pdf|png|jpe?g)$/i)?.[0].toLowerCase();
    return `uploaded-prescription${extension || ''}`;
}

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.post('/admin/knowledge', authMiddleware, roleMiddleware('admin'), asyncRoute(async (req, res) => {
    if (!requireExternalSharingApproval(res)) return;
    const { title, sourceUrl, content } = req.body || {};
    if (typeof title !== 'string' || !title.trim() || title.length > 200 ||
        typeof sourceUrl !== 'string' || sourceUrl.length > 1000 ||
        typeof content !== 'string' || content.trim().length < 100 || content.length > 100000) {
        return res.status(400).json({ success: false, error: 'Provide a title, trusted HTTPS source URL, and 100–100000 characters of source content.' });
    }

    let url;
    try {
        url = new URL(sourceUrl);
    } catch (error) {
        return res.status(400).json({ success: false, error: 'Source URL is invalid.' });
    }
    if (url.protocol !== 'https:') {
        return res.status(400).json({ success: false, error: 'Knowledge sources must use HTTPS.' });
    }
    const allowedDomains = (process.env.PATIENT_AI_RAG_ALLOWED_DOMAINS || 'medlineplus.gov,dailymed.nlm.nih.gov')
        .split(',').map(domain => domain.trim().toLowerCase()).filter(Boolean);
    const sourceHost = url.hostname.toLowerCase();
    if (!allowedDomains.some(domain => sourceHost === domain || sourceHost.endsWith(`.${domain}`))) {
        return res.status(400).json({ success: false, error: 'Source domain is not in PATIENT_AI_RAG_ALLOWED_DOMAINS.' });
    }
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{8,}\d/i.test(content)) {
        return res.status(400).json({ success: false, error: 'Knowledge content must not contain patient contact information.' });
    }

    const chunks = splitIntoChunks(content);
    if (chunks.length > 100) {
        return res.status(400).json({ success: false, error: 'Source content is too large to index in one request.' });
    }
    const embeddings = await embedTexts(chunks);
    const records = await PatientAIKnowledgeChunk.insertMany(chunks.map((chunk, index) => ({
        title: title.trim(),
        sourceUrl: url.toString(),
        content: chunk,
        embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL,
        embedding: embeddings[index],
        active: true
    })));
    await PatientAIKnowledgeChunk.deleteMany({
        sourceUrl: url.toString(),
        _id: { $nin: records.map(record => record._id) }
    });
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_knowledge_ingested',
        entity_type: 'PatientAIKnowledgeChunk',
        entity_id: records[0]._id.toString()
    });
    res.status(201).json({ success: true, sourceUrl: url.toString(), indexedChunks: records.length });
}));

router.get('/doctor-handoffs', authMiddleware, roleMiddleware('doctor'), asyncRoute(async (req, res) => {
    const doctor = await Doctor.findOne({ user: req.user.id || req.user.user_id }).lean();
    if (!doctor) return res.status(403).json({ success: false, error: 'Doctor profile not found.' });
    const appointments = await Appointment.find({ doctor: doctor._id }).select('patient').lean();
    const patientIds = [...new Set(appointments.map(item => String(item.patient)))];
    const handoffs = patientIds.length ? await PatientAIReview.find({
        patient: { $in: patientIds },
        status: { $in: ['requested', 'assigned'] },
        $or: [{ doctor: null }, { doctor: doctor._id }]
    }).sort('-createdAt').limit(100)
        .populate({ path: 'patient', populate: { path: 'user', select: 'first_name last_name' } })
        .populate('conversation', 'title')
        .lean() : [];
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_handoffs_listed',
        entity_type: 'PatientAIReview',
        entity_id: String(doctor._id)
    });
    res.json({ success: true, handoffs });
}));

router.get('/doctor-handoffs/:id', authMiddleware, roleMiddleware('doctor'), asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Invalid handoff ID.' });
    }
    const doctor = await Doctor.findOne({ user: req.user.id || req.user.user_id }).lean();
    if (!doctor) return res.status(403).json({ success: false, error: 'Doctor profile not found.' });
    const handoff = await PatientAIReview.findById(req.params.id)
        .populate({ path: 'patient', populate: { path: 'user', select: 'first_name last_name' } })
        .populate('conversation', 'title')
        .lean();
    if (!handoff) return res.status(404).json({ success: false, error: 'Handoff not found.' });
    const appointment = await Appointment.exists({ doctor: doctor._id, patient: handoff.patient._id });
    if (!appointment) return res.status(403).json({ success: false, error: 'You are not authorized to review this patient.' });
    if (handoff.doctor && String(handoff.doctor) !== String(doctor._id)) {
        return res.status(403).json({ success: false, error: 'This handoff is assigned to another doctor.' });
    }
    const messages = await PatientAIMessage.find({
        conversation: handoff.conversation._id,
        patient: handoff.patient._id
    }).sort('createdAt').select('sender message intent createdAt').lean();
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_handoff_read',
        entity_type: 'PatientAIReview',
        entity_id: String(handoff._id)
    });
    res.json({ success: true, handoff, messages });
}));

router.patch('/doctor-handoffs/:id', authMiddleware, roleMiddleware('doctor'), asyncRoute(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Invalid handoff ID.' });
    }
    const allowedStatuses = new Set(['assigned', 'reviewed', 'closed']);
    if (!allowedStatuses.has(req.body?.status)) {
        return res.status(400).json({ success: false, error: 'status must be assigned, reviewed, or closed.' });
    }
    const doctor = await Doctor.findOne({ user: req.user.id || req.user.user_id }).lean();
    if (!doctor) return res.status(403).json({ success: false, error: 'Doctor profile not found.' });
    const handoff = await PatientAIReview.findById(req.params.id).lean();
    if (!handoff) return res.status(404).json({ success: false, error: 'Handoff not found.' });
    const appointment = await Appointment.exists({ doctor: doctor._id, patient: handoff.patient });
    if (!appointment) return res.status(403).json({ success: false, error: 'You are not authorized to review this patient.' });
    if (handoff.doctor && String(handoff.doctor) !== String(doctor._id)) {
        return res.status(403).json({ success: false, error: 'This handoff is assigned to another doctor.' });
    }
    const updated = await PatientAIReview.findByIdAndUpdate(req.params.id, {
        $set: { status: req.body.status, doctor: doctor._id }
    }, { new: true, runValidators: true }).lean();
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_handoff_status_updated',
        entity_type: 'PatientAIReview',
        entity_id: String(updated._id),
        new_value: updated.status
    });
    res.json({ success: true, handoff: updated });
}));

router.use(authMiddleware, getPatientForUser);

router.post('/chat', async (req, res, next) => {
    try {
        if (!requireAiEnabled(res)) return;
        const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
        const language = req.body?.language === 'te' ? 'te' : 'en';
        if (!message || message.length > 8000) {
            return res.status(400).json({ success: false, error: 'Message must contain 1 to 8000 characters.' });
        }

        let conversation;
        if (req.body?.conversationId) {
            if (!requireConversationId(req.body.conversationId)) {
                return res.status(400).json({ success: false, error: 'A valid conversationId is required.' });
            }
            conversation = await PatientAIConversation.findOne({
                _id: req.body.conversationId,
                patient: req.patient._id,
                status: 'active'
            });
            if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found.' });
        } else {
            conversation = await PatientAIConversation.create({
                patient: req.patient._id,
                language,
                title: message.slice(0, 80)
            });
        }

        conversation.language = language;
        await conversation.save();
        const intent = classifyIntent(message);
        const safety = safetyCheck(message);

        await PatientAIMessage.create({
            conversation: conversation._id,
            patient: req.patient._id,
            sender: 'patient',
            message,
            intent
        });

        const recent = await PatientAIMessage.find({
            conversation: conversation._id,
            patient: req.patient._id
        }).sort('-createdAt').limit(12).lean();
        const history = recent.reverse().map(item => ({ sender: item.sender, message: item.message }));

        let answer;
        let sources = [];
        if (safety.blockRoutineAnswer) {
            answer = safety.answerPrefix;
        } else if (intent === 'DOSAGE_QUESTION') {
            answer = 'I cannot recommend changing a dose. Follow the prescription as written and contact your prescriber or pharmacist before changing it.';
            safety.requiresDoctorReview = true;
        } else if (intent === 'DRUG_INTERACTION') {
            answer = 'I cannot verify drug interactions from the available sources. Ask your pharmacist or prescriber to review all medicines you take.';
            safety.requiresDoctorReview = true;
        } else if (intent === 'OUT_OF_SCOPE') {
            answer = 'I can help with general health education and medicine-label information. I cannot assist with this request.';
        } else if (intent === 'PRESCRIPTION_ANALYSIS') {
            answer = 'Use the prescription upload control to extract visible medicine details. The extraction can be wrong or incomplete, so verify it against the original with your pharmacist.';
            safety.requiresDoctorReview = true;
        } else if (intent === 'GENERAL_HEALTH') {
            if (!requireExternalSharingApproval(res)) return;
            const knowledge = await retrieveHealthKnowledge(message);
            if (!knowledge.length) {
                answer = 'I could not find a sufficiently relevant answer in the approved medical education sources. Please ask your doctor or pharmacist.';
                safety.requiresDoctorReview = true;
            } else {
                const generated = await generateAnswer({
                    message,
                    language,
                    intent,
                    history,
                    patientContext: {},
                    evidence: knowledge
                });
                answer = generated.answer;
                sources = knowledge;
                safety.requiresDoctorReview = safety.requiresDoctorReview || generated.requiresDoctorReview;
            }
        } else if (intent === 'MEDICINE_INFORMATION' || intent === 'SIDE_EFFECT_QUESTION') {
            const requestedMedicine = typeof req.body?.medicineName === 'string'
                ? req.body.medicineName.trim().slice(0, 100)
                : '';
            const knownDocuments = await PatientAIDocument.find({ patient: req.patient._id })
                .sort('-createdAt').limit(20).select('medicine_fields').lean();
            const knownMedicine = knownDocuments
                .flatMap(document => document.medicine_fields || [])
                .find(medicine => medicine.name && message.toLowerCase().includes(medicine.name.toLowerCase()));
            const medicineName = requestedMedicine || knownMedicine?.name;
            if (!medicineName) {
                answer = 'Please use the medicine-label lookup below and enter the medicine name, or ask your pharmacist. I will not guess which medicine you mean.';
            } else {
                if (!requireExternalSharingApproval(res)) return;
                const evidence = await retrieveMedicineEvidence(medicineName);
                if (evidence.status !== 'available' || !evidence.sources?.length) {
                    answer = 'I could not find a matching DailyMed label. Please confirm the medicine name with your pharmacist or prescriber.';
                    safety.requiresDoctorReview = true;
                } else {
                    const generated = await generateAnswer({
                        message,
                        language,
                        intent,
                        history,
                        patientContext: {},
                        evidence: evidence.sources
                    });
                    answer = generated.answer;
                    sources = evidence.sources;
                    safety.requiresDoctorReview = safety.requiresDoctorReview || generated.requiresDoctorReview;
                }
            }
        }

        await PatientAIMessage.create({
            conversation: conversation._id,
            patient: req.patient._id,
            sender: 'assistant',
            message: answer,
            intent,
            sources,
            safety
        });
        await PatientAIConversation.findByIdAndUpdate(conversation._id, { $set: { updatedAt: new Date() } });

        await AuditLog.create({
            user: req.user.id || req.user.user_id,
            action: 'patient_ai_chat',
            entity_type: 'PatientAIConversation',
            entity_id: conversation._id.toString()
        });

        res.json({
            success: true,
            conversationId: conversation._id,
            intent,
            answer,
            sources,
            safetyNotice: 'This is educational information, not a diagnosis or prescription. Follow your doctor or pharmacist for medical decisions.',
            requiresDoctorReview: safety.requiresDoctorReview
        });
    } catch (error) {
        next(error);
    }
});

function requireConversationId(value) {
    return mongoose.isValidObjectId(value);
}

router.get('/conversations', async (req, res, next) => {
    try {
        const conversations = await PatientAIConversation.find({
            patient: req.patient._id,
            status: 'active'
        }).sort('-updatedAt').limit(50).lean();
        await AuditLog.create({
            user: req.user.id || req.user.user_id,
            action: 'patient_ai_conversations_listed',
            entity_type: 'PatientAIConversation',
            entity_id: String(req.patient._id)
        });
        res.json({ success: true, conversations });
    } catch (error) {
        next(error);
    }
});

router.get('/conversations/:id', getConversation, asyncRoute(async (req, res) => {
    const messages = await PatientAIMessage.find({
        conversation: req.conversation._id,
        patient: req.patient._id
    }).sort('createdAt').lean();
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_conversation_read',
        entity_type: 'PatientAIConversation',
        entity_id: req.conversation._id.toString()
    });
    res.json({ success: true, conversation: req.conversation, messages });
}));

router.delete('/conversations/:id', getConversation, asyncRoute(async (req, res) => {
    await PatientAIConversation.findByIdAndUpdate(req.conversation._id, { $set: { status: 'deleted' } });
    await PatientAIMessage.deleteMany({ conversation: req.conversation._id, patient: req.patient._id });
    await PatientAIDocument.deleteMany({ conversation: req.conversation._id, patient: req.patient._id });
    await PatientAIReview.deleteMany({ conversation: req.conversation._id, patient: req.patient._id });
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_conversation_deleted',
        entity_type: 'PatientAIConversation',
        entity_id: req.conversation._id.toString()
    });
    res.json({ success: true, conversationId: req.conversation._id });
}));

function getConversation(req, res, next) {
    requireOwnedConversation(req, res, next);
}

router.post('/doctor-handoff', asyncRoute(async (req, res) => {
    const conversationId = req.body?.conversationId;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!requireConversationId(conversationId)) {
        return res.status(400).json({ success: false, error: 'A valid conversationId is required.' });
    }
    if (!reason || reason.length > 1000) {
        return res.status(400).json({ success: false, error: 'Reason must contain 1 to 1000 characters.' });
    }
    const conversation = await PatientAIConversation.findOne({
        _id: conversationId,
        patient: req.patient._id,
        status: 'active'
    });
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found.' });
    const review = await PatientAIReview.create({
        patient: req.patient._id,
        conversation: conversation._id,
        reason
    });
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_doctor_handoff_requested',
        entity_type: 'PatientAIReview',
        entity_id: review._id.toString()
    });
    res.status(201).json({ success: true, handoffId: review._id, status: review.status });
}));

router.get('/medicine/:name', asyncRoute(async (req, res) => {
    if (!requireAiEnabled(res) || !requireExternalSharingApproval(res)) return;
    const name = String(req.params.name || '').trim();
    if (!name || name.length > 100) {
        return res.status(400).json({ success: false, error: 'Medicine name must contain 1 to 100 characters.' });
    }
    const result = await retrieveMedicineEvidence(name);
    if (result.status === 'unavailable') {
        return res.status(502).json({ success: false, error: 'DailyMed is temporarily unavailable.' });
    }
    res.json({
        success: true,
        medication: result.medication,
        status: result.status,
        sources: result.sources,
        notice: result.status === 'not_found'
            ? 'No matching DailyMed label was found. Confirm the medicine name with a pharmacist.'
            : 'This is official label information, not personalized medical advice. Confirm medicine decisions with your clinician or pharmacist.'
    });
}));

router.post('/prescription/analyze', asyncRoute(async (req, res, next) => {
    if (!requireAiEnabled(res) || !requireExternalSharingApproval(res)) return;
    upload.single('file')(req, res, async error => {
        if (error) {
            return res.status(error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400))
                .json({ success: false, error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10 MB limit.' : error.message });
        }
        try {
            if (!req.file) return res.status(400).json({ success: false, error: 'A prescription PDF, PNG, or JPEG file is required.' });
            let conversation;
            if (req.body.conversationId) {
                if (!requireConversationId(req.body.conversationId)) {
                    return res.status(400).json({ success: false, error: 'A valid conversationId is required.' });
                }
                conversation = await PatientAIConversation.findOne({
                    _id: req.body.conversationId,
                    patient: req.patient._id,
                    status: 'active'
                });
                if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found.' });
            } else {
                conversation = await PatientAIConversation.create({
                    patient: req.patient._id,
                    title: 'Prescription information',
                    language: req.body.language === 'te' ? 'te' : 'en'
                });
            }

            const rawText = await extractPrescriptionText(req.file);
            const documentText = redactPrescriptionText(rawText, req.patient.user || {});
            const extracted = await extractPrescriptionMedicines('ollama', documentText);
            const evidenceResult = await retrieveEvidence(extracted.medicines);
            const evidence = evidenceResult.results.flatMap(item => item.sources || []);
            const uncertainty = [...extracted.missingInformation];
            for (const result of evidenceResult.results) {
                if (result.status === 'not_found') uncertainty.push(`No matching DailyMed label was found for ${result.medication}.`);
                if (result.status === 'unavailable') uncertainty.push(`DailyMed information is unavailable for ${result.medication}.`);
            }
            if (!extracted.medicines.length) uncertainty.push('No medicine details could be reliably identified; check the original with a pharmacist.');

            const document = await PatientAIDocument.create({
                patient: req.patient._id,
                conversation: conversation._id,
                file_name: sanitizeFileName(req.file.originalname),
                mime_type: req.file.mimetype,
                extraction_status: 'completed',
                medicine_fields: extracted.medicines,
                sources: evidence,
                uncertainty: [...new Set(uncertainty)]
            });
            const summary = extracted.medicines.length
                ? `I extracted ${extracted.medicines.length} medicine entry/entries. Please compare every field with the original prescription; do not rely on unclear or missing details.`
                : 'I could not reliably identify a medicine from this document. Please check the original with your pharmacist.';
            await PatientAIMessage.create({
                conversation: conversation._id,
                patient: req.patient._id,
                sender: 'assistant',
                message: summary,
                intent: 'PRESCRIPTION_ANALYSIS',
                sources: evidence
            });
            await AuditLog.create({
                user: req.user.id || req.user.user_id,
                action: 'patient_ai_prescription_analyzed',
                entity_type: 'PatientAIDocument',
                entity_id: document._id.toString()
            });
            res.status(201).json({
                success: true,
                conversationId: conversation._id,
                document: {
                    id: document._id,
                    fileName: document.file_name,
                    extractionStatus: document.extraction_status,
                    medicines: document.medicine_fields,
                    sources: document.sources,
                    uncertainty: document.uncertainty
                },
                safetyNotice: 'The uploaded file was processed in memory and was not retained. OCR may be incorrect; verify every detail against the original.'
            });
        } catch (routeError) {
            next(routeError);
        }
    });
}));

router.get('/documents', asyncRoute(async (req, res) => {
    const documents = await PatientAIDocument.find({ patient: req.patient._id })
        .sort('-createdAt').limit(50)
        .select('file_name mime_type extraction_status medicine_fields sources uncertainty createdAt conversation')
        .lean();
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_documents_listed',
        entity_type: 'PatientAIDocument',
        entity_id: String(req.patient._id)
    });
    res.json({ success: true, documents });
}));

router.delete('/documents/:id', asyncRoute(async (req, res) => {
    if (!requireConversationId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'A valid documentId is required.' });
    }
    const document = await PatientAIDocument.findOneAndDelete({
        _id: req.params.id,
        patient: req.patient._id
    });
    if (!document) return res.status(404).json({ success: false, error: 'Document not found.' });
    await AuditLog.create({
        user: req.user.id || req.user.user_id,
        action: 'patient_ai_document_deleted',
        entity_type: 'PatientAIDocument',
        entity_id: document._id.toString()
    });
    res.json({ success: true, documentId: document._id });
}));

router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.status || 500).json({
        success: false,
        error: error.status ? error.message : 'Patient AI request failed.',
        code: error.code || 'PATIENT_AI_FAILED'
    });
});

module.exports = router;
