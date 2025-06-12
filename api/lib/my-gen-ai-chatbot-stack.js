// lib/my-gen-ai-chatbot-stack.js
const { Stack, Duration, CfnOutput } = require('aws-cdk-lib');
const lambda = require('aws-cdk-lib/aws-lambda-nodejs');
const apigw = require('aws-cdk-lib/aws-apigatewayv2');
const integrations = require('aws-cdk-lib/aws-apigatewayv2-integrations');
const iam = require('aws-cdk-lib/aws-iam');
const path = require('path');

class ChatStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const CHOSEN_MODEL_ID = process.env.MODEL_ID || "anthropic.claude-3-5-haiku-20241022-v1:0";

    // 1. Lambda Function
    const chatLambda = new lambda.NodejsFunction(this, 'ChatHandler', {
      runtime: require('aws-cdk-lib/aws-lambda').Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../lambda-handler/chat.js'),
      handler: 'handler',
      timeout: Duration.seconds(90), // Bedrock can take some time
      bundling: {
        forceDockerBundling: false,
        externalModules: [
        ],
      },
      environment: {
        MODEL_ID: CHOSEN_MODEL_ID,
        MAX_TOKENS: "512",
      },
    });

    // 2. IAM Permissions for Lambda to invoke Bedrock
    const bedrockPolicy = new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/${CHOSEN_MODEL_ID}`
      ],
    });
    chatLambda.addToRolePolicy(bedrockPolicy);

    // 3. API Gateway
    const httpApi = new apigw.HttpApi(this, 'GenAiChatbotApi', {
      description: 'API for Gen AI Chatbot',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
        allowMethods: [
          apigw.CorsHttpMethod.OPTIONS,
          apigw.CorsHttpMethod.POST,
        ],
        allowOrigins: ['*'],
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
      value: httpApi.url + 'chat',
      description: 'The endpoint URL for the Chatbot API',
    });
  }
}

module.exports = { ChatStack };
