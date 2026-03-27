import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

async function run() {
  try {
    const token = core.getInput('github-token');
    const octokit = github.getOctokit(token);
    const context = github.context;

    if (context.eventName !== 'issue_comment') return;

    const commentBody = context.payload.comment?.body || '';
    const sender = context.payload.comment?.user?.login;

    if (!commentBody.toLowerCase().includes('claim') && !commentBody.toLowerCase().includes('wallet:')) return;

    core.info(`Processing claim from @${sender}...`);

    const walletMatch = commentBody.match(/wallet:\s*(`)?(\w+)(`)?/i);
    const wallet = walletMatch ? walletMatch[2] : null;

    let follows = 'no';
    try {
      // Corrected check: check if target_user follows username (Scottcjn)
      await octokit.rest.users.checkPersonIsFollowedByAuthenticated({
        username: 'Scottcjn',
        target_user: sender
      });
      follows = 'yes';
    } catch (e) {
      follows = 'no';
    }

    const owner = 'Scottcjn';
    const scottRepos = await octokit.paginate(octokit.rest.repos.listForUser, {
      username: owner,
      type: 'owner',
      per_page: 100
    });
    const scottRepoFullNames = new Set(scottRepos.map(r => r.full_name));

    let starCount = 0;
    const starredRepos = await octokit.paginate(octokit.rest.activity.listReposStarredByUser, {
      username: sender,
      per_page: 100
    });

    for (const item of starredRepos) {
      // Octokit type for starred repos can vary depending on headers, but usually contains .repo or is the repo itself
      const repoFullName = (item as any).full_name || (item as any).repo?.full_name;
      if (repoFullName && scottRepoFullNames.has(repoFullName)) {
        starCount++;
      }
    }

    let walletBalance = 'N/A';
    let walletExists = 'no';
    if (wallet) {
      try {
        const nodeUrl = core.getInput('node-url') || 'https://50.28.86.131';
        const response = await axios.get(`${nodeUrl}/wallet/balance?miner_id=${wallet}`, { timeout: 10000 });
        if (response.data && response.data.balance !== undefined) {
          walletExists = 'yes';
          walletBalance = `${response.data.balance} RTC`;
        }
      } catch (e: any) {
        core.warning(`Node API check failed: ${e.message}`);
      }
    }

    const responseBody = `
## Automated Verification for @${sender}

| Check | Result |
|-------|--------|
| Follows @Scottcjn | ${follows === 'yes' ? '✅ Yes' : '❌ No'} |
| Scottcjn repos starred | **${starCount}** / ${scottRepos.length} |
| Wallet \`${wallet || 'N/A'}\` exists | ${walletExists === 'yes' ? `✅ Yes (Balance: ${walletBalance})` : '❌ Not Found'} |

**Suggested action**: ${follows === 'yes' && starCount > 0 ? '✅ Ready for payout review' : '⚠️ Missing requirements'}
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
