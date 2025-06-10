// lambda-handler/chat.js
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// Ensure the AWS_REGION environment variable is set in your Lambda configuration
// or it will default to the region the Lambda is deployed in.
const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

// Define the Bedrock model ID you want to use
// Make sure you have access to this model in your Bedrock console
// Example: Anthropic Claude Instant v1
const MODEL_ID = process.env.MODEL_ID || "anthropic.claude-instant-v1";
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || "500");

exports.handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    let userPrompt;
    try {
        const body = JSON.parse(event.body);
        userPrompt = body.prompt;
        if (!userPrompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing 'prompt' in request body" }),
                headers: { "Content-Type": "application/json" },
            };
        }
    } catch (error) {
        console.error("Error parsing request body:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid JSON in request body" }),
            headers: { "Content-Type": "application/json" },
        };
    }

    // Construct the prompt for Claude. Other models might have different prompt structures.
    // For Claude, the prompt should be in the format: "Human: [your prompt] Assistant:"
    const claudePrompt = `Human: ${userPrompt}\n\nAssistant:`;

    const params = {
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "*/*",
        body: JSON.stringify({
            prompt: claudePrompt,
            max_tokens_to_sample: MAX_TOKENS,
            temperature: 0.7, // Adjust creativity (0.0 - 1.0)
            top_p: 0.9,       // Adjust nucleus sampling
        }),
    };

    console.log("Invoking Bedrock with params:", params);

    try {
        const command = new InvokeModelCommand(params);
        const response = await client.send(command);

        const responseBody = JSON.parse(Buffer.from(response.body).toString());
        const completion = responseBody.completion; // Specific to Claude

        console.log("Bedrock response:", completion);

        return {
            statusCode: 200,
            body: JSON.stringify({ response: completion.trim() }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // For simple testing, be more specific in prod
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
        };
    } catch (error) {
        console.error("Error invoking Bedrock:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error invoking Bedrock model", error: error.message }),
            headers: { "Content-Type": "application/json" },
        };
    }
};
