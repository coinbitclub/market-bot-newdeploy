/**
 * 🤝 FORMULÁRIO DE SOLICITAÇÃO DE AFILIAÇÃO - ATUALIZADO
 * =====================================================
 * 
 * ✅ Aprovação automática para AFFILIATE_NORMAL
 * 🎯 Interface simplificada para ativação imediata
 */

import React, { useState } from 'react';
import axios from 'axios';

const AffiliateRequestForm = ({ userId, onSuccess }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        document: '',
        tradingExperience: '',
        terms: false
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.terms) {
            setError('Você deve aceitar os termos e condições');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await axios.post('/api/affiliate/request', {
                userId: userId,
                fullName: formData.fullName,
                document: formData.document,
                tradingExperience: formData.tradingExperience,
                terms: formData.terms
            });

            if (response.data.success) {
                setSuccess(`🎉 Parabéns! Sua afiliação foi ativada automaticamente!
                
✅ Código de Afiliado: ${response.data.affiliate.code}
✅ Tipo: ${response.data.affiliate.type} (${(response.data.affiliate.commission_rate * 100)}% comissão)
✅ Status: ATIVO

Você já pode começar a indicar pessoas e receber comissões!`);
                setFormData({ fullName: '', document: '', tradingExperience: '', terms: false });
                
                // Redirecionar para dashboard após 3 segundos
                setTimeout(() => {
                    if (onSuccess) onSuccess(response.data.affiliate);
                }, 3000);
            } else {
                setError(response.data.error || 'Erro ao processar solicitação');
            }

        } catch (error) {
            setError(error.response?.data?.error || 'Erro ao enviar solicitação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="affiliate-request-form">
            <div className="form-header">
                <h2>🚀 Tornar-se Afiliado CoinBitClub</h2>
                <div className="instant-approval-banner">
                    <span className="instant-icon">⚡</span>
                    <div className="instant-text">
                        <strong>Aprovação Instantânea!</strong>
                        <p>Sua afiliação será ativada automaticamente após o envio</p>
                    </div>
                </div>
            </div>

            <div className="benefits-section">
                <h3>🎯 Benefícios do Programa de Afiliação</h3>
                <div className="benefits-grid">
                    <div className="benefit-item">
                        <span className="benefit-icon">💰</span>
                        <div>
                            <strong>1.5% de Comissão</strong>
                            <p>Receba comissões em todas as operações dos seus indicados</p>
                        </div>
                    </div>
                    <div className="benefit-item">
                        <span className="benefit-icon">🔄</span>
                        <div>
                            <strong>Conversão com Bônus</strong>
                            <p>+10% de bônus ao converter comissões em créditos</p>
                        </div>
                    </div>
                    <div className="benefit-item">
                        <span className="benefit-icon">⚡</span>
                        <div>
                            <strong>Ativação Imediata</strong>
                            <p>Sem espera - comece a receber comissões agora mesmo</p>
                        </div>
                    </div>
                    <div className="benefit-item">
                        <span className="benefit-icon">🌟</span>
                        <div>
                            <strong>Possibilidade VIP</strong>
                            <p>Admins podem promover afiliados para VIP (5% comissão)</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">❌</span>
                    {error}
                </div>
            )}

            {success && (
                <div className="success-message">
                    <span className="success-icon">🎉</span>
                    <pre>{success}</pre>
                </div>
            )}

            <form onSubmit={handleSubmit} className="affiliate-form">
                <div className="form-group">
                    <label htmlFor="fullName">Nome Completo *</label>
                    <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder="Seu nome completo"
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="document">CPF/CNPJ *</label>
                    <input
                        type="text"
                        id="document"
                        name="document"
                        value={formData.document}
                        onChange={handleChange}
                        required
                        placeholder="000.000.000-00"
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="tradingExperience">Experiência em Trading</label>
                    <textarea
                        id="tradingExperience"
                        name="tradingExperience"
                        value={formData.tradingExperience}
                        onChange={handleChange}
                        placeholder="Descreva brevemente sua experiência com trading (opcional)"
                        rows="3"
                        className="form-control"
                    />
                </div>

                <div className="terms-section">
                    <label className="terms-label">
                        <input
                            type="checkbox"
                            name="terms"
                            checked={formData.terms}
                            onChange={handleChange}
                            required
                        />
                        <span className="checkmark"></span>
                        <div className="terms-text">
                            <strong>Aceito os termos e condições *</strong>
                            <p>
                                Concordo com as regras do programa de afiliação e declaro que as informações 
                                fornecidas são verdadeiras. Entendo que:
                            </p>
                            <ul>
                                <li>✅ Receberei 1.5% de comissão como afiliado normal</li>
                                <li>✅ A aprovação é automática e imediata</li>
                                <li>✅ Posso converter comissões em créditos com 10% bônus</li>
                                <li>⚡ A ativação é instantânea após o envio</li>
                            </ul>
                        </div>
                    </label>
                </div>

                <div className="submit-section">
                    <button
                        type="submit"
                        disabled={loading || !formData.terms}
                        className="submit-button"
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Ativando Afiliação...
                            </>
                        ) : (
                            <>
                                <span className="button-icon">🚀</span>
                                Ativar Afiliação Agora
                            </>
                        )}
                    </button>
                    
                    <div className="instant-info">
                        <span className="instant-badge">⚡ INSTANTÂNEO</span>
                        <p>Sua afiliação será ativada imediatamente após clicar</p>
                    </div>
                </div>
            </form>

            <style jsx>{`
                .affiliate-request-form {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                }

                .form-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .form-header h2 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-size: 28px;
                }

                .instant-approval-banner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }

                .instant-icon {
                    font-size: 30px;
                    animation: pulse 2s infinite;
                }

                .instant-text {
                    text-align: left;
                }

                .instant-text strong {
                    font-size: 18px;
                    display: block;
                }

                .instant-text p {
                    margin: 5px 0 0 0;
                    opacity: 0.9;
                    font-size: 14px;
                }

                .benefits-section {
                    background: #f8f9fa;
                    padding: 25px;
                    border-radius: 10px;
                    margin-bottom: 30px;
                    border-left: 4px solid #3498db;
                }

                .benefits-section h3 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    text-align: center;
                }

                .benefits-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }

                .benefit-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    background: white;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                }

                .benefit-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                }

                .benefit-item strong {
                    color: #2c3e50;
                    display: block;
                    margin-bottom: 5px;
                }

                .benefit-item p {
                    color: #7f8c8d;
                    font-size: 14px;
                    margin: 0;
                }

                .error-message, .success-message {
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }

                .error-message {
                    background: #fee;
                    border: 1px solid #e74c3c;
                    color: #c0392b;
                }

                .success-message {
                    background: #eafaf1;
                    border: 1px solid #27ae60;
                    color: #1e7e34;
                }

                .success-message pre {
                    margin: 0;
                    white-space: pre-wrap;
                    font-family: inherit;
                    line-height: 1.5;
                }

                .form-group {
                    margin-bottom: 20px;
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

                .terms-section {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 25px 0;
                    border: 2px solid #e9ecef;
                }

                .terms-label {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    cursor: pointer;
                }

                .terms-label input[type="checkbox"] {
                    margin-top: 3px;
                }

                .terms-text strong {
                    color: #2c3e50;
                    display: block;
                    margin-bottom: 10px;
                }

                .terms-text p {
                    color: #5a6c7d;
                    margin-bottom: 10px;
                    font-size: 14px;
                }

                .terms-text ul {
                    margin: 10px 0 0 20px;
                    color: #5a6c7d;
                    font-size: 13px;
                }

                .terms-text li {
                    margin-bottom: 5px;
                }

                .submit-section {
                    text-align: center;
                    margin-top: 30px;
                }

                .submit-button {
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                    margin-bottom: 15px;
                }

                .submit-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
                }

                .submit-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none !important;
                }

                .button-icon {
                    font-size: 20px;
                }

                .spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid transparent;
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .instant-info {
                    margin-top: 15px;
                }

                .instant-badge {
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: 600;
                    display: inline-block;
                    margin-bottom: 5px;
                }

                .instant-info p {
                    color: #7f8c8d;
                    font-size: 13px;
                    margin: 0;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
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
                    
                    .instant-approval-banner {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .instant-text {
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default AffiliateRequestForm;
