const utils = require('@iobroker/adapter-core');
const axios = require('axios');

class FrankfurtBoerse extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'frankfurt-boerse' });
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        // Ersten Durchlauf starten
        await this.updateData();
        
        // Intervall einrichten
        const intervall = parseInt(this.config.intervall) || 10;
        this.updateInterval = setInterval(() => this.updateData(), intervall * 60000);
    }

    async updateData() {
        const aktien = this.config.aktienListe;
        if (!aktien || !Array.isArray(aktien)) {
            this.log.info('Keine Aktien in der Liste konfiguriert.');
            return;
        }

        for (const eintrag of aktien) {
            const symbol = eintrag.symbol;
            if (!symbol) continue;

            // Pfad mit Unterordner "Aktien"
            const dpName = `Aktien.kurs_${symbol.replace('.', '_')}`;

            // Datenpunkt im Unterordner erstellen
            await this.setObjectNotExistsAsync(dpName, {
                type: 'state',
                common: {
                    name: `Kurs ${symbol}`,
                    type: 'number',
                    role: 'value.price',
                    unit: 'EUR',
                    read: true,
                    write: false
                },
                native: {},
            });

            this.fetchPrice(symbol, dpName);
        }
    }

    async fetchPrice(symbol, dpName) {
        try {
            const url = `https://yahoo.com{symbol}`;
            const response = await axios.get(url);
            
            if (response.data && response.data.chart && response.data.chart.result) {
                const price = response.data.chart.result[0].meta.regularMarketPrice;
                this.setState(dpName, { val: price, ack: true });
                this.log.debug(`Update für ${symbol}: ${price} EUR`);
            }
        } catch (e) {
            this.log.error(`Fehler beim Abrufen von ${symbol}: ${e.message}`);
        }
    }

    onUnload(callback) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        callback();
    }
}

if (require.main === module) {
    new FrankfurtBoerse();
} else {
    module.exports = FrankfurtBoerse;
}
