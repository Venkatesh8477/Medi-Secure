const axios = require('axios');

const DEFAULT_BASE_URL = 'https://ollama.com/api';

function getConfig() {
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL;
    if (!apiKey || !model) {
        const error = new Error('Ollama is not configured. Set OLLAMA_API_KEY and OLLAMA_MODEL.');
        error.status = 503;
        error.code = 'OLLAMA_NOT_CONFIGURED';
        throw error;
    }
    return {
        apiKey,
        model,
        baseUrl: (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
        timeout: Math.max(1000, Number(process.env.OLLAMA_TIMEOUT_MS) || 45000)
    };
}

async function chatJson({ system, user, role = 'clinical assistant', image }) {
    const config = getConfig();
    let response;
    let parsed;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            response = await axios.post(`${config.baseUrl}/chat`, {
                model: config.model,
                stream: false,
                format: 'json',
                messages: [
                    {
                        role: 'system',
                        content: attempt === 0
                            ? system
                            : `${system}\n\nOutput exactly one complete, valid JSON object. Do not include markdown, code fences, or explanatory text.`
                    },
                    { role: 'user', content: user, ...(image ? { images: [image.data] } : {}) }
                ],
                options: { temperature: 0.1 }
            }, {
                timeout: config.timeout,
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (cause) {
            const status = cause.response?.status;
            const error = new Error(status === 429
                ? 'Ollama Cloud rate limit reached.'
                : cause.code === 'ECONNABORTED'
                    ? 'Ollama Cloud request timed out.'
                    : status
                        ? `Ollama Cloud request failed (HTTP ${status}).`
                        : 'Could not reach Ollama Cloud.');
            error.status = status === 429 ? 429 : 502;
            error.code = status === 429 ? 'OLLAMA_RATE_LIMIT' : cause.code === 'ECONNABORTED' ? 'OLLAMA_TIMEOUT' : 'OLLAMA_REQUEST_FAILED';
            throw error;
        }

        const content = response?.data?.message?.content;
        if (typeof content !== 'string' || !content.trim()) {
            if (attempt === 0) continue;
            const error = new Error(`Ollama returned an empty response for ${role} after retrying.`);
            error.status = 502;
            error.code = 'OLLAMA_EMPTY_RESPONSE';
            throw error;
        }
        try {
            parsed = JSON.parse(content);
            break;
        } catch (_) {
            if (attempt === 1) {
                const error = new Error(`Ollama returned malformed JSON for ${role} after retrying.`);
                error.status = 502;
                error.code = 'OLLAMA_MALFORMED_JSON';
                throw error;
            }
        }
    }
    return { value: parsed, usage: response.data?.prompt_eval_count || response.data?.eval_count ? {
        inputTokens: response.data.prompt_eval_count || 0,
        outputTokens: response.data.eval_count || 0
    } : null };
}

module.exports = { chatJson, getConfig };
