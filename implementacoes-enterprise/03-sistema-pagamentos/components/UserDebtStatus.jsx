import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Alert,
    AlertDescription,
    Badge,
    Button,
    Progress
} from '@/components/ui';
import { AlertCircle, DollarSign, TrendingDown, Clock, CheckCircle } from 'lucide-react';

const UserDebtStatus = ({ userId }) => {
    const [debtStatus, setDebtStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadDebtStatus();
        }
    }, [userId]);

    const loadDebtStatus = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/debt/debt-status/${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setDebtStatus(data);
            }
        } catch (error) {
            console.error('Erro ao carregar status de dívida:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount, currency = 'BRL') => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency === 'BRL' ? 'BRL' : 'USD'
        }).format(amount || 0);
    };

    const getDebtStatusColor = (hasDebt, isBlocked) => {
        if (isBlocked) return 'text-red-600';
        if (hasDebt) return 'text-orange-600';
        return 'text-green-600';
    };

    const getDebtStatusText = (hasDebt, isBlocked) => {
        if (isBlocked) return 'Operações Bloqueadas';
        if (hasDebt) return 'Dívida Pendente';
        return 'Em Dia';
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!debtStatus) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Não foi possível carregar o status de dívida do usuário.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const { user_status, summary } = debtStatus;

    return (
        <div className="space-y-4">
            {/* Status Principal */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Status Financeiro</span>
                        <Badge 
                            className={getDebtStatusColor(summary.has_pending_debt, summary.operations_blocked)}
                        >
                            {getDebtStatusText(summary.has_pending_debt, summary.operations_blocked)}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Saldo Atual */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Saldo Disponível</h4>
                            <div className="space-y-1">
                                <div className="flex items-center">
                                    <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                                    <span className="text-lg font-semibold">
                                        {formatCurrency(user_status.balance_brl, 'BRL')}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <DollarSign className="w-4 h-4 text-blue-500 mr-2" />
                                    <span className="text-lg font-semibold">
                                        {formatCurrency(user_status.balance_usd, 'USD')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Dívida Pendente */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Dívida Pendente</h4>
                            <div className="space-y-1">
                                <div className="flex items-center">
                                    <TrendingDown className="w-4 h-4 text-red-500 mr-2" />
                                    <span className={`text-lg font-semibold ${summary.total_debt_brl > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                        {formatCurrency(summary.total_debt_brl, 'BRL')}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <TrendingDown className="w-4 h-4 text-red-500 mr-2" />
                                    <span className={`text-lg font-semibold ${summary.total_debt_usd > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                        {formatCurrency(summary.total_debt_usd, 'USD')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alertas */}
                    {summary.operations_blocked && (
                        <Alert className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Operações Bloqueadas:</strong> As operações de trading estão bloqueadas 
                                devido a dívida pendente. Faça uma recarga para compensar automaticamente.
                            </AlertDescription>
                        </Alert>
                    )}

                    {summary.has_pending_debt && !summary.operations_blocked && (
                        <Alert className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Dívida Pendente:</strong> Você possui dívida pendente que será 
                                compensada automaticamente na próxima recarga.
                            </AlertDescription>
                        </Alert>
                    )}

                    {!summary.has_pending_debt && (
                        <Alert className="mt-4 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                <strong>Parabéns!</strong> Você não possui dívidas pendentes e pode operar normalmente.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Histórico de Dívidas */}
            {debtStatus.debt_history.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Dívidas Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {debtStatus.debt_history.slice(0, 5).map((debt) => (
                                <div key={debt.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium">{debt.reason}</p>
                                        <p className="text-sm text-gray-500">
                                            {debt.debt_type} • {new Date(debt.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-red-600">
                                            {debt.amount_brl > 0 && formatCurrency(debt.amount_brl, 'BRL')}
                                            {debt.amount_usd > 0 && formatCurrency(debt.amount_usd, 'USD')}
                                        </p>
                                        <Badge 
                                            variant={debt.status === 'COMPENSATED' ? 'default' : debt.status === 'PENDING' ? 'destructive' : 'secondary'}
                                        >
                                            {debt.status === 'COMPENSATED' ? 'Compensada' : 
                                             debt.status === 'PENDING' ? 'Pendente' : 
                                             debt.status === 'FORGIVEN' ? 'Perdoada' : debt.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Histórico de Compensações */}
            {debtStatus.compensation_history.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Compensações Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {debtStatus.compensation_history.slice(0, 5).map((compensation) => (
                                <div key={compensation.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                                    <div className="flex-1">
                                        <p className="font-medium text-green-800">Compensação Aplicada</p>
                                        <p className="text-sm text-green-600">
                                            Recarga #{compensation.recharge_id} • {new Date(compensation.processed_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-green-600">
                                            {compensation.amount_compensated_brl > 0 && `+${formatCurrency(compensation.amount_compensated_brl, 'BRL')}`}
                                            {compensation.amount_compensated_usd > 0 && `+${formatCurrency(compensation.amount_compensated_usd, 'USD')}`}
                                        </p>
                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                            Compensada
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Informações Sobre o Sistema */}
            <Card>
                <CardHeader>
                    <CardTitle>Como Funciona o Sistema de Saldo Devedor</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-start">
                            <span className="font-medium text-blue-600 mr-2">1.</span>
                            <span>Comissões são cobradas apenas sobre operações com <strong>LUCRO</strong></span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium text-blue-600 mr-2">2.</span>
                            <span>Se não há saldo suficiente para a comissão, é criado um <strong>saldo devedor</strong></span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium text-blue-600 mr-2">3.</span>
                            <span>Na próxima recarga, a dívida é <strong>automaticamente compensada</strong></span>
                        </div>
                        <div className="flex items-start">
                            <span className="font-medium text-blue-600 mr-2">4.</span>
                            <span>Usuários com dívida podem ter operações <strong>temporariamente bloqueadas</strong></span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserDebtStatus;
