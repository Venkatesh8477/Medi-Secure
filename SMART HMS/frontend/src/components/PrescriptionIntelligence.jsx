import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './PrescriptionIntelligence.css';

const API_PATH = '/doctor/prescription-analysis';
const STATUS_OPTIONS = [
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'follow_up_required', label: 'Follow-up required' },
    { value: 'not_actionable', label: 'Not actionable' }
];

function DisplayFindings({ findings }) {
    if (!findings?.length) return <p>No validated findings were returned.</p>;
    return (
        <ul className="prescription-findings">
            {findings.map((finding, index) => (
                <li key={`${finding.category}-${index}`}>
                    <strong>{finding.category.replace(/_/g, ' ')} · {finding.severity.replace(/_/g, ' ')}</strong>
                    <p>{finding.description}</p>
                    {!!finding.medicineNames?.length && <small>Medicines: {finding.medicineNames.join(', ')}</small>}
                    <small>Confidence label: {finding.confidence} (not a calibrated clinical probability)</small>
                    {!!finding.evidence?.length && (
                        <ul>
                            {finding.evidence.map(source => (
                                <li key={source.url}>
                                    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
                                    {source.publishedDate ? ` · ${source.publishedDate}` : ''}
                                    {source.excerpt && <p>{source.excerpt}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            ))}
        </ul>
    );
}

function PrescriptionIntelligence({ patientId, prescriptions = [] }) {
    const [prescriptionId, setPrescriptionId] = useState('');
    const [file, setFile] = useState(null);
    const [agentMode, setAgentMode] = useState('single');
    const [provider, setProvider] = useState('gemini');
    const [analysis, setAnalysis] = useState(null);
    const [history, setHistory] = useState([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState('');
    const [reviewStatus, setReviewStatus] = useState('reviewed');
    const [reviewNotes, setReviewNotes] = useState('');
    const [reviewMessage, setReviewMessage] = useState('');

    useEffect(() => {
        setPrescriptionId(prescriptions[0]?.id || prescriptions[0]?._id || '');
    }, [patientId, prescriptions]);

    useEffect(() => {
        setAnalysis(null);
        setHistory([]);
        setSelectedHistoryId('');
        setError('');
        setReviewMessage('');
    }, [patientId]);

    useEffect(() => {
        let cancelled = false;
        if (!prescriptionId) {
            setHistory([]);
            return undefined;
        }
        setLoadingHistory(true);
        api.get(`${API_PATH}/history/${prescriptionId}`)
            .then(response => {
                if (!cancelled) setHistory(response.data.analyses || []);
            })
            .catch(requestError => {
                if (!cancelled) setError(requestError.response?.data?.error || 'Could not load prescription analysis history.');
            })
            .finally(() => {
                if (!cancelled) setLoadingHistory(false);
            });
        return () => { cancelled = true; };
    }, [prescriptionId]);

    const selectedAnalysis = analysis || history.find(item => item._id === selectedHistoryId);
    const modelResults = selectedAnalysis?.modelResults || [];
    const comparison = selectedAnalysis?.comparison;

    const runAnalysis = async event => {
        event.preventDefault();
        if (!prescriptionId && !file) {
            setError('Select a prescription or upload a PDF, PNG, or JPEG file.');
            return;
        }
        setLoading(true);
        setError('');
        setReviewMessage('');
        setAnalysis(null);
        setSelectedHistoryId('');
        const formData = new FormData();
        formData.append('patientId', patientId);
        if (prescriptionId) formData.append('prescriptionId', prescriptionId);
        formData.append('agentMode', agentMode);
        formData.append('provider', provider);
        if (file) formData.append('file', file);

        try {
            const response = await api.post(API_PATH, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAnalysis(response.data.analysis);
            setReviewStatus('reviewed');
            setReviewNotes('');
            if (prescriptionId) {
                const historyResponse = await api.get(`${API_PATH}/history/${prescriptionId}`);
                setHistory(historyResponse.data.analyses || []);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Prescription analysis could not be completed.');
        } finally {
            setLoading(false);
        }
    };

    const loadHistoryItem = async id => {
        setAnalysis(null);
        setSelectedHistoryId(id);
        setError('');
        try {
            const response = await api.get(`${API_PATH}/${id}`);
            setAnalysis(response.data.analysis);
            setReviewStatus(response.data.analysis.doctorReview?.status || 'reviewed');
            setReviewNotes(response.data.analysis.doctorReview?.notes || '');
            setSelectedHistoryId(id);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not load the saved analysis.');
        }
    };

    const saveReview = async event => {
        event.preventDefault();
        if (!selectedAnalysis?._id) return;
        setReviewMessage('');
        setError('');
        try {
            const response = await api.post(`${API_PATH}/${selectedAnalysis._id}/review`, {
                status: reviewStatus,
                notes: reviewNotes
            });
            setAnalysis(current => ({ ...current, doctorReview: response.data.doctorReview }));
            setReviewMessage('Doctor review saved.');
            if (prescriptionId) {
                const historyResponse = await api.get(`${API_PATH}/history/${prescriptionId}`);
                setHistory(historyResponse.data.analyses || []);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not save the doctor review.');
        }
    };

    return (
        <section className="prescription-intelligence">
            <h3>AI Prescription Intelligence</h3>
            <p className="prescription-safety-notice">
                Analysis is decision support only. Verify each finding and source. AI must not approve or change treatment.
                Cloud providers receive the minimum clinical context needed for the requested analysis.
            </p>
            <form onSubmit={runAnalysis} className="prescription-analysis-form">
                <label>
                    Existing prescription
                    <select value={prescriptionId} onChange={event => { setPrescriptionId(event.target.value); setFile(null); }}>
                        <option value="">Upload a prescription instead</option>
                        {prescriptions.map(item => {
                            const id = item.id || item._id;
                            return (
                                <option key={id} value={id}>
                                    {[item.medication_name || item.medication?.name, item.strength || item.medication?.strength, item.dosage].filter(Boolean).join(' · ') || 'Prescription'}
                                </option>
                            );
                        })}
                    </select>
                </label>
                <label>
                    Prescription document (PDF, PNG, JPEG; max 10 MB)
                    <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        onChange={event => { setFile(event.target.files?.[0] || null); if (event.target.files?.[0]) setPrescriptionId(''); }}
                    />
                </label>
                <label>
                    Analysis architecture
                    <select value={agentMode} onChange={event => setAgentMode(event.target.value)} disabled={loading}>
                        <option value="single">Single agent</option>
                        <option value="multi">Multi-agent</option>
                    </select>
                </label>
                <label>
                    AI provider
                    <select value={provider} onChange={event => setProvider(event.target.value)} disabled={loading}>
                        <option value="gemini">Gemini</option>
                        <option value="ollama">Ollama Cloud</option>
                        <option value="both">Compare both providers</option>
                    </select>
                </label>
                <button type="submit" className="action-btn" disabled={loading || loadingHistory}>
                    {loading ? 'Analyzing…' : 'Run prescription analysis'}
                </button>
            </form>

            {error && <p role="alert" className="prescription-error">{error}</p>}
            {loadingHistory && <p>Loading analysis history…</p>}
            {prescriptionId && history.length > 0 && (
                <label className="prescription-history-select">
                    Previous analysis
                    <select value={selectedHistoryId} onChange={event => loadHistoryItem(event.target.value)}>
                        <option value="">Select a saved analysis</option>
                        {history.map(item => (
                            <option key={item._id} value={item._id}>
                                {new Date(item.createdAt).toLocaleString()} · {item.agentMode} · {item.providerMode} · {item.status}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {selectedAnalysis && (
                <div className="prescription-analysis-results">
                    <h4>Analysis status: {selectedAnalysis.status}</h4>
                    <p>{selectedAnalysis.agentMode} architecture · {selectedAnalysis.providerMode} · {selectedAnalysis.sourceDocumentName || 'Existing prescription'}</p>
                    {selectedAnalysis.documentExtraction && (
                        <details>
                            <summary>Document extraction · {selectedAnalysis.documentExtraction.status} · {selectedAnalysis.documentExtraction.provider}</summary>
                            {selectedAnalysis.documentExtraction.error && <p className="prescription-error">{selectedAnalysis.documentExtraction.error}</p>}
                            <ul>{(selectedAnalysis.documentExtraction.medicines || []).map((medicine, index) => (
                                <li key={`${medicine.name}-${index}`}>
                                    {[medicine.name, medicine.strength, medicine.dosage, medicine.frequency, medicine.duration, medicine.route].filter(Boolean).join(' · ')}
                                </li>
                            ))}</ul>
                            {(selectedAnalysis.documentExtraction.missingInformation || []).map((item, index) => <p key={index}>{item}</p>)}
                        </details>
                    )}
                    {modelResults.map(result => (
                        <details key={result.provider} open={modelResults.length === 1}>
                            <summary>{result.provider} · {result.modelName} · {result.status}{result.durationMs ? ` · ${result.durationMs} ms` : ''}</summary>
                            {result.error && <p className="prescription-error">{result.error}</p>}
                            <DisplayFindings findings={result.findings} />
                            {!!result.missingInformation?.length && (
                                <div><strong>Missing information / cautions</strong><ul>{result.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                            )}
                            {!!result.conflicts?.length && (
                                <div><strong>Conflicts requiring review</strong><ul>{result.conflicts.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                            )}
                        </details>
                    ))}
                    {!!selectedAnalysis.agentResults?.length && (
                        <details>
                            <summary>Individual multi-agent results</summary>
                            {selectedAnalysis.agentResults.map((agent, index) => (
                                <details key={`${agent.provider}-${agent.agentName}-${index}`}>
                                    <summary>{agent.provider} · {agent.agentName} · {agent.status}</summary>
                                    {agent.error && <p className="prescription-error">{agent.error}</p>}
                                    <DisplayFindings findings={agent.findings} />
                                </details>
                            ))}
                        </details>
                    )}
                    {comparison && (
                        <details open>
                            <summary>Provider comparison · {comparison.comparisonStatus}</summary>
                            <p>Agreement between models is not proof of clinical correctness.</p>
                            {['agreements', 'geminiOnly', 'ollamaOnly', 'disagreements', 'missingInformation', 'failedTasks'].map(key => (
                                <div key={key}>
                                    <strong>{key.replace(/([A-Z])/g, ' $1')}</strong>
                                    <pre>{JSON.stringify(comparison[key] || [], null, 2)}</pre>
                                </div>
                            ))}
                        </details>
                    )}
                    {!!modelResults.flatMap(result => result.evidence || []).length && (
                        <details>
                            <summary>DailyMed label evidence</summary>
                            <ul>{modelResults.flatMap(result => result.evidence || []).map((source, index) => (
                                <li key={`${source.url}-${index}`}>
                                    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
                                    {source.publishedDate ? ` · ${source.publishedDate}` : ''}
                                    {source.excerpt && <p>{source.excerpt}</p>}
                                </li>
                            ))}</ul>
                        </details>
                    )}
                    {!!selectedAnalysis._id && (
                        <form className="prescription-review-form" onSubmit={saveReview}>
                            <h4>Doctor review</h4>
                            <label>
                                Review status
                                <select value={reviewStatus} onChange={event => setReviewStatus(event.target.value)}>
                                    {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </label>
                            <label>
                                Notes
                                <textarea value={reviewNotes} maxLength={4000} onChange={event => setReviewNotes(event.target.value)} />
                            </label>
                            <button type="submit" className="action-btn">Save doctor review</button>
                            {reviewMessage && <p role="status">{reviewMessage}</p>}
                        </form>
                    )}
                </div>
            )}
        </section>
    );
}

export default PrescriptionIntelligence;
