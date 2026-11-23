const { chatJson } = require('./providerService');

function isRetryableResponseError(error) {
    return ['GEMINI_EMPTY_RESPONSE', 'GEMINI_MALFORMED_JSON', 'OLLAMA_EMPTY_RESPONSE', 'OLLAMA_MALFORMED_JSON']
        .includes(error.code);
}

async function chatJsonWithValidation(provider, request, validate) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const result = await chatJson(provider, attempt === 0 ? request : {
                ...request,
                user: `${request.user}\n\nThe previous response was invalid. Return corrected JSON matching the required schema exactly; do not add prose.`
            });
            return { result, value: validate(result.value) };
        } catch (error) {
            lastError = error;
            const schemaError = !error.code;
            if (attempt === 1 || (!schemaError && !isRetryableResponseError(error))) throw error;
        }
    }
    throw lastError;
}

module.exports = { chatJsonWithValidation };
