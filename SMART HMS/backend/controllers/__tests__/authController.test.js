const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const AuthController = require('../authController');
const User = require('../../models/User');
const PasswordService = require('../../services/passwordService');

describe('authentication controller', () => {
    const previousSecret = process.env.JWT_SECRET;
    let userFindOne;

    beforeEach(() => {
        process.env.JWT_SECRET = 'controller-test-secret-at-least-32-characters-long';
        userFindOne = jest.spyOn(User, 'findOne');
    });

    afterEach(() => {
        userFindOne.mockRestore();
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
    });

    test('rejects weak and bcrypt-truncated registration passwords before database access', async () => {
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const request = password => ({
            body: { username: 'test', email: 'test@example.invalid', password, role: 'doctor' }
        });

        await AuthController.registerUser(request('short'), response);
        expect(response.status).toHaveBeenLastCalledWith(400);

        await AuthController.registerUser(request('a'.repeat(73)), response);
        expect(response.status).toHaveBeenLastCalledWith(400);
        expect(userFindOne).not.toHaveBeenCalled();
    });

    test('signs login tokens with the configured secret', async () => {
        const passwordHash = await PasswordService.hash('long-enough-password');
        const id = new mongoose.Types.ObjectId();
        const user = {
            _id: id,
            username: 'doctor',
            email: 'doctor@example.invalid',
            role: 'doctor',
            first_name: 'Doctor',
            last_name: 'Test',
            password_hash: passwordHash
        };
        userFindOne.mockResolvedValue(user);
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await AuthController.login({ body: { username: 'doctor', password: 'long-enough-password' } }, response);

        const payload = response.json.mock.calls[0][0];
        expect(payload.success).toBe(true);
        expect(jwt.verify(payload.token, process.env.JWT_SECRET)).toMatchObject({ id: id.toString(), role: 'doctor' });
    });
});
