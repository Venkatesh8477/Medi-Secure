const { buildClinicalCase } = require('./caseBuilder');
const { runSingle, runMulti } = require('./agentOrchestrator');
const { Patient, Doctor } = require('../../models/RoleProfiles');
const { Appointment, Diagnosis, VitalSign } = require('../../models/Clinical');
const { Prescription } = require('../../models/PharmacyAndLab');

function createAiSuggestionsHandler(dependencies = {}) {
    const buildCase = dependencies.buildClinicalCase || buildClinicalCase;
    const single = dependencies.runSingle || runSingle;
    const multi = dependencies.runMulti || runMulti;
    const models = dependencies.models || { Patient, Doctor, Appointment, Diagnosis, VitalSign, Prescription };

    return async function aiSuggestions(req, res) {
        try {
            if (!req.user || req.user.role !== 'doctor') return res.status(403).json({ success: false, error: 'Doctor access required.' });
            const mode = req.body?.mode || 'single';
            if (!['single', 'multi'].includes(mode)) return res.status(400).json({ success: false, error: 'Mode must be single or multi.' });
            const clinicalRecord = await buildCase({
                patientId: req.params.patientId,
                models: { ...models, doctorUserId: req.user.id || req.user.user_id }
            });
            const result = mode === 'multi'
                ? await multi(clinicalRecord.clinicalCase)
                : await single(clinicalRecord.clinicalCase);
            const response = {
                success: true,
                mode,
                suggestions: result.suggestions,
                patientData: { name: clinicalRecord.patientDisplayName, ...clinicalRecord.patientData },
                safety: 'AI-generated clinical decision support. A licensed doctor must review and verify all content. Do not use this output alone to diagnose or change treatment.',
                metrics: result.metrics
            };
            if (mode === 'multi') response.agentFindings = result.agentFindings;
            return res.json(response);
        } catch (error) {
            const status = error.status || (error.code?.startsWith('OLLAMA_') ? 502 : 500);
            return res.status(status).json({ success: false, error: error.message || 'AI assessment failed.', code: error.code || 'CARECHECK_FAILED' });
        }
    };
}

module.exports = { createAiSuggestionsHandler };
