const axios = require('axios');
const ollama = require('../carecheck/llmService');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function providerConfig(provider) {
    if (provider === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            const error = new Error('Gemini is not configured. Set GEMINI_API_KEY.');
            error.status = 503;
            error.code = 'GEMINI_NOT_CONFIGURED';
            throw error;
        }
        return {
            apiKey,
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            timeout: Math.max(1000, Number(process.env.GEMINI_TIMEOUT_MS) || 45000)
        };
    }
    if (provider !== 'ollama') {
        const error = new Error('Provider must be gemini or ollama.');
        error.status = 400;
        error.code = 'INVALID_PROVIDER';
        throw error;
    }
    const config = ollama.getConfig();
    return { apiKey: config.apiKey, model: config.model, timeout: config.timeout, baseUrl: config.baseUrl };
}

async function chatJson(provider, { system, user, role = 'prescription analysis', image }) {
    if (provider === 'ollama') {
        const response = await ollama.chatJson({
            system,
            user,
            role,
            ...(image ? { image } : {})
        });
        const config = providerConfig(provider);
        return { ...response, modelName: config.model };
    }

    const config = providerConfig(provider);
    const parts = [{ text: `${system}\n\n${user}` }];
    if (image) {
        parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }

    let response;
    try {
        response = await axios.post(
            `${GEMINI_BASE_URL}/${encodeURIComponent(config.model)}:generateContent`,
            {
                contents: [{ role: 'user', parts }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
            },
            { headers: { 'x-goog-api-key': config.apiKey }, timeout: config.timeout }
        );
    } catch (cause) {
        const status = cause.response?.status;
        const error = new Error(status === 429
            ? 'Gemini rate limit reached.'
            : cause.code === 'ECONNABORTED'
                ? 'Gemini request timed out.'
                : status
                    ? `Gemini request failed (HTTP ${status}).`
                    : 'Could not reach Gemini.');
        error.status = status === 429 ? 429 : 502;
        error.code = status === 429 ? 'GEMINI_RATE_LIMIT' : cause.code === 'ECONNABORTED' ? 'GEMINI_TIMEOUT' : 'GEMINI_REQUEST_FAILED';
        throw error;
    }

    const content = response.data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('')
        .trim();
    if (!content) {
        const error = new Error(`Gemini returned an empty response for ${role}.`);
        error.status = 502;
        error.code = 'GEMINI_EMPTY_RESPONSE';
        throw error;
    }
    let value;
    try {
        value = JSON.parse(content);
    } catch (_) {
        const error = new Error(`Gemini returned malformed JSON for ${role}.`);
        error.status = 502;
        error.code = 'GEMINI_MALFORMED_JSON';
        throw error;
    }
    const usage = response.data?.usageMetadata;
    return {
        value,
        modelName: config.model,
        usage: usage ? {
            inputTokens: usage.promptTokenCount || 0,
            outputTokens: usage.candidatesTokenCount || 0
        } : null
    };
}

module.exports = { chatJson, providerConfig };
