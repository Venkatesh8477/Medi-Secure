const express = require('express');
const { Medication } = require('../models/PharmacyAndLab');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Get inventory status
router.get('/inventory', authMiddleware, roleMiddleware('inventory_manager'), async (req, res) => {
  try {
    const inventory = await Medication.find().sort({ name: 1 }).lean();
    
    // Polyfill for frontend expecting quantity_in_stock and unit_price fields
    const formatted = inventory.map(item => ({
        ...item,
        quantity_in_stock: item.stock_quantity,
        unit_price: item.price ? Number(item.price.toString()) : 0
    }));

    res.json({ success: true, inventory: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new medication to inventory
router.post('/inventory/add', authMiddleware, roleMiddleware('inventory_manager'), async (req, res) => {
  try {
    const { name, category, quantity, unitPrice, reorderLevel, expiryDate, supplier } = req.body;

    const med = new Medication({
        name,
        // Optional tracking
        // category,
        stock_quantity: quantity,
        price: unitPrice,
        reorder_level: reorderLevel,
        expiry_date: expiryDate ? new Date(expiryDate) : undefined
        // supplier
    });
    
    await med.save();

    res.json({ success: true, message: 'Medication added', medicationId: med._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update medication details
router.put('/inventory/:id', authMiddleware, roleMiddleware('inventory_manager'), async (req, res) => {
  try {
    const { quantity, unitPrice, reorderLevel, expiryDate } = req.body;

    await Medication.findByIdAndUpdate(req.params.id, {
        stock_quantity: quantity,
        price: unitPrice,
        reorder_level: reorderLevel,
        expiry_date: expiryDate ? new Date(expiryDate) : undefined
    });

    res.json({ success: true, message: 'Medication updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expired medications
router.get('/inventory/expired', authMiddleware, roleMiddleware('inventory_manager'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const expired = await Medication.find({ expiry_date: { $lte: today } }).sort({ expiry_date: 1 }).lean();
    
    const formatted = expired.map(item => ({
        ...item,
        quantity_in_stock: item.stock_quantity,
        unit_price: item.price ? Number(item.price.toString()) : 0
    }));

    res.json({ success: true, expired: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock items
router.get('/inventory/low-stock', authMiddleware, roleMiddleware('inventory_manager'), async (req, res) => {
  try {
    // $expr is needed to compare two fields in the same document
    const lowStock = await Medication.find({ $expr: { $lt: ["$stock_quantity", "$reorder_level"] } }).sort({ stock_quantity: 1 }).lean();
    
    const formatted = lowStock.map(item => ({
        ...item,
        quantity_in_stock: item.stock_quantity,
        unit_price: item.price ? Number(item.price.toString()) : 0
    }));

    res.json({ success: true, lowStock: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory dashboard stats
router.get('/dashboard/stats', authMiddleware, roleMiddleware('inventory_manager'), async (req, res) => {
  try {
    const totalItems = await Medication.countDocuments();
    const lowStockItems = await Medication.countDocuments({ $expr: { $lt: ["$stock_quantity", "$reorder_level"] } });
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const expiredItems = await Medication.countDocuments({ expiry_date: { $lte: today } });
    
    const medications = await Medication.find().lean();
    let totalValue = 0;
    
    medications.forEach(m => {
        const p = m.price ? Number(m.price.toString()) : 0;
        totalValue += (m.stock_quantity * p);
    });

    res.json({
      success: true,
      stats: {
        totalItems,
        lowStockItems,
        expiredItems,
        totalValue
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
