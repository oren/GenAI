// lib/my-gen-ai-chatbot-stack.js
const { Stack, Duration, CfnOutput } = require('aws-cdk-lib');
const lambda = require('aws-cdk-lib/aws-lambda-nodejs');
const apigw = require('aws-cdk-lib/aws-apigatewayv2');
const integrations = require('aws-cdk-lib/aws-apigatewayv2-integrations');
const iam = require('aws-cdk-lib/aws-iam');
const path = require('path');

class MyGenAiChatbotStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const CHOSEN_MODEL_ID = "anthropic.claude-instant-v1"; // Or your preferred model
    // e.g., "ai21.j2-mid-v1", "amazon.titan-text-express-v1", "meta.llama2-13b-chat-v1"

    // 1. Lambda Function
    const chatLambda = new lambda.NodejsFunction(this, 'ChatHandler', {
      runtime: require('aws-cdk-lib/aws-lambda').Runtime.NODEJS_18_X, // Or newer
      entry: path.join(__dirname, '../lambda-handler/chat.js'),
      handler: 'handler',
      timeout: Duration.seconds(90), // Bedrock can take some time
      bundling: {
        externalModules: [ // Already included in Lambda runtime or AWS SDK v3 which is modular
          // '@aws-sdk/client-bedrock-runtime' // No need to bundle if using SDK v3 provided by Lambda
        ],
      },
      environment: {
        MODEL_ID: CHOSEN_MODEL_ID,
        MAX_TOKENS: "500", // Adjust as needed
        // AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1' // Good practice for SDK v2, v3 handles this better
      },
    });

    // 2. IAM Permissions for Lambda to invoke Bedrock
    // Ensure the model ARN matches the region and model ID you are using
    // You can use a wildcard for the model ID part if you want to allow multiple models from a provider
    // e.g., arn:aws:bedrock:${this.region}::foundation-model/anthropic.*
    const bedrockPolicy = new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/${CHOSEN_MODEL_ID}`
      ],
    });
    chatLambda.addToRolePolicy(bedrockPolicy);

    // 3. API Gateway (HTTP API - simpler and cheaper than REST API)
    const httpApi = new apigw.HttpApi(this, 'GenAiChatbotApi', {
      description: 'API for Gen AI Chatbot',
      corsPreflight: { // Optional: configure CORS for browser-based clients
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowMethods: [
          apigw.CorsHttpMethod.OPTIONS,
          apigw.CorsHttpMethod.POST,
        ],
        allowOrigins: ['*'], // Be more restrictive in production
        // allowCredentials: true, // If you need cookies/auth headers
      },
    });

    // 4. API Gateway Integration with Lambda
    const lambdaIntegration = new integrations.HttpLambdaIntegration('ChatIntegration', chatLambda);

    httpApi.addRoutes({
      path: '/chat',
      methods: [apigw.HttpMethod.POST],
      integration: lambdaIntegration,
    });

    // 5. Output the API endpoint URL
    new CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.url + 'chat', // append the path
      description: 'The endpoint URL for the Chatbot API',
    });
  }
}

module.exports = { MyGenAiChatbotStack };
