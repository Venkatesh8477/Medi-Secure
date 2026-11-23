const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const routes = require('../doctorPrescriptionAnalysisRoutes');

const testSecret = 'test-only-secret-that-is-at-least-32-characters';

describe('doctor prescription analysis route guards', () => {
    let server;
    let baseUrl;
    const previousSecret = process.env.JWT_SECRET;
    const previousEnabled = process.env.AI_PRESCRIPTION_ANALYSIS_ENABLED;
    const previousSharing = process.env.AI_EXTERNAL_DATA_SHARING_APPROVED;

    beforeAll(async () => {
        process.env.JWT_SECRET = testSecret;
        process.env.AI_PRESCRIPTION_ANALYSIS_ENABLED = 'false';
        process.env.AI_EXTERNAL_DATA_SHARING_APPROVED = 'false';
        const app = express();
        app.use(express.json());
        app.use('/api/doctor/prescription-analysis', routes);
        server = http.createServer(app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}/api/doctor/prescription-analysis`;
    });

    afterAll(async () => {
        await new Promise(resolve => server.close(resolve));
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
        if (previousEnabled === undefined) delete process.env.AI_PRESCRIPTION_ANALYSIS_ENABLED;
        else process.env.AI_PRESCRIPTION_ANALYSIS_ENABLED = previousEnabled;
        if (previousSharing === undefined) delete process.env.AI_EXTERNAL_DATA_SHARING_APPROVED;
        else process.env.AI_EXTERNAL_DATA_SHARING_APPROVED = previousSharing;
    });

    test('rejects unauthenticated analysis requests', async () => {
        const response = await fetch(baseUrl, { method: 'POST' });
        expect(response.status).toBe(401);
    });

    test('rejects patient accounts before feature processing', async () => {
        const token = jwt.sign({ id: 'patient-id', role: 'patient' }, testSecret);
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        expect(response.status).toBe(403);
    });

    test('keeps analysis disabled unless server flags are explicitly enabled', async () => {
        const token = jwt.sign({ id: 'doctor-id', role: 'doctor' }, testSecret);
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({ success: false });
    });
});
