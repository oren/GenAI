// lambda-handler/chat.js
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

// Define the Bedrock model ID you want to use
const MODEL_ID = process.env.MODEL_ID || "anthropic.claude-3-5-haiku-20241022-v1:0";
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || "1024"); // Claude 3 can handle more tokens
const ANTHROPIC_VERSION = "bedrock-2023-05-31"; // Required for Claude 3 Messages API

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
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            };
        }
    } catch (error) {
        console.error("Error parsing request body:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid JSON in request body" }),
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        };
    }

    // --- Start: Payload changes for Messages API (Claude 3) ---
    const messages = [
        {
            role: "user",
            content: [{ type: "text", text: userPrompt }],
        },
    ];

    // Construct the payload for Claude 3 Messages API
    const bedrockRequestBody = {
        anthropic_version: ANTHROPIC_VERSION, // Required
        max_tokens: MAX_TOKENS,
        messages: messages,
        // Optional parameters:
        // temperature: 0.7,
        // top_p: 0.9,
        // system: "You are a helpful AI assistant." // System prompt (optional)
    };
    // --- End: Payload changes for Messages API (Claude 3) ---

    const params = {
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json", // Recommended to be specific
        body: JSON.stringify(bedrockRequestBody),
    };

    console.log("Invoking Bedrock with params:", JSON.stringify(params, null, 2));

    try {
        const command = new InvokeModelCommand(params);
        const apiResponse = await client.send(command);

        const responseBody = JSON.parse(Buffer.from(apiResponse.body).toString());
        console.log("Bedrock raw response body:", JSON.stringify(responseBody, null, 2));

        // --- Start: Response parsing changes for Messages API (Claude 3) ---
        // The response structure is different for the Messages API.
        // The main content is usually in responseBody.content[0].text
        let completion = "";
        if (responseBody.content && Array.isArray(responseBody.content) && responseBody.content.length > 0) {
            const firstContentBlock = responseBody.content[0];
            if (firstContentBlock.type === "text") {
                completion = firstContentBlock.text;
            } else {
                console.warn("Received non-text content block:", firstContentBlock);
                completion = "[Received non-text content, see logs]";
            }
        } else if (responseBody.completion) {
             // Fallback for older models just in case, though the error indicates Claude 3
            completion = responseBody.completion;
        } else {
            console.error("Unexpected Bedrock response structure:", responseBody);
            throw new Error("Failed to parse completion from Bedrock response.");
        }
        // --- End: Response parsing changes for Messages API (Claude 3) ---

        console.log("Bedrock completion:", completion);

        return {
            statusCode: 200,
            body: JSON.stringify({ response: completion.trim() }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
        };
    } catch (error) {
        console.error("Error invoking Bedrock:", error.name, error.message, error.stack);
        const errorMessage = error.message || "Error invoking Bedrock model";
        const errorDetails = error.$metadata ? { requestId: error.$metadata.requestId, httpStatusCode: error.$metadata.httpStatusCode } : {};

        return {
            statusCode: error.$metadata?.httpStatusCode || 500,
            body: JSON.stringify({
                message: "Error invoking Bedrock model",
                error: errorMessage,
                details: errorDetails
            }),
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        };
    }
};
