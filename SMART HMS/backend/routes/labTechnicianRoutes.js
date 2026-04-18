const express = require('express');
const multer = require('multer');
const { LabRequest, LabResult } = require('../models/PharmacyAndLab');
const { Patient, Doctor } = require('../models/RoleProfiles');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// A simple PatientSample Mongoose Schema (since it was missing from original general schema export)
const mongoose = require('mongoose');
const patientSampleSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    sample_type: String,
    collection_date: Date,
    status: String,
    notes: String,
    collected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const PatientSample = mongoose.models.PatientSample || mongoose.model('PatientSample', patientSampleSchema);

const upload = multer({
  dest: 'uploads/lab-reports/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

// Get all patient samples
router.get('/samples', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    const samples = await PatientSample.find().populate({ path: 'patient', populate: { path: 'user' } }).sort({ collection_date: -1 }).lean();
    
    const formatted = samples.map(s => ({
      id: s._id,
      sample_type: s.sample_type,
      collection_date: s.collection_date,
      status: s.status,
      notes: s.notes,
      patient_id: s.patient?._id,
      first_name: s.patient?.user?.first_name,
      last_name: s.patient?.user?.last_name,
      patient_name: `${s.patient?.user?.first_name} ${s.patient?.user?.last_name}`
    }));

    res.json({ success: true, samples: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Collect new sample
router.post('/samples/collect', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    const { patientId, sampleType, collectionDate, notes } = req.body;
    const userId = req.user.user_id || req.user.id;

    const sample = new PatientSample({
        patient: patientId,
        sample_type: sampleType,
        collection_date: collectionDate ? new Date(collectionDate) : new Date(),
        status: 'collected',
        notes,
        collected_by: userId
    });
    
    await sample.save();

    res.json({ success: true, message: 'Sample collected successfully', sampleId: sample._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sample status
router.put('/samples/:id/status', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    const { status } = req.body;
    await PatientSample.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true, message: 'Sample status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all test requests
router.get('/test-requests', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    const requests = await LabRequest.find()
        .populate({ path: 'patient', populate: { path: 'user' } })
        .populate({ path: 'doctor', populate: { path: 'user' } })
        .sort({ created_at: -1 })
        .lean();

    const requestsWithNames = requests.map(r => ({
      id: r._id,
      test_type: r.test_type,
      request_date: r.created_at,
      status: r.status,
      patient_id: r.patient?._id,
      first_name: r.patient?.user?.first_name,
      last_name: r.patient?.user?.last_name,
      doctor_id: r.doctor?._id,
      doctor_first_name: r.doctor?.user?.first_name,
      doctor_last_name: r.doctor?.user?.last_name,
      patient_name: `${r.patient?.user?.first_name || ''} ${r.patient?.user?.last_name || ''}`.trim(),
      doctor_name: `${r.doctor?.user?.first_name || ''} ${r.doctor?.user?.last_name || ''}`.trim()
    }));

    res.json({ success: true, requests: requestsWithNames });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload test report
router.post('/test-requests/upload-report', authMiddleware, roleMiddleware('lab_technician'), upload.single('reportFile'), async (req, res) => {
  try {
    const { testRequestId, testName, result, referenceRange, unit, status, remarks } = req.body;
    const reportFilePath = req.file ? req.file.path : null;
    
    // Result
    const resDoc = new LabResult({
        lab_request: testRequestId,
        test_name: testName,
        result_value: result,
        reference_range: referenceRange,
        unit,
        result_status: status,
        notes: remarks,
        report_file_path: reportFilePath
    });
    await resDoc.save();

    // Update request
    await LabRequest.findByIdAndUpdate(testRequestId, { 
        status: 'completed', 
        completed_date: new Date()
    });

    res.json({ success: true, message: 'Test report uploaded successfully', resultId: resDoc._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get patients list
router.get('/patients', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    const patients = await Patient.find().populate('user').lean();
    const formatted = patients.map(p => ({
        id: p._id,
        first_name: p.user?.first_name,
        last_name: p.user?.last_name
    })).sort((a,b) => (a.first_name || '').localeCompare(b.first_name || ''));

    res.json({ success: true, patients: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Legacy status update
router.put('/requests/:id/status', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    await LabRequest.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Legacy results post
router.post('/requests/:id/results', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    const { testResult, remarks } = req.body;
    await LabRequest.findByIdAndUpdate(req.params.id, {
        status: 'completed',
        reason: testResult,  // Map loosely to old 'result'
        remarks: remarks,    // Map loosely
        completed_date: new Date()
    });
    res.json({ success: true, message: 'Results uploaded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard stats
router.get('/dashboard/stats', authMiddleware, roleMiddleware('lab_technician'), async (req, res) => {
  try {
    const pendingTests = await LabRequest.countDocuments({ status: 'pending' });
    const completedTests = await LabRequest.countDocuments({ status: 'completed' });

    res.json({
      success: true,
      stats: { pendingTests, completedTests }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
