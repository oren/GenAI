#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { MyGenAiChatbotStack } = require('../lib/my-gen-ai-chatbot-stack');

const app = new cdk.App();
new MyGenAiChatbotStack(app, 'MyGenAiChatbotStack', {
  env: { account: process.env.AWS_ACCOUNT, region: 'us-west-2' },
});
