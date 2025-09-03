/**
 * ===============================================
 * 💸 COMPONENTE CALCULADORA DE TAXA DE SAQUE
 * ===============================================
 * CoinBitClub Market Bot - Withdrawal Fee Calculator
 * 
 * 🎯 FUNCIONALIDADES:
 * • Cálculo automático de taxa R$10 (BRL) / $2 (USD)
 * • Validação de saldo em tempo real
 * • Preview do saque com taxa
 * • Interface intuitiva
 * • Feedback visual de status
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Select, Alert, Spin, Typography, Row, Col, Divider, Statistic } from 'antd';
import { DollarCircleOutlined, BankOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Title, Text } = Typography;

const WithdrawalFeeCalculator = ({ userId, userBalance, onWithdrawalSuccess }) => {
    // ===============================================
    // 🔧 ESTADO DO COMPONENTE
    // ===============================================
    
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('BRL');
    const [calculation, setCalculation] = useState(null);
    const [validation, setValidation] = useState(null);
    const [error, setError] = useState(null);
    const [feeConfig, setFeeConfig] = useState(null);
    
    // ===============================================
    // 🚀 INICIALIZAÇÃO
    // ===============================================
    
    useEffect(() => {
        loadFeeConfig();
    }, []);
    
    const loadFeeConfig = async () => {
        try {
            const response = await axios.get('/api/withdrawal-fees/config');
            if (response.data.success) {
                setFeeConfig(response.data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar configuração de taxas:', error);
        }
    };
    
    // ===============================================
    // 🧮 CÁLCULO DE TAXA
    // ===============================================
    
    const calculateFee = useCallback(async (withdrawalAmount, selectedCurrency) => {
        if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
            setCalculation(null);
            setValidation(null);
            return;
        }
        
        setCalculating(true);
        setError(null);
        
        try {
            // Calcular taxa
            const calcResponse = await axios.post('/api/withdrawal-fees/calculate', {
                currency: selectedCurrency,
                amount: parseFloat(withdrawalAmount)
            });
            
            if (calcResponse.data.success) {
                setCalculation(calcResponse.data.data);
                
                // Validar se usuário pode realizar o saque
                const validResponse = await axios.post('/api/withdrawal-fees/validate', {
                    user_id: userId,
                    currency: selectedCurrency,
                    amount: parseFloat(withdrawalAmount)
                });
                
                if (validResponse.data.success) {
                    setValidation(validResponse.data.data);
                }
            }
            
        } catch (error) {
            console.error('Erro ao calcular taxa:', error);
            setError(error.response?.data?.error || 'Erro ao calcular taxa de saque');
        } finally {
            setCalculating(false);
        }
    }, [userId]);
    
    // ===============================================
    // 🎯 EVENTOS
    // ===============================================
    
    const handleAmountChange = (value) => {
        setAmount(value);
        calculateFee(value, currency);
    };
    
    const handleCurrencyChange = (value) => {
        setCurrency(value);
        if (amount) {
            calculateFee(amount, value);
        }
    };
    
    const handleWithdrawal = async () => {
        if (!calculation || !validation || !validation.can_withdraw) {
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await axios.post('/api/withdrawals/request', {
                amount: parseFloat(amount),
                currency: currency,
                fee_amount: calculation.fee_amount,
                total_amount: calculation.total_amount,
                with_fee_calculation: true
            });
            
            if (response.data.success) {
                setAmount('');
                setCalculation(null);
                setValidation(null);
                
                if (onWithdrawalSuccess) {
                    onWithdrawalSuccess(response.data.data);
                }
            }
            
        } catch (error) {
            console.error('Erro ao solicitar saque:', error);
            setError(error.response?.data?.error || 'Erro ao processar solicitação de saque');
        } finally {
            setLoading(false);
        }
    };
    
    // ===============================================
    // 🎨 HELPERS DE RENDERIZAÇÃO
    // ===============================================
    
    const getStatusColor = () => {
        if (!validation) return 'default';
        return validation.can_withdraw ? 'success' : 'error';
    };
    
    const getStatusIcon = () => {
        if (!validation) return <DollarCircleOutlined />;
        return validation.can_withdraw ? <CheckCircleOutlined /> : <WarningOutlined />;
    };
    
    const getBalanceText = () => {
        if (!userBalance) return 'N/A';
        
        const balance = currency === 'BRL' 
            ? userBalance.prepaid_credits 
            : userBalance.account_balance_usd;
            
        return `${currency === 'BRL' ? 'R$' : '$'} ${parseFloat(balance || 0).toFixed(2)}`;
    };
    
    const getCurrentFee = () => {
        if (!feeConfig || !feeConfig[currency.toLowerCase()]) return null;
        
        const config = feeConfig[currency.toLowerCase()];
        const symbol = currency === 'BRL' ? 'R$' : '$';
        
        return `${symbol} ${config.fee_amount.toFixed(2)}`;
    };
    
    // ===============================================
    // 🖼️ RENDERIZAÇÃO
    // ===============================================
    
    return (
        <Card 
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BankOutlined />
                    <span>Calculadora de Saque com Taxa</span>
                </div>
            }
            style={{ width: '100%', maxWidth: 600 }}
        >
            {/* Informações de Taxa */}
            {feeConfig && (
                <Alert
                    message="Taxas de Saque"
                    description={
                        <div>
                            <Text strong>BRL:</Text> R$ {feeConfig.brl?.fee_amount?.toFixed(2) || '10.00'} | 
                            <Text strong> USD:</Text> $ {feeConfig.usd?.fee_amount?.toFixed(2) || '2.00'}
                        </div>
                    }
                    type="info"
                    style={{ marginBottom: 16 }}
                />
            )}
            
            {/* Saldo Atual */}
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Statistic
                            title="Saldo Atual"
                            value={getBalanceText()}
                            prefix={<DollarCircleOutlined />}
                        />
                    </Col>
                    <Col span={12}>
                        <Statistic
                            title="Taxa Aplicável"
                            value={getCurrentFee() || 'N/A'}
                            prefix={<BankOutlined />}
                        />
                    </Col>
                </Row>
            </Card>
            
            {/* Formulário de Saque */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Text strong>Moeda:</Text>
                    <Select
                        value={currency}
                        onChange={handleCurrencyChange}
                        style={{ width: '100%', marginTop: 4 }}
                        size="large"
                    >
                        <Option value="BRL">
                            🇧🇷 Real (BRL)
                        </Option>
                        <Option value="USD">
                            🇺🇸 Dólar (USD)
                        </Option>
                    </Select>
                </Col>
                <Col span={16}>
                    <Text strong>Valor do Saque:</Text>
                    <Input
                        type="number"
                        placeholder={`Digite o valor em ${currency}`}
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        style={{ marginTop: 4 }}
                        size="large"
                        prefix={currency === 'BRL' ? 'R$' : '$'}
                        suffix={calculating && <Spin size="small" />}
                    />
                </Col>
            </Row>
            
            {/* Resultados do Cálculo */}
            {calculation && (
                <Card 
                    size="small" 
                    title="Resumo do Saque"
                    style={{ marginBottom: 16 }}
                    type={getStatusColor() === 'success' ? 'inner' : undefined}
                >
                    <Row gutter={16}>
                        <Col span={8}>
                            <Statistic
                                title="Valor Solicitado"
                                value={calculation.withdrawal_amount}
                                precision={2}
                                prefix={currency === 'BRL' ? 'R$' : '$'}
                            />
                        </Col>
                        <Col span={8}>
                            <Statistic
                                title="Taxa de Saque"
                                value={calculation.fee_amount}
                                precision={2}
                                prefix={currency === 'BRL' ? 'R$' : '$'}
                                valueStyle={{ color: '#cf1322' }}
                            />
                        </Col>
                        <Col span={8}>
                            <Statistic
                                title="Total a Debitar"
                                value={calculation.total_amount}
                                precision={2}
                                prefix={currency === 'BRL' ? 'R$' : '$'}
                                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                            />
                        </Col>
                    </Row>
                </Card>
            )}
            
            {/* Status de Validação */}
            {validation && (
                <Alert
                    message={validation.can_withdraw ? 'Saque Aprovado' : 'Saque Rejeitado'}
                    description={
                        validation.can_withdraw 
                            ? `Você receberá ${currency === 'BRL' ? 'R$' : '$'} ${calculation?.withdrawal_amount?.toFixed(2)} em sua conta.`
                            : validation.failure_reason || 'Saldo insuficiente para cobrir o valor do saque mais a taxa.'
                    }
                    type={validation.can_withdraw ? 'success' : 'error'}
                    icon={getStatusIcon()}
                    style={{ marginBottom: 16 }}
                />
            )}
            
            {/* Erro */}
            {error && (
                <Alert
                    message="Erro"
                    description={error}
                    type="error"
                    style={{ marginBottom: 16 }}
                    closable
                    onClose={() => setError(null)}
                />
            )}
            
            <Divider />
            
            {/* Botão de Ação */}
            <Button
                type="primary"
                size="large"
                block
                loading={loading}
                disabled={!calculation || !validation || !validation.can_withdraw}
                onClick={handleWithdrawal}
                icon={<BankOutlined />}
            >
                {loading 
                    ? 'Processando Saque...' 
                    : validation?.can_withdraw 
                        ? `Solicitar Saque de ${currency === 'BRL' ? 'R$' : '$'} ${amount}`
                        : 'Saque Não Disponível'
                }
            </Button>
            
            {/* Informações Adicionais */}
            <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                <Text type="secondary">
                    • Taxa de saque: {currency === 'BRL' ? 'R$ 10,00' : '$ 2,00'} por transação<br/>
                    • O valor da taxa será automaticamente debitado do seu saldo<br/>
                    • Processamento: 1-2 dias úteis após aprovação
                </Text>
            </div>
        </Card>
    );
};

export default WithdrawalFeeCalculator;
