// lambda-handler/chat.js
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// Initialize the Bedrock Runtime client
// The AWS_REGION will be picked up from the Lambda environment variables.
const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

// Define the Bedrock model ID you want to use
// This will be overridden by the environment variable if set in CDK/Lambda config.
const MODEL_ID = process.env.MODEL_ID || "amazon.titan-text-lite-v1";

// For Titan, maxTokenCount is a common parameter name.
// This will be overridden by the environment variable if set.
const MAX_TOKENS_TO_GENERATE = parseInt(process.env.MAX_TOKENS || "512");

// ANTHROPIC_VERSION is not needed for Titan models, so it's removed.

exports.handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    let userPrompt;
    try {
        const body = JSON.parse(event.body);
        userPrompt = body.prompt;
        if (!userPrompt) {
            console.error("Missing 'prompt' in request body");
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

    // --- Payload for Amazon Titan Text Lite ---
    const bedrockRequestBody = {
        inputText: userPrompt, // Titan uses 'inputText'
        textGenerationConfig: {
            maxTokenCount: MAX_TOKENS_TO_GENERATE,
            stopSequences: [], // Optional: e.g., ["User:", "Human:"]
            temperature: 0.7,  // Optional: 0.0 - 1.0
            topP: 0.9          // Optional: 0.0 - 1.0
        }
    };
    // --- End Payload ---

    const params = {
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json", // Titan also accepts application/json
        body: JSON.stringify(bedrockRequestBody),
    };

    console.log("Invoking Bedrock with params:", JSON.stringify(params, null, 2));

    try {
        const command = new InvokeModelCommand(params);
        const apiResponse = await client.send(command);

        const responseBody = JSON.parse(Buffer.from(apiResponse.body).toString());
        console.log("Bedrock raw response body:", JSON.stringify(responseBody, null, 2));

        // --- Response parsing for Amazon Titan Text Lite ---
        let completion = "";
        // Titan models usually return an array of results, each with outputText.
        if (responseBody.results && Array.isArray(responseBody.results) && responseBody.results.length > 0) {
            completion = responseBody.results[0].outputText;
        } else if (responseBody.outputText) { // Fallback for some simpler Titan response structures
             completion = responseBody.outputText;
        } else {
            console.error("Unexpected Bedrock response structure:", responseBody);
            // It's good practice to still throw an error if the expected output isn't found
            throw new Error("Failed to parse completion from Bedrock response. Output structure not recognized.");
        }
        // --- End Response parsing ---

        console.log("Bedrock completion:", completion);

        return {
            statusCode: 200,
            body: JSON.stringify({ response: completion.trim() }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // Keep CORS headers
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "POST,OPTIONS"
            },
        };
    } catch (error) {
        // Log the full error object for better debugging from CloudWatch
        console.error("Error invoking Bedrock:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

        const errorMessage = error.message || "Error invoking Bedrock model";
        // Extracting details from AWS SDK v3 error objects
        const errorDetails = error.$metadata ?
            {
                requestId: error.$metadata.requestId,
                httpStatusCode: error.$metadata.httpStatusCode,
                cfId: error.$metadata.cfId, // CloudFront ID if applicable
                extendedRequestId: error.$metadata.extendedRequestId // S3 specific, but good to have a pattern
            } :
            {};

        return {
            // Use the status code from the error if available, otherwise default to 500
            statusCode: error.$metadata?.httpStatusCode || 500,
            body: JSON.stringify({
                message: "Error invoking Bedrock model",
                error: errorMessage,
                details: errorDetails,
                modelIdUsed: MODEL_ID // Good to include which model failed
            }),
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, // Keep CORS on error
        };
    }
};
