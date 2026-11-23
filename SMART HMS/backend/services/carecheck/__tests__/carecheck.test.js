jest.mock('../llmService', () => ({ chatJson: jest.fn() }));

const { chatJson } = require('../llmService');
const { runSingle, runMulti } = require('../agentOrchestrator');
const { createAiSuggestionsHandler } = require('../controller');
const { buildClinicalCase } = require('../caseBuilder');

const validAssessment = {
    diagnosisDifferentials: [{ diagnosis: 'Example', likelihood: 'Unclear', reasoning: 'Requires clinician assessment.' }],
    testRecommendations: [],
    drugGuidelines: { interactions: [], dosageReview: 'Requires professional review.', recommendations: [], contraindications: [] },
    uncertainty: ['Insufficient information for a conclusion.'],
    evidenceNeeded: [],
    conflicts: []
};

function queryChain(value) {
    const chain = { populate: () => chain, sort: () => chain, limit: () => chain, lean: () => Promise.resolve(value) };
    return chain;
}

describe('CareCheck orchestration and API behavior', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    test('single mode makes one model call and returns validated legacy suggestions', async () => {
        chatJson.mockResolvedValue({ value: validAssessment, usage: { inputTokens: 10, outputTokens: 20 } });
        const result = await runSingle({ caseId: 'mock' });
        expect(chatJson).toHaveBeenCalledTimes(1);
        expect(result.suggestions.diagnosisDifferentials).toHaveLength(1);
        expect(result.metrics.llmCallCount).toBe(1);
    });

    test('multi mode makes three parallel agent calls and a supervisor call', async () => {
        chatJson.mockResolvedValue({ value: validAssessment, usage: null });
        const result = await runMulti({ caseId: 'mock' });
        expect(chatJson).toHaveBeenCalledTimes(4);
        expect(result.metrics.llmCallCount).toBe(4);
        expect(result.agentFindings.specialist).toBeDefined();
    });

    test('failed multi agent rejects the run without a single-agent fallback', async () => {
        chatJson.mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'OLLAMA_TIMEOUT' }));
        await expect(runMulti({ caseId: 'mock' })).rejects.toThrow('timeout');
        expect(chatJson).toHaveBeenCalledTimes(3);
    });

    test('retries malformed Ollama JSON once and rejects a persistently empty response', async () => {
        const axios = require('axios');
        axios.post = jest.fn()
            .mockResolvedValueOnce({ data: { message: { content: '{broken' } } })
            .mockResolvedValueOnce({ data: { message: { content: '{"ok":true}' } } })
            .mockResolvedValueOnce({ data: { message: { content: '' } } })
            .mockResolvedValueOnce({ data: { message: { content: '' } } });
        process.env.OLLAMA_API_KEY = 'test-key';
        process.env.OLLAMA_MODEL = 'mock-model';
        const llm = jest.requireActual('../llmService');
        await expect(llm.chatJson({ system: 's', user: 'u' })).resolves.toMatchObject({ value: { ok: true } });
        expect(axios.post.mock.calls[1][1].messages[0].content).toContain('exactly one complete, valid JSON object');
        await expect(llm.chatJson({ system: 's', user: 'u' })).rejects.toThrow('empty response');
    });

    test('rejects Ollama output that remains malformed after retry', async () => {
        const axios = require('axios');
        axios.post = jest.fn()
            .mockResolvedValueOnce({ data: { message: { content: '{broken' } } })
            .mockResolvedValueOnce({ data: { message: { content: '{still broken' } } });
        process.env.OLLAMA_API_KEY = 'test-key';
        process.env.OLLAMA_MODEL = 'mock-model';
        const llm = jest.requireActual('../llmService');
        await expect(llm.chatJson({ system: 's', user: 'u' })).rejects.toMatchObject({
            message: expect.stringContaining('malformed JSON'),
            code: 'OLLAMA_MALFORMED_JSON'
        });
    });

    test('Ollama timeout and rate limit return meaningful errors', async () => {
        const axios = require('axios');
        axios.post = jest.fn().mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }))
            .mockRejectedValueOnce({ response: { status: 429 } });
        process.env.OLLAMA_API_KEY = 'test-key';
        process.env.OLLAMA_MODEL = 'mock-model';
        const llm = jest.requireActual('../llmService');
        await expect(llm.chatJson({ system: 's', user: 'u' })).rejects.toMatchObject({ status: 502, code: 'OLLAMA_TIMEOUT' });
        await expect(llm.chatJson({ system: 's', user: 'u' })).rejects.toMatchObject({ status: 429, code: 'OLLAMA_RATE_LIMIT' });
    });

    test('rejects callers without doctor authorization before any model call', async () => {
        const handler = createAiSuggestionsHandler({ buildClinicalCase: jest.fn() });
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await handler({ user: { role: 'patient' }, params: { patientId: 'x' }, body: {} }, res);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('rejects a doctor with no appointment relationship to the patient', async () => {
        const models = {
            Doctor: { findOne: jest.fn().mockResolvedValue({ _id: 'doctor-id' }) },
            Patient: { findById: jest.fn(() => queryChain({ _id: 'patient-id', user: {} })) },
            Appointment: { exists: jest.fn().mockResolvedValue(null) },
            Diagnosis: { find: jest.fn() }, Prescription: { find: jest.fn() }, VitalSign: { find: jest.fn() }
        };
        await expect(buildClinicalCase({ patientId: '507f1f77bcf86cd799439011', models: { ...models, doctorUserId: 'doctor-user' } }))
            .rejects.toMatchObject({ status: 403 });
        expect(models.Diagnosis.find).not.toHaveBeenCalled();
    });

    test('case builder marks missing clinical information as unknown', async () => {
        const models = {
            Doctor: { findOne: jest.fn().mockResolvedValue({ _id: 'doctor-id' }) },
            Patient: { findById: jest.fn(() => queryChain({ _id: '507f1f77bcf86cd799439011', user: {}, allergies: null })) },
            Appointment: { exists: jest.fn().mockResolvedValue(true) },
            Diagnosis: { find: jest.fn(() => queryChain([])) },
            Prescription: { find: jest.fn(() => queryChain([])) },
            VitalSign: { find: jest.fn(() => queryChain([])) }
        };
        const result = await buildClinicalCase({ patientId: '507f1f77bcf86cd799439011', models: { ...models, doctorUserId: 'doctor-user' } });
        expect(result.clinicalCase.allergies).toBeNull();
        expect(result.clinicalCase.dataQualityIssues).toHaveLength(4);
        expect(JSON.stringify(result.clinicalCase)).not.toContain('first_name');
    });

    test('handler returns mode and existing suggestions property', async () => {
        const handler = createAiSuggestionsHandler({
            buildClinicalCase: jest.fn().mockResolvedValue({ patientDisplayName: 'Test', patientData: { diagnosesCount: 0, prescriptionsCount: 0 }, clinicalCase: {} }),
            runSingle: jest.fn().mockResolvedValue({ suggestions: validAssessment, metrics: { llmCallCount: 1 } })
        });
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await handler({ user: { role: 'doctor', id: 'doctor' }, params: { patientId: 'p' }, body: {} }, res);
        expect(res.json.mock.calls[0][0]).toMatchObject({ success: true, mode: 'single', suggestions: validAssessment });
    });

    test('handler rejects unsupported mode', async () => {
        const handler = createAiSuggestionsHandler({ buildClinicalCase: jest.fn() });
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await handler({ user: { role: 'doctor' }, params: { patientId: 'p' }, body: { mode: 'ensemble' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
