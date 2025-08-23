/**
 * 🔒 INTERFACE DE NOMEAÇÃO VIP - ADMIN EXCLUSIVO
 * ============================================
 * 
 * Interface exclusiva para administradores promoverem afiliados para VIP
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AffiliateVIPManager = ({ adminId, isAdmin }) => {
    const [affiliates, setAffiliates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [vipPromotionModal, setVipPromotionModal] = useState({
        isOpen: false,
        affiliate: null
    });
    const [promotionData, setPromotionData] = useState({
        reason: '',
        justification: ''
    });

    useEffect(() => {
        if (isAdmin) {
            loadAffiliates();
        }
    }, [isAdmin]);

    const loadAffiliates = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/affiliate/eligible-for-vip');
            if (response.data.success) {
                setAffiliates(response.data.affiliates);
            }
        } catch (error) {
            console.error('Erro ao carregar afiliados:', error);
        } finally {
            setLoading(false);
        }
    };

    const openVipPromotionModal = (affiliate) => {
        setVipPromotionModal({ isOpen: true, affiliate });
        setPromotionData({ reason: '', justification: '' });
    };

    const closeVipPromotionModal = () => {
        setVipPromotionModal({ isOpen: false, affiliate: null });
        setPromotionData({ reason: '', justification: '' });
    };

    const handlePromoteToVIP = async () => {
        if (!promotionData.reason.trim()) {
            alert('Por favor, informe o motivo da promoção');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('/api/admin/affiliate/promote-vip', {
                adminId: adminId,
                targetUserId: vipPromotionModal.affiliate.id,
                reason: promotionData.reason,
                justification: promotionData.justification
            });

            if (response.data.success) {
                alert(`✅ ${response.data.promotion.username} promovido para AFFILIATE_VIP com sucesso!`);
                closeVipPromotionModal();
                await loadAffiliates(); // Recarregar lista
            } else {
                alert('Erro na promoção: ' + response.data.error);
            }

        } catch (error) {
            alert('Erro ao promover para VIP: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="access-denied">
                <h2>🔒 Acesso Negado</h2>
                <p>Apenas administradores podem acessar esta funcionalidade.</p>
            </div>
        );
    }

    return (
        <div className="vip-manager">
            <div className="manager-header">
                <h2>🌟 Gerenciador de Afiliados VIP</h2>
                <p>Promova afiliados normais para VIP (5% comissão)</p>
            </div>

            {loading && (
                <div className="loading-section">
                    <div className="spinner"></div>
                    <p>Carregando afiliados...</p>
                </div>
            )}

            <div className="affiliates-grid">
                {affiliates.length === 0 && !loading ? (
                    <div className="empty-state">
                        <h3>📋 Nenhum afiliado elegível encontrado</h3>
                        <p>Todos os afiliados já são VIP ou não atendem aos critérios.</p>
                    </div>
                ) : (
                    affiliates.map(affiliate => (
                        <div key={affiliate.id} className="affiliate-card">
                            <div className="affiliate-header">
                                <div className="affiliate-info">
                                    <h3>{affiliate.username}</h3>
                                    <span className="affiliate-code">{affiliate.affiliate_code}</span>
                                </div>
                                <div className="affiliate-type">
                                    <span className="type-badge normal">
                                        {affiliate.affiliate_type}
                                    </span>
                                </div>
                            </div>

                            <div className="affiliate-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Indicações:</span>
                                    <span className="stat-value">{affiliate.total_referrals}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Comissões (BRL):</span>
                                    <span className="stat-value">R$ {affiliate.total_commission_brl}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Comissões (USD):</span>
                                    <span className="stat-value">$ {affiliate.total_commission_usd}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Membro desde:</span>
                                    <span className="stat-value">
                                        {new Date(affiliate.affiliate_approved_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            </div>

                            <div className="affiliate-actions">
                                <button
                                    onClick={() => openVipPromotionModal(affiliate)}
                                    className="promote-button"
                                    disabled={loading}
                                >
                                    🌟 Promover para VIP
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Promoção VIP */}
            {vipPromotionModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>🌟 Promover para Afiliado VIP</h3>
                            <button 
                                onClick={closeVipPromotionModal}
                                className="close-button"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="promotion-info">
                                <p><strong>Afiliado:</strong> {vipPromotionModal.affiliate?.username}</p>
                                <p><strong>Código:</strong> {vipPromotionModal.affiliate?.affiliate_code}</p>
                                <p><strong>Atual:</strong> AFFILIATE_NORMAL (1.5%)</p>
                                <p><strong>Novo:</strong> AFFILIATE_VIP (5%)</p>
                            </div>

                            <div className="form-group">
                                <label htmlFor="reason">Motivo da Promoção *</label>
                                <select
                                    id="reason"
                                    value={promotionData.reason}
                                    onChange={(e) => setPromotionData(prev => ({ ...prev, reason: e.target.value }))}
                                    className="form-control"
                                    required
                                >
                                    <option value="">Selecione o motivo</option>
                                    <option value="PERFORMANCE_EXCELENTE">Performance Excelente</option>
                                    <option value="ALTO_VOLUME_INDICACOES">Alto Volume de Indicações</option>
                                    <option value="CONTRIBUICAO_COMUNIDADE">Contribuição para Comunidade</option>
                                    <option value="PARCERIA_ESTRATEGICA">Parceria Estratégica</option>
                                    <option value="RECONHECIMENTO_ESPECIAL">Reconhecimento Especial</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="justification">Justificativa Detalhada</label>
                                <textarea
                                    id="justification"
                                    value={promotionData.justification}
                                    onChange={(e) => setPromotionData(prev => ({ ...prev, justification: e.target.value }))}
                                    placeholder="Descreva os motivos específicos para esta promoção..."
                                    rows="4"
                                    className="form-control"
                                />
                            </div>

                            <div className="promotion-benefits">
                                <h4>🎯 Benefícios da Promoção VIP:</h4>
                                <ul>
                                    <li>✅ Comissão aumenta de 1.5% para 5%</li>
                                    <li>✅ Status VIP permanente</li>
                                    <li>✅ Reconhecimento especial na plataforma</li>
                                    <li>✅ Acesso a recursos exclusivos</li>
                                </ul>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                onClick={closeVipPromotionModal}
                                className="cancel-button"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePromoteToVIP}
                                className="confirm-button"
                                disabled={loading || !promotionData.reason.trim()}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Promovendo...
                                    </>
                                ) : (
                                    <>
                                        🌟 Confirmar Promoção VIP
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .vip-manager {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .manager-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding: 30px;
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    border-radius: 12px;
                }

                .manager-header h2 {
                    margin: 0 0 10px 0;
                    font-size: 32px;
                }

                .manager-header p {
                    margin: 0;
                    opacity: 0.9;
                    font-size: 16px;
                }

                .access-denied {
                    text-align: center;
                    padding: 50px;
                    background: #fee;
                    border: 2px solid #e74c3c;
                    border-radius: 10px;
                    color: #c0392b;
                }

                .loading-section {
                    text-align: center;
                    padding: 40px;
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

                .affiliates-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 20px;
                }

                .affiliate-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    border-left: 4px solid #3498db;
                    transition: transform 0.3s;
                }

                .affiliate-card:hover {
                    transform: translateY(-2px);
                }

                .affiliate-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                }

                .affiliate-info h3 {
                    margin: 0 0 5px 0;
                    color: #2c3e50;
                }

                .affiliate-code {
                    font-family: monospace;
                    background: #ecf0f1;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #34495e;
                }

                .type-badge {
                    padding: 4px 12px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .type-badge.normal {
                    background: #3498db;
                    color: white;
                }

                .affiliate-stats {
                    margin-bottom: 20px;
                }

                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    padding: 5px 0;
                    border-bottom: 1px solid #ecf0f1;
                }

                .stat-label {
                    color: #7f8c8d;
                    font-size: 14px;
                }

                .stat-value {
                    font-weight: 600;
                    color: #2c3e50;
                }

                .affiliate-actions {
                    text-align: center;
                }

                .promote-button {
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 14px;
                }

                .promote-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
                }

                .promote-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .empty-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 50px;
                    background: #f8f9fa;
                    border-radius: 10px;
                    color: #7f8c8d;
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #ecf0f1;
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    border-radius: 12px 12px 0 0;
                }

                .modal-header h3 {
                    margin: 0;
                }

                .close-button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px;
                }

                .modal-body {
                    padding: 20px;
                }

                .promotion-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }

                .promotion-info p {
                    margin: 5px 0;
                    font-size: 14px;
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
                    padding: 10px;
                    border: 2px solid #e9ecef;
                    border-radius: 6px;
                    font-size: 14px;
                }

                .form-control:focus {
                    outline: none;
                    border-color: #f39c12;
                }

                .promotion-benefits {
                    background: #eaf5e9;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #27ae60;
                }

                .promotion-benefits h4 {
                    margin: 0 0 10px 0;
                    color: #27ae60;
                }

                .promotion-benefits ul {
                    margin: 0;
                    padding-left: 20px;
                }

                .promotion-benefits li {
                    margin-bottom: 5px;
                    color: #2d5a31;
                }

                .modal-actions {
                    display: flex;
                    gap: 10px;
                    padding: 20px;
                    border-top: 1px solid #ecf0f1;
                    justify-content: flex-end;
                }

                .cancel-button, .confirm-button {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .cancel-button {
                    background: #95a5a6;
                    color: white;
                }

                .confirm-button {
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .confirm-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .spinner-small {
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
                    .vip-manager {
                        padding: 10px;
                    }
                    
                    .affiliates-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .modal-content {
                        width: 95%;
                        margin: 10px;
                    }
                }
            `}</style>
        </div>
    );
};

export default AffiliateVIPManager;
