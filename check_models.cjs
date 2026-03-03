const https = require('https');

https.get('https://openrouter.ai/api/v1/models', (resp) => {
  let data = '';
  resp.on('data', (chunk) => {
    data += chunk;
  });
  resp.on('end', () => {
    const models = JSON.parse(data).data;
    const seed = models.filter(m => m.name.toLowerCase().includes('seed') || m.id.toLowerCase().includes('seed'));
    console.log("Seedream models:", JSON.stringify(seed, null, 2));

    const allImageModelsByModality = models.filter(m => m.architecture?.output_modalities && m.architecture.output_modalities.includes("image"));
    console.log("\nImage models by modality count:", allImageModelsByModality.length);
    console.log("Example modality model:", allImageModelsByModality[0]?.id);
    
    // Check if there are other indicators for image models
    // e.g. "pricing.image" is present?
    const hasImagePricing = models.filter(m => m.pricing && typeof m.pricing.image !== 'undefined');
    console.log("\nModels with pricing.image count:", hasImagePricing.length);
    console.log("First 3:", hasImagePricing.slice(0, 3).map(m => m.id));
  });
});
