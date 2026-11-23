function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function findingKey(finding) {
    return `${normalizeText(finding.category)}|${finding.medicineNames.map(normalizeText).sort().join(',')}`;
}

function compareProviders(gemini, ollama) {
    if (!gemini || !ollama || gemini.status === 'failed' || ollama.status === 'failed') {
        return {
            comparisonStatus: 'partial',
            agreements: [],
            geminiOnly: gemini?.status === 'failed' ? [] : (gemini?.findings || []),
            ollamaOnly: ollama?.status === 'failed' ? [] : (ollama?.findings || []),
            disagreements: [],
            missingInformation: [],
            failedTasks: [gemini, ollama].filter(result => !result || result.status === 'failed')
                .map(result => ({ provider: result?.provider || 'unknown', error: result?.error || 'Provider result is unavailable.' })),
            requiresDoctorReview: true
        };
    }

    const unmatchedOllama = new Set(ollama.findings.map((_, index) => index));
    const agreements = [];
    const disagreements = [];
    const geminiOnly = [];

    for (const geminiFinding of gemini.findings) {
        const key = findingKey(geminiFinding);
        const matchIndex = [...unmatchedOllama].find(index => findingKey(ollama.findings[index]) === key);
        if (matchIndex === undefined) {
            geminiOnly.push(geminiFinding);
            continue;
        }
        unmatchedOllama.delete(matchIndex);
        const ollamaFinding = ollama.findings[matchIndex];
        if (normalizeText(geminiFinding.severity) === normalizeText(ollamaFinding.severity) &&
            normalizeText(geminiFinding.description) === normalizeText(ollamaFinding.description)) {
            agreements.push({ gemini: geminiFinding, ollama: ollamaFinding });
        } else {
            disagreements.push({ gemini: geminiFinding, ollama: ollamaFinding });
        }
    }

    return {
        comparisonStatus: gemini.status === 'completed' && ollama.status === 'completed' ? 'completed' : 'partial',
        agreements,
        geminiOnly,
        ollamaOnly: [...unmatchedOllama].map(index => ollama.findings[index]),
        disagreements,
        missingInformation: [
            ...gemini.missingInformation.map(item => ({ provider: 'gemini', item })),
            ...ollama.missingInformation.map(item => ({ provider: 'ollama', item }))
        ],
        failedTasks: [
            ...(gemini.agentResults || []).filter(result => result.status === 'failed').map(result => ({
                provider: 'gemini', task: result.agentName, error: result.error
            })),
            ...(ollama.agentResults || []).filter(result => result.status === 'failed').map(result => ({
                provider: 'ollama', task: result.agentName, error: result.error
            }))
        ],
        requiresDoctorReview: true
    };
}

module.exports = { compareProviders };
