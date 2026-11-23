import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './PatientAIHandoffs.css';

function PatientAIHandoffs() {
    const [handoffs, setHandoffs] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadHandoffs = async () => {
        setError('');
        try {
            const response = await api.get('/patient-ai/doctor-handoffs');
            setHandoffs(response.data.handoffs || []);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not load patient assistance requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHandoffs();
    }, []);

    const openHandoff = async id => {
        setError('');
        try {
            const response = await api.get(`/patient-ai/doctor-handoffs/${id}`);
            setSelected(response.data);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not open this assistance request.');
        }
    };

    const updateStatus = async status => {
        if (!selected?.handoff?._id) return;
        setError('');
        try {
            await api.patch(`/patient-ai/doctor-handoffs/${selected.handoff._id}`, { status });
            setSelected(current => ({
                ...current,
                handoff: { ...current.handoff, status }
            }));
            await loadHandoffs();
            if (status === 'closed') setSelected(null);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not update this request.');
        }
    };

    if (loading) return <div className="tab-content"><p>Loading patient assistance requests…</p></div>;

    return (
        <div className="tab-content">
            <h2>Patient AI Assistance Requests</h2>
            <p>Requests are visible only for patients with an appointment relationship to you.</p>
            {error && <p role="alert" className="error-message">{error}</p>}
            {!handoffs.length && <p className="no-data">No open assistance requests.</p>}
            <div className="patient-ai-handoff-list">
                {handoffs.map(item => (
                    <article key={item._id} className="patient-ai-handoff-card">
                        <div>
                            <strong>
                                {[item.patient?.user?.first_name, item.patient?.user?.last_name].filter(Boolean).join(' ') || 'Patient'}
                            </strong>
                            <p>{item.reason}</p>
                            <small>{new Date(item.createdAt).toLocaleString()} · {item.status}</small>
                        </div>
                        <button type="button" className="action-btn" onClick={() => openHandoff(item._id)}>
                            Review request
                        </button>
                    </article>
                ))}
            </div>
            {selected && (
                <section className="patient-ai-handoff-detail">
                    <h3>Conversation: {selected.handoff.conversation?.title || 'Patient AI conversation'}</h3>
                    <p><strong>Request:</strong> {selected.handoff.reason}</p>
                    <div className="patient-ai-handoff-messages">
                        {(selected.messages || []).map((item, index) => (
                            <article key={`${item.createdAt}-${index}`}>
                                <strong>{item.sender === 'patient' ? 'Patient' : 'AI assistant'}</strong>
                                <p>{item.message}</p>
                            </article>
                        ))}
                    </div>
                    <div className="patient-ai-handoff-actions">
                        <button type="button" className="action-btn" onClick={() => updateStatus('assigned')}>Assign to me</button>
                        <button type="button" className="action-btn" onClick={() => updateStatus('reviewed')}>Mark reviewed</button>
                        <button type="button" onClick={() => updateStatus('closed')}>Close request</button>
                        <button type="button" onClick={() => setSelected(null)}>Back to requests</button>
                    </div>
                </section>
            )}
        </div>
    );
}

export default PatientAIHandoffs;
