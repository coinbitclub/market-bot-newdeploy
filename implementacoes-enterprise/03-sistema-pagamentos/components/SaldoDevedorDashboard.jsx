import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Alert,
    AlertDescription,
    Button,
    Badge,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Label,
    Textarea
} from '@/components/ui';
import { AlertTriangle, DollarSign, RefreshCw, UserX, CheckCircle } from 'lucide-react';

const SaldoDevedorDashboard = () => {
    const [debtData, setDebtData] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showForgiveDialog, setShowForgiveDialog] = useState(false);
    const [forgiveReason, setForgiveReason] = useState('');

    useEffect(() => {
        loadDebtDashboard();
    }, []);

    const loadDebtDashboard = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/debt/admin/debt-dashboard');
            const data = await response.json();
            
            if (data.success) {
                setDebtData(data.dashboard);
                setStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Erro ao carregar dashboard de dívidas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleForgiveDebt = async (userId) => {
        try {
            const response = await fetch('/api/debt/admin/forgive-debt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    reason: forgiveReason || 'Perdão administrativo'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                setShowForgiveDialog(false);
                setForgiveReason('');
                setSelectedUser(null);
                loadDebtDashboard(); // Recarregar dados
                
                alert('Dívida perdoada com sucesso!');
            } else {
                alert('Erro ao perdoar dívida: ' + result.error);
            }
        } catch (error) {
            console.error('Erro ao perdoar dívida:', error);
            alert('Erro interno do servidor');
        }
    };

    const formatCurrency = (amount, currency = 'BRL') => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency === 'BRL' ? 'BRL' : 'USD'
        }).format(amount || 0);
    };

    const getDebtSeverity = (debtBRL, debtUSD) => {
        const total = (debtBRL || 0) + (debtUSD || 0);
        if (total > 1000) return 'high';
        if (total > 100) return 'medium';
        return 'low';
    };

    const DebtSeverityBadge = ({ debtBRL, debtUSD }) => {
        const severity = getDebtSeverity(debtBRL, debtUSD);
        const colors = {
            high: 'bg-red-100 text-red-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-blue-100 text-blue-800'
        };
        
        return (
            <Badge className={colors[severity]}>
                {severity === 'high' ? 'Alto' : severity === 'medium' ? 'Médio' : 'Baixo'}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <RefreshCw className="animate-spin mr-2" />
                Carregando dashboard de dívidas...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Dashboard de Saldos Devedores</h1>
                <Button onClick={loadDebtDashboard} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <UserX className="h-8 w-8 text-red-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Usuários com Dívida</p>
                                <p className="text-2xl font-bold">{statistics.usuarios_com_divida || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <DollarSign className="h-8 w-8 text-green-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Dívida BRL</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(statistics.total_divida_brl, 'BRL')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <DollarSign className="h-8 w-8 text-blue-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Dívida USD</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(statistics.total_divida_usd, 'USD')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center">
                            <AlertTriangle className="h-8 w-8 text-orange-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Usuários Bloqueados</p>
                                <p className="text-2xl font-bold">{statistics.usuarios_bloqueados || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerta de Sistema */}
            {(statistics.usuarios_com_divida > 10 || statistics.total_divida_brl > 5000) && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Atenção:</strong> Há um número elevado de usuários com dívidas pendentes. 
                        Considere revisar as políticas de cobrança ou implementar campanhas de recuperação.
                    </AlertDescription>
                </Alert>
            )}

            {/* Tabela de Usuários com Dívida */}
            <Card>
                <CardHeader>
                    <CardTitle>Usuários com Saldo Devedor</CardTitle>
                </CardHeader>
                <CardContent>
                    {debtData.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Saldo Atual</TableHead>
                                    <TableHead>Dívida Pendente</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Última Compensação</TableHead>
                                    <TableHead>Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debtData.map((user) => (
                                    <TableRow key={user.user_id}>
                                        <TableCell className="font-medium">
                                            {user.username}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div>{formatCurrency(user.balance_brl, 'BRL')}</div>
                                                <div className="text-sm text-gray-500">
                                                    {formatCurrency(user.balance_usd, 'USD')}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="text-red-600 font-medium">
                                                    {formatCurrency(user.saldo_devedor_brl, 'BRL')}
                                                </div>
                                                <div className="text-red-500 text-sm">
                                                    {formatCurrency(user.saldo_devedor_usd, 'USD')}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <DebtSeverityBadge 
                                                    debtBRL={user.saldo_devedor_brl}
                                                    debtUSD={user.saldo_devedor_usd}
                                                />
                                                {user.operacoes_bloqueadas && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Bloqueado
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.ultima_compensacao ? (
                                                <span className="text-sm text-gray-500">
                                                    {new Date(user.ultima_compensacao).toLocaleDateString('pt-BR')}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">Nunca</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowForgiveDialog(true);
                                                    }}
                                                >
                                                    Perdoar Dívida
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8">
                            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                            <p className="text-lg font-medium">Nenhum usuário com dívida pendente</p>
                            <p className="text-gray-500">Todos os usuários estão com saldos em dia!</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog para Perdoar Dívida */}
            <Dialog open={showForgiveDialog} onOpenChange={setShowForgiveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Perdoar Dívida</DialogTitle>
                    </DialogHeader>
                    
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium">Usuário: {selectedUser.username}</h4>
                                <p className="text-sm text-gray-600">Email: {selectedUser.email}</p>
                                <div className="mt-2">
                                    <p className="text-sm">
                                        <strong>Dívida BRL:</strong> {formatCurrency(selectedUser.saldo_devedor_brl, 'BRL')}
                                    </p>
                                    <p className="text-sm">
                                        <strong>Dívida USD:</strong> {formatCurrency(selectedUser.saldo_devedor_usd, 'USD')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Motivo do Perdão</Label>
                                <Textarea
                                    id="reason"
                                    value={forgiveReason}
                                    onChange={(e) => setForgiveReason(e.target.value)}
                                    placeholder="Descreva o motivo para perdoar esta dívida..."
                                    rows={3}
                                />
                            </div>

                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Atenção:</strong> Esta ação irá zerar completamente a dívida do usuário 
                                    e desbloquear suas operações. Esta ação não pode ser desfeita.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowForgiveDialog(false);
                                setForgiveReason('');
                                setSelectedUser(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={() => handleForgiveDebt(selectedUser?.user_id)}
                            disabled={!forgiveReason.trim()}
                        >
                            Confirmar Perdão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SaldoDevedorDashboard;
