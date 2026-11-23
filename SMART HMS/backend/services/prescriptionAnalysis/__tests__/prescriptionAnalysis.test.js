jest.mock('axios');
jest.mock('../../carecheck/llmService', () => ({
    chatJson: jest.fn(),
    getConfig: jest.fn()
}));

const axios = require('axios');
const ollama = require('../../carecheck/llmService');
const { chatJson } = require('../providerService');
const { retrieveEvidence } = require('../dailyMedService');
const { validateFindings } = require('../responseValidator');
const { compareProviders } = require('../comparisonService');
const { validateFileSignature } = require('../documentExtractor');

describe('prescription analysis helpers', () => {
    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.GEMINI_API_KEY;
    });

    test('validates required finding fields and rejects malformed output', () => {
        expect(validateFindings({
            findings: [{ category: 'dosage', severity: 'unknown', description: 'Needs review.', medicineNames: [], confidence: 'uncertain' }],
            missingInformation: []
        }, 'test').findings).toHaveLength(1);
        expect(() => validateFindings({ findings: [{ category: 'dosage' }] }, 'test')).toThrow('invalid shape');
    });

    test('compares matching findings and retains meaningful severity disagreements', () => {
        const finding = { category: 'interaction', medicineNames: ['Drug A'], description: 'Review', severity: 'review_required' };
        const comparison = compareProviders(
            { provider: 'gemini', status: 'completed', findings: [finding], missingInformation: [] },
            { provider: 'ollama', status: 'completed', findings: [{ ...finding, severity: 'informational' }], missingInformation: [] }
        );
        expect(comparison.disagreements).toHaveLength(1);
        expect(comparison.requiresDoctorReview).toBe(true);
    });

    test('does not count materially different provider descriptions as agreement', () => {
        const comparison = compareProviders(
            { status: 'completed', findings: [{ category: 'allergy', medicineNames: ['Drug A'], severity: 'unknown', description: 'Allergy is recorded.' }], missingInformation: [] },
            { status: 'completed', findings: [{ category: 'allergy', medicineNames: ['Drug A'], severity: 'unknown', description: 'Allergy data is missing.' }], missingInformation: [] }
        );
        expect(comparison.disagreements).toHaveLength(1);
        expect(comparison.agreements).toHaveLength(0);
    });

    test('reports partial comparison when one provider fails', () => {
        const comparison = compareProviders(
            { provider: 'gemini', status: 'completed', findings: [], missingInformation: [] },
            { provider: 'ollama', status: 'failed', findings: [], error: 'unavailable' }
        );
        expect(comparison.comparisonStatus).toBe('partial');
        expect(comparison.failedTasks).toHaveLength(1);
    });

    test('sends Gemini requests to the configured model without putting the key in the URL', async () => {
        process.env.GEMINI_API_KEY = 'test-secret';
        axios.post.mockResolvedValue({
            data: {
                candidates: [{ content: { parts: [{ text: '{"findings":[],"missingInformation":[],"conflicts":[]}' }] } }],
                usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 4 }
            }
        });

        const result = await chatJson('gemini', { system: 'system', user: 'user' });

        expect(result.value.findings).toEqual([]);
        expect(axios.post.mock.calls[0][0]).toContain(':generateContent');
        expect(axios.post.mock.calls[0][0]).not.toContain('test-secret');
        expect(axios.post.mock.calls[0][2].headers['x-goog-api-key']).toBe('test-secret');
    });

    test('returns DailyMed label source links and extracts label excerpts', async () => {
        axios.get.mockResolvedValueOnce({
            data: { data: [{ title: 'DRUG A TABLET', published_date: 'Jan 1, 2026', setid: 'set-1' }] }
        }).mockResolvedValueOnce({ data: '<section><title>Warnings</title><text>Warnings and dosage review.</text></section>' });

        const result = await retrieveEvidence([{ name: 'Drug A' }]);

        expect(result.status).toBe('completed');
        expect(result.results[0].sources[0].url).toContain('setid=set-1');
        expect(result.results[0].sources[0].excerpt).toContain('Warnings');
    });

    test('accepts supported document signatures and rejects mismatched content', () => {
        const pdf = { mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7') };
        const mislabeled = { mimetype: 'application/pdf', buffer: Buffer.from('not a PDF') };
        expect(validateFileSignature(pdf)).toBe(true);
        expect(validateFileSignature(mislabeled)).toBe(false);
    });

    test('uses the existing Ollama client configuration', () => {
        ollama.getConfig.mockReturnValue({ apiKey: 'key', model: 'model', timeout: 1000, baseUrl: 'https://ollama.com/api' });
        expect(require('../providerService').providerConfig('ollama').model).toBe('model');
    });
});
