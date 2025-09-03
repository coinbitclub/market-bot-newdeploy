#!/usr/bin/env node
/**
 * 🔄 RESTAURADOR DE BACKUPS FASE 1
 * =================================
 * 
 * Restaura todos os arquivos originais antes das otimizações
 * 
 * Data: 03/09/2025
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 RESTAURANDO ARQUIVOS ORIGINAIS...');

const backupMappings = [
    {
        backup: 'src/modules/trading/executors/order-execution-engine.js.backup.1756910460105',
        original: 'src/modules/trading/executors/order-execution-engine.js'
    },
    {
        backup: 'src/modules/trading/processors/multi-user-signal-processor.js.backup.1756910460091',
        original: 'src/modules/trading/processors/multi-user-signal-processor.js'
    },
    {
        backup: 'src/modules/trading/processors/enhanced-signal-processor.js.backup.1756910460096',
        original: 'src/modules/trading/processors/enhanced-signal-processor.js'
    },
    {
        backup: 'src/services/orchestration/integrador-executores.js.backup.1756910460100',
        original: 'src/services/orchestration/integrador-executores.js'
    },
    {
        backup: 'scripts/trading/real-trading-executor.js.backup.1756910460085',
        original: 'scripts/trading/real-trading-executor.js'
    },
    {
        backup: 'scripts/trading/trading-performance-optimizer.js.backup.1756910460109',
        original: 'scripts/trading/trading-performance-optimizer.js'
    }
];

let restored = 0;
let errors = 0;

backupMappings.forEach(({ backup, original }) => {
    try {
        if (fs.existsSync(backup)) {
            const backupContent = fs.readFileSync(backup, 'utf8');
            fs.writeFileSync(original, backupContent, 'utf8');
            console.log(`✅ Restaurado: ${original}`);
            restored++;
        } else {
            console.log(`⚠️ Backup não encontrado: ${backup}`);
        }
    } catch (error) {
        console.error(`❌ Erro ao restaurar ${original}:`, error.message);
        errors++;
    }
});

console.log('\n📊 RELATÓRIO DE RESTAURAÇÃO:');
console.log(`✅ Arquivos restaurados: ${restored}`);
console.log(`❌ Erros encontrados: ${errors}`);

if (errors === 0) {
    console.log('\n✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('🎯 Todos os arquivos foram restaurados ao estado original');
} else {
    console.log('\n⚠️ RESTAURAÇÃO PARCIAL');
    console.log('🔧 Alguns arquivos podem precisar de atenção manual');
}
