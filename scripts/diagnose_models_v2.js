const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env
const envPath = path.join(__dirname, '.env');
let apiKey = '';
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    // Improved regex to handle optional quotes
    const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\n\r]+)["']?/);
    if (match) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY in .env");
    process.exit(1);
}

console.log(`Using API Key: ${apiKey.substring(0, 5)}...`);

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200) {
            const response = JSON.parse(data);
            console.log("--- AVAILABLE GUIDED MODELS ---");
            if (response.models) {
                response.models.forEach(m => {
                    const name = m.name.replace('models/', '');
                    // Check if it supports generateContent
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(name);
                    }
                });
            } else {
                console.log("No models field in response:", data);
            }
        } else {
            console.error(`Error ${res.statusCode}: ${data}`);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
