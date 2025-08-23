/**
 * 💰 ENDPOINT DE DEMONSTRAÇÃO DE SALDOS
 * ===================================
 * Adicionar ao app.js para demonstração via API
 */

// ADICIONAR AO APP.JS - ENDPOINT PARA DEMONSTRAÇÃO DE SALDOS
app.get('/api/demo/saldos', async (req, res) => {
    try {
        console.log('🚀 INICIANDO DEMONSTRAÇÃO DE SALDOS VIA API');
        
        // 1. Verificar conexões de usuários
        const usuarios = await pool.query(`
            SELECT 
                u.id, u.username, u.email,
                COUNT(uak.id) as total_chaves,
                COUNT(CASE WHEN uak.validation_status = 'CONNECTED' THEN 1 END) as chaves_conectadas
            FROM users u
            LEFT JOIN user_api_keys uak ON u.id = uak.user_id AND uak.is_active = true
            WHERE u.is_active = true
            GROUP BY u.id, u.username, u.email
            ORDER BY u.username
        `);

        console.log(`👥 Encontrados ${usuarios.rows.length} usuários`);

        // 2. Obter chaves ativas
        const chaves = await pool.query(`
            SELECT 
                u.username,
                uak.exchange,
                uak.environment,
                uak.validation_status,
                uak.last_validated_at
            FROM users u
            JOIN user_api_keys uak ON u.id = uak.user_id
            WHERE u.is_active = true AND uak.is_active = true
            ORDER BY u.username, uak.exchange
        `);

        console.log(`🔑 Encontradas ${chaves.rows.length} chaves de API`);

        // 3. Simular coleta de saldos
        const saldosSimulados = [];
        let totalGeralUSD = 0;

        for (const chave of chaves.rows) {
            const saldoSimulado = {
                usuario: chave.username,
                exchange: chave.exchange,
                environment: chave.environment,
                status: chave.validation_status || 'PENDING',
                saldos: {
                    totalUSD: Math.random() * 5000 + 100, // Valor simulado
                    moedas: [
                        { 
                            moeda: 'USDT', 
                            saldo: Math.random() * 2000 + 500,
                            valorUSD: Math.random() * 2000 + 500
                        },
                        { 
                            moeda: 'BTC', 
                            saldo: Math.random() * 0.1 + 0.01,
                            valorUSD: Math.random() * 4500 + 500
                        }
                    ]
                },
                timestamp: new Date()
            };
            
            totalGeralUSD += saldoSimulado.saldos.totalUSD;
            saldosSimulados.push(saldoSimulado);
        }

        // 4. Gerar relatório
        const relatorio = {
            demonstracao: true,
            timestamp: new Date(),
            resumo: {
                totalUsuarios: usuarios.rows.length,
                totalChaves: chaves.rows.length,
                totalUSD: totalGeralUSD,
                mediaUSDPorUsuario: totalGeralUSD / usuarios.rows.length || 0
            },
            usuarios: usuarios.rows,
            saldosColetados: saldosSimulados,
            proximos_passos: [
                'Validar chaves de API em tempo real',
                'Implementar coleta automática de saldos',
                'Configurar alertas de saldo baixo',
                'Gerar relatórios periódicos'
            ]
        };

        console.log('✅ DEMONSTRAÇÃO CONCLUÍDA');
        console.log(`💰 Total simulado: $${totalGeralUSD.toFixed(2)}`);

        res.json({
            success: true,
            message: 'Demonstração de levantamento de saldos executada com sucesso',
            data: relatorio
        });

    } catch (error) {
        console.error('❌ Erro na demonstração:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erro na demonstração de saldos',
            details: error.message
        });
    }
});

// ENDPOINT PARA COLETA REAL DE SALDOS
app.post('/api/saldos/coletar', async (req, res) => {
    try {
        const saldosReais = await obterSaldoIntegrado();
        res.json({
            success: true,
            message: 'Saldos coletados em tempo real',
            data: saldosReais
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro na coleta de saldos',
            details: error.message
        });
    }
});
