const finalKeys = ['diagnosisDifferentials', 'testRecommendations', 'drugGuidelines'];

function parseAgentOutput(value, agentName) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${agentName} returned an invalid JSON object.`);
    }
    return value;
}

function validateFinalOutput(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Final assessment must be a JSON object.');
    for (const key of finalKeys) if (!(key in value)) throw new Error(`Final assessment is missing ${key}.`);
    if (!Array.isArray(value.diagnosisDifferentials) || !Array.isArray(value.testRecommendations)) {
        throw new Error('Final assessment lists must be arrays.');
    }
    for (const item of value.diagnosisDifferentials) {
        if (!item || typeof item.diagnosis !== 'string' || typeof item.likelihood !== 'string' || typeof item.reasoning !== 'string') {
            throw new Error('A diagnosis differential has an invalid shape.');
        }
    }
    for (const item of value.testRecommendations) {
        if (!item || typeof item.test !== 'string' || typeof item.purpose !== 'string' || typeof item.priority !== 'string') {
            throw new Error('A test recommendation has an invalid shape.');
        }
    }
    const drug = value.drugGuidelines;
    if (!drug || !Array.isArray(drug.interactions) || typeof drug.dosageReview !== 'string' ||
        !Array.isArray(drug.recommendations) || !Array.isArray(drug.contraindications)) {
        throw new Error('Medication review has an invalid shape.');
    }
    if ([...drug.interactions, ...drug.recommendations, ...drug.contraindications].some(item => typeof item !== 'string')) {
        throw new Error('Medication review lists must contain text only.');
    }
    for (const key of ['uncertainty', 'evidenceNeeded', 'conflicts']) {
        if (!Array.isArray(value[key]) || value[key].some(item => typeof item !== 'string')) {
            throw new Error(`Final assessment ${key} must be a text list.`);
        }
    }
    return {
        diagnosisDifferentials: value.diagnosisDifferentials,
        testRecommendations: value.testRecommendations,
        drugGuidelines: drug,
        uncertainty: value.uncertainty,
        evidenceNeeded: value.evidenceNeeded,
        conflicts: value.conflicts
    };
}

module.exports = { parseAgentOutput, validateFinalOutput };
