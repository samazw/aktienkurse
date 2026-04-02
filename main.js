const utils = require('@iobroker/adapter-core');
const axios = require('axios');

class FrankfurtBoerse extends utils.Adapter {
    constructor(options) {
        super({ ...options, name: 'frankfurt-boerse' });
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.updateData();
        const intervall = parseInt(this.config.intervall) || 10;
        this.updateInterval = setInterval(() => this.updateData(), intervall * 60000);
    }

    async updateData() {
        const aktien = this.config.aktienListe;
        if (!aktien || !Array.isArray(aktien)) return;

        for (const eintrag of aktien) {
            const symbol = eintrag.symbol;
            const dpName = `kurs_${symbol.replace('.', '_')}`;

            await this.setObjectNotExistsAsync(dpName, {
                type: 'state',
                common: { name: `Kurs ${symbol}`, type: 'number', role: 'value.price', unit: 'EUR', read: true, write: false },
                native: {},
            });

            this.fetchPrice(symbol, dpName);
        }
    }

    async fetchPrice(symbol, dpName) {
        try {
            const url = `https://yahoo.com{symbol}`;
            const response = await axios.get(url);
            if (response.data?.chart?.result?.[0]?.meta) {
                const price = response.data.chart.result[0].meta.regularMarketPrice;
                this.setState(dpName, { val: price, ack: true });
            }
        } catch (e) {
            this.log.error(`Fehler bei ${symbol}: ${e.message}`);
        }
    }

    onUnload(callback) {
        clearInterval(this.updateInterval);
        callback();
    }
}

if (require.main === module) { new FrankfurtBoerse(); } else { module.exports = FrankfurtBoerse; }
