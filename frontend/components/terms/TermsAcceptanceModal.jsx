/**
 * ===============================================
 * ⚛️ COMPONENTE: Modal de Aceite de Termos
 * ===============================================
 * Arquivo: TermsAcceptanceModal.jsx
 * Versão: 1.0.0
 * Data: 2025-08-22
 * 
 * 🎯 FUNCIONALIDADES:
 * ✅ Modal obrigatório para aceite
 * ✅ Exibição dos termos completos
 * ✅ Validação de aceite
 * ✅ Integração com API
 * ✅ Auditoria automática
 */

import React, { useState, useEffect } from 'react';
import { 
    Modal, 
    Box, 
    Typography, 
    Button, 
    Checkbox, 
    FormControlLabel, 
    Paper, 
    Divider,
    Alert,
    CircularProgress,
    Tab,
    Tabs
} from '@mui/material';
import { Check, Close, Article, Security } from '@mui/icons-material';
import axios from 'axios';

const TermsAcceptanceModal = ({ 
    open, 
    onAccept, 
    onClose, 
    userId, 
    mandatory = true 
}) => {
    // ===============================================
    // 🔄 ESTADOS DO COMPONENTE
    // ===============================================
    
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState(null);
    const [accepted, setAccepted] = useState(false);
    const [currentTab, setCurrentTab] = useState(0);
    
    // Dados dos termos
    const [termsData, setTermsData] = useState({
        id: null,
        version: '',
        title: '',
        termsContent: '',
        privacyPolicy: '',
        effectiveDate: null
    });
    
    // ===============================================
    // 🚀 EFFECTS E INICIALIZAÇÃO
    // ===============================================
    
    useEffect(() => {
        if (open) {
            loadCurrentTerms();
        }
    }, [open]);
    
    // ===============================================
    // 📥 CARREGAR TERMOS ATUAIS
    // ===============================================
    
    const loadCurrentTerms = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('📥 Carregando termos atuais...');
            
            const response = await axios.get('/api/terms/current');
            
            if (response.data.success) {
                setTermsData(response.data.data);
                console.log(`✅ Termos carregados: v${response.data.data.version}`);
            } else {
                throw new Error(response.data.error || 'Erro ao carregar termos');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar termos:', error);
            setError('Não foi possível carregar os termos atuais. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };
    
    // ===============================================
    // ✅ REGISTRAR ACEITE
    // ===============================================
    
    const handleAccept = async () => {
        if (!accepted) {
            setError('Você deve aceitar os termos para continuar');
            return;
        }
        
        try {
            setAccepting(true);
            setError(null);
            
            console.log(`✅ Registrando aceite para usuário ${userId}...`);
            
            const response = await axios.post('/api/terms/accept', {
                termsVersionId: termsData.id
            }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.data.success) {
                console.log('✅ Aceite registrado com sucesso!');
                
                // Notificar componente pai
                if (onAccept) {
                    onAccept({
                        accepted: true,
                        version: termsData.version,
                        acceptanceId: response.data.data.acceptanceId
                    });
                }
                
                // Fechar modal após sucesso
                setTimeout(() => {
                    handleClose();
                }, 1000);
                
            } else {
                throw new Error(response.data.error || 'Erro ao registrar aceite');
            }
            
        } catch (error) {
            console.error('❌ Erro ao registrar aceite:', error);
            setError(error.response?.data?.error || 'Erro ao registrar aceite. Tente novamente.');
        } finally {
            setAccepting(false);
        }
    };
    
    // ===============================================
    // 🚪 FECHAR MODAL
    // ===============================================
    
    const handleClose = () => {
        if (mandatory && !accepted) {
            setError('Você deve aceitar os termos para continuar usando a plataforma');
            return;
        }
        
        setAccepted(false);
        setError(null);
        setCurrentTab(0);
        
        if (onClose) {
            onClose();
        }
    };
    
    // ===============================================
    // 📄 FORMATAR CONTEÚDO DOS TERMOS
    // ===============================================
    
    const formatContent = (content) => {
        return content.split('\n').map((paragraph, index) => (
            <Typography 
                key={index} 
                variant="body2" 
                paragraph
                sx={{ 
                    textAlign: 'justify',
                    lineHeight: 1.6,
                    marginBottom: 2
                }}
            >
                {paragraph}
            </Typography>
        ));
    };
    
    // ===============================================
    // 🎨 RENDER DO COMPONENTE
    // ===============================================
    
    return (
        <Modal
            open={open}
            onClose={mandatory ? undefined : handleClose}
            disableEscapeKeyDown={mandatory}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Paper 
                elevation={24}
                sx={{
                    width: '90%',
                    maxWidth: 800,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <Box sx={{ 
                    p: 3, 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    bgcolor: 'primary.main',
                    color: 'white'
                }}>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                        📋 Termos de Uso e Política de Privacidade
                    </Typography>
                    <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
                        {termsData.title}
                    </Typography>
                    {termsData.version && (
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            Versão: {termsData.version} | Vigência: {new Date(termsData.effectiveDate).toLocaleDateString('pt-BR')}
                        </Typography>
                    )}
                </Box>
                
                {/* Loading */}
                {loading && (
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        p: 4
                    }}>
                        <CircularProgress />
                        <Typography variant="body1" sx={{ ml: 2 }}>
                            Carregando termos...
                        </Typography>
                    </Box>
                )}
                
                {/* Error */}
                {error && !loading && (
                    <Alert severity="error" sx={{ m: 2 }}>
                        {error}
                    </Alert>
                )}
                
                {/* Content */}
                {!loading && !error && (
                    <>
                        {/* Tabs */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs 
                                value={currentTab} 
                                onChange={(e, newValue) => setCurrentTab(newValue)}
                                variant="fullWidth"
                            >
                                <Tab 
                                    icon={<Article />} 
                                    label="Termos de Uso" 
                                    iconPosition="start"
                                />
                                <Tab 
                                    icon={<Security />} 
                                    label="Política de Privacidade" 
                                    iconPosition="start"
                                />
                            </Tabs>
                        </Box>
                        
                        {/* Content Area */}
                        <Box sx={{ 
                            flex: 1, 
                            overflow: 'auto', 
                            p: 3,
                            minHeight: 300,
                            maxHeight: 400
                        }}>
                            {currentTab === 0 && (
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                                        📜 Termos de Uso
                                    </Typography>
                                    {formatContent(termsData.termsContent)}
                                </Box>
                            )}
                            
                            {currentTab === 1 && (
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                                        🔒 Política de Privacidade
                                    </Typography>
                                    {formatContent(termsData.privacyPolicy)}
                                </Box>
                            )}
                        </Box>
                        
                        <Divider />
                        
                        {/* Acceptance Area */}
                        <Box sx={{ p: 3 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={accepted}
                                        onChange={(e) => setAccepted(e.target.checked)}
                                        color="primary"
                                        disabled={accepting}
                                    />
                                }
                                label={
                                    <Typography variant="body1">
                                        Li e aceito os <strong>Termos de Uso</strong> e a <strong>Política de Privacidade</strong> da plataforma CoinBitClub
                                    </Typography>
                                }
                                sx={{ mb: 2 }}
                            />
                            
                            {mandatory && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    ⚠️ É obrigatório aceitar os termos para continuar usando a plataforma
                                </Alert>
                            )}
                            
                            {/* Action Buttons */}
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'flex-end', 
                                gap: 2 
                            }}>
                                {!mandatory && (
                                    <Button
                                        variant="outlined"
                                        onClick={handleClose}
                                        startIcon={<Close />}
                                        disabled={accepting}
                                    >
                                        Cancelar
                                    </Button>
                                )}
                                
                                <Button
                                    variant="contained"
                                    onClick={handleAccept}
                                    disabled={!accepted || accepting}
                                    startIcon={accepting ? <CircularProgress size={20} /> : <Check />}
                                    sx={{ minWidth: 150 }}
                                >
                                    {accepting ? 'Processando...' : 'Aceitar Termos'}
                                </Button>
                            </Box>
                        </Box>
                    </>
                )}
            </Paper>
        </Modal>
    );
};

// ===============================================
// 📤 EXPORTAR COMPONENTE
// ===============================================

export default TermsAcceptanceModal;

// Exemplo de uso:
/*
import TermsAcceptanceModal from './components/TermsAcceptanceModal';

function App() {
    const [showTerms, setShowTerms] = useState(false);
    const [user, setUser] = useState(null);
    
    const handleTermsAccept = (acceptanceData) => {
        console.log('Termos aceitos:', acceptanceData);
        // Atualizar estado do usuário
        setUser(prev => ({
            ...prev,
            hasAcceptedTerms: true,
            termsVersion: acceptanceData.version
        }));
    };
    
    return (
        <div>
            <TermsAcceptanceModal
                open={showTerms}
                onAccept={handleTermsAccept}
                onClose={() => setShowTerms(false)}
                userId={user?.id}
                mandatory={true}
            />
        </div>
    );
}
*/
