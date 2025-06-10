#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { MyGenAiChatbotStack } = require('../lib/my-gen-ai-chatbot-stack');

const app = new cdk.App();
new MyGenAiChatbotStack(app, 'MyGenAiChatbotStack', {
  env: { account: '123456789012', region: 'us-west-2' },
});
