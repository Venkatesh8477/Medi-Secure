function summarizeRun({ startedAt, callCount, usages, outputs }) {
    const tokenUsageAvailable = usages.length > 0 && usages.every(Boolean);
    const inputTokens = tokenUsageAvailable ? usages.reduce((sum, usage) => sum + usage.inputTokens, 0) : null;
    const outputTokens = tokenUsageAvailable ? usages.reduce((sum, usage) => sum + usage.outputTokens, 0) : null;
    const agentFindings = outputs.map(output => new Set((output?.diagnosisDifferentials || [])
        .map(item => item.diagnosis.toLowerCase().trim()).filter(Boolean)));
    const pairScores = [];
    for (let left = 0; left < agentFindings.length; left++) {
        for (let right = left + 1; right < agentFindings.length; right++) {
            const union = new Set([...agentFindings[left], ...agentFindings[right]]);
            const intersection = [...agentFindings[left]].filter(item => agentFindings[right].has(item));
            if (union.size) pairScores.push(intersection.length / union.size);
        }
    }
    const agreement = pairScores.length ? pairScores.reduce((sum, score) => sum + score, 0) / pairScores.length : null;
    return {
        latencyMs: Date.now() - startedAt,
        llmCallCount: callCount,
        tokenUsage: tokenUsageAvailable ? { inputTokens, outputTokens } : null,
        estimatedCost: null,
        agreementSignal: agreement,
        agreementNote: 'Text overlap is a weak signal, not evidence of correctness.'
    };
}

module.exports = { summarizeRun };
