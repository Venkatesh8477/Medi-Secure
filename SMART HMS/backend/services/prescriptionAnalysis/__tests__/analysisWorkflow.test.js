jest.mock('../providerService', () => ({
    chatJson: jest.fn(),
    providerConfig: jest.fn(() => ({ model: 'test-model' }))
}));

const providerService = require('../providerService');
const { runMulti, runSingle } = require('../analysisService');
const { validatePrescriptionExtraction } = require('../prescriptionParser');
const { chatJsonWithValidation } = require('../validatedCall');

const validOutput = {
    findings: [{
        category: 'dosage',
        severity: 'review_required',
        description: 'Verify the recorded dosage.',
        medicineNames: ['Example medicine'],
        confidence: 'uncertain'
    }],
    missingInformation: [],
    conflicts: []
};

const input = {
    patientContext: { age: null, allergies: null, currentMedications: [] },
    prescriptionMedicines: [{ name: 'Example medicine' }],
    missingInformation: []
};

const evidence = { provider: 'DailyMed', status: 'completed', results: [] };

describe('prescription analysis workflows', () => {
    beforeEach(() => jest.clearAllMocks());

    test('single-agent validates and returns a provider result', async () => {
        providerService.chatJson.mockResolvedValue({ value: validOutput, modelName: 'test-model' });

        const result = await runSingle('gemini', input, evidence);

        expect(providerService.chatJson).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({ provider: 'gemini', status: 'completed', modelName: 'test-model' });
        expect(result.findings[0].category).toBe('dosage');
    });

    test('multi-agent runs specialists and supervisor and returns individual results', async () => {
        providerService.chatJson.mockResolvedValue({ value: validOutput, modelName: 'test-model' });

        const result = await runMulti('ollama', input, evidence);

        expect(providerService.chatJson).toHaveBeenCalledTimes(7);
        expect(result.status).toBe('completed');
        expect(result.agentResults).toHaveLength(7);
        expect(result.agentResults.some(agent => agent.agentName === 'supervisor')).toBe(true);
    });

    test('multi-agent preserves partial status when a specialist fails', async () => {
        providerService.chatJson.mockRejectedValueOnce(Object.assign(new Error('specialist timeout'), { code: 'GEMINI_TIMEOUT' }));
        providerService.chatJson.mockResolvedValue({ value: validOutput, modelName: 'test-model' });

        const result = await runMulti('gemini', input, evidence);

        expect(result.status).toBe('partial');
        expect(result.agentResults.filter(agent => agent.status === 'failed')).toHaveLength(1);
        expect(result.missingInformation.some(item => item.includes('assessment is unknown'))).toBe(true);
    });

    test('multi-agent reports failure when the supervisor fails', async () => {
        providerService.chatJson.mockImplementation((provider, options) => {
            if (options.role === 'prescription-analysis supervisor') return Promise.reject(new Error('supervisor timeout'));
            return Promise.resolve({ value: validOutput, modelName: 'test-model' });
        });

        const result = await runMulti('gemini', input, evidence);

        expect(result.status).toBe('failed');
        expect(result.agentResults.at(-1)).toMatchObject({ agentName: 'supervisor', status: 'failed' });
    });

    test('document extraction accepts normalized medicine details and rejects malformed output', () => {
        expect(validatePrescriptionExtraction({
            medicines: [{ name: 'Example', strength: '10 mg' }],
            missingInformation: []
        }).medicines[0]).toMatchObject({ name: 'Example', strength: '10 mg', route: null });
        expect(() => validatePrescriptionExtraction({ medicines: [{ strength: '10 mg' }] }))
            .toThrow('missing a name');
    });

    test('retries one malformed or schema-invalid model response with a correction instruction', async () => {
        providerService.chatJson
            .mockResolvedValueOnce({ value: { malformed: true } })
            .mockResolvedValueOnce({ value: validOutput });

        const result = await chatJsonWithValidation('gemini', { system: 'safety', user: 'input' }, value => {
            if (!Array.isArray(value.findings)) throw new Error('schema validation failed');
            return value;
        });

        expect(providerService.chatJson).toHaveBeenCalledTimes(2);
        expect(providerService.chatJson.mock.calls[1][1].user).toContain('previous response was invalid');
        expect(result.value.findings).toHaveLength(1);
    });
});
