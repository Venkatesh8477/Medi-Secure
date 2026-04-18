const express = require('express');
const { Medication, Prescription } = require('../models/PharmacyAndLab');
const { Patient, Doctor } = require('../models/RoleProfiles');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Get medicine stock
router.get('/medicines', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const medicines = await Medication.find().sort({ name: 1 }).lean();
    
    const formatted = medicines.map(m => ({
        ...m,
        id: m._id,
        price: m.price ? Number(m.price.toString()) : 0
    }));
    
    res.json({ success: true, medicines: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update medicine stock
router.post('/medicines/:id/stock', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const { quantity, action } = req.body; // action: 'add' or 'remove'
    const medicineId = req.params.id;

    if (!quantity || isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const medicine = await Medication.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const currentStock = medicine.stock_quantity || 0;
    const numQuantity = Number(quantity);

    if (action === 'add') {
        medicine.stock_quantity = currentStock + numQuantity;
    } else if (action === 'remove') {
        if (currentStock < numQuantity) {
            return res.status(400).json({ error: `Cannot remove ${quantity}. Current stock is only ${currentStock}` });
        }
        medicine.stock_quantity = currentStock - numQuantity;
    } else {
        return res.status(400).json({ error: 'Invalid action. Use "add" or "remove"' });
    }
    
    await medicine.save();

    res.json({ 
      success: true, 
      message: `Stock ${action === 'add' ? 'added' : 'removed'} successfully`,
      medicine: {
          id: medicine._id,
          name: medicine.name,
          stock_quantity: medicine.stock_quantity
      }
    });
  } catch (error) {
    console.error('Stock update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get low stock medicines
router.get('/medicines/low-stock', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const lowStock = await Medication.find({ $expr: { $lt: ["$stock_quantity", "$reorder_level"] } }).sort({ name: 1 }).lean();
    res.json({ success: true, lowStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prescriptions for pharmacy
router.get('/prescriptions', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const prescriptionsList = await Prescription.find()
        .populate({ path: 'patient', populate: { path: 'user' } })
        .populate({ path: 'doctor', populate: { path: 'user' } })
        .populate('medication')
        .sort({ created_at: -1 })
        .lean();
        
    const formatted = prescriptionsList.map(pr => ({
        id: pr._id,
        prescription_date: pr.created_at,
        instructions: pr.notes,
        status: pr.status,
        dosage: pr.dosage,
        frequency: pr.frequency,
        duration: pr.duration,
        patient_id: pr.patient?._id,
        patient_name: pr.patient?.user?.first_name,
        patient_last_name: pr.patient?.user?.last_name,
        doctor_id: pr.doctor?._id,
        doctor_name: pr.doctor?.user?.first_name,
        doctor_last_name: pr.doctor?.user?.last_name,
        medicine_name: pr.medication?.name
    }));

    res.json({ success: true, prescriptions: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dispense medicine (process prescription)
router.post('/prescriptions/:id/dispense', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const { quantity } = req.body;
    const prescriptionId = req.params.id;

    const presc = await Prescription.findById(prescriptionId);
    
    if (!presc) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const medicineId = presc.medication;

    const med = await Medication.findById(medicineId);
    if(med && quantity) {
        med.stock_quantity = Math.max(0, (med.stock_quantity || 0) - Number(quantity));
        await med.save();
    }

    presc.status = 'dispensed';
    // Adding custom dynamic property loosely since strictly it's not in schema but it records timing
    presc.dispensed_date = new Date();
    await presc.save();

    res.json({ success: true, message: 'Medicine dispensed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pharmacy dashboard stats
router.get('/dashboard/stats', authMiddleware, roleMiddleware('pharmacist'), async (req, res) => {
  try {
    const totalMedicines = await Medication.countDocuments();
    const lowStock = await Medication.countDocuments({ $expr: { $lt: ["$stock_quantity", "$reorder_level"] } });
    const pendingPrescriptions = await Prescription.countDocuments({ status: { $ne: 'dispensed' } });

    res.json({
      success: true,
      stats: {
        totalMedicines,
        lowStock,
        pendingPrescriptions
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
