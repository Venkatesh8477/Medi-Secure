const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const LEGACY_SALT = 'hospital2025';
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

function legacyHash(password) {
    const firstHash = crypto.createHash('sha256').update(password).digest('hex');
    return crypto.createHash('sha256').update(firstHash + LEGACY_SALT).digest('hex');
}

class PasswordService {
    static hash(password) {
        return bcrypt.hash(password, 12);
    }

    static async verifyAndUpgrade(password, user) {
        if (typeof user.password_hash !== 'string') return false;
        if (BCRYPT_HASH.test(user.password_hash)) {
            return bcrypt.compare(password, user.password_hash);
        }

        const storedHash = Buffer.from(user.password_hash, 'utf8');
        const computedHash = Buffer.from(legacyHash(password), 'utf8');
        const matches = storedHash.length === computedHash.length &&
            crypto.timingSafeEqual(storedHash, computedHash);
        if (!matches) return false;

        user.password_hash = await this.hash(password);
        user.auth_type = 'bcrypt';
        await user.save();
        return true;
    }
}

module.exports = PasswordService;
