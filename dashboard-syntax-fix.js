const fs = require('fs');
const path = require('path');

// Corrigir problemas de sintaxe no dashboard-completo.js
const dashboardFile = path.join(__dirname, 'dashboard-completo.js');
let content = fs.readFileSync(dashboardFile, 'utf8');

console.log('🔧 CORRIGINDO PROBLEMAS DE SINTAXE NO DASHBOARD...\n');

// 1. Escapar template literals dentro de JavaScript do cliente que está dentro de template strings do servidor
console.log('✅ Escapando template literals em JavaScript do cliente...');

// Corrigir linha 1948 e adjacentes - esta é uma função JavaScript que está dentro de um template string HTML
content = content.replace(
    /return `\s*<tr>\s*<td>#\$\{index \+ 1\}/g,
    'return \\`<tr><td>#\\${index + 1}'
);

// Corrigir todos os ${} dentro do JavaScript do cliente que estão em template strings do servidor
content = content.replace(
    /(\s+)(return\s+`[^`]*)\$\{([^}]+)\}/g,
    '$1$2\\${$3}'
);

// 2. Verificar se há template strings mal fechadas
const templateMatches = content.match(/return\s*`[^`]*$/gm);
if (templateMatches) {
    console.log('⚠️  Template strings possivelmente mal fechadas encontradas');
    templateMatches.forEach((match, index) => {
        console.log(`   ${index + 1}: ${match.substring(0, 50)}...`);
    });
}

// 3. Salvar o arquivo corrigido
fs.writeFileSync(dashboardFile, content, 'utf8');

console.log('\n✅ CORREÇÕES APLICADAS COM SUCESSO!');
console.log('📝 Arquivo dashboard-completo.js atualizado');

// 4. Verificar se ainda há erros de sintaxe
try {
    require(dashboardFile);
    console.log('✅ Verificação de sintaxe: APROVADO');
} catch (error) {
    console.log('❌ Ainda há problemas de sintaxe:', error.message);
    console.log('📍 Linha aproximada:', error.stack?.match(/(\d+):\d+/)?.[1] || 'Desconhecida');
}

module.exports = 'Correções aplicadas';
