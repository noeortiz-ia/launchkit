const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/models',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer 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'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
        const json = JSON.parse(data);
        const models = json.data;
        // Filter for Flux models
        const fluxModels = models.filter(m => m.id.toLowerCase().includes('flux'));
        console.log('Found Flux models:', fluxModels.length);
        
        const output = fluxModels.map(m => ({
            id: m.id,
            name: m.name,
            pricing: m.pricing
        }));
        
        fs.writeFileSync('flux_models.json', JSON.stringify(output, null, 2));
        console.log('Saved to flux_models.json');
    } catch (e) {
        console.error('Error parsing JSON:', e);
        console.log('Raw data:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
