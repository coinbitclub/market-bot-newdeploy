/**
 * ===============================================
 * 📊 DASHBOARD ADMINISTRATIVO DE TAXAS DE SAQUE
 * ===============================================
 * CoinBitClub Market Bot - Admin Withdrawal Fees Dashboard
 * 
 * 🎯 FUNCIONALIDADES:
 * • Dashboard de receitas com taxas
 * • Relatórios mensais e anuais
 * • Configuração de taxas BRL/USD
 * • Monitoramento de saques
 * • Estatísticas de performance
 */

import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Row, 
    Col, 
    Statistic, 
    Table, 
    Button, 
    Select, 
    DatePicker, 
    Modal, 
    Form, 
    Input, 
    message,
    Alert,
    Spin,
    Typography,
    Divider,
    Tag
} from 'antd';
import { 
    DollarCircleOutlined, 
    BankOutlined, 
    SettingOutlined, 
    TrophyOutlined,
    RiseOutlined,
    UserOutlined,
    CalendarOutlined,
    EditOutlined
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/plots';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AdminWithdrawalFeesDashboard = () => {
    // ===============================================
    // 🔧 ESTADO DO COMPONENTE
    // ===============================================
    
    const [loading, setLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [revenueData, setRevenueData] = useState(null);
    const [feeConfig, setFeeConfig] = useState(null);
    const [selectedCurrency, setSelectedCurrency] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState(12);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    
    const [form] = Form.useForm();
    
    // ===============================================
    // 🚀 INICIALIZAÇÃO
    // ===============================================
    
    useEffect(() => {
        loadAllData();
    }, [selectedCurrency, selectedPeriod]);
    
    const loadAllData = async () => {
        setLoading(true);
        
        try {
            await Promise.all([
                loadDashboardData(),
                loadRevenueData(),
                loadFeeConfig()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            message.error('Erro ao carregar dados do dashboard');
        } finally {
            setLoading(false);
        }
    };
    
    const loadDashboardData = async () => {
        try {
            const params = selectedCurrency !== 'all' ? { currency: selectedCurrency } : {};
            const response = await axios.get('/api/withdrawal-fees/admin/dashboard', { params });
            
            if (response.data.success) {
                setDashboardData(response.data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    };
    
    const loadRevenueData = async () => {
        try {
            const params = {
                months: selectedPeriod,
                ...(selectedCurrency !== 'all' && { currency: selectedCurrency })
            };
            
            const response = await axios.get('/api/withdrawal-fees/admin/revenue', { params });
            
            if (response.data.success) {
                setRevenueData(response.data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar receita:', error);
        }
    };
    
    const loadFeeConfig = async () => {
        try {
            const response = await axios.get('/api/withdrawal-fees/config');
            
            if (response.data.success) {
                setFeeConfig(response.data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
        }
    };
    
    // ===============================================
    // 🛠️ FUNÇÕES DE CONFIGURAÇÃO
    // ===============================================
    
    const handleEditConfig = (currency) => {
        if (!feeConfig || !feeConfig[currency]) return;
        
        const config = feeConfig[currency];
        setEditingConfig({ currency: currency.toUpperCase(), ...config });
        form.setFieldsValue({
            currency: currency.toUpperCase(),
            fee_amount: config.fee_amount
        });
        setConfigModalVisible(true);
    };
    
    const handleSaveConfig = async (values) => {
        try {
            const response = await axios.put('/api/withdrawal-fees/admin/config', {
                currency: values.currency,
                fee_amount: parseFloat(values.fee_amount),
                updated_by: 'admin' // Em produção, pegar do contexto do usuário
            });
            
            if (response.data.success) {
                message.success('Configuração atualizada com sucesso');
                setConfigModalVisible(false);
                form.resetFields();
                loadFeeConfig();
            }
            
        } catch (error) {
            console.error('Erro ao atualizar configuração:', error);
            message.error(error.response?.data?.error || 'Erro ao atualizar configuração');
        }
    };
    
    // ===============================================
    // 📊 CONFIGURAÇÃO DOS GRÁFICOS
    // ===============================================
    
    const getRevenueChartConfig = () => {
        if (!revenueData?.monthly_data) return null;
        
        const data = revenueData.monthly_data.map(item => ({
            month: moment(item.month).format('MMM/YY'),
            revenue: parseFloat(item.total_fees_collected),
            withdrawals: parseInt(item.withdrawals_count),
            currency: item.currency
        }));
        
        return {
            data,
            xField: 'month',
            yField: 'revenue',
            seriesField: 'currency',
            color: ['#1890ff', '#52c41a'],
            point: {
                size: 5,
                shape: 'diamond'
            },
            label: {
                style: {
                    fill: '#aaa'
                }
            }
        };
    };
    
    const getWithdrawalsChartConfig = () => {
        if (!revenueData?.monthly_data) return null;
        
        const data = revenueData.monthly_data.map(item => ({
            month: moment(item.month).format('MMM/YY'),
            count: parseInt(item.withdrawals_count),
            currency: item.currency
        }));
        
        return {
            data,
            xField: 'month',
            yField: 'count',
            seriesField: 'currency',
            color: ['#722ed1', '#fa8c16']
        };
    };
    
    // ===============================================
    // 📋 CONFIGURAÇÃO DAS TABELAS
    // ===============================================
    
    const getUsersTableColumns = [
        {
            title: 'Usuário',
            dataIndex: 'user_id',
            key: 'user_id',
            render: (userId) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserOutlined />
                    <Text code>{userId.substr(0, 8)}...</Text>
                </div>
            )
        },
        {
            title: 'Total Saques',
            dataIndex: 'total_withdrawals',
            key: 'total_withdrawals',
            sorter: (a, b) => a.total_withdrawals - b.total_withdrawals,
            render: (count) => <Tag color="blue">{count}</Tag>
        },
        {
            title: 'Valor Total',
            dataIndex: 'total_withdrawn',
            key: 'total_withdrawn',
            sorter: (a, b) => parseFloat(a.total_withdrawn) - parseFloat(b.total_withdrawn),
            render: (amount, record) => (
                <Text strong>
                    {record.currency === 'BRL' ? 'R$' : '$'} {parseFloat(amount).toFixed(2)}
                </Text>
            )
        },
        {
            title: 'Taxas Pagas',
            dataIndex: 'total_fees_paid',
            key: 'total_fees_paid',
            sorter: (a, b) => parseFloat(a.total_fees_paid) - parseFloat(b.total_fees_paid),
            render: (fees, record) => (
                <Text type="success" strong>
                    {record.currency === 'BRL' ? 'R$' : '$'} {parseFloat(fees).toFixed(2)}
                </Text>
            )
        },
        {
            title: 'Última Transação',
            dataIndex: 'last_withdrawal',
            key: 'last_withdrawal',
            render: (date) => date ? moment(date).format('DD/MM/YYYY HH:mm') : 'Nunca'
        }
    ];
    
    // ===============================================
    // 🖼️ RENDERIZAÇÃO
    // ===============================================
    
    if (loading && !dashboardData) {
        return (
            <div style={{ textAlign: 'center', padding: 50 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                    <Text>Carregando dashboard...</Text>
                </div>
            </div>
        );
    }
    
    return (
        <div style={{ padding: 24 }}>
            {/* Cabeçalho */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2}>
                        <BankOutlined /> Dashboard de Taxas de Saque
                    </Title>
                    <Text type="secondary">
                        Monitoramento e controle das taxas de saque do sistema
                    </Text>
                </Col>
                <Col>
                    <Button 
                        type="primary" 
                        icon={<SettingOutlined />}
                        onClick={() => setConfigModalVisible(true)}
                    >
                        Configurar Taxas
                    </Button>
                </Col>
            </Row>
            
            {/* Filtros */}
            <Card style={{ marginBottom: 24 }}>
                <Row gutter={16} align="middle">
                    <Col>
                        <Text strong>Moeda:</Text>
                    </Col>
                    <Col>
                        <Select
                            value={selectedCurrency}
                            onChange={setSelectedCurrency}
                            style={{ width: 120 }}
                        >
                            <Option value="all">Todas</Option>
                            <Option value="BRL">🇧🇷 BRL</Option>
                            <Option value="USD">🇺🇸 USD</Option>
                        </Select>
                    </Col>
                    <Col>
                        <Text strong>Período:</Text>
                    </Col>
                    <Col>
                        <Select
                            value={selectedPeriod}
                            onChange={setSelectedPeriod}
                            style={{ width: 150 }}
                        >
                            <Option value={3}>3 meses</Option>
                            <Option value={6}>6 meses</Option>
                            <Option value={12}>12 meses</Option>
                            <Option value={24}>24 meses</Option>
                        </Select>
                    </Col>
                    <Col>
                        <Button onClick={loadAllData} loading={loading}>
                            Atualizar
                        </Button>
                    </Col>
                </Row>
            </Card>
            
            {/* Estatísticas Principais */}
            {revenueData?.totals && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {revenueData.totals.map((total, index) => (
                        <Col xs={24} sm={12} md={6} key={index}>
                            <Card>
                                <Statistic
                                    title={`Receita Total ${total.currency}`}
                                    value={total.total_fees}
                                    precision={2}
                                    valueStyle={{ color: '#3f8600' }}
                                    prefix={<TrophyOutlined />}
                                    suffix={total.currency === 'BRL' ? 'BRL' : 'USD'}
                                />
                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">
                                        {total.total_withdrawals} saques
                                    </Text>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
            
            {/* Configuração Atual de Taxas */}
            {feeConfig && (
                <Card 
                    title="Configuração Atual de Taxas" 
                    style={{ marginBottom: 24 }}
                    extra={
                        <Button 
                            type="link" 
                            icon={<SettingOutlined />}
                            onClick={() => setConfigModalVisible(true)}
                        >
                            Editar
                        </Button>
                    }
                >
                    <Row gutter={16}>
                        {Object.entries(feeConfig).map(([currency, config]) => (
                            <Col xs={24} sm={12} key={currency}>
                                <Card size="small" style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 24, marginBottom: 8 }}>
                                        {currency === 'brl' ? '🇧🇷' : '🇺🇸'}
                                    </div>
                                    <Statistic
                                        title={`Taxa ${config.currency}`}
                                        value={config.fee_amount}
                                        precision={2}
                                        prefix={config.currency === 'BRL' ? 'R$' : '$'}
                                    />
                                    <div style={{ marginTop: 8 }}>
                                        <Button 
                                            size="small" 
                                            type="link"
                                            icon={<EditOutlined />}
                                            onClick={() => handleEditConfig(currency)}
                                        >
                                            Editar
                                        </Button>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}
            
            {/* Gráficos */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={12}>
                    <Card title="Receita com Taxas" extra={<RiseOutlined />}>
                        {getRevenueChartConfig() && <Line {...getRevenueChartConfig()} />}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Volume de Saques" extra={<CalendarOutlined />}>
                        {getWithdrawalsChartConfig() && <Column {...getWithdrawalsChartConfig()} />}
                    </Card>
                </Col>
            </Row>
            
            {/* Tabela de Usuários */}
            {dashboardData?.users && (
                <Card title="Usuários por Volume de Saques">
                    <Table
                        dataSource={dashboardData.users}
                        columns={getUsersTableColumns}
                        rowKey="user_id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => 
                                `${range[0]}-${range[1]} de ${total} usuários`
                        }}
                        loading={loading}
                    />
                </Card>
            )}
            
            {/* Modal de Configuração */}
            <Modal
                title="Configurar Taxa de Saque"
                visible={configModalVisible}
                onCancel={() => {
                    setConfigModalVisible(false);
                    form.resetFields();
                    setEditingConfig(null);
                }}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSaveConfig}
                >
                    <Form.Item
                        name="currency"
                        label="Moeda"
                        rules={[{ required: true, message: 'Selecione a moeda' }]}
                    >
                        <Select placeholder="Selecione a moeda">
                            <Option value="BRL">🇧🇷 Real (BRL)</Option>
                            <Option value="USD">🇺🇸 Dólar (USD)</Option>
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                        name="fee_amount"
                        label="Valor da Taxa"
                        rules={[
                            { required: true, message: 'Digite o valor da taxa' },
                            { type: 'number', min: 0, message: 'Valor deve ser positivo' }
                        ]}
                    >
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 10.00"
                            addonBefore={editingConfig?.currency === 'BRL' ? 'R$' : '$'}
                        />
                    </Form.Item>
                    
                    <Alert
                        message="Atenção"
                        description="A alteração da taxa será aplicada imediatamente a todos os novos saques."
                        type="warning"
                        style={{ marginBottom: 16 }}
                    />
                    
                    <Row gutter={8}>
                        <Col span={12}>
                            <Button 
                                block
                                onClick={() => {
                                    setConfigModalVisible(false);
                                    form.resetFields();
                                }}
                            >
                                Cancelar
                            </Button>
                        </Col>
                        <Col span={12}>
                            <Button type="primary" htmlType="submit" block>
                                Salvar
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminWithdrawalFeesDashboard;
