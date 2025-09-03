/**
 * 🎛️ COMPONENTE: Painel de Gerenciamento de Solicitações (Admin)
 * ==============================================================
 * 
 * Interface para administradores aprovarem/rejeitarem solicitações de afiliação
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AffiliateRequestManagement = ({ adminId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [selectedRequest, setSelectedRequest] = useState(null);

    useEffect(() => {
        loadRequests();
    }, [filter]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/admin/affiliate/requests?status=${filter}&limit=50`);
            if (response.data.success) {
                setRequests(response.data.requests);
            }
        } catch (error) {
            console.error('Erro ao carregar solicitações:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId, adminNotes = '') => {
        setProcessingId(requestId);
        try {
            const response = await axios.put(`/api/admin/affiliate/request/${requestId}/approve`, {
                adminId: adminId,
                adminNotes: adminNotes
            });

            if (response.data.success) {
                await loadRequests();
                setSelectedRequest(null);
                alert('Solicitação aprovada com sucesso!');
            }
        } catch (error) {
            alert('Erro ao aprovar solicitação: ' + (error.response?.data?.error || error.message));
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId, adminNotes) => {
        if (!adminNotes.trim()) {
            alert('Por favor, informe o motivo da rejeição');
            return;
        }

        setProcessingId(requestId);
        try {
            const response = await axios.put(`/api/admin/affiliate/request/${requestId}/reject`, {
                adminId: adminId,
                adminNotes: adminNotes
            });

            if (response.data.success) {
                await loadRequests();
                setSelectedRequest(null);
                alert('Solicitação rejeitada');
            }
        } catch (error) {
            alert('Erro ao rejeitar solicitação: ' + (error.response?.data?.error || error.message));
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { label: 'Pendente', className: 'status-pending' },
            approved: { label: 'Aprovado', className: 'status-approved' },
            rejected: { label: 'Rejeitado', className: 'status-rejected' }
        };
        
        const config = statusConfig[status] || { label: status, className: 'status-unknown' };
        
        return (
            <span className={`status-badge ${config.className}`}>
                {config.label}
            </span>
        );
    };

    const getLevelBadge = (level) => {
        return (
            <span className={`level-badge ${level === 'vip' ? 'level-vip' : 'level-normal'}`}>
                {level === 'vip' ? '⭐ VIP' : '👤 Normal'}
            </span>
        );
    };

    return (
        <div className="affiliate-request-management">
            <div className="management-header">
                <h2>🤝 Gerenciamento de Afiliados</h2>
                <p>Aprovar e gerenciar solicitações de afiliação</p>
            </div>

            <div className="filters">
                <button 
                    className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    📋 Pendentes
                </button>
                <button 
                    className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
                    onClick={() => setFilter('approved')}
                >
                    ✅ Aprovados
                </button>
                <button 
                    className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setFilter('rejected')}
                >
                    ❌ Rejeitados
                </button>
                <button 
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    📊 Todos
                </button>
            </div>

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Carregando solicitações...</p>
                </div>
            ) : (
                <div className="requests-list">
                    {requests.length === 0 ? (
                        <div className="empty-state">
                            <p>Nenhuma solicitação encontrada</p>
                        </div>
                    ) : (
                        requests.map(request => (
                            <div key={request.id} className="request-card">
                                <div className="request-header">
                                    <div className="user-info">
                                        <h3>{request.username}</h3>
                                        <p>{request.email}</p>
                                    </div>
                                    <div className="request-meta">
                                        {getStatusBadge(request.status)}
                                        {getLevelBadge(request.requested_level)}
                                    </div>
                                </div>

                                <div className="request-details">
                                    <div className="detail-row">
                                        <strong>Solicitado em:</strong>
                                        <span>{formatDate(request.requested_at)}</span>
                                    </div>
                                    
                                    {request.processed_at && (
                                        <div className="detail-row">
                                            <strong>Processado em:</strong>
                                            <span>{formatDate(request.processed_at)}</span>
                                        </div>
                                    )}

                                    {request.processed_by_admin && (
                                        <div className="detail-row">
                                            <strong>Processado por:</strong>
                                            <span>{request.processed_by_admin}</span>
                                        </div>
                                    )}

                                    <div className="reason-section">
                                        <strong>Motivo:</strong>
                                        <p className="reason-text">{request.reason}</p>
                                    </div>

                                    {request.admin_notes && (
                                        <div className="admin-notes">
                                            <strong>Notas do Admin:</strong>
                                            <p>{request.admin_notes}</p>
                                        </div>
                                    )}
                                </div>

                                {request.status === 'pending' && (
                                    <div className="request-actions">
                                        <button 
                                            className="btn btn-approve"
                                            onClick={() => handleApprove(request.id)}
                                            disabled={processingId === request.id}
                                        >
                                            {processingId === request.id ? (
                                                <>
                                                    <span className="spinner-small"></span>
                                                    Aprovando...
                                                </>
                                            ) : (
                                                '✅ Aprovar'
                                            )}
                                        </button>
                                        
                                        <button 
                                            className="btn btn-details"
                                            onClick={() => setSelectedRequest(request)}
                                        >
                                            📝 Detalhes
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal de detalhes/ação */}
            {selectedRequest && (
                <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Processar Solicitação</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setSelectedRequest(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="user-summary">
                                <h4>{selectedRequest.username}</h4>
                                <p>{selectedRequest.email}</p>
                                <p>Nível solicitado: {getLevelBadge(selectedRequest.requested_level)}</p>
                            </div>

                            <div className="reason-full">
                                <strong>Motivo completo:</strong>
                                <p>{selectedRequest.reason}</p>
                            </div>

                            <div className="admin-action">
                                <textarea
                                    id="adminNotes"
                                    placeholder="Notas do administrador (opcional para aprovação, obrigatório para rejeição)"
                                    rows={3}
                                    className="admin-notes-input"
                                />
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button 
                                className="btn btn-approve"
                                onClick={() => {
                                    const notes = document.getElementById('adminNotes').value;
                                    handleApprove(selectedRequest.id, notes);
                                }}
                                disabled={processingId === selectedRequest.id}
                            >
                                ✅ Aprovar
                            </button>
                            
                            <button 
                                className="btn btn-reject"
                                onClick={() => {
                                    const notes = document.getElementById('adminNotes').value;
                                    handleReject(selectedRequest.id, notes);
                                }}
                                disabled={processingId === selectedRequest.id}
                            >
                                ❌ Rejeitar
                            </button>
                            
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setSelectedRequest(null)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .affiliate-request-management {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .management-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .management-header h2 {
                    color: #2c3e50;
                    margin-bottom: 10px;
                }

                .filters {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                }

                .filter-btn {
                    padding: 10px 20px;
                    border: 2px solid #e9ecef;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-weight: 500;
                }

                .filter-btn:hover {
                    border-color: #3498db;
                }

                .filter-btn.active {
                    background: #3498db;
                    color: white;
                    border-color: #3498db;
                }

                .loading {
                    text-align: center;
                    padding: 50px;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }

                .empty-state {
                    text-align: center;
                    padding: 50px;
                    color: #7f8c8d;
                }

                .requests-list {
                    display: grid;
                    gap: 20px;
                }

                .request-card {
                    background: white;
                    border-radius: 10px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    border-left: 4px solid #e9ecef;
                }

                .request-card:hover {
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }

                .request-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                }

                .user-info h3 {
                    margin: 0 0 5px 0;
                    color: #2c3e50;
                }

                .user-info p {
                    margin: 0;
                    color: #7f8c8d;
                    font-size: 14px;
                }

                .request-meta {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .status-badge, .level-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .status-pending {
                    background: #fff3cd;
                    color: #856404;
                }

                .status-approved {
                    background: #d4edda;
                    color: #155724;
                }

                .status-rejected {
                    background: #f8d7da;
                    color: #721c24;
                }

                .level-normal {
                    background: #e9ecef;
                    color: #495057;
                }

                .level-vip {
                    background: #fff8e1;
                    color: #856404;
                }

                .request-details {
                    margin-bottom: 20px;
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 14px;
                }

                .detail-row strong {
                    color: #495057;
                }

                .reason-section {
                    margin-top: 15px;
                }

                .reason-text {
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    border-left: 3px solid #3498db;
                    margin: 5px 0 0 0;
                    font-style: italic;
                }

                .admin-notes {
                    margin-top: 15px;
                    padding: 10px;
                    background: #fff8e1;
                    border-radius: 4px;
                    border-left: 3px solid #ffc107;
                }

                .request-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.3s;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .btn-approve {
                    background: #28a745;
                    color: white;
                }

                .btn-approve:hover:not(:disabled) {
                    background: #218838;
                }

                .btn-reject {
                    background: #dc3545;
                    color: white;
                }

                .btn-reject:hover:not(:disabled) {
                    background: #c82333;
                }

                .btn-details {
                    background: #17a2b8;
                    color: white;
                }

                .btn-details:hover {
                    background: #138496;
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .spinner-small {
                    width: 12px;
                    height: 12px;
                    border: 2px solid transparent;
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    border-radius: 10px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 20px 0 20px;
                    border-bottom: 1px solid #e9ecef;
                    margin-bottom: 20px;
                }

                .modal-header h3 {
                    margin: 0;
                    color: #2c3e50;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #7f8c8d;
                }

                .modal-body {
                    padding: 0 20px 20px;
                }

                .user-summary {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                }

                .user-summary h4 {
                    margin: 0 0 5px 0;
                    color: #2c3e50;
                }

                .reason-full {
                    margin-bottom: 20px;
                }

                .admin-notes-input {
                    width: 100%;
                    padding: 10px;
                    border: 2px solid #e9ecef;
                    border-radius: 4px;
                    resize: vertical;
                    font-family: inherit;
                }

                .modal-actions {
                    padding: 20px;
                    border-top: 1px solid #e9ecef;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .affiliate-request-management {
                        padding: 10px;
                    }
                    
                    .request-header {
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .request-meta {
                        justify-content: flex-start;
                    }
                    
                    .detail-row {
                        flex-direction: column;
                    }
                    
                    .modal-content {
                        width: 95%;
                    }
                    
                    .modal-actions {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
};

export default AffiliateRequestManagement;
