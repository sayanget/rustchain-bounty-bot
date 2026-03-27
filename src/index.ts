import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

async function run() {
  try {
    const token = core.getInput('github-token');
    const octokit = github.getOctokit(token);
    const context = github.context;

    if (context.eventName !== 'issue_comment') {
      core.info('Not an issue comment event. Skipping.');
      return;
    }

    const commentBody = context.payload.comment?.body || '';
    const sender = context.payload.comment?.user?.login;

    // 1. Basic Claim Detection
    if (!commentBody.toLowerCase().includes('claim') && !commentBody.toLowerCase().includes('wallet:')) {
      core.info('No claim detected in comment.');
      return;
    }

    core.info(`Processing claim from @${sender}...`);

    // 2. Extract Data
    const walletMatch = commentBody.match(/wallet:\s*(`)?(\w+)(`)?/i);
    const wallet = walletMatch ? walletMatch[2] : null;
    
    const results = {
      follows: 'pending',
      stars: 0,
      walletExists: 'pending',
      duplicate: 'pending'
    };

    // 3. Verification Logic (Mocks for initial framework)
    // TODO: Implement actual GitHub and RustChain Node API calls
    
    // 4. Post Verification Result
    const responseBody = `
## Automated Verification for @${sender}

| Check | Result |
|-------|--------|
| Follows @Scottcjn | ${results.follows === 'yes' ? '✅ Yes' : '⚠️ Pending'} |
| Scottcjn repos starred | ${results.stars} |
| Wallet \`${wallet || 'N/A'}\` exists | ${results.walletExists === 'yes' ? '✅ Yes' : '⚠️ Not Found/Pending'} |
| Previous claims | ${results.duplicate === 'no' ? '✅ Clear' : '⚠️ Warning'} |

**Suggested action**: Human review required.
    `;

    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      body: responseBody,
    });

  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
