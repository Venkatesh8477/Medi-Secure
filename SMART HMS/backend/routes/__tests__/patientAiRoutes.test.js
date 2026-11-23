const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const routes = require('../patientAiRoutes');

const testSecret = 'test-only-secret-that-is-at-least-32-characters';

describe('patient AI route guards', () => {
    let server;
    let baseUrl;
    const previousSecret = process.env.JWT_SECRET;
    const previousEnabled = process.env.PATIENT_AI_ENABLED;

    beforeAll(async () => {
        process.env.JWT_SECRET = testSecret;
        process.env.PATIENT_AI_ENABLED = 'false';
        const app = express();
        app.use(express.json());
        app.use('/api/patient-ai', routes);
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}/api/patient-ai`;
    });

    afterAll(async () => {
        await new Promise(resolve => server.close(resolve));
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
        if (previousEnabled === undefined) delete process.env.PATIENT_AI_ENABLED;
        else process.env.PATIENT_AI_ENABLED = previousEnabled;
    });

    test('rejects unauthenticated chat requests', async () => {
        const response = await fetch(`${baseUrl}/chat`, { method: 'POST' });
        expect(response.status).toBe(401);
    });

    test('rejects doctor accounts', async () => {
        const token = jwt.sign({ id: 'doctor-id', role: 'doctor' }, testSecret);
        const response = await fetch(`${baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ message: 'Hello' })
        });
        expect(response.status).toBe(403);
    });

    test('patient ownership guard fails safely when database is unavailable', async () => {
        const token = jwt.sign({ id: 'patient-id', role: 'patient' }, testSecret);
        const response = await fetch(`${baseUrl}/medicine/aspirin`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        expect([404, 503]).toContain(response.status);
    });
});
