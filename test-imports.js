console.log('🧪 Teste de importação dos módulos...');

try {
    console.log('1. Testando Fear & Greed...');
    const FearGreedCollector = require('./coletor-fear-greed-coinstats.js');
    console.log('✅ Fear & Greed OK');
} catch (error) {
    console.log('❌ Fear & Greed erro:', error.message);
}

try {
    console.log('2. Testando Top 100...');
    const BinanceTop100Collector = require('./binance-top100-collector.js');
    console.log('✅ Top 100 OK');
} catch (error) {
    console.log('❌ Top 100 erro:', error.message);
}

try {
    console.log('3. Testando Coletor Saldos...');
    const BalanceCollectorModule = require('./coletor-saldos-automatico.js');
    console.log('✅ Coletor Saldos OK');
} catch (error) {
    console.log('❌ Coletor Saldos erro:', error.message);
}

try {
    console.log('4. Testando Águia News...');
    const AguiaModule = require('./aguia-news-gratuito.js');
    console.log('✅ Águia News OK');
} catch (error) {
    console.log('❌ Águia News erro:', error.message);
}

try {
    console.log('5. Testando Monitoring...');
    const MonitoringModule = require('./automatic-monitoring-system.js');
    console.log('✅ Monitoring OK');
} catch (error) {
    console.log('❌ Monitoring erro:', error.message);
}

console.log('🎯 Teste de importação concluído!');
