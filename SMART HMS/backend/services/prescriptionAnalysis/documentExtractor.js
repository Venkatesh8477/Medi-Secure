const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

const MAX_EXTRACTED_CHARACTERS = 50000;

function validateFileSignature(file) {
    const data = file.buffer;
    if (file.mimetype === 'application/pdf') return data.subarray(0, 5).toString() === '%PDF-';
    if (file.mimetype === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (file.mimetype === 'image/jpeg') return data[0] === 0xff && data[1] === 0xd8 && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9;
    return false;
}

async function extractPrescriptionText(file) {
    if (!file?.buffer?.length) throw Object.assign(new Error('A non-empty prescription file is required.'), { status: 400 });
    if (!validateFileSignature(file)) {
        throw Object.assign(new Error('Unsupported or invalid file. Upload a valid PDF, PNG, or JPEG.'), { status: 400 });
    }

    let text;
    try {
        if (file.mimetype === 'application/pdf') {
            const parsed = await pdfParse(file.buffer, { max: 20 });
            text = parsed.text;
        } else {
            const worker = await createWorker('eng');
            try {
                const result = await worker.recognize(file.buffer);
                text = result.data.text;
            } finally {
                await worker.terminate();
            }
        }
    } catch (error) {
        if (error.status) throw error;
        throw Object.assign(new Error('The prescription document could not be read. Upload a clearer PDF or image.'), {
            status: 422,
            code: 'DOCUMENT_UNREADABLE'
        });
    }

    text = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
    if (text.length < 10) {
        throw Object.assign(new Error('No readable prescription text was extracted. Upload a clearer document or select an existing prescription.'), {
            status: 422,
            code: 'DOCUMENT_UNREADABLE'
        });
    }
    return text.slice(0, MAX_EXTRACTED_CHARACTERS);
}

module.exports = { extractPrescriptionText, validateFileSignature };
