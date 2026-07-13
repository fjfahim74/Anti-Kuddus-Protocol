// netlify/functions/summarize.js
//
// Server-side proxy for the AI Study Assistant.
// The API key NEVER touches the browser — it is read from Netlify's
// environment variables (Site settings > Environment variables) and used
// only here, on the server.
//
// Set this in Netlify:
//   GEMINI_API_KEY = <your real key>
//
// Get a free key at https://aistudio.google.com/apikey

// 'gemini-flash-latest' is Google's auto-updating alias for their current
// GA flash model, so this won't silently break again when a specific
// dated model (like gemini-2.5-flash) gets deprecated. If you want a
// pinned, more predictable version instead, use 'gemini-3.5-flash'.
const MODEL = 'gemini-flash-latest';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';

const PROMPTS = {
    bullet: 'Summarize the following study material as clear, well-organized bullet points. Group related points under short headings where useful.',
    brief: 'Write a brief, concise summary of the following study material in 3-5 sentences.',
    detailed: 'Write detailed, structured study notes covering the following material. Use headings and sub-points where helpful.',
    qa: 'Turn the following study material into a set of question-and-answer pairs that would help someone review for a test.',
    explain: "Explain the following study material in very simple terms, as if explaining it to a 12-year-old. Use everyday language and simple examples."
};

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return respond(405, { error: 'Method not allowed' });
    }

    var apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        apiKey = apiKey.trim().replace(/^["']|["']$/g, ''); // strip accidental quotes/whitespace
    }
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set in the environment');
        return respond(500, { error: 'AI assistant is not configured on the server yet.' });
    }
    // Safe debug log — only length and first/last 2 chars, never the full key.
    // Check this in Netlify: Functions tab > summarize > real-time logs.
    console.log('GEMINI_API_KEY loaded: length=' + apiKey.length +
        ' starts=' + apiKey.slice(0, 2) + ' ends=' + apiKey.slice(-2));

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return respond(400, { error: 'Invalid request body' });
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const type = typeof body.type === 'string' ? body.type : 'bullet';

    if (!text) {
        return respond(400, { error: 'No content provided to summarize.' });
    }
    if (text.length < 20) {
        return respond(400, { error: 'Please provide more content for a meaningful summary.' });
    }
    if (text.length > 20000) {
        return respond(400, { error: 'Content is too long. Please shorten it and try again.' });
    }

    const instruction = PROMPTS[type] || PROMPTS.bullet;

    try {
        const aiResponse = await fetch(GEMINI_URL + '?key=' + encodeURIComponent(apiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: 'You are a helpful study assistant for students. Follow the requested format exactly and keep the response focused on the provided material only.' }]
                },
                contents: [
                    { role: 'user', parts: [{ text: instruction + '\n\n---\n\n' + text }] }
                ],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 1500
                }
            })
        });

        const data = await safeJson(aiResponse);

        if (!aiResponse.ok) {
            const upstreamMsg = data && data.error && data.error.message;
            console.error('Gemini error:', aiResponse.status, upstreamMsg);

            if (aiResponse.status === 401 || aiResponse.status === 403) {
                return respond(403, { error: 'The AI assistant is temporarily unavailable. Please try again later.' });
            }
            if (aiResponse.status === 429) {
                return respond(429, { error: 'API rate limit reached. Please wait a moment and try again.' });
            }
            if (aiResponse.status >= 500) {
                return respond(502, { error: 'The AI assistant is temporarily unavailable. Please try again later.' });
            }
            return respond(400, { error: upstreamMsg || 'The AI request was invalid. Please try again.' });
        }

        const candidate = data && data.candidates && data.candidates[0];
        const finishReason = candidate && candidate.finishReason;
        const parts = candidate && candidate.content && candidate.content.parts;
        const outputText = parts && parts.map(function (p) { return p.text || ''; }).join('').trim();

        if (!outputText) {
            if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
                return respond(400, { error: 'This content could not be summarized. Try different content.' });
            }
            return respond(500, { error: 'No response generated. Try with different content.' });
        }

        return respond(200, { text: outputText });
    } catch (err) {
        console.error('Unexpected error calling Gemini:', err);
        return respond(500, { error: 'Something went wrong on our end. Please try again.' });
    }
};

async function safeJson(response) {
    try {
        return await response.json();
    } catch (e) {
        return null;
    }
}

function respond(statusCode, bodyObj) {
    return {
        statusCode: statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
    };
}
