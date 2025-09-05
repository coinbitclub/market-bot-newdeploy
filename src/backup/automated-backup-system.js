/**
 * 💾 AUTOMATED BACKUP SYSTEM - SISTEMA DE BACKUP AUTOMATIZADO
 * =============================================================
 * 
 * Sistema inteligente de backup com múltiplas estratégias
 * Backup incremental, S3, agendamento e verificação de integridade
 * 
 * @author CoinBitClub Enterprise Team
 * @version 6.0.0 Advanced
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const AWS = require('aws-sdk');
const cron = require('node-cron');

class AutomatedBackupSystem {
    constructor(options = {}) {
        this.config = {
            enabled: process.env.BACKUP_ENABLED === 'true',
            interval: process.env.BACKUP_INTERVAL || 'daily',
            retention: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
            localPath: process.env.BACKUP_LOCATION || path.join(process.cwd(), 'backups'),
            compression: options.compression !== false,
            encryption: options.encryption !== false,
            s3Enabled: !!(process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID),
            ...options
        };

        this.backupTypes = {
            database: true,
            files: true,
            logs: true,
            config: true
        };

        this.stats = {
            totalBackups: 0,
            successfulBackups: 0,
            failedBackups: 0,
            lastBackup: null,
            totalSize: 0
        };

        this.setupS3();
        this.ensureBackupDirectory();
        this.scheduleBackups();

        console.log('💾 Automated Backup System inicializado');
        console.log(`📅 Intervalo: ${this.config.interval} | Retenção: ${this.config.retention} dias`);
        console.log(`☁️ S3: ${this.config.s3Enabled ? 'Habilitado' : 'Desabilitado'}`);
    }

    /**
     * ☁️ Configurar S3
     */
    setupS3() {
        if (this.config.s3Enabled) {
            this.s3 = new AWS.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || 'us-east-1'
            });
            
            this.s3Bucket = process.env.AWS_S3_BUCKET;
            console.log(`☁️ S3 configurado: ${this.s3Bucket}`);
        }
    }

    /**
     * 📁 Garantir diretório de backup
     */
    ensureBackupDirectory() {
        if (!fs.existsSync(this.config.localPath)) {
            fs.mkdirSync(this.config.localPath, { recursive: true });
            console.log(`📁 Diretório de backup criado: ${this.config.localPath}`);
        }
    }

    /**
     * ⏰ Agendar backups automáticos
     */
    scheduleBackups() {
        if (!this.config.enabled) {
            console.log('⏰ Backups automáticos desabilitados');
            return;
        }

        let cronExpression;
        
        switch (this.config.interval) {
            case 'hourly':
                cronExpression = '0 * * * *'; // A cada hora
                break;
            case 'daily':
                cronExpression = '0 2 * * *'; // Diariamente às 2h
                break;
            case 'weekly':
                cronExpression = '0 2 * * 0'; // Domingos às 2h
                break;
            default:
                cronExpression = '0 2 * * *'; // Default: diário
        }

        cron.schedule(cronExpression, async () => {
            console.log('⏰ Iniciando backup automático...');
            await this.performFullBackup();
        });

        console.log(`⏰ Backup agendado: ${cronExpression} (${this.config.interval})`);
    }

    /**
     * 🎯 Realizar backup completo
     */
    async performFullBackup() {
        const backupId = this.generateBackupId();
        const backupDir = path.join(this.config.localPath, backupId);
        
        try {
            console.log(`🎯 Iniciando backup completo: ${backupId}`);
            
            fs.mkdirSync(backupDir, { recursive: true });
            
            const backupManifest = {
                id: backupId,
                timestamp: new Date().toISOString(),
                type: 'full',
                components: [],
                files: [],
                checksums: {},
                size: 0,
                duration: 0
            };

            const startTime = Date.now();

            // Backup do banco de dados
            if (this.backupTypes.database) {
                console.log('🗄️ Fazendo backup do banco de dados...');
                const dbBackup = await this.backupDatabase(backupDir);
                if (dbBackup.success) {
                    backupManifest.components.push('database');
                    backupManifest.files.push(dbBackup.file);
                    backupManifest.checksums[dbBackup.file] = dbBackup.checksum;
                    backupManifest.size += dbBackup.size;
                }
            }

            // Backup de arquivos críticos
            if (this.backupTypes.files) {
                console.log('📁 Fazendo backup de arquivos...');
                const filesBackup = await this.backupFiles(backupDir);
                if (filesBackup.success) {
                    backupManifest.components.push('files');
                    backupManifest.files.push(...filesBackup.files);
                    Object.assign(backupManifest.checksums, filesBackup.checksums);
                    backupManifest.size += filesBackup.size;
                }
            }

            // Backup de logs
            if (this.backupTypes.logs) {
                console.log('📝 Fazendo backup de logs...');
                const logsBackup = await this.backupLogs(backupDir);
                if (logsBackup.success) {
                    backupManifest.components.push('logs');
                    backupManifest.files.push(logsBackup.file);
                    backupManifest.checksums[logsBackup.file] = logsBackup.checksum;
                    backupManifest.size += logsBackup.size;
                }
            }

            // Backup de configurações
            if (this.backupTypes.config) {
                console.log('⚙️ Fazendo backup de configurações...');
                const configBackup = await this.backupConfig(backupDir);
                if (configBackup.success) {
                    backupManifest.components.push('config');
                    backupManifest.files.push(configBackup.file);
                    backupManifest.checksums[configBackup.file] = configBackup.checksum;
                    backupManifest.size += configBackup.size;
                }
            }

            const endTime = Date.now();
            backupManifest.duration = endTime - startTime;

            // Salvar manifest
            const manifestPath = path.join(backupDir, 'manifest.json');
            fs.writeFileSync(manifestPath, JSON.stringify(backupManifest, null, 2));

            // Comprimir backup
            if (this.config.compression) {
                console.log('🗜️ Comprimindo backup...');
                await this.compressBackup(backupDir);
            }

            // Upload para S3
            if (this.config.s3Enabled) {
                console.log('☁️ Enviando para S3...');
                await this.uploadToS3(backupDir, backupId);
            }

            // Atualizar estatísticas
            this.stats.totalBackups++;
            this.stats.successfulBackups++;
            this.stats.lastBackup = new Date().toISOString();
            this.stats.totalSize += backupManifest.size;

            console.log(`✅ Backup completo: ${backupId} (${this.formatBytes(backupManifest.size)})`);

            // Limpeza de backups antigos
            await this.cleanupOldBackups();

            return {
                success: true,
                backupId,
                manifest: backupManifest
            };

        } catch (error) {
            this.stats.failedBackups++;
            console.error(`❌ Erro no backup ${backupId}:`, error.message);
            
            // Limpar backup falho
            if (fs.existsSync(backupDir)) {
                fs.rmSync(backupDir, { recursive: true });
            }

            return {
                success: false,
                error: error.message,
                backupId
            };
        }
    }

    /**
     * 🗄️ Backup do banco de dados
     */
    async backupDatabase(backupDir) {
        return new Promise((resolve) => {
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filename = `database_${timestamp}.sql`;
            const filepath = path.join(backupDir, filename);

            const pgDump = spawn('pg_dump', [
                '--host', process.env.DB_MASTER_HOST || 'localhost',
                '--port', process.env.DB_MASTER_PORT || '5432',
                '--username', process.env.POSTGRES_USER || 'postgres',
                '--dbname', process.env.POSTGRES_DB || 'trading',
                '--no-password',
                '--verbose',
                '--clean',
                '--if-exists',
                '--file', filepath
            ], {
                env: {
                    ...process.env,
                    PGPASSWORD: process.env.POSTGRES_PASSWORD
                }
            });

            pgDump.on('close', (code) => {
                if (code === 0 && fs.existsSync(filepath)) {
                    const stats = fs.statSync(filepath);
                    const checksum = this.calculateChecksum(filepath);
                    
                    resolve({
                        success: true,
                        file: filename,
                        size: stats.size,
                        checksum
                    });
                } else {
                    resolve({
                        success: false,
                        error: `pg_dump exited with code ${code}`
                    });
                }
            });

            pgDump.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });
        });
    }

    /**
     * 📁 Backup de arquivos críticos
     */
    async backupFiles(backupDir) {
        const criticalPaths = [
            'src/',
            'config/',
            'package.json',
            'package-lock.json',
            '.env.production.example'
        ];

        const filesDir = path.join(backupDir, 'files');
        fs.mkdirSync(filesDir, { recursive: true });

        const files = [];
        const checksums = {};
        let totalSize = 0;

        for (const srcPath of criticalPaths) {
            const fullPath = path.join(process.cwd(), srcPath);
            
            if (fs.existsSync(fullPath)) {
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    await this.copyDirectory(fullPath, path.join(filesDir, srcPath));
                } else {
                    const destPath = path.join(filesDir, path.basename(srcPath));
                    fs.copyFileSync(fullPath, destPath);
                    
                    const checksum = this.calculateChecksum(destPath);
                    files.push(path.basename(srcPath));
                    checksums[path.basename(srcPath)] = checksum;
                    totalSize += stat.size;
                }
            }
        }

        return {
            success: true,
            files,
            checksums,
            size: totalSize
        };
    }

    /**
     * 📝 Backup de logs
     */
    async backupLogs(backupDir) {
        const logsDir = path.join(process.cwd(), 'logs');
        
        if (!fs.existsSync(logsDir)) {
            return { success: false, error: 'Logs directory not found' };
        }

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `logs_${timestamp}.tar.gz`;
        const filepath = path.join(backupDir, filename);

        return new Promise((resolve) => {
            const tar = spawn('tar', [
                '-czf', filepath,
                '-C', process.cwd(),
                'logs/'
            ]);

            tar.on('close', (code) => {
                if (code === 0 && fs.existsSync(filepath)) {
                    const stats = fs.statSync(filepath);
                    const checksum = this.calculateChecksum(filepath);
                    
                    resolve({
                        success: true,
                        file: filename,
                        size: stats.size,
                        checksum
                    });
                } else {
                    resolve({
                        success: false,
                        error: `tar exited with code ${code}`
                    });
                }
            });

            tar.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });
        });
    }

    /**
     * ⚙️ Backup de configurações
     */
    async backupConfig(backupDir) {
        const configFiles = [
            'docker-compose.yml',
            'docker-compose.production.yml',
            'Dockerfile',
            '.env.production.example'
        ];

        const configDir = path.join(backupDir, 'config');
        fs.mkdirSync(configDir, { recursive: true });

        let totalSize = 0;
        const files = [];

        for (const file of configFiles) {
            const srcPath = path.join(process.cwd(), file);
            if (fs.existsSync(srcPath)) {
                const destPath = path.join(configDir, file);
                fs.copyFileSync(srcPath, destPath);
                
                const stats = fs.statSync(destPath);
                totalSize += stats.size;
                files.push(file);
            }
        }

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `config_${timestamp}.tar.gz`;
        const filepath = path.join(backupDir, filename);

        return new Promise((resolve) => {
            const tar = spawn('tar', [
                '-czf', filepath,
                '-C', backupDir,
                'config/'
            ]);

            tar.on('close', (code) => {
                if (code === 0) {
                    // Remover diretório temporário
                    fs.rmSync(configDir, { recursive: true });
                    
                    const stats = fs.statSync(filepath);
                    const checksum = this.calculateChecksum(filepath);
                    
                    resolve({
                        success: true,
                        file: filename,
                        size: stats.size,
                        checksum
                    });
                } else {
                    resolve({
                        success: false,
                        error: `tar exited with code ${code}`
                    });
                }
            });
        });
    }

    /**
     * 🗜️ Comprimir backup
     */
    async compressBackup(backupDir) {
        const backupName = path.basename(backupDir);
        const parentDir = path.dirname(backupDir);
        const compressedFile = path.join(parentDir, `${backupName}.tar.gz`);

        return new Promise((resolve) => {
            const tar = spawn('tar', [
                '-czf', compressedFile,
                '-C', parentDir,
                backupName
            ]);

            tar.on('close', (code) => {
                if (code === 0) {
                    // Remover diretório não comprimido
                    fs.rmSync(backupDir, { recursive: true });
                    resolve({ success: true, file: compressedFile });
                } else {
                    resolve({ success: false, error: `tar exited with code ${code}` });
                }
            });
        });
    }

    /**
     * ☁️ Upload para S3
     */
    async uploadToS3(backupDir, backupId) {
        if (!this.config.s3Enabled) return;

        const files = fs.readdirSync(backupDir);
        
        for (const file of files) {
            const filePath = path.join(backupDir, file);
            const key = `backups/${backupId}/${file}`;
            
            const fileStream = fs.createReadStream(filePath);
            
            const uploadParams = {
                Bucket: this.s3Bucket,
                Key: key,
                Body: fileStream,
                ServerSideEncryption: 'AES256'
            };

            try {
                await this.s3.upload(uploadParams).promise();
                console.log(`☁️ Arquivo enviado para S3: ${key}`);
            } catch (error) {
                console.error(`❌ Erro ao enviar ${file} para S3:`, error.message);
            }
        }
    }

    /**
     * 🧹 Limpeza de backups antigos
     */
    async cleanupOldBackups() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);

        // Limpeza local
        const backups = fs.readdirSync(this.config.localPath);
        
        for (const backup of backups) {
            const backupPath = path.join(this.config.localPath, backup);
            const stats = fs.statSync(backupPath);
            
            if (stats.mtime < cutoffDate) {
                if (stats.isDirectory()) {
                    fs.rmSync(backupPath, { recursive: true });
                } else {
                    fs.unlinkSync(backupPath);
                }
                console.log(`🧹 Backup antigo removido: ${backup}`);
            }
        }

        // Limpeza S3
        if (this.config.s3Enabled) {
            try {
                const objects = await this.s3.listObjectsV2({
                    Bucket: this.s3Bucket,
                    Prefix: 'backups/'
                }).promise();

                const objectsToDelete = objects.Contents.filter(obj => 
                    obj.LastModified < cutoffDate
                );

                if (objectsToDelete.length > 0) {
                    const deleteParams = {
                        Bucket: this.s3Bucket,
                        Delete: {
                            Objects: objectsToDelete.map(obj => ({ Key: obj.Key }))
                        }
                    };

                    await this.s3.deleteObjects(deleteParams).promise();
                    console.log(`🧹 ${objectsToDelete.length} backups antigos removidos do S3`);
                }
            } catch (error) {
                console.error('❌ Erro na limpeza do S3:', error.message);
            }
        }
    }

    /**
     * 🔍 Verificar integridade do backup
     */
    async verifyBackup(backupId) {
        const backupDir = path.join(this.config.localPath, backupId);
        const manifestPath = path.join(backupDir, 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
            return { valid: false, error: 'Manifest not found' };
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const issues = [];

        for (const file of manifest.files) {
            const filePath = path.join(backupDir, file);
            
            if (!fs.existsSync(filePath)) {
                issues.push(`File missing: ${file}`);
                continue;
            }

            const currentChecksum = this.calculateChecksum(filePath);
            const expectedChecksum = manifest.checksums[file];

            if (currentChecksum !== expectedChecksum) {
                issues.push(`Checksum mismatch: ${file}`);
            }
        }

        return {
            valid: issues.length === 0,
            issues,
            manifest
        };
    }

    /**
     * 🔑 Calcular checksum
     */
    calculateChecksum(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    /**
     * 📁 Copiar diretório recursivamente
     */
    async copyDirectory(src, dest) {
        fs.mkdirSync(dest, { recursive: true });
        
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    /**
     * 🆔 Gerar ID único para backup
     */
    generateBackupId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = crypto.randomBytes(4).toString('hex');
        return `backup_${timestamp}_${random}`;
    }

    /**
     * 📊 Formatar bytes
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 📊 Obter estatísticas
     */
    getStats() {
        const backups = fs.existsSync(this.config.localPath) 
            ? fs.readdirSync(this.config.localPath)
            : [];

        return {
            ...this.stats,
            localBackups: backups.length,
            config: {
                enabled: this.config.enabled,
                interval: this.config.interval,
                retention: this.config.retention,
                s3Enabled: this.config.s3Enabled,
                compression: this.config.compression
            },
            successRate: this.stats.totalBackups > 0 
                ? ((this.stats.successfulBackups / this.stats.totalBackups) * 100).toFixed(2) + '%'
                : '0%',
            averageSize: this.stats.successfulBackups > 0 
                ? this.formatBytes(this.stats.totalSize / this.stats.successfulBackups)
                : '0 B'
        };
    }

    /**
     * 🔌 Parar sistema de backup
     */
    stop() {
        console.log('💾 Automated Backup System parado');
    }
}

module.exports = AutomatedBackupSystem;
