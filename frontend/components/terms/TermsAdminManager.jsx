/**
 * ===============================================
 * ⚛️ COMPONENTE: Gerenciador de Termos (Admin)
 * ===============================================
 * Arquivo: TermsAdminManager.jsx
 * Versão: 1.0.0
 * Data: 2025-08-22
 * 
 * 🎯 FUNCIONALIDADES:
 * ✅ Criar novas versões de termos
 * ✅ Ativar/desativar versões
 * ✅ Dashboard de compliance
 * ✅ Relatórios de aceite
 * ✅ Gestão administrativa completa
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Grid,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Tooltip
} from '@mui/material';
import {
    Add,
    Edit,
    CheckCircle,
    RadioButtonUnchecked,
    Visibility,
    Assessment,
    Download,
    Refresh
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const TermsAdminManager = () => {
    // ===============================================
    // 🔄 ESTADOS DO COMPONENTE
    // ===============================================
    
    const [loading, setLoading] = useState(true);
    const [currentTab, setCurrentTab] = useState(0);
    const [versions, setVersions] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [complianceReport, setComplianceReport] = useState(null);
    
    // Modal de criação
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createData, setCreateData] = useState({
        version: '',
        title: '',
        termsContent: '',
        privacyPolicy: '',
        effectiveDate: new Date()
    });
    
    // Estados de controle
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [processing, setProcessing] = useState(false);
    
    // ===============================================
    // 🚀 EFFECTS E INICIALIZAÇÃO
    // ===============================================
    
    useEffect(() => {
        loadInitialData();
    }, []);
    
    useEffect(() => {
        if (currentTab === 1) {
            loadComplianceReport();
        }
    }, [currentTab]);
    
    // ===============================================
    // 📥 CARREGAR DADOS INICIAIS
    // ===============================================
    
    const loadInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadVersions(),
                loadDashboard()
            ]);
        } catch (error) {
            console.error('❌ Erro ao carregar dados iniciais:', error);
            setError('Erro ao carregar dados. Tente recarregar a página.');
        } finally {
            setLoading(false);
        }
    };
    
    const loadVersions = async () => {
        const response = await axios.get('/api/terms/admin/versions', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data.success) {
            setVersions(response.data.data.versions);
        }
    };
    
    const loadDashboard = async () => {
        const response = await axios.get('/api/terms/dashboard', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.data.success) {
            setDashboard(response.data.data);
        }
    };
    
    const loadComplianceReport = async () => {
        try {
            const response = await axios.get('/api/terms/admin/compliance-report', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.data.success) {
                setComplianceReport(response.data.data);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar relatório:', error);
        }
    };
    
    // ===============================================
    // ➕ CRIAR NOVA VERSÃO
    // ===============================================
    
    const handleCreateVersion = async () => {
        try {
            setProcessing(true);
            setError(null);
            
            const response = await axios.post('/api/terms/admin/create-version', createData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.data.success) {
                setSuccess('Nova versão criada com sucesso!');
                setCreateModalOpen(false);
                resetCreateData();
                await loadVersions();
            } else {
                throw new Error(response.data.error);
            }
            
        } catch (error) {
            setError(error.response?.data?.error || 'Erro ao criar versão');
        } finally {
            setProcessing(false);
        }
    };
    
    const resetCreateData = () => {
        setCreateData({
            version: '',
            title: '',
            termsContent: '',
            privacyPolicy: '',
            effectiveDate: new Date()
        });
    };
    
    // ===============================================
    // 🔄 ATIVAR VERSÃO
    // ===============================================
    
    const handleActivateVersion = async (versionId) => {
        try {
            setProcessing(true);
            setError(null);
            
            const response = await axios.put(`/api/terms/admin/activate/${versionId}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.data.success) {
                setSuccess('Versão ativada com sucesso!');
                await Promise.all([loadVersions(), loadDashboard()]);
            } else {
                throw new Error(response.data.error);
            }
            
        } catch (error) {
            setError(error.response?.data?.error || 'Erro ao ativar versão');
        } finally {
            setProcessing(false);
        }
    };
    
    // ===============================================
    // 🎨 COMPONENTE: Dashboard de Estatísticas
    // ===============================================
    
    const DashboardTab = () => (
        <Grid container spacing={3}>
            {/* Cards de Estatísticas */}
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="primary">
                            👥 Total de Usuários
                        </Typography>
                        <Typography variant="h4">
                            {dashboard?.statistics?.totalUsers || 0}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="success.main">
                            ✅ Aceites Válidos
                        </Typography>
                        <Typography variant="h4">
                            {dashboard?.statistics?.usersAccepted || 0}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="warning.main">
                            ⏳ Pendentes
                        </Typography>
                        <Typography variant="h4">
                            {dashboard?.statistics?.usersNeedAcceptance || 0}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="info.main">
                            📊 Taxa de Compliance
                        </Typography>
                        <Typography variant="h4">
                            {dashboard?.statistics?.complianceRate || 0}%
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            
            {/* Tabela de Versões */}
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">📋 Versões de Termos</Typography>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setCreateModalOpen(true)}
                        >
                            Nova Versão
                        </Button>
                    </Box>
                    
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Versão</TableCell>
                                    <TableCell>Título</TableCell>
                                    <TableCell>Data Efetiva</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Aceites</TableCell>
                                    <TableCell>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {versions.map((version) => (
                                    <TableRow key={version.id}>
                                        <TableCell>
                                            <Typography variant="subtitle2">
                                                {version.version}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{version.title}</TableCell>
                                        <TableCell>
                                            {new Date(version.effective_date).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={version.is_active ? 'Ativa' : 'Inativa'}
                                                color={version.is_active ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {version.acceptance_count} aceites
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                {!version.is_active && (
                                                    <Tooltip title="Ativar versão">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleActivateVersion(version.id)}
                                                            disabled={processing}
                                                        >
                                                            <CheckCircle />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Visualizar">
                                                    <IconButton size="small">
                                                        <Visibility />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Grid>
            
            {/* Aceites Recentes */}
            {dashboard?.recentAcceptances?.length > 0 && (
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            🕒 Aceites Recentes
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Usuário</TableCell>
                                        <TableCell>Versão</TableCell>
                                        <TableCell>Data/Hora</TableCell>
                                        <TableCell>IP</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dashboard.recentAcceptances.map((acceptance, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{acceptance.email}</TableCell>
                                            <TableCell>{acceptance.version}</TableCell>
                                            <TableCell>
                                                {new Date(acceptance.accepted_at).toLocaleString('pt-BR')}
                                            </TableCell>
                                            <TableCell>{acceptance.ip_address}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            )}
        </Grid>
    );
    
    // ===============================================
    // 🎨 COMPONENTE: Relatório de Compliance
    // ===============================================
    
    const ComplianceTab = () => (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">📊 Relatório de Compliance</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={loadComplianceReport}
                    >
                        Atualizar
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Download />}
                    >
                        Exportar CSV
                    </Button>
                </Box>
            </Box>
            
            {complianceReport && (
                <Grid container spacing={3}>
                    {/* Resumo */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                📈 Resumo do Período
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2" color="text.secondary">
                                        Total de Versões
                                    </Typography>
                                    <Typography variant="h6">
                                        {complianceReport.summary?.totalVersions || 0}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2" color="text.secondary">
                                        Total de Aceites
                                    </Typography>
                                    <Typography variant="h6">
                                        {complianceReport.summary?.totalAcceptances || 0}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2" color="text.secondary">
                                        Usuários Únicos
                                    </Typography>
                                    <Typography variant="h6">
                                        {complianceReport.summary?.uniqueUsers || 0}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                    
                    {/* Detalhes por Versão */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                📋 Detalhes por Versão
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Versão</TableCell>
                                            <TableCell>Data Efetiva</TableCell>
                                            <TableCell>Total Aceites</TableCell>
                                            <TableCell>Usuários Únicos</TableCell>
                                            <TableCell>Primeiro Aceite</TableCell>
                                            <TableCell>Último Aceite</TableCell>
                                            <TableCell>Tempo Médio (h)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {complianceReport.details?.map((detail, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Typography variant="subtitle2">
                                                        {detail.version}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(detail.effective_date).toLocaleDateString('pt-BR')}
                                                </TableCell>
                                                <TableCell>{detail.total_acceptances || 0}</TableCell>
                                                <TableCell>{detail.unique_users || 0}</TableCell>
                                                <TableCell>
                                                    {detail.first_acceptance 
                                                        ? new Date(detail.first_acceptance).toLocaleDateString('pt-BR')
                                                        : '-'
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {detail.last_acceptance 
                                                        ? new Date(detail.last_acceptance).toLocaleDateString('pt-BR')
                                                        : '-'
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {detail.avg_hours_to_accept 
                                                        ? `${detail.avg_hours_to_accept}h`
                                                        : '-'
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
    
    // ===============================================
    // 🎨 RENDER PRINCIPAL
    // ===============================================
    
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                    Carregando dados administrativos...
                </Typography>
            </Box>
        );
    }
    
    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Typography variant="h4" sx={{ mb: 3 }}>
                📋 Gestão de Termos e Políticas
            </Typography>
            
            {/* Alerts */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}
            
            {/* Tabs */}
            <Paper sx={{ width: '100%' }}>
                <Tabs 
                    value={currentTab} 
                    onChange={(e, newValue) => setCurrentTab(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab icon={<Assessment />} label="Dashboard" iconPosition="start" />
                    <Tab icon={<CheckCircle />} label="Compliance" iconPosition="start" />
                </Tabs>
                
                <Box sx={{ p: 3 }}>
                    {currentTab === 0 && <DashboardTab />}
                    {currentTab === 1 && <ComplianceTab />}
                </Box>
            </Paper>
            
            {/* Modal de Criação */}
            <Dialog
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>➕ Criar Nova Versão de Termos</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Versão"
                                value={createData.version}
                                onChange={(e) => setCreateData(prev => ({ ...prev, version: e.target.value }))}
                                placeholder="Ex: 2.0.0"
                                helperText="Formato: MAJOR.MINOR.PATCH"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DateTimePicker
                                    label="Data Efetiva"
                                    value={createData.effectiveDate}
                                    onChange={(date) => setCreateData(prev => ({ ...prev, effectiveDate: date }))}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Título"
                                value={createData.title}
                                onChange={(e) => setCreateData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ex: Termos de Uso e Política de Privacidade - CoinBitClub v2.0"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={8}
                                label="Conteúdo dos Termos"
                                value={createData.termsContent}
                                onChange={(e) => setCreateData(prev => ({ ...prev, termsContent: e.target.value }))}
                                placeholder="Digite o conteúdo completo dos termos de uso..."
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={6}
                                label="Política de Privacidade"
                                value={createData.privacyPolicy}
                                onChange={(e) => setCreateData(prev => ({ ...prev, privacyPolicy: e.target.value }))}
                                placeholder="Digite o conteúdo da política de privacidade..."
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateModalOpen(false)}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleCreateVersion}
                        disabled={processing || !createData.version || !createData.title}
                    >
                        {processing ? <CircularProgress size={20} /> : 'Criar Versão'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TermsAdminManager;
