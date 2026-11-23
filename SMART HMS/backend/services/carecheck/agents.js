const { chatJson } = require('./llmService');
const { parseAgentOutput, validateFinalOutput } = require('./outputValidator');

const responseShape = `Return only JSON with this shape: {"diagnosisDifferentials":[{"diagnosis":"","likelihood":"Low|Medium|High|Unclear","reasoning":""}],"testRecommendations":[{"test":"","purpose":"","priority":"Low|Medium|High|Unclear"}],"drugGuidelines":{"interactions":[],"dosageReview":"","recommendations":[],"contraindications":[]},"uncertainty":[],"evidenceNeeded":[],"conflicts":[]}. Use empty arrays and explicit uncertainty when evidence is insufficient.`;
const json = value => JSON.stringify(value);
const validateAgent = (value, name) => validateFinalOutput(parseAgentOutput(value, name));

async function physicianAgent(clinicalCase) {
    const result = await chatJson({ role: 'physician agent', system: `You provide AI-generated clinical decision support for a licensed doctor. Do not diagnose, prescribe, or claim certainty. Use only the supplied facts, separate evidence from possibilities, never invent data. ${responseShape}`, user: `Assess the clinical case. ${json(clinicalCase)}` });
    return { output: validateAgent(result.value, 'Physician agent'), usage: result.usage };
}

async function specialistAgent(clinicalCase) {
    const result = await chatJson({ role: 'internal medicine specialist agent', system: `You are an AI internal medicine specialist role for decision support, not a real physician. Review the case independently. Use only supplied facts, avoid diagnosis certainty and treatment orders. ${responseShape}`, user: `Provide a focused internal medicine assessment. ${json(clinicalCase)}` });
    return { output: validateAgent(result.value, 'Specialist agent'), usage: result.usage };
}

async function medicationAgent(clinicalCase) {
    const result = await chatJson({ role: 'medication safety agent', system: `Review only the supplied medication and allergy details. No drug interaction database is connected: do not assert interactions, contraindications, or dose errors as verified facts. State that each possible concern requires pharmacist/doctor review. Never recommend starting, stopping, or changing treatment. ${responseShape}`, user: `Review medication safety in this case. ${json(clinicalCase)}` });
    return { output: validateAgent(result.value, 'Medication agent'), usage: result.usage };
}

async function supervisorAgent({ clinicalCase, physician, specialist, medication }) {
    const inputs = { clinicalCase, physician, specialist, medication };
    const result = await chatJson({ role: 'supervisor agent', system: `Consolidate the provided AI assessments for the treating doctor. The agents may be wrong; agreement is not proof. Preserve material disagreements and identify missing evidence. Do not add facts or claims absent from inputs. Do not diagnose or prescribe. ${responseShape}`, user: json(inputs) });
    return { output: validateFinalOutput(result.value), usage: result.usage };
}

module.exports = { physicianAgent, specialistAgent, medicationAgent, supervisorAgent };
