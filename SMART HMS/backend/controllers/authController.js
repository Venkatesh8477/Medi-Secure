const jwt = require('jsonwebtoken');
const PasswordService = require('../services/passwordService');
const { getJwtSecret } = require('../services/jwtConfig');
const User = require('../models/User');
const { Patient, Doctor, Nurse, Pharmacist, LabTechnician, Receptionist } = require('../models/RoleProfiles');

class AuthController {
    /**
     * Register a new user
     */
    static async registerUser(req, res) {
        try {
            const { username, email, password, role, firstName, lastName } = req.body;

            // Validate required fields
            if (!username || !email || !password || !role) {
                return res.status(400).json({ success: false, error: 'All fields are required' });
            }
            if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
                return res.status(400).json({ success: false, error: 'Password must be at least 12 characters and no more than 72 UTF-8 bytes.' });
            }

            // Check if user already exists
            const existing = await User.findOne({ 
                $or: [{ username }, { email }]
            });

            if (existing) {
                return res.status(400).json({ success: false, error: 'Username or email already exists' });
            }

            // Hash password
            const passwordHash = await PasswordService.hash(password);

            // Insert user
            const user = new User({
                username,
                email,
                password_hash: passwordHash,
                auth_type: 'bcrypt',
                role,
                first_name: firstName || username,
                last_name: lastName || ''
            });
            await user.save();
            const userId = user._id.toString();

            // Create role-specific record
            try {
                if (role === 'patient') {
                    await Patient.create({ user: userId });
                } else if (role === 'doctor') {
                    await Doctor.create({ user: userId });
                } else if (role === 'nurse') {
                    await Nurse.create({ user: userId });
                } else if (role === 'pharmacist') {
                    await Pharmacist.create({ user: userId });
                } else if (role === 'lab_technician') {
                    await LabTechnician.create({ user: userId });
                } else if (role === 'receptionist') {
                    await Receptionist.create({ user: userId });
                }
            } catch (roleErr) {
                console.warn('Role record creation warning:', roleErr.message);
            }

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: { id: userId, username, email, role }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
        }
    }

    /**
     * Login user
     */
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Username and password are required' });
            }

            // Find user
            const user = await User.findOne({ username });

            if (!user) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }

            // Verify password
            const isValid = await PasswordService.verifyAndUpgrade(password, user);
            
            if (!isValid) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }

            // Generate JWT token
            const jwtSecret = getJwtSecret();
            if (!jwtSecret) {
                return res.status(503).json({ success: false, error: 'Authentication is not configured. Set a JWT_SECRET of at least 32 characters.' });
            }

            const token = jwt.sign(
                {
                    id: user._id,
                    username: user.username,
                    role: user.role
                },
                jwtSecret,
                { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user._id.toString(),
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    firstName: user.first_name,
                    lastName: user.last_name
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, error: 'Login failed: ' + error.message });
        }
    }

    /**
     * Logout user (client-side token removal, server just acknowledges)
     */
    static async logout(req, res) {
        res.json({ success: true, message: 'Logged out successfully' });
    }

    /**
     * Get current user info
     */
    static async getCurrentUser(req, res) {
        try {
            // req.user could have 'id' or 'user_id' depending on jwt logic
            const userId = req.user.id || req.user.user_id;

            const user = await User.findById(userId).select('-password_hash');

            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = AuthController;
