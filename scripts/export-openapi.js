#!/usr/bin/env node

/**
 * 📤 EXPORT OPENAPI SCRIPT - T1 Implementation
 * Script para exportar documentação OpenAPI para arquivo JSON
 */

const openApiConfig = require('../src/bootstrap/openapi');
const path = require('path');

console.log('🚀 Exportando documentação OpenAPI...');
console.log('=====================================');

try {
    // Exportar OpenAPI
    const outputPath = openApiConfig.exportToFile();
    
    console.log('\n✅ Export concluído com sucesso!');
    console.log(`📄 Arquivo: ${outputPath}`);
    console.log(`📊 Endpoints documentados: ${Object.keys(openApiConfig.getSpecs().paths || {}).length}`);
    
    // Mostrar estatísticas
    const specs = openApiConfig.getSpecs();
    console.log('\n📋 Estatísticas:');
    console.log(`   • Versão API: ${specs.info?.version || 'N/A'}`);
    console.log(`   • Título: ${specs.info?.title || 'N/A'}`);
    console.log(`   • Servidores: ${specs.servers?.length || 0}`);
    console.log(`   • Schemas: ${Object.keys(specs.components?.schemas || {}).length}`);
    
    process.exit(0);
    
} catch (error) {
    console.error('\n❌ Erro durante o export:');
    console.error(error.message);
    
    if (error.stack) {
        console.error('\n🔍 Stack trace:');
        console.error(error.stack);
    }
    
    process.exit(1);
}