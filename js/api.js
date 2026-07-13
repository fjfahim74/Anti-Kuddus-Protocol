const GeminiAPI = (function () {
    // No API key here — the request goes to our own Netlify function,
    // which holds the Gemini API key server-side and forwards the request.
    var ENDPOINT = '/api/summarize';

    function hasApiKey() {
        // Key is managed server-side now; assume the backend is configured.
        return true;
    }

    async function summarize(text, type) {
        var response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, type: type })
        });

        var data = {};
        try { data = await response.json(); } catch (e) {}

        if (!response.ok) {
            var errorMsg = data.error || ('API request failed (HTTP ' + response.status + ')');

            if (response.status === 400) throw new Error(errorMsg || 'The AI request was invalid. Please try again.');
            if (response.status === 429) throw new Error('API rate limit reached. Please wait a moment and try again.');
            if (response.status === 403 || response.status === 502) throw new Error('The AI assistant is temporarily unavailable. Please try again later.');
            if (response.status === 500) throw new Error(errorMsg || 'Something went wrong on our end. Please try again.');
            if (response.status === 404) throw new Error('AI backend not found (404) — the Netlify function isn\'t deployed or /api routing isn\'t working. See netlify/functions/ping.js to diagnose.');

            throw new Error(errorMsg);
        }

        if (!data.text) {
            throw new Error('No response generated. Try with different content.');
        }

        return data.text;
    }

    return {
        hasApiKey: hasApiKey,
        summarize: summarize
    };
})();
