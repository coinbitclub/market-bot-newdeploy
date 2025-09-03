/**
 * 📝 CENTRALIZED LOGGING SYSTEM
 * 
 * Sistema de logging enterprise com níveis e formatação
 */

const fs = require('fs').promises;
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        
        this.currentLevel = options.level || 'INFO';
        this.logDir = options.logDir || path.join(process.cwd(), 'logs');
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile !== false;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        
        this.ensureLogDirectory();
    }

    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            // Directory already exists
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.currentLevel];
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const formatted = {
            timestamp,
            level,
            message,
            ...meta
        };
        return JSON.stringify(formatted, null, 2);
    }

    async writeToFile(level, formattedMessage) {
        if (!this.enableFile) return;
        
        const filename = `${level.toLowerCase()}-${new Date().toISOString().split('T')[0]}.log`;
        const filepath = path.join(this.logDir, filename);
        
        try {
            await fs.appendFile(filepath, formattedMessage + '\n');
        } catch (error) {
            console.error('Erro ao escrever log no arquivo:', error);
        }
    }

    writeToConsole(level, formattedMessage) {
        if (!this.enableConsole) return;
        
        const colors = {
            ERROR: '\x1b[31m', // Red
            WARN: '\x1b[33m',  // Yellow
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[35m', // Magenta
            TRACE: '\x1b[37m'  // White
        };
        
        const reset = '\x1b[0m';
        const colorCode = colors[level] || '';
        
        console.log(`${colorCode}${formattedMessage}${reset}`);
    }

    async log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        const formattedMessage = this.formatMessage(level, message, meta);
        
        // Escrever no console
        this.writeToConsole(level, formattedMessage);
        
        // Escrever no arquivo
        await this.writeToFile(level, formattedMessage);
    }

    error(message, meta = {}) {
        return this.log('ERROR', message, meta);
    }

    warn(message, meta = {}) {
        return this.log('WARN', message, meta);
    }

    info(message, meta = {}) {
        return this.log('INFO', message, meta);
    }

    debug(message, meta = {}) {
        return this.log('DEBUG', message, meta);
    }

    trace(message, meta = {}) {
        return this.log('TRACE', message, meta);
    }

    // Criar logger específico para módulo
    createModuleLogger(moduleName) {
        return {
            error: (message, meta = {}) => this.error(message, { module: moduleName, ...meta }),
            warn: (message, meta = {}) => this.warn(message, { module: moduleName, ...meta }),
            info: (message, meta = {}) => this.info(message, { module: moduleName, ...meta }),
            debug: (message, meta = {}) => this.debug(message, { module: moduleName, ...meta }),
            trace: (message, meta = {}) => this.trace(message, { module: moduleName, ...meta })
        };
    }
}

// Logger global
const logger = new Logger({
    level: process.env.LOG_LEVEL || 'INFO',
    enableConsole: true,
    enableFile: true
});

module.exports = { Logger, logger };
