const axios = require('axios');
const { getConfig } = require('../carecheck/llmService');

async function embedTexts(texts) {
    const config = getConfig();
    const model = process.env.OLLAMA_EMBEDDING_MODEL;
    if (!model) {
        const error = new Error('Patient AI embeddings are not configured. Set OLLAMA_EMBEDDING_MODEL.');
        error.status = 503;
        error.code = 'EMBEDDING_NOT_CONFIGURED';
        throw error;
    }
    if (!Array.isArray(texts) || !texts.length || texts.some(text => typeof text !== 'string' || !text.trim())) {
        throw new TypeError('Embedding input must be a non-empty list of text.');
    }

    let response;
    try {
        response = await axios.post(`${config.baseUrl}/embed`, {
            model,
            input: texts
        }, {
            timeout: config.timeout,
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (cause) {
        const error = new Error(cause.response?.status
            ? `Ollama Cloud embedding request failed (HTTP ${cause.response.status}).`
            : cause.code === 'ECONNABORTED'
                ? 'Ollama Cloud embedding request timed out.'
                : 'Could not reach Ollama Cloud embeddings.');
        error.status = cause.response?.status === 429 ? 429 : 502;
        error.code = cause.response?.status === 429 ? 'OLLAMA_EMBEDDING_RATE_LIMIT' : 'OLLAMA_EMBEDDING_FAILED';
        throw error;
    }

    const vectors = response.data?.embeddings;
    if (!Array.isArray(vectors) || vectors.length !== texts.length ||
        vectors.some(vector => !Array.isArray(vector) || !vector.length || vector.some(value => !Number.isFinite(value)))) {
        const error = new Error('Ollama Cloud returned an invalid embedding response.');
        error.status = 502;
        error.code = 'INVALID_EMBEDDING_RESPONSE';
        throw error;
    }
    const dimensions = vectors[0].length;
    if (vectors.some(vector => vector.length !== dimensions)) {
        const error = new Error('Ollama Cloud returned inconsistent embedding dimensions.');
        error.status = 502;
        error.code = 'INVALID_EMBEDDING_RESPONSE';
        throw error;
    }
    return vectors;
}

module.exports = { embedTexts };
