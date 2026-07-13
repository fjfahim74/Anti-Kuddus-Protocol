// netlify/functions/ping.js
//
// Health-check only. Visit this directly in your browser after deploying:
//   https://YOUR-SITE.netlify.app/.netlify/functions/ping   <- tests functions are deployed
//   https://YOUR-SITE.netlify.app/api/ping                  <- tests the /api/* redirect works
//
// If the first URL works but the second doesn't, netlify.toml's redirect isn't
// being applied (wrong file location, or a dashboard setting overriding it).
// If neither works, functions aren't being deployed at all (check the
// Functions tab in your Netlify dashboard, and your build's "base directory"
// / "functions directory" settings).

exports.handler = async function () {
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ok: true,
            message: 'Functions are deployed and reachable.',
            hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
            time: new Date().toISOString()
        })
    };
};
