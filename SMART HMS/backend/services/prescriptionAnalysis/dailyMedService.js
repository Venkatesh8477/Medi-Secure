const axios = require('axios');

const BASE_URL = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';
const TIMEOUT_MS = 10000;
const MAX_MEDICINES = 8;

function xmlText(value) {
    return value.replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function selectLabelExcerpt(text) {
    const plainText = xmlText(text);
    const terms = /\b(dosage|administration|contraindications|warnings|precautions|drug interactions|allergic|allergy|adverse reactions)\b/gi;
    const excerpts = [];
    let match;
    while ((match = terms.exec(plainText)) && excerpts.length < 5) {
        const start = Math.max(0, match.index - 160);
        const end = Math.min(plainText.length, match.index + 420);
        const excerpt = plainText.slice(start, end).trim();
        if (!excerpts.some(item => item === excerpt)) excerpts.push(excerpt);
    }
    return (excerpts.length ? excerpts.join(' … ') : plainText.slice(0, 1000)).slice(0, 2400);
}

async function lookupDrug(name) {
    const response = await axios.get(`${BASE_URL}/spls.json`, {
        params: { drug_name: name, pagesize: 3 },
        timeout: TIMEOUT_MS
    });
    const labels = Array.isArray(response.data?.data) ? response.data.data : [];
    const normalizedName = name.toLowerCase();
    const label = labels.find(item => item.title?.toLowerCase().includes(normalizedName)) || labels[0];
    if (!label?.setid) return { medication: name, status: 'not_found', sources: [] };

    const labelResponse = await axios.get(`${BASE_URL}/spls/${encodeURIComponent(label.setid)}.xml`, {
        timeout: TIMEOUT_MS,
        responseType: 'text'
    });
    return {
        medication: name,
        status: 'available',
        sources: [{
            title: label.title || name,
            publishedDate: label.published_date || null,
            url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(label.setid)}`,
            excerpt: selectLabelExcerpt(String(labelResponse.data || ''))
        }]
    };
}

async function retrieveEvidence(medicines) {
    const names = [...new Set(medicines.map(medicine => medicine.name.trim()).filter(Boolean))].slice(0, MAX_MEDICINES);
    const results = await Promise.all(names.map(async name => {
        try {
            return await lookupDrug(name);
        } catch (error) {
            return { medication: name, status: 'unavailable', sources: [], error: 'DailyMed could not be reached for this medicine.' };
        }
    }));
    return {
        provider: 'DailyMed',
        status: results.every(result => result.status === 'available' || result.status === 'not_found') ? 'completed' : 'partial',
        results
    };
}

module.exports = { lookupDrug, retrieveEvidence, selectLabelExcerpt };
