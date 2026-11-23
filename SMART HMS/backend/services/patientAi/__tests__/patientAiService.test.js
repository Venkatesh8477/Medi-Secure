jest.mock('../../carecheck/llmService', () => ({ chatJson: jest.fn() }));

const { chatJson } = require('../../carecheck/llmService');
const { classifyIntent, safetyCheck, generateAnswer } = require('../patientAiService');

describe('patient AI safety and orchestration', () => {
    beforeEach(() => jest.clearAllMocks());

    test('detects emergency and medication-change intents deterministically', () => {
        expect(classifyIntent('I have severe chest pain')).toBe('EMERGENCY');
        expect(classifyIntent('Can I stop my blood pressure medicine?')).toBe('DOSAGE_QUESTION');
        expect(safetyCheck('I cannot breathe').blockRoutineAnswer).toBe(true);
        expect(safetyCheck('Should I change my dose?').requiresDoctorReview).toBe(true);
    });

    test('generates structured informational response through Ollama', async () => {
        chatJson.mockResolvedValue({
            value: { answer: 'General information.', sources: [], requiresDoctorReview: false },
            usage: { inputTokens: 10, outputTokens: 20 }
        });
        await expect(generateAnswer({
            message: 'What is blood pressure?',
            language: 'en',
            intent: 'GENERAL_HEALTH',
            history: [],
            patientContext: {}
        })).resolves.toMatchObject({ answer: 'General information.' });
    });

    test('recognizes Telugu as a requested language', async () => {
        chatJson.mockResolvedValue({
            value: { answer: 'సాధారణ సమాచారం.', sources: [] },
            usage: null
        });
        await generateAnswer({ message: 'రక్తపోటు అంటే?', language: 'te', intent: 'GENERAL_HEALTH', history: [], patientContext: {} });
        expect(chatJson.mock.calls[0][0].system).toContain('Telugu');
    });
});
