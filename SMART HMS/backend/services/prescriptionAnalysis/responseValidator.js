const VALID_CONFIDENCE = new Set(['low', 'moderate', 'high', 'uncertain']);
const MAX_FINDINGS = 50;

function validateFindings(value, sourceName) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.findings)) {
        throw new Error(`${sourceName} returned an invalid findings object.`);
    }
    if (value.findings.length > MAX_FINDINGS) throw new Error(`${sourceName} returned too many findings.`);
    const findings = value.findings.map((item, index) => {
        if (!item || typeof item !== 'object' ||
            typeof item.category !== 'string' || typeof item.severity !== 'string' ||
            typeof item.description !== 'string' || item.description.length > 2000 ||
            !Array.isArray(item.medicineNames) || !item.medicineNames.every(name => typeof name === 'string')) {
            throw new Error(`${sourceName} finding ${index + 1} has an invalid shape.`);
        }
        const confidence = String(item.confidence || 'uncertain').toLowerCase();
        if (!VALID_CONFIDENCE.has(confidence)) {
            throw new Error(`${sourceName} finding ${index + 1} has an invalid confidence label.`);
        }
        return {
            category: item.category.slice(0, 80),
            severity: item.severity.slice(0, 40),
            description: item.description,
            medicineNames: item.medicineNames.slice(0, 20).map(name => name.slice(0, 150)),
            confidence
        };
    });
    const missingInformation = value.missingInformation === undefined ? [] : value.missingInformation;
    if (!Array.isArray(missingInformation) ||
        !missingInformation.every(item => typeof item === 'string' && item.length <= 500)) {
        throw new Error(`${sourceName} missingInformation must be a list of short text values.`);
    }
    const conflicts = value.conflicts === undefined ? [] : value.conflicts;
    if (!Array.isArray(conflicts) || !conflicts.every(item => typeof item === 'string' && item.length <= 1000)) {
        throw new Error(`${sourceName} conflicts must be a list of short text values.`);
    }
    return { findings, missingInformation, conflicts };
}

module.exports = { validateFindings };
