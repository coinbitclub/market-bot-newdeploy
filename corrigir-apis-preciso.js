// 🔧 CORREÇÃO PRECISA DAS APIS DO DASHBOARD
const fs = require('fs');

function corrigirAPIsPreciso() {
    console.log('🔧 CORREÇÃO PRECISA DAS APIs DO DASHBOARD');
    console.log('========================================');
    
    const arquivo = 'dashboard-completo.js';
    let conteudo = fs.readFileSync(arquivo, 'utf8');
    
    // 1. Corrigir getDecissoesIA - substituir query que usa operadores JSON incorretos
    console.log('1️⃣ Corrigindo getDecissoesIA...');
    
    const queryDecissoesIAProblematica = /sm\.ai_decision->>'shouldExecute'/g;
    if (queryDecissoesIAProblematica.test(conteudo)) {
        conteudo = conteudo.replace(queryDecissoesIAProblematica, 'sm.ai_approved');
        console.log('   ✅ Operador JSON ->shouldExecute substituído');
    }
    
    const queryDecissoesIAProblematica2 = /sm\.ai_decision->>'analysis'/g;
    if (queryDecissoesIAProblematica2.test(conteudo)) {
        conteudo = conteudo.replace(queryDecissoesIAProblematica2, 'sm.ai_reason');
        console.log('   ✅ Operador JSON ->analysis substituído');
    }
    
    const queryDecissoesIAProblematica3 = /sm\.ai_decision->>'confidence'/g;
    if (queryDecissoesIAProblematica3.test(conteudo)) {
        conteudo = conteudo.replace(queryDecissoesIAProblematica3, 'sm.confidence');
        console.log('   ✅ Operador JSON ->confidence substituído');
    }
    
    const queryDecissoesIAProblematica4 = /sm\.ai_decision->>'isStrongSignal'/g;
    if (queryDecissoesIAProblematica4.test(conteudo)) {
        conteudo = conteudo.replace(queryDecissoesIAProblematica4, 'sm.is_strong_signal');
        console.log('   ✅ Operador JSON ->isStrongSignal substituído');
    }
    
    // 2. Corrigir problemas de JOIN na query de decisões IA
    console.log('2️⃣ Corrigindo JOINs problemáticos...');
    
    const joinProblematico = /JOIN signal_metrics_log sm ON ts\.symbol = sm\.symbol AND ABS\(EXTRACT\(EPOCH FROM \(ts\.created_at - sm\.received_at\)\)\) < 60/g;
    if (joinProblematico.test(conteudo)) {
        conteudo = conteudo.replace(joinProblematico, '-- JOIN removido, usando apenas signal_metrics_log\nFROM signal_metrics_log sm\nWHERE sm.processed_at IS NOT NULL');
        console.log('   ✅ JOIN problemático removido');
    }
    
    // 3. Remover referências a trading_signals na query de decisões IA
    const referenciaTS = /FROM trading_signals ts/g;
    if (referenciaTS.test(conteudo)) {
        conteudo = conteudo.replace(referenciaTS, 'FROM signal_metrics_log sm');
        console.log('   ✅ Referência a trading_signals removida');
    }
    
    const referenciaTS2 = /ts\.id as signal_id,/g;
    if (referenciaTS2.test(conteudo)) {
        conteudo = conteudo.replace(referenciaTS2, 'sm.id as signal_id,');
        console.log('   ✅ Referência ts.id corrigida');
    }
    
    const referenciaTS3 = /ts\.signal,/g;
    if (referenciaTS3.test(conteudo)) {
        conteudo = conteudo.replace(referenciaTS3, 'sm.signal_data as signal,');
        console.log('   ✅ Referência ts.signal corrigida');
    }
    
    const referenciaTS4 = /ts\.symbol,/g;
    if (referenciaTS4.test(conteudo)) {
        conteudo = conteudo.replace(referenciaTS4, 'sm.symbol,');
        console.log('   ✅ Referência ts.symbol corrigida');
    }
    
    const referenciaTS5 = /ts\.created_at as signal_time,/g;
    if (referenciaTS5.test(conteudo)) {
        conteudo = conteudo.replace(referenciaTS5, 'sm.received_at as signal_time,');
        console.log('   ✅ Referência ts.created_at corrigida');
    }
    
    // 4. Corrigir problemas de campo na query de usuários
    console.log('3️⃣ Corrigindo campos de usuários...');
    
    const campoAdminCredits = /u\.admin_credits_brl,/g;
    if (campoAdminCredits.test(conteudo)) {
        conteudo = conteudo.replace(campoAdminCredits, 'u.balance_admin_brl,');
        console.log('   ✅ Campo admin_credits_brl corrigido');
    }
    
    const campoAdminCredits2 = /u\.admin_credits_usd,/g;
    if (campoAdminCredits2.test(conteudo)) {
        conteudo = conteudo.replace(campoAdminCredits2, 'u.balance_admin_usd,');
        console.log('   ✅ Campo admin_credits_usd corrigido');
    }
    
    // 5. Remover outros operadores JSON problemáticos
    console.log('4️⃣ Removendo operadores JSON restantes...');
    
    const operadorJSON1 = /sm\.market_direction->>'allowed'/g;
    if (operadorJSON1.test(conteudo)) {
        conteudo = conteudo.replace(operadorJSON1, 'sm.market_direction');
        console.log('   ✅ Operador market_direction->allowed corrigido');
    }
    
    // Salvar arquivo
    fs.writeFileSync(arquivo, conteudo, 'utf8');
    console.log('✅ CORREÇÕES APLICADAS COM SUCESSO!');
}

corrigirAPIsPreciso();
