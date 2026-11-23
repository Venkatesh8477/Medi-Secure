const { chatJson } = require('../carecheck/llmService');
const { retrieveEvidence } = require('../prescriptionAnalysis/dailyMedService');
const { retrieveHealthKnowledge } = require('./ragService');

const EMERGENCY_PATTERN = /\b(chest pain|cannot breathe|can't breathe|trouble breathing|fainting|unconscious|stroke|suicide|severe bleeding|anaphylaxis)\b|ఛాతి నొప్పి|శ్వాస తీసుకోలేక|స్పృహ కోల్పోయ|తీవ్ర రక్తస్రావం/i;
const MEDICATION_CHANGE_PATTERN = /\b(stop|increase|decrease|change|double)\b.{0,40}\b(medicine|medication|dose|tablet|capsule)\b|\b(medicine|medication|dose|tablet|capsule)\b.{0,40}\b(stop|increase|decrease|change|double)\b|మందు ఆప|మోతాదు పెంచ|మోతాదు తగ్గ/i;

function classifyIntent(message) {
    const text = String(message || '').toLowerCase();
    if (EMERGENCY_PATTERN.test(text)) return 'EMERGENCY';
    if (MEDICATION_CHANGE_PATTERN.test(text) || /\b(dosage|side effect|drug interaction|contraindication)\b|దుష్ప్రభావ|మోతాదు|మందు|ఔషధం/i.test(text)) {
        if (/dosage|stop|increase|decrease|change|double|మోతాదు|మందు ఆప/i.test(text)) return 'DOSAGE_QUESTION';
        if (/side effect|దుష్ప్రభావ/i.test(text)) return 'SIDE_EFFECT_QUESTION';
        if (/interaction|contraindication|ఔషధం కలిపి/i.test(text)) return 'DRUG_INTERACTION';
        return 'MEDICINE_INFORMATION';
    }
    if (/\b(prescription|prescribed|ocr|uploaded prescription)\b/.test(text)) return 'PRESCRIPTION_ANALYSIS';
    if (/\b(medicine|tablet|capsule|drug|medication)\b/.test(text)) return 'MEDICINE_INFORMATION';
    if (/\b(weather|stock|code|programming|politics)\b/.test(text)) return 'OUT_OF_SCOPE';
    return 'GENERAL_HEALTH';
}

function safetyCheck(message) {
    if (EMERGENCY_PATTERN.test(message)) {
        return {
            level: 'emergency',
            requiresDoctorReview: true,
            answerPrefix: 'This may be an emergency. Stop and seek immediate medical care or call your local emergency service now.',
            blockRoutineAnswer: true
        };
    }
    if (MEDICATION_CHANGE_PATTERN.test(message)) {
        return {
            level: 'high',
            requiresDoctorReview: true,
            answerPrefix: 'Do not start, stop, increase, decrease, or change medicine doses without the prescriber or pharmacist.',
            blockRoutineAnswer: false
        };
    }
    return { level: 'normal', requiresDoctorReview: false, answerPrefix: '', blockRoutineAnswer: false };
}

async function generateAnswer({ message, language, intent, history, patientContext, evidence = [] }) {
    const languageName = language === 'te' ? 'Telugu' : 'English';
    const response = await chatJson({
        role: 'patient health education',
        system: `You are an informational patient health assistant. Reply in ${languageName}. You do not diagnose, prescribe, start or stop treatment, or change dosages. Use only the supplied context and supplied trusted evidence. If the evidence does not answer the question, say so and direct the patient to a doctor or pharmacist. Return only JSON with: {"answer":"string","sources":[],"requiresDoctorReview":true|false}. Do not claim a diagnosis or imply certainty. Preserve the user's safety needs.`,
        user: JSON.stringify({
            intent,
            message,
            patientContext,
            trustedMedicineEvidence: evidence,
            recentMessages: history,
            instructions: 'Give educational information only. Cite no source unless it is supplied. If evidence is missing, say that it cannot be confirmed.'
        })
    });
    const value = response.value || {};
    return {
        answer: typeof value.answer === 'string' ? value.answer : 'I cannot provide a reliable answer without more information.',
        sources: evidence,
        requiresDoctorReview: value.requiresDoctorReview === true,
        modelUsage: response.usage
    };
}

async function retrieveMedicineEvidence(name) {
    const result = await retrieveEvidence([{ name }]);
    return result.results[0] || { medication: name, status: 'not_found', sources: [] };
}

module.exports = { classifyIntent, safetyCheck, generateAnswer, retrieveMedicineEvidence, retrieveHealthKnowledge };
