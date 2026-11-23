import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './PatientAIChat.css';

function PatientAIChat({ onClose }) {
    const [conversationId, setConversationId] = useState('');
    const [language, setLanguage] = useState('en');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [handoffReason, setHandoffReason] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [prescriptionResult, setPrescriptionResult] = useState(null);
    const [medicineName, setMedicineName] = useState('');
    const [medicineResult, setMedicineResult] = useState(null);
    const [lookingUpMedicine, setLookingUpMedicine] = useState(false);

    const loadConversations = async () => {
        try {
            const response = await api.get('/patient-ai/conversations');
            setConversations(response.data.conversations || []);
            const documentsResponse = await api.get('/patient-ai/documents');
            setDocuments(documentsResponse.data.documents || []);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not load conversations.');
        }
    };

    useEffect(() => {
        loadConversations();
    }, []);

    const openConversation = async id => {
        setConversationId(id);
        setError('');
        try {
            const response = await api.get(`/patient-ai/conversations/${id}`);
            setMessages((response.data.messages || []).map(item => ({
                sender: item.sender,
                text: item.message,
                intent: item.intent,
                sources: item.sources
            })));
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not open conversation.');
        }
    };

    const sendMessage = async event => {
        event.preventDefault();
        const text = message.trim();
        if (!text) return;
        setLoading(true);
        setError('');
        setMessages(current => [...current, { sender: 'patient', text }]);
        setMessage('');
        try {
            const response = await api.post('/patient-ai/chat', {
                conversationId: conversationId || undefined,
                message: text,
                language
            });
            setConversationId(response.data.conversationId);
            setMessages(current => [...current, {
                sender: 'assistant',
                text: response.data.answer,
                intent: response.data.intent,
                sources: response.data.sources,
                safetyNotice: response.data.safetyNotice,
                requiresDoctorReview: response.data.requiresDoctorReview
            }]);
            await loadConversations();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not send message.');
        } finally {
            setLoading(false);
        }
    };

    const requestHandoff = async () => {
        if (!conversationId || !handoffReason.trim()) return;
        setError('');
        try {
            await api.post('/patient-ai/doctor-handoff', {
                conversationId,
                reason: handoffReason.trim()
            });
            setHandoffReason('');
            setMessages(current => [...current, {
                sender: 'assistant',
                text: 'Your request for doctor assistance was submitted.',
                intent: 'DOCTOR_HANDOFF'
            }]);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not request doctor assistance.');
        }
    };

    const analyzePrescription = async event => {
        event.preventDefault();
        if (!selectedFile) return;
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('Prescription file must be 10 MB or smaller.');
            return;
        }
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('language', language);
        if (conversationId) formData.append('conversationId', conversationId);
        try {
            const response = await api.post('/patient-ai/prescription/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPrescriptionResult(response.data.document);
            setConversationId(response.data.conversationId);
            setMessages(current => [...current, {
                sender: 'assistant',
                text: response.data.document.medicines.length
                    ? `I extracted ${response.data.document.medicines.length} medicine entry/entries. Verify them against your original prescription.`
                    : 'I could not reliably identify a medicine. Please check the prescription with your pharmacist.',
                intent: 'PRESCRIPTION_ANALYSIS',
                sources: response.data.document.sources,
                safetyNotice: response.data.safetyNotice
            }]);
            setSelectedFile(null);
            await loadConversations();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not analyze the prescription.');
        } finally {
            setUploading(false);
        }
    };

    const lookupMedicine = async event => {
        event.preventDefault();
        const name = medicineName.trim();
        if (!name) return;
        setLookingUpMedicine(true);
        setMedicineResult(null);
        setError('');
        try {
            const response = await api.get(`/patient-ai/medicine/${encodeURIComponent(name)}`);
            setMedicineResult(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not look up this medicine.');
        } finally {
            setLookingUpMedicine(false);
        }
    };

    const deleteDocument = async id => {
        setError('');
        try {
            await api.delete(`/patient-ai/documents/${id}`);
            setDocuments(current => current.filter(document => document._id !== id));
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not delete the saved extraction.');
        }
    };

    const deleteConversation = async id => {
        setError('');
        try {
            await api.delete(`/patient-ai/conversations/${id}`);
            setConversations(current => current.filter(item => item._id !== id));
            setDocuments(current => current.filter(document => document.conversation !== id));
            if (conversationId === id) {
                setConversationId('');
                setMessages([]);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not delete the conversation.');
        }
    };

    return (
        <section className="patient-ai-chat">
            <aside className="patient-ai-history">
                <h3>Conversations</h3>
                <button type="button" onClick={() => { setConversationId(''); setMessages([]); }}>New chat</button>
                {conversations.map(item => (
                    <div className="patient-ai-conversation-item" key={item._id}>
                        <button
                            type="button"
                            className={conversationId === item._id ? 'active' : ''}
                            onClick={() => openConversation(item._id)}
                        >
                            {item.title}
                        </button>
                        <button type="button" onClick={() => deleteConversation(item._id)} aria-label={`Delete ${item.title}`}>×</button>
                    </div>
                ))}
            </aside>
            <div className="patient-ai-main">
                <header>
                    <h2>AI Health Assistant</h2>
                    <div className="patient-ai-header-actions">
                        <label>
                            Language
                            <select value={language} onChange={event => setLanguage(event.target.value)}>
                                <option value="en">English</option>
                                <option value="te">Telugu</option>
                            </select>
                        </label>
                        {onClose && <button type="button" className="patient-ai-close" onClick={onClose} aria-label="Close AI assistance">×</button>}
                    </div>
                </header>
                <p className="patient-ai-disclaimer">
                    Educational information only. The assistant cannot diagnose, prescribe, or change medication.
                </p>
                <div className="patient-ai-tools">
                    <form onSubmit={analyzePrescription}>
                        <label>
                            Analyze prescription (PDF, PNG, JPEG; max 10 MB)
                            <input
                                type="file"
                                accept="application/pdf,image/png,image/jpeg"
                                onChange={event => setSelectedFile(event.target.files?.[0] || null)}
                            />
                        </label>
                        <button type="submit" disabled={!selectedFile || uploading}>
                            {uploading ? 'Analyzing…' : 'Analyze prescription'}
                        </button>
                        <small>Uploaded files are processed in memory and not retained. Verify extracted details against the original.</small>
                    </form>
                    <form onSubmit={lookupMedicine}>
                        <label>
                            Look up a medicine label
                            <input
                                value={medicineName}
                                onChange={event => setMedicineName(event.target.value)}
                                maxLength={100}
                                placeholder="Enter medicine name"
                            />
                        </label>
                        <button type="submit" disabled={!medicineName.trim() || lookingUpMedicine}>
                            {lookingUpMedicine ? 'Searching…' : 'Look up'}
                        </button>
                    </form>
                    {medicineResult && (
                        <div className="patient-ai-medicine-result" role="status">
                            <strong>{medicineResult.medication}</strong>
                            <p>{medicineResult.notice}</p>
                            {medicineResult.sources?.map(source => (
                                <article key={source.url}>
                                    <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
                                    {source.publishedDate && <small> · {source.publishedDate}</small>}
                                    {source.excerpt && <p>{source.excerpt}</p>}
                                </article>
                            ))}
                        </div>
                    )}
                    {prescriptionResult && (
                        <div className="patient-ai-medicine-result" role="status">
                            <strong>Extracted details — verify against the original</strong>
                            {prescriptionResult.medicines?.length ? (
                                <ul>{prescriptionResult.medicines.map((medicine, index) => (
                                    <li key={`${medicine.name}-${index}`}>
                                        {[medicine.name, medicine.strength, medicine.dosage, medicine.frequency, medicine.duration, medicine.route]
                                            .filter(Boolean).join(' · ')}
                                    </li>
                                ))}</ul>
                            ) : <p>No medicine details could be confidently extracted.</p>}
                            {!!prescriptionResult.uncertainty?.length && (
                                <ul>{prescriptionResult.uncertainty.map((item, index) => <li key={index}>{item}</li>)}</ul>
                            )}
                        </div>
                    )}
                    {documents.length > 0 && (
                        <details>
                            <summary>Saved prescription extractions ({documents.length})</summary>
                            {documents.map(document => (
                                <article className="patient-ai-saved-document" key={document._id}>
                                    <strong>{document.file_name}</strong>
                                    <span>{document.medicine_fields?.map(item => item.name).filter(Boolean).join(', ') || 'No medicine identified'}</span>
                                    <button type="button" onClick={() => deleteDocument(document._id)}>Delete extraction</button>
                                </article>
                            ))}
                        </details>
                    )}
                </div>
                <div className="patient-ai-messages" aria-live="polite">
                    {!messages.length && (
                        <div>
                            <p>How can I help you understand your health information?</p>
                            <button type="button" onClick={() => setMessage('What does this diagnosis mean?')}>Explain a diagnosis</button>
                            <button type="button" onClick={() => setMessage('What are common medicine side effects?')}>Medicine side effects</button>
                        </div>
                    )}
                    {messages.map((item, index) => (
                        <article key={index} className={`patient-ai-message ${item.sender}`}>
                            <strong>{item.sender === 'patient' ? 'You' : 'Health Assistant'}</strong>
                            <p>{item.text}</p>
                            {item.sources?.length > 0 && (
                                <ul>{item.sources.map((source, sourceIndex) => (
                                    <li key={sourceIndex}>{typeof source === 'string' ? source : source.title || source.url}</li>
                                ))}</ul>
                            )}
                            {item.safetyNotice && <small>{item.safetyNotice}</small>}
                        </article>
                    ))}
                    {loading && <p>Assistant is thinking…</p>}
                </div>
                {error && <p role="alert" className="patient-ai-error">{error}</p>}
                <form onSubmit={sendMessage} className="patient-ai-input">
                    <input
                        value={message}
                        onChange={event => setMessage(event.target.value)}
                        placeholder="Ask a health question"
                        maxLength={8000}
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || !message.trim()}>Send</button>
                </form>
                {conversationId && (
                    <div className="patient-ai-handoff">
                        <input
                            value={handoffReason}
                            onChange={event => setHandoffReason(event.target.value)}
                            placeholder="Reason for doctor assistance"
                            maxLength={1000}
                        />
                        <button type="button" onClick={requestHandoff} disabled={!handoffReason.trim()}>
                            Request doctor assistance
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}

export default PatientAIChat;
