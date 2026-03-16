import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';
import https from 'https';

const RUSTCHAIN_NODE = process.env.RUSTCHAIN_NODE_URL || 'https://50.28.86.131';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Internal node bypass
});

async function run() {
  try {
    const token = core.getInput('github-token');
    const octokit = github.getOctokit(token);
    const context = github.context;

    if (context.eventName !== 'issue_comment') {
      core.info('Not an issue comment, skipping.');
      return;
    }

    const commentBody = context.payload.comment?.body || '';
    const user = context.payload.comment?.user?.login;

    if (!commentBody.toLowerCase().includes('claiming')) {
      core.info('Comment does not contain "claiming", skipping.');
      return;
    }

    core.info(`Processing claim from @${user}`);

    // 1. Follow Check
    let follows = false;
    try {
      const { status } = await octokit.rest.users.checkPersonIsFollowedByAuthenticated({
        username: 'Scottcjn',
        target_user: user
      });
      follows = status === 204;
    } catch (e) {
      follows = false;
    }

    // 2. Star Count
    let starCount = 0;
    try {
      const { data: starred } = await octokit.rest.activity.listReposStarredByUser({
        username: user,
        per_page: 100
      });
      starCount = starred.filter((repo: any) => repo.owner.login === 'Scottcjn').length;
    } catch (e) {
      core.error(`Failed to fetch stars: ${e}`);
    }

    // 3. Wallet Check
    const walletMatch = commentBody.match(/Wallet:\s*([a-zA-Z0-9_-]+)/i);
    const walletId = walletMatch ? walletMatch[1] : null;
    let walletBalance = 'N/A';
    let walletExists = false;

    if (walletId) {
      try {
        const { data } = await axios.get(`${RUSTCHAIN_NODE}/wallet/balance`, {
          params: { miner_id: walletId },
          httpsAgent,
          timeout: 5000
        });
        walletExists = true;
        walletBalance = `${data.balance} RTC`;
      } catch (e) {
        walletExists = false;
      }
    }

    // 4. URL Check (Article)
    const urlMatch = commentBody.match(/https?:\/\/[^\s]+/);
    const articleUrl = urlMatch ? urlMatch[0] : null;
    let urlLive = false;
    if (articleUrl) {
      try {
        const res = await axios.head(articleUrl, { timeout: 5000 });
        urlLive = res.status === 200;
      } catch (e) {
        urlLive = false;
      }
    }

    // Prepare Result Table
    const resultTable = `
## Automated Verification for @${user}

| Check | Result |
|-------|--------|
| Follows @Scottcjn | ${follows ? '✅ Yes' : '❌ No'} |
| Scottcjn repos starred | **${starCount}** |
| Wallet \`${walletId || 'None'}\` exists | ${walletExists ? `✅ Balance: ${walletBalance}` : '❌ Not Found'} |
| Article link | ${articleUrl ? (urlLive ? '✅ Live' : '❌ Broken') : '➖ N/A'} |

**Suggested Action**: ${follows && starCount > 0 ? 'Review for payment' : 'Missing requirements'}
`;

    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      body: resultTable
    });

  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
