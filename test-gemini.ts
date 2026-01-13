async function testGemini() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.log("No API Key");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const payload = {
        contents: [{ parts: [{ text: "Hello" }] }]
    };

    console.log("Testing Gemini direct fetch...");
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log("Response status:", res.status);
        if (res.status === 404) {
            console.log("404! Trying gemini-pro...");
            const urlPro = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`;
            const resPro = await fetch(urlPro, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const dataPro = await resPro.json();
            console.log("gemini-pro status:", resPro.status);
            console.log("gemini-pro body:", JSON.stringify(dataPro).slice(0, 200));
        } else {
            console.log("Body:", JSON.stringify(data).slice(0, 200));
        }
    } catch (e) {
        console.log("Error:", e);
    }
}

testGemini();
