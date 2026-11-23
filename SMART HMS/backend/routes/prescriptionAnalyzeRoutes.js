const express = require('express');
const multer = require('multer');
require('../config/database');
const { chatJson } = require('../services/carecheck/llmService');
const { deidentifyText } = require('../services/carecheck/caseBuilder');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// This optional patient-facing prescription explanation route stays disabled unless explicitly enabled.
const AI_ENABLED = process.env.AI_ENABLED === 'true';

/**
 * POST /api/prescription-analyze
 * (multipart with 'file', opt 'notes' field)
 * Returns: { success, analysis, details?, error? }
 */
router.post('/prescription-analyze', authMiddleware, roleMiddleware('patient'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const notes = req.body.notes || '';

    // If AI analysis is disabled via env flag, return error - this route is for analysis only
    if (!AI_ENABLED) {
      return res.status(503).json({ 
        success: false,
        error: 'AI analysis is currently disabled. Please use the Documents tab to upload files.' 
      });
    }

    const { value: analysis } = await chatJson({ role: 'prescription explanation',
      system: 'Give cautious, patient-friendly information. The uploaded file is not parsed or read by this service. Use only the patient notes supplied; do not guess medication names or doses. Do not change treatment. Return JSON with howToTake, importantNotes, sideEffects, precautions, whenToContactDoctor, and warnings.',
      user: JSON.stringify({ notes: deidentifyText(notes) }) });
    res.json({
      success: true,
      analysis,
      sourceNotice: 'The uploaded file itself was not read. This explanation uses only the notes entered with the upload.'
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

module.exports = router;

