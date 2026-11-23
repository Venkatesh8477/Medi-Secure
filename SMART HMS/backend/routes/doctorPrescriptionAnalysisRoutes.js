const express = require('express');
const multer = require('multer');
const { Types } = require('mongoose');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { Doctor } = require('../models/RoleProfiles');
const { Appointment } = require('../models/Clinical');
const { Prescription } = require('../models/PharmacyAndLab');
const PrescriptionAnalysis = require('../models/PrescriptionAnalysis');
const { AuditLog } = require('../models/System');
const {
    analyzePrescription,
    ensureDoctorAccessToPatient,
    getAnalysisForDoctor,
    SAFETY_NOTICE
} = require('../services/prescriptionAnalysis/analysisService');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        const supported = new Set(['application/pdf', 'image/png', 'image/jpeg']);
        if (!supported.has(file.mimetype)) {
            return callback(Object.assign(new Error('Upload a PDF, PNG, or JPEG prescription.'), { status: 400 }));
        }
        callback(null, true);
    }
});

function routeAction(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res);
        } catch (error) {
            next(error);
        }
    };
}

function uploadSingle(req, res, next) {
    upload.single('file')(req, res, error => {
        if (error) {
            return res.status(error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400))
                .json({ success: false, error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10 MB limit.' : error.message });
        }
        next();
    });
}

function requireAiConfiguration(req, res, next) {
    if (process.env.AI_PRESCRIPTION_ANALYSIS_ENABLED !== 'true') {
        return res.status(503).json({ success: false, error: 'AI prescription analysis is disabled by server configuration.' });
    }
    if (process.env.AI_EXTERNAL_DATA_SHARING_APPROVED !== 'true') {
        return res.status(503).json({ success: false, error: 'Cloud analysis is disabled until external patient-data sharing is explicitly approved in server configuration.' });
    }
    next();
}

function recordAudit(req, action, entityId) {
    return AuditLog.create({
        user: req.user.id || req.user.user_id,
        action,
        entity_type: 'PrescriptionAnalysis',
        entity_id: String(entityId),
        ip_address: req.ip,
        user_agent: req.get('user-agent')
    });
}

router.post('/', authMiddleware, roleMiddleware('doctor'), requireAiConfiguration, uploadSingle, routeAction(async (req, res) => {
    const analysis = await analyzePrescription({
        patientId: req.body.patientId,
        prescriptionId: req.body.prescriptionId || undefined,
        agentMode: req.body.agentMode,
        provider: req.body.provider,
        doctorUserId: req.user.id || req.user.user_id,
        file: req.file,
        auditMetadata: { ipAddress: req.ip, userAgent: req.get('user-agent') }
    });
    res.status(201).json({ success: true, analysis, safetyNotice: SAFETY_NOTICE });
}));

router.get('/history/:prescriptionId', authMiddleware, roleMiddleware('doctor'), routeAction(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.prescriptionId)) {
        return res.status(400).json({ success: false, error: 'Invalid prescription ID.' });
    }
    const doctor = await Doctor.findOne({ user: req.user.id || req.user.user_id }).lean();
    if (!doctor) return res.status(403).json({ success: false, error: 'Doctor profile not found.' });
    const prescription = await Prescription.findOne({
        _id: req.params.prescriptionId,
        doctor: doctor._id
    }).select('patient').lean();
    if (!prescription) return res.status(404).json({ success: false, error: 'Prescription not found.' });
    await ensureDoctorAccessToPatient(req.user.id || req.user.user_id, prescription.patient);
    await recordAudit(req, 'prescription_analysis_history_read', prescription._id);
    const analyses = await PrescriptionAnalysis.find({
        prescription: prescription._id,
        doctor: doctor._id
    }).sort('-createdAt').limit(50).lean();
    res.json({ success: true, analyses });
}));

router.get('/:id/comparison', authMiddleware, roleMiddleware('doctor'), routeAction(async (req, res) => {
    const analysis = await getAnalysisForDoctor(req.params.id, req.user.id || req.user.user_id);
    await recordAudit(req, 'prescription_analysis_comparison_read', analysis._id);
    res.json({ success: true, comparison: analysis.comparison, status: analysis.status });
}));

router.get('/:id/agents', authMiddleware, roleMiddleware('doctor'), routeAction(async (req, res) => {
    const analysis = await getAnalysisForDoctor(req.params.id, req.user.id || req.user.user_id);
    await recordAudit(req, 'prescription_analysis_agents_read', analysis._id);
    res.json({ success: true, agentResults: analysis.agentResults });
}));

router.post('/:id/review', authMiddleware, roleMiddleware('doctor'), routeAction(async (req, res) => {
    const allowedStatuses = new Set(['reviewed', 'follow_up_required', 'not_actionable']);
    const { status, notes = '' } = req.body || {};
    if (!allowedStatuses.has(status)) {
        return res.status(400).json({ success: false, error: 'status must be reviewed, follow_up_required, or not_actionable.' });
    }
    if (typeof notes !== 'string' || notes.length > 4000) {
        return res.status(400).json({ success: false, error: 'Review notes must be 4000 characters or fewer.' });
    }
    const analysis = await getAnalysisForDoctor(req.params.id, req.user.id || req.user.user_id);
    const updated = await PrescriptionAnalysis.findByIdAndUpdate(req.params.id, {
        $set: {
            'doctorReview.status': status,
            'doctorReview.notes': notes.trim(),
            'doctorReview.reviewedBy': req.user.id || req.user.user_id,
            'doctorReview.reviewedAt': new Date()
        }
    }, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Analysis not found.' });
    await recordAudit(req, 'prescription_analysis_doctor_reviewed', updated._id);
    res.json({ success: true, doctorReview: updated.doctorReview });
}));

router.get('/:id', authMiddleware, roleMiddleware('doctor'), routeAction(async (req, res) => {
    const analysis = await getAnalysisForDoctor(req.params.id, req.user.id || req.user.user_id);
    await recordAudit(req, 'prescription_analysis_read', analysis._id);
    res.json({ success: true, analysis, safetyNotice: SAFETY_NOTICE });
}));

router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 500;
    res.status(status).json({
        success: false,
        error: error.message || 'Prescription analysis request failed.',
        code: error.code || 'PRESCRIPTION_ANALYSIS_FAILED'
    });
});

module.exports = router;
