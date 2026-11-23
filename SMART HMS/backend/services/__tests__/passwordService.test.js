const crypto = require('crypto');
const PasswordService = require('../passwordService');

function legacyHash(password) {
    const firstHash = crypto.createHash('sha256').update(password).digest('hex');
    return crypto.createHash('sha256').update(firstHash + 'hospital2025').digest('hex');
}

describe('PasswordService', () => {
    test('hashes new passwords with bcrypt and verifies them', async () => {
        const passwordHash = await PasswordService.hash('correct horse battery staple');
        const user = { password_hash: passwordHash, save: jest.fn() };

        await expect(PasswordService.verifyAndUpgrade('correct horse battery staple', user)).resolves.toBe(true);
        await expect(PasswordService.verifyAndUpgrade('incorrect', user)).resolves.toBe(false);
        expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
        expect(user.save).not.toHaveBeenCalled();
    });

    test('upgrades a valid legacy hash after successful login', async () => {
        const user = { password_hash: legacyHash('old password'), save: jest.fn().mockResolvedValue() };

        await expect(PasswordService.verifyAndUpgrade('old password', user)).resolves.toBe(true);
        expect(user.password_hash).toMatch(/^\$2[aby]\$12\$/);
        expect(user.save).toHaveBeenCalledTimes(1);
    });

    test('does not upgrade an invalid legacy password', async () => {
        const user = { password_hash: legacyHash('old password'), save: jest.fn() };

        await expect(PasswordService.verifyAndUpgrade('wrong password', user)).resolves.toBe(false);
        expect(user.save).not.toHaveBeenCalled();
    });
});
