#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { ChatStack } = require('../lib/chatbot-stack');

const app = new cdk.App();
new ChatStack(app, 'ChatStack', {
  env: { account: process.env.AWS_ACCOUNT, region: process.env.AWS_REGION },
});
