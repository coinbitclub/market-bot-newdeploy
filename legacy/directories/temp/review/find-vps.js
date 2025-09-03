#!/usr/bin/env node

/**
 * DETECTOR AUTOMÁTICO DE VPS DIGITALOCEAN
 * Busca todos os droplets e mostra IPs
 */

const axios = require('axios');

async function findAllDroplets() {
    const token = process.argv[2];
    
    if (!token) {
        console.log('❌ PRECISO DO TOKEN DIGITALOCEAN');
        console.log('📝 Como usar:');
        console.log('   node find-vps.js dop_v1_SEU_TOKEN_AQUI');
        console.log('');
        console.log('🔑 Obter token em:');
        console.log('   https://cloud.digitalocean.com/account/api/tokens');
        console.log('');
        console.log('🌐 OU acesse manualmente:');
        console.log('   https://cloud.digitalocean.com/droplets');
        return;
    }

    try {
        console.log('🔍 BUSCANDO TODOS OS VPS...');
        console.log('============================');
        console.log('');

        const response = await axios.get('https://api.digitalocean.com/v2/droplets', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const droplets = response.data.droplets;

        if (droplets.length === 0) {
            console.log('❌ Nenhum VPS encontrado!');
            console.log('💡 Crie um VPS primeiro no DigitalOcean');
            return;
        }

        console.log(`✅ Encontrados ${droplets.length} VPS(s):`);
        console.log('');

        droplets.forEach((droplet, index) => {
            const ipv4 = droplet.networks.v4.find(network => network.type === 'public');
            const ipv4_address = ipv4 ? ipv4.ip_address : 'Não encontrado';
            
            console.log(`📡 VPS #${index + 1}:`);
            console.log(`   Nome: ${droplet.name}`);
            console.log(`   Status: ${droplet.status}`);
            console.log(`   IP IPv4: ${ipv4_address}`);
            console.log(`   Região: ${droplet.region.name}`);
            console.log(`   Criado: ${new Date(droplet.created_at).toLocaleString()}`);
            console.log('');

            // Se encontrou IP válido, gerar comandos
            if (ipv4_address !== 'Não encontrado' && droplet.status === 'active') {
                console.log(`🚀 COMANDOS PARA CONFIGURAR (${droplet.name}):`);
                console.log(`   ssh root@${ipv4_address}`);
                console.log(`   wget -O setup.sh https://bit.ly/coinbit-proxy-setup`);
                console.log(`   chmod +x setup.sh`);
                console.log(`   ./setup.sh`);
                console.log('');
                console.log(`🧪 TESTE FINAL:`);
                console.log(`   curl http://${ipv4_address}/proxy-health`);
                console.log('');
                console.log(`🎯 IP PARA EXCHANGES: ${ipv4_address}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('');
            }
        });

        // Procurar especificamente por VPS relacionado ao CoinBitClub
        const coinbitVPS = droplets.find(d => 
            d.name.toLowerCase().includes('coinbit') || 
            d.name.toLowerCase().includes('proxy') ||
            d.name.toLowerCase().includes('trading')
        );

        if (coinbitVPS) {
            const ipv4 = coinbitVPS.networks.v4.find(network => network.type === 'public');
            if (ipv4) {
                console.log('🎯 VPS DETECTADO PARA COINBITCLUB:');
                console.log(`   IP: ${ipv4.ip_address}`);
                console.log(`   Status: ${coinbitVPS.status}`);
                
                // Salvar configuração
                const config = {
                    vps_name: coinbitVPS.name,
                    vps_ip: ipv4.ip_address,
                    vps_status: coinbitVPS.status,
                    railway_url: 'https://coinbitclub-backend.railway.app',
                    detected_at: new Date().toISOString()
                };
                
                require('fs').writeFileSync('detected-vps.json', JSON.stringify(config, null, 2));
                console.log('💾 Configuração salva em: detected-vps.json');
            }
        }

    } catch (error) {
        console.log('❌ ERRO AO BUSCAR VPS:');
        console.log(`   ${error.message}`);
        
        if (error.response && error.response.status === 401) {
            console.log('🔑 Token inválido ou expirado!');
            console.log('   Gere um novo em: https://cloud.digitalocean.com/account/api/tokens');
        }
    }
}

findAllDroplets();
