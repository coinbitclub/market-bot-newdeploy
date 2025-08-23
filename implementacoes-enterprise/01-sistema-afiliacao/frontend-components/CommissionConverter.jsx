/**
 * 💰 COMPONENTE: Conversor de Comissões
 * ====================================
 * 
 * Interface para afiliados converterem comissões em créditos com 10% bônus
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CommissionConverter = ({ userId }) => {
    const [balances, setBalances] = useState({
        commission_brl: 0,
        commission_usd: 0
    });
    const [conversionData, setConversionData] = useState({
        amount: '',
        currency: 'BRL'
    });
    const [loading, setLoading] = useState(false);
    const [conversions, setConversions] = useState([]);
    const [preferences, setPreferences] = useState({
        autoConvert: false,
        conversionThreshold: 0
    });

    useEffect(() => {
        loadDashboard();
        loadConversions();
    }, [userId]);

    const loadDashboard = async () => {
        try {
            const response = await axios.get(`/api/affiliate/${userId}/dashboard`);
            if (response.data.success) {
                const { balances: dashboardBalances, preferences: userPrefs } = response.data.dashboard;
                setBalances(dashboardBalances.commissions);
                setPreferences(userPrefs);
            }
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    };

    const loadConversions = async () => {
        try {
            const response = await axios.get(`/api/affiliate/${userId}/conversions?limit=10`);
            if (response.data.success) {
                setConversions(response.data.conversions);
            }
        } catch (error) {
            console.error('Erro ao carregar conversões:', error);
        }
    };

    const handleConvert = async () => {
        const amount = parseFloat(conversionData.amount);
        
        if (!amount || amount <= 0) {
            alert('Por favor, informe um valor válido para conversão');
            return;
        }

        const availableBalance = conversionData.currency === 'BRL' ? balances.brl : balances.usd;
        
        if (amount > availableBalance) {
            alert('Valor maior que o saldo disponível');
            return;
        }

        setLoading(true);
        
        try {
            const response = await axios.post('/api/affiliate/convert-commissions', {
                userId: userId,
                amount: amount,
                currency: conversionData.currency
            });

            if (response.data.success) {
                alert('Conversão realizada com sucesso!');
                setConversionData({ amount: '', currency: conversionData.currency });
                await loadDashboard();
                await loadConversions();
            } else {
                alert('Erro na conversão: ' + response.data.error);
            }

        } catch (error) {
            alert('Erro ao converter: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const updatePreferences = async (newPrefs) => {
        try {
            const response = await axios.put(`/api/affiliate/${userId}/preferences`, newPrefs);
            if (response.data.success) {
                setPreferences(newPrefs);
                alert('Preferências atualizadas com sucesso!');
            }
        } catch (error) {
            alert('Erro ao atualizar preferências: ' + (error.response?.data?.error || error.message));
        }
    };

    const calculateBonus = (amount) => {
        return amount * 0.10; // 10% bônus
    };

    const calculateTotal = (amount) => {
        return amount + calculateBonus(amount);
    };

    const formatCurrency = (value, currency) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency
        }).format(value);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    return (
        <div className="commission-converter">
            <div className="converter-header">
                <h2>💰 Conversor de Comissões</h2>
                <p>Converta suas comissões em créditos operacionais com <strong>+10% de bônus</strong></p>
            </div>

            {/* Saldos Disponíveis */}
            <div className="balances-section">
                <h3>💳 Saldos Disponíveis para Conversão</h3>
                <div className="balances-grid">
                    <div className="balance-card brl">
                        <div className="balance-header">
                            <span className="currency-icon">🇧🇷</span>
                            <h4>Real Brasileiro</h4>
                        </div>
                        <div className="balance-amount">
                            {formatCurrency(balances.brl, 'BRL')}
                        </div>
                        <p className="balance-description">Comissões em Reais</p>
                    </div>

                    <div className="balance-card usd">
                        <div className="balance-header">
                            <span className="currency-icon">🇺🇸</span>
                            <h4>Dólar Americano</h4>
                        </div>
                        <div className="balance-amount">
                            {formatCurrency(balances.usd, 'USD')}
                        </div>
                        <p className="balance-description">Comissões em Dólares</p>
                    </div>
                </div>
            </div>

            {/* Formulário de Conversão */}
            <div className="conversion-form">
                <h3>🔄 Converter Comissões</h3>
                
                <div className="form-row">
                    <div className="form-group">
                        <label>Moeda:</label>
                        <select
                            value={conversionData.currency}
                            onChange={(e) => setConversionData(prev => ({ ...prev, currency: e.target.value }))}
                            className="form-control"
                        >
                            <option value="BRL">🇧🇷 Real Brasileiro (BRL)</option>
                            <option value="USD">🇺🇸 Dólar Americano (USD)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Valor a Converter:</label>
                        <input
                            type="number"
                            value={conversionData.amount}
                            onChange={(e) => setConversionData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            max={conversionData.currency === 'BRL' ? balances.brl : balances.usd}
                            className="form-control"
                        />
                        <span className="available-balance">
                            Disponível: {formatCurrency(
                                conversionData.currency === 'BRL' ? balances.brl : balances.usd,
                                conversionData.currency
                            )}
                        </span>
                    </div>
                </div>

                {conversionData.amount && parseFloat(conversionData.amount) > 0 && (
                    <div className="conversion-preview">
                        <h4>📊 Prévia da Conversão</h4>
                        <div className="preview-grid">
                            <div className="preview-item">
                                <span className="preview-label">Valor Original:</span>
                                <span className="preview-value">
                                    {formatCurrency(parseFloat(conversionData.amount), conversionData.currency)}
                                </span>
                            </div>
                            <div className="preview-item bonus">
                                <span className="preview-label">Bônus (10%):</span>
                                <span className="preview-value">
                                    +{formatCurrency(calculateBonus(parseFloat(conversionData.amount)), conversionData.currency)}
                                </span>
                            </div>
                            <div className="preview-item total">
                                <span className="preview-label">Total em Créditos:</span>
                                <span className="preview-value">
                                    {formatCurrency(calculateTotal(parseFloat(conversionData.amount)), conversionData.currency)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="conversion-actions">
                    <button
                        onClick={handleConvert}
                        disabled={loading || !conversionData.amount || parseFloat(conversionData.amount) <= 0}
                        className="btn btn-convert"
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Convertendo...
                            </>
                        ) : (
                            <>
                                🔄 Converter com +10% Bônus
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Configurações de Conversão Automática */}
            <div className="auto-conversion-settings">
                <h3>⚙️ Conversão Automática</h3>
                <div className="settings-form">
                    <div className="setting-item">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={preferences.autoConvert}
                                onChange={(e) => {
                                    const newPrefs = { ...preferences, autoConvert: e.target.checked };
                                    setPreferences(newPrefs);
                                    updatePreferences(newPrefs);
                                }}
                            />
                            <span className="checkmark"></span>
                            Ativar conversão automática
                        </label>
                        <p className="setting-description">
                            Converte automaticamente comissões em créditos quando atingir o valor mínimo
                        </p>
                    </div>

                    {preferences.autoConvert && (
                        <div className="setting-item">
                            <label>Valor mínimo para conversão automática:</label>
                            <input
                                type="number"
                                value={preferences.conversionThreshold}
                                onChange={(e) => {
                                    const newPrefs = { ...preferences, conversionThreshold: parseFloat(e.target.value) || 0 };
                                    setPreferences(newPrefs);
                                }}
                                onBlur={() => updatePreferences(preferences)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="form-control"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Histórico de Conversões */}
            <div className="conversion-history">
                <h3>📜 Histórico de Conversões</h3>
                {conversions.length === 0 ? (
                    <div className="empty-history">
                        <p>Nenhuma conversão realizada ainda</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {conversions.map((conversion, index) => (
                            <div key={index} className="history-item">
                                <div className="history-main">
                                    <div className="history-amount">
                                        {formatCurrency(conversion.commission_amount, conversion.currency)}
                                        <span className="bonus-indicator">
                                            +{formatCurrency(conversion.bonus_amount, conversion.currency)} bônus
                                        </span>
                                    </div>
                                    <div className="history-total">
                                        = {formatCurrency(conversion.total_credit, conversion.currency)} créditos
                                    </div>
                                </div>
                                <div className="history-date">
                                    {formatDate(conversion.converted_at)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .commission-converter {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .converter-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .converter-header h2 {
                    color: #2c3e50;
                    margin-bottom: 10px;
                }

                .converter-header p {
                    color: #7f8c8d;
                    font-size: 16px;
                }

                .balances-section,
                .conversion-form,
                .auto-conversion-settings,
                .conversion-history {
                    background: white;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .balances-section h3,
                .conversion-form h3,
                .auto-conversion-settings h3,
                .conversion-history h3 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #e9ecef;
                    padding-bottom: 10px;
                }

                .balances-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }

                .balance-card {
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                .balance-card.brl {
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                }

                .balance-card.usd {
                    background: linear-gradient(135deg, #3498db, #5dade2);
                    color: white;
                }

                .balance-header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    margin-bottom: 15px;
                }

                .currency-icon {
                    font-size: 24px;
                }

                .balance-header h4 {
                    margin: 0;
                    font-size: 16px;
                }

                .balance-amount {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }

                .balance-description {
                    margin: 0;
                    opacity: 0.9;
                    font-size: 14px;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                }

                .form-group label {
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #34495e;
                }

                .form-control {
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

                .available-balance {
                    font-size: 12px;
                    color: #7f8c8d;
                    margin-top: 5px;
                }

                .conversion-preview {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    border-left: 4px solid #3498db;
                }

                .conversion-preview h4 {
                    margin: 0 0 15px 0;
                    color: #2c3e50;
                }

                .preview-grid {
                    display: grid;
                    gap: 10px;
                }

                .preview-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                }

                .preview-item.bonus {
                    color: #27ae60;
                    font-weight: 600;
                }

                .preview-item.total {
                    border-top: 2px solid #e9ecef;
                    margin-top: 10px;
                    padding-top: 15px;
                    font-weight: bold;
                    font-size: 18px;
                    color: #2c3e50;
                }

                .preview-label {
                    color: #5a6c7d;
                }

                .preview-value {
                    font-weight: 600;
                }

                .conversion-actions {
                    text-align: center;
                }

                .btn {
                    padding: 12px 30px;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-convert {
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                    color: white;
                    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                }

                .btn-convert:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none !important;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    font-weight: 600;
                    color: #2c3e50;
                }

                .checkbox-label input[type="checkbox"] {
                    margin-right: 10px;
                }

                .setting-description {
                    color: #7f8c8d;
                    font-size: 14px;
                    margin: 5px 0 0 0;
                }

                .setting-item {
                    margin-bottom: 20px;
                }

                .empty-history {
                    text-align: center;
                    color: #7f8c8d;
                    padding: 30px;
                }

                .history-list {
                    display: grid;
                    gap: 15px;
                }

                .history-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    border-left: 4px solid #27ae60;
                }

                .history-main {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .history-amount {
                    font-weight: 600;
                    color: #2c3e50;
                }

                .bonus-indicator {
                    color: #27ae60;
                    font-size: 12px;
                    font-weight: normal;
                    margin-left: 10px;
                }

                .history-total {
                    color: #7f8c8d;
                    font-size: 14px;
                }

                .history-date {
                    color: #7f8c8d;
                    font-size: 12px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .commission-converter {
                        padding: 10px;
                    }
                    
                    .form-row {
                        grid-template-columns: 1fr;
                        gap: 15px;
                    }
                    
                    .balances-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .history-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }
                }
            `}</style>
        </div>
    );
};

export default CommissionConverter;
