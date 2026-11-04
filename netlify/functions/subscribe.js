exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        const { email, name, consent, captchaToken } = JSON.parse(event.body);

        // 1. Basic validation
        if (!email || !consent) {
            return { statusCode: 400, body: JSON.stringify({ error: "Email and opt-in consent are required." }) };
        }

        if (!captchaToken) {
            return { statusCode: 400, body: JSON.stringify({ error: "CAPTCHA token missing." }) };
        }

        // 2. Verify Turnstile CAPTCHA Token with Cloudflare API
        const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
        
        // If TURNSTILE_SECRET_KEY is set in Netlify, perform verification
        if (TURNSTILE_SECRET_KEY) {
            const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    secret: TURNSTILE_SECRET_KEY,
                    response: captchaToken,
                    remoteip: event.headers['client-ip'] || event.headers['x-forwarded-for'] || ''
                })
            });

            const verifyData = await verifyRes.json();

            if (!verifyData.success) {
                return { statusCode: 400, body: JSON.stringify({ error: "Anti-spam verification failed. Please try again." }) };
            }
        }

        // 3. Environment Variables for Brevo
        const BREVO_API_KEY = process.env.BREVO_API_KEY;
        const BREVO_LIST_ID = parseInt(process.env.BREVO_LIST_ID || "2", 10);

        // 4. Submit Contact to Brevo API
        const response = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                attributes: { FIRSTNAME: name || "" },
                listIds: [BREVO_LIST_ID],
                updateEnabled: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { statusCode: response.status, body: JSON.stringify({ error: errorData.message || "Failed to subscribe" }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Successfully subscribed!" })
        };

    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: "Server error occurred." }) };
    }
};
