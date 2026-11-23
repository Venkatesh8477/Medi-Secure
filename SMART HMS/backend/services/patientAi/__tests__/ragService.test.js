jest.mock('../embeddingService', () => ({ embedTexts: jest.fn() }));

const { splitIntoChunks, cosineSimilarity, retrieveHealthKnowledge } = require('../ragService');
const { embedTexts } = require('../embeddingService');
const { PatientAIKnowledgeChunk } = require('../../../models/PatientAI');

describe('patient AI retrieval helpers', () => {
    afterEach(() => jest.clearAllMocks());

    test('splits source text into overlapping chunks under the configured size', () => {
        const content = 'medical information '.repeat(200);
        const chunks = splitIntoChunks(content, 500, 60);
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every(chunk => chunk.length <= 500)).toBe(true);
        expect(chunks[1]).toContain(chunks[0].slice(-55).trim());
    });

    test('computes cosine similarity and rejects mismatched vectors', () => {
        expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
        expect(cosineSimilarity([1], [1, 0])).toBe(-1);
    });

    test('retrieves only sufficiently similar chunks for the configured embedding model', async () => {
        process.env.OLLAMA_EMBEDDING_MODEL = 'test-embedding-model';
        const lean = jest.fn().mockResolvedValue([
            { title: 'Relevant', sourceUrl: 'https://medlineplus.gov/a', content: 'relevant passage', embedding: [1, 0] },
            { title: 'Irrelevant', sourceUrl: 'https://medlineplus.gov/b', content: 'other passage', embedding: [0, 1] }
        ]);
        jest.spyOn(PatientAIKnowledgeChunk, 'find').mockReturnValue({ select: () => ({ lean }) });
        embedTexts.mockResolvedValue([[1, 0]]);
        const result = await retrieveHealthKnowledge('health question');
        expect(PatientAIKnowledgeChunk.find).toHaveBeenCalledWith({
            active: true,
            embeddingModel: 'test-embedding-model'
        });
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Relevant');
        expect(result[0].score).toBeUndefined();
        PatientAIKnowledgeChunk.find.mockRestore();
    });
});
