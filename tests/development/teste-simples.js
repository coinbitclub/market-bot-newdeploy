console.log("🔍 TESTE SIMPLES BYBIT");
console.log("Iniciando...");

const axios = require('axios');
const crypto = require('crypto');

console.log("Módulos carregados OK");

// Teste básico
async function testeSimples() {
    try {
        console.log("Fazendo teste básico...");
        const response = await axios.get('https://api.bybit.com/v5/market/time', { timeout: 5000 });
        console.log("✅ Conectividade OK:", response.data);
        console.log("✅ Teste concluído com sucesso!");
    } catch (error) {
        console.log("❌ Erro:", error.message);
    }
}

testeSimples();
