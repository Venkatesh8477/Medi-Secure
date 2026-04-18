const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 */
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Normalize token fields: some tokens use `user_id`, newer tokens use `id`.
        if (decoded) {
            if (!decoded.id && decoded.user_id) {
                decoded.id = decoded.user_id;
            }
        }
        req.user = decoded;
        next();
        
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

/**
 * Role-based Authorization Middleware
 */
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        next();
    };
};

module.exports = {
    authMiddleware,
    roleMiddleware
};
