const mongoose = require('mongoose');
const { Patient } = require('../models/RoleProfiles');
const { PatientAIConversation, PatientAIDocument } = require('../models/PatientAI');

async function getPatientForUser(req, res, next) {
    if (req.user?.role !== 'patient') {
        return res.status(403).json({ success: false, error: 'Patient access required.' });
    }
    try {
        const patient = await Patient.findOne({ user: req.user.id || req.user.user_id }).populate('user').lean();
        if (!patient) return res.status(404).json({ success: false, error: 'Patient profile not found.' });
        req.patient = patient;
        next();
    } catch (error) {
        if (mongoose.connection.readyState === 0) {
            return res.status(503).json({ success: false, error: 'Patient AI database is unavailable.' });
        }
        next(error);
    }
}

async function requireOwnedConversation(req, res, next) {
    const id = req.params.id || req.body?.conversationId;
    if (!id || !mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, error: 'A valid conversationId is required.' });
    }
    try {
        const conversation = await PatientAIConversation.findOne({
            _id: id,
            patient: req.patient._id,
            status: { $ne: 'deleted' }
        }).lean();
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found.' });
        }
        req.conversation = conversation;
        next();
    } catch (error) {
        next(error);
    }
}

async function requireOwnedDocument(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'A valid documentId is required.' });
    }
    const document = await PatientAIDocument.findOne({
        _id: req.params.id,
        patient: req.patient._id
    }).lean();
    if (!document) return res.status(404).json({ success: false, error: 'Document not found.' });
    req.patientAiDocument = document;
    next();
}

module.exports = { getPatientForUser, requireOwnedConversation, requireOwnedDocument };
