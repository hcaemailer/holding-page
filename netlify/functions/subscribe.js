exports.handler = async function(event, context) {
    // 1. Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        const { email, name } = JSON.parse(event.body);

        if (!email) {
            return { statusCode: 400, body: JSON.stringify({ error: "Email is required" }) };
        }

        // 2. Fetch environment variables
        const BREVO_API_KEY = process.env.BREVO_API_KEY;
        const BREVO_LIST_ID = parseInt(process.env.BREVO_LIST_ID || "2", 10);

        // 3. Make the secure request to Brevo using 'FIRSTNAME'
        const response = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                attributes: { FIRSTNAME: name || "" }, // Fixed: changed FNAME to FIRSTNAME
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
