/**
 * 📚 OPENAPI CONFIGURATION - T1 Implementation
 * Configuração Swagger/OpenAPI para documentação automática
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

class OpenApiConfig {
    constructor() {
        this.options = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'CoinBitClub Enterprise API',
                    version: '6.0.0',
                    description: 'API completa do sistema de trading CoinBitClub Enterprise',
                    contact: {
                        name: 'CoinBitClub Enterprise Team',
                        email: 'dev@coinbitclub.com'
                    }
                },
                servers: [
                    {
                        url: process.env.API_BASE_URL || 'http://localhost:3333',
                        description: 'Servidor de desenvolvimento'
                    }
                ],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    },
                    schemas: {
                        Error: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    description: 'Mensagem de erro'
                                },
                                code: {
                                    type: 'string',
                                    description: 'Código do erro'
                                }
                            }
                        },
                        HealthCheck: {
                            type: 'object',
                            properties: {
                                ok: {
                                    type: 'boolean',
                                    description: 'Status de saúde do sistema'
                                },
                                ts: {
                                    type: 'string',
                                    format: 'date-time',
                                    description: 'Timestamp da verificação'
                                },
                                version: {
                                    type: 'string',
                                    description: 'Versão do sistema'
                                }
                            }
                        }
                    }
                }
            },
            apis: [
                './src/routes/*.js',
                './src/apps/*.js',
                './src/api/**/*.js',
                './routes/*.js'
            ]
        };

        this.specs = swaggerJsdoc(this.options);
    }

    /**
     * 🔧 Middleware Swagger UI
     */
    getSwaggerUiMiddleware() {
        return swaggerUi.setup(this.specs, {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'CoinBitClub Enterprise API'
        });
    }

    /**
     * 📄 Servir arquivos Swagger UI
     */
    getSwaggerUiServe() {
        return swaggerUi.serve;
    }

    /**
     * 📋 Obter especificações OpenAPI
     */
    getSpecs() {
        return this.specs;
    }

    /**
     * 💾 Exportar OpenAPI para arquivo JSON
     */
    exportToFile() {
        try {
            const outputPath = path.join(process.cwd(), 'specs', 'api', 'openapi.json');
            
            // Garantir que o diretório existe
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Escrever arquivo
            fs.writeFileSync(outputPath, JSON.stringify(this.specs, null, 2));
            
            console.log(`✅ OpenAPI exportado para: ${outputPath}`);
            return outputPath;
        } catch (error) {
            console.error('❌ Erro ao exportar OpenAPI:', error.message);
            throw error;
        }
    }
}

module.exports = new OpenApiConfig();