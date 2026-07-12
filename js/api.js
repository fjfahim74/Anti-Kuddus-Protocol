const GeminiAPI = (function () {
    var BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    function getApiKey() {
        var config = Storage.get('config') || {};
        return config.geminiApiKey || '';
    }

    function setApiKey(key) {
        var config = Storage.get('config') || {};
        config.geminiApiKey = key;
        Storage.set('config', config);
    }

    function hasApiKey() {
        return !!getApiKey();
    }

    function buildPrompt(text, type) {
        var prompts = {
            bullet: 'Summarize the following study material into clear, concise bullet points. Group related points under headings. Focus on key concepts, definitions, and important facts:\n\n',
            brief: 'Write a brief summary (3-5 paragraphs) of the following study material. Cover the main ideas and key takeaways:\n\n',
            detailed: 'Create detailed study notes from the following material. Include:\n- Key concepts and definitions\n- Important facts and figures\n- Relationships between ideas\n- Examples where helpful\nFormat with clear headings and subheadings:\n\n',
            qa: 'Convert the following study material into a Q&A format. Create 8-12 important questions and answers that cover the key concepts. Format as:\n\n**Q: [question]**\nA: [answer]\n\nMaterial:\n\n',
            explain: 'Explain the following study material in simple language that a 12-year-old student can understand. Use everyday examples and analogies. Avoid jargon:\n\n'
        };

        return (prompts[type] || prompts.bullet) + text;
    }

    async function summarize(text, type) {
        var apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('API key not set. Please enter your Gemini API key.');
        }

        var prompt = buildPrompt(text, type);

        var response = await fetch(BASE_URL + '?key=' + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            var errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            var errorMsg = (errorData.error && errorData.error.message) || 'API request failed';

            if (response.status === 400) throw new Error('Invalid API key. Please check and try again.');
            if (response.status === 429) throw new Error('API rate limit reached. Please wait a moment and try again.');
            if (response.status === 403) throw new Error('API key does not have access. Please verify your key.');

            throw new Error(errorMsg);
        }

        var data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('No response generated. Try with different content.');
        }

        return data.candidates[0].content.parts[0].text;
    }

    return {
        getApiKey: getApiKey,
        setApiKey: setApiKey,
        hasApiKey: hasApiKey,
        summarize: summarize
    };
})();
