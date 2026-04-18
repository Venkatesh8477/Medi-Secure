const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital_management_system';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('[INIT] ✓ MongoDB connected successfully');
    } catch (error) {
        console.error('[INIT] ❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Immediately attempt to connect when this module is required
connectDB();

// We export mongoose to allow components to interact globally, though most will just import models
module.exports = mongoose;
