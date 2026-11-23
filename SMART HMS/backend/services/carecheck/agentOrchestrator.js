const agents = require('./agents');
const { validateFinalOutput } = require('./outputValidator');
const { summarizeRun } = require('./evaluator');

async function runSingle(clinicalCase, deps = agents) {
    const startedAt = Date.now();
    const result = await deps.physicianAgent(clinicalCase);
    const suggestions = validateFinalOutput(result.output);
    return { suggestions, metrics: summarizeRun({ startedAt, callCount: 1, usages: [result.usage], outputs: [suggestions] }) };
}

async function runMulti(clinicalCase, deps = agents) {
    const startedAt = Date.now();
    const [physician, specialist, medication] = await Promise.all([
        deps.physicianAgent(clinicalCase), deps.specialistAgent(clinicalCase), deps.medicationAgent(clinicalCase)
    ]);
    const supervised = await deps.supervisorAgent({ clinicalCase, physician: physician.output, specialist: specialist.output, medication: medication.output });
    const suggestions = validateFinalOutput(supervised.output);
    const agentFindings = { physician: physician.output, specialist: specialist.output, medication: medication.output };
    const metrics = summarizeRun({ startedAt, callCount: 4, usages: [physician.usage, specialist.usage, medication.usage, supervised.usage], outputs: Object.values(agentFindings) });
    return { suggestions, agentFindings, metrics };
}

module.exports = { runSingle, runMulti };
