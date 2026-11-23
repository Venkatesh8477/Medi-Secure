const { getJwtSecret } = require('../jwtConfig');

describe('JWT secret configuration', () => {
    const previousSecret = process.env.JWT_SECRET;

    afterEach(() => {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
    });

    test('rejects missing, short, and copied example secrets', () => {
        delete process.env.JWT_SECRET;
        expect(getJwtSecret()).toBeNull();
        process.env.JWT_SECRET = 'too-short';
        expect(getJwtSecret()).toBeNull();
        process.env.JWT_SECRET = 'replace-with-a-random-secret-at-least-32-characters';
        expect(getJwtSecret()).toBeNull();
    });

    test('accepts a sufficiently long non-placeholder secret', () => {
        process.env.JWT_SECRET = 'a-private-random-secret-with-at-least-thirty-two-characters';
        expect(getJwtSecret()).toBe(process.env.JWT_SECRET);
    });
});
