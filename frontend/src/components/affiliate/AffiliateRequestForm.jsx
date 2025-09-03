/**
 * 📝 COMPONENTE: Formulário de Solicitação de Afiliação
 * ====================================================
 * 
 * Interface para usuários solicitarem se tornar afiliados
 */

import React, { useState } from 'react';
import axios from 'axios';

const AffiliateRequestForm = ({ userId, onSuccess, onError }) => {
    const [formData, setFormData] = useState({
        requestedLevel: 'normal',
        reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validações
        const newErrors = {};
        if (!formData.reason.trim()) {
            newErrors.reason = 'Por favor, informe o motivo da solicitação';
        }
        if (formData.reason.length < 20) {
            newErrors.reason = 'O motivo deve ter pelo menos 20 caracteres';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const response = await axios.post('/api/affiliate/request', {
                userId: userId,
                requestedLevel: formData.requestedLevel,
                reason: formData.reason
            });

            if (response.data.success) {
                onSuccess(response.data);
            } else {
                onError(response.data.error || 'Erro desconhecido');
            }

        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Erro ao enviar solicitação';
            onError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    return (
        <div className="affiliate-request-form">
            <div className="form-header">
                <h2>🤝 Solicitar ser Afiliado</h2>
                <p>Torne-se um afiliado CoinBitClub e ganhe comissões pelas indicações!</p>
            </div>

            <form onSubmit={handleSubmit} className="request-form">
                <div className="form-group">
                    <label htmlFor="requestedLevel">Nível de Afiliação:</label>
                    <select
                        id="requestedLevel"
                        value={formData.requestedLevel}
                        onChange={(e) => handleChange('requestedLevel', e.target.value)}
                        className="form-control"
                    >
                        <option value="normal">Afiliado Normal (1.5% comissão)</option>
                        <option value="vip">Afiliado VIP (5.0% comissão) - Requer aprovação</option>
                    </select>
                    
                    <div className="level-info">
                        {formData.requestedLevel === 'normal' && (
                            <div className="info-box info-normal">
                                <h4>✅ Afiliado Normal</h4>
                                <ul>
                                    <li>Comissão: 1.5% das operações dos indicados</li>
                                    <li>Aprovação: Automática</li>
                                    <li>Limite de saque: R$ 2.000/dia</li>
                                    <li>Código único de indicação</li>
                                </ul>
                            </div>
                        )}
                        
                        {formData.requestedLevel === 'vip' && (
                            <div className="info-box info-vip">
                                <h4>⭐ Afiliado VIP</h4>
                                <ul>
                                    <li>Comissão: 5.0% das operações dos indicados</li>
                                    <li>Aprovação: Manual pelo administrador</li>
                                    <li>Limite de saque: R$ 10.000/dia</li>
                                    <li>Suporte dedicado</li>
                                    <li>Materiais de marketing</li>
                                </ul>
                                <div className="vip-requirements">
                                    <strong>Requisitos VIP:</strong>
                                    <p>• Mínimo 10 indicações ativas</p>
                                    <p>• R$ 500 em comissões mensais</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="reason">Motivo da Solicitação: *</label>
                    <textarea
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => handleChange('reason', e.target.value)}
                        placeholder="Conte-nos por que deseja se tornar afiliado e como planeja indicar novos usuários..."
                        rows={4}
                        className={`form-control ${errors.reason ? 'error' : ''}`}
                        maxLength={500}
                    />
                    {errors.reason && (
                        <span className="error-message">{errors.reason}</span>
                    )}
                    <div className="char-count">
                        {formData.reason.length}/500 caracteres
                    </div>
                </div>

                <div className="benefits-section">
                    <h3>🎯 Benefícios de ser Afiliado:</h3>
                    <div className="benefits-grid">
                        <div className="benefit-item">
                            <span className="benefit-icon">💰</span>
                            <div>
                                <strong>Comissões Recorrentes</strong>
                                <p>Ganhe a cada operação dos seus indicados</p>
                            </div>
                        </div>
                        <div className="benefit-item">
                            <span className="benefit-icon">🔄</span>
                            <div>
                                <strong>Conversão com Bônus</strong>
                                <p>Converta comissões em créditos com +10% bônus</p>
                            </div>
                        </div>
                        <div className="benefit-item">
                            <span className="benefit-icon">📊</span>
                            <div>
                                <strong>Dashboard Exclusivo</strong>
                                <p>Acompanhe performance e indicações</p>
                            </div>
                        </div>
                        <div className="benefit-item">
                            <span className="benefit-icon">🎁</span>
                            <div>
                                <strong>Materiais de Marketing</strong>
                                <p>Banners, templates e links personalizados</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Enviando Solicitação...
                            </>
                        ) : (
                            'Solicitar ser Afiliado'
                        )}
                    </button>
                </div>
            </form>

            <style jsx>{`
                .affiliate-request-form {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .form-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .form-header h2 {
                    color: #2c3e50;
                    margin-bottom: 10px;
                }

                .form-header p {
                    color: #7f8c8d;
                    font-size: 16px;
                }

                .form-group {
                    margin-bottom: 25px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #34495e;
                }

                .form-control {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e9ecef;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.3s;
                }

                .form-control:focus {
                    outline: none;
                    border-color: #3498db;
                }

                .form-control.error {
                    border-color: #e74c3c;
                }

                .error-message {
                    color: #e74c3c;
                    font-size: 12px;
                    margin-top: 5px;
                    display: block;
                }

                .char-count {
                    text-align: right;
                    font-size: 12px;
                    color: #7f8c8d;
                    margin-top: 5px;
                }

                .level-info {
                    margin-top: 15px;
                }

                .info-box {
                    padding: 15px;
                    border-radius: 6px;
                    border-left: 4px solid;
                }

                .info-normal {
                    background: #f8f9fa;
                    border-left-color: #28a745;
                }

                .info-vip {
                    background: #fff8e1;
                    border-left-color: #ffc107;
                }

                .info-box h4 {
                    margin: 0 0 10px 0;
                    color: #2c3e50;
                }

                .info-box ul {
                    margin: 10px 0;
                    padding-left: 20px;
                }

                .info-box li {
                    margin-bottom: 5px;
                    color: #5a6c7d;
                }

                .vip-requirements {
                    margin-top: 10px;
                    padding: 10px;
                    background: rgba(255, 193, 7, 0.1);
                    border-radius: 4px;
                }

                .vip-requirements strong {
                    color: #856404;
                }

                .vip-requirements p {
                    margin: 2px 0;
                    font-size: 12px;
                    color: #856404;
                }

                .benefits-section {
                    margin: 30px 0;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 6px;
                }

                .benefits-section h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                }

                .benefits-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                }

                .benefit-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }

                .benefit-icon {
                    font-size: 20px;
                    padding: 8px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .benefit-item strong {
                    color: #2c3e50;
                    display: block;
                    margin-bottom: 3px;
                }

                .benefit-item p {
                    color: #7f8c8d;
                    font-size: 12px;
                    margin: 0;
                }

                .form-actions {
                    text-align: center;
                    margin-top: 30px;
                }

                .btn {
                    padding: 12px 30px;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-primary {
                    background: #3498db;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #2980b9;
                    transform: translateY(-1px);
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .affiliate-request-form {
                        margin: 10px;
                        padding: 15px;
                    }
                    
                    .benefits-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default AffiliateRequestForm;
