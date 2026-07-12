const GeminiAPI = (function () {
    function getApiKey() {
        return 'server_managed';
    }

    function setApiKey(key) {
        // No-op on client side
    }

    function hasApiKey() {
        return true;
    }

    async function summarize(text, type) {
        var response = await fetch('/api/gemini/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, type: type })
        });

        if (!response.ok) {
            var errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            var errorMsg = (errorData.error) || 'API request failed';
            throw new Error(errorMsg);
        }

        var data = await response.json();
        return data.text;
    }

    return {
        getApiKey: getApiKey,
        setApiKey: setApiKey,
        hasApiKey: hasApiKey,
        summarize: summarize
    };
})();
