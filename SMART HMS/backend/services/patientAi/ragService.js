const { PatientAIKnowledgeChunk } = require('../../models/PatientAI');
const { embedTexts } = require('./embeddingService');

function splitIntoChunks(content, maxLength = 1400, overlap = 180) {
    const text = String(content || '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + maxLength, text.length);
        if (end < text.length) {
            const boundary = text.lastIndexOf(' ', end);
            if (boundary > start + maxLength * 0.6) end = boundary;
        }
        chunks.push(text.slice(start, end).trim());
        if (end === text.length) break;
        start = Math.max(start + 1, end - overlap);
    }
    return chunks.filter(Boolean);
}

function cosineSimilarity(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || !left.length) return -1;
    let dot = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;
    for (let index = 0; index < left.length; index++) {
        dot += left[index] * right[index];
        leftMagnitude += left[index] * left[index];
        rightMagnitude += right[index] * right[index];
    }
    if (!leftMagnitude || !rightMagnitude) return -1;
    return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

async function retrieveHealthKnowledge(query, { limit = 4, minimumScore = 0.35 } = {}) {
    const [queryVector] = await embedTexts([query]);
    const chunks = await PatientAIKnowledgeChunk.find({
        active: true,
        embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL
    })
        .select('title sourceUrl content embedding')
        .lean();
    return chunks.map(chunk => ({
        title: chunk.title,
        url: chunk.sourceUrl,
        excerpt: chunk.content,
        score: cosineSimilarity(queryVector, chunk.embedding)
    }))
        .filter(item => item.score >= minimumScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score, ...source }) => source);
}

module.exports = { splitIntoChunks, cosineSimilarity, retrieveHealthKnowledge };
