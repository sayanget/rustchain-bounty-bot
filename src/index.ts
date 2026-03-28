import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

async function checkArticle(url: string) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const html = response.data;
    const text = html.replace(/<[^>]*>?/gm, ' '); 
    const wordCount = text.trim().split(/\s+/).length;
    return {
      isLive: true,
      wordCount,
      quality: wordCount > 500 ? 'High' : wordCount > 200 ? 'Medium' : 'Low'
    };
  } catch (e: any) {
    return { isLive: false, wordCount: 0, quality: 'None' };
  }
}

async function run() {
  try {
    const token = core.getInput('github-token');
    const octokit = github.getOctokit(token);
    const context = github.context;

    if (context.eventName !== 'issue_comment') return;

    const commentBody = context.payload.comment?.body || '';
    const sender = context.payload.comment?.user?.login;
    const currentCommentId = context.payload.comment?.id;

    if (!commentBody.toLowerCase().includes('claim') && !commentBody.toLowerCase().includes('wallet:')) return;

    core.info(`Processing claim from @${sender}...`);

    const walletMatch = commentBody.match(/wallet:\s*(`)?(\w+)(`)?/i);
    const wallet = walletMatch ? walletMatch[2] : null;

    const urlMatch = commentBody.match(/https?:\/\/(dev\.to|medium\.com)\/[^\s]+/i);
    const articleUrl = urlMatch ? urlMatch[0] : null;

    // 1. Follow Check
    let follows = 'no';
    try {
      await octokit.rest.users.checkPersonIsFollowedByAuthenticated({
        username: 'Scottcjn',
        target_user: sender
      });
      follows = 'yes';
    } catch (e) {
      follows = 'no';
    }

    // 2. Star Counting
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
      const repoFullName = (item as any).full_name || (item as any).repo?.full_name;
      if (repoFullName && scottRepoFullNames.has(repoFullName)) {
        starCount++;
      }
    }

    // 3. Duplicate/Previous Claims Detection
    let duplicateDetected = 'no';
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      ...context.repo,
      issue_number: context.issue.number,
      per_page: 100
    });

    for (const comment of comments) {
      if (comment.id === currentCommentId) continue; 
      const body = comment.body?.toLowerCase() || '';
      const cSender = comment.user?.login;
      
      if (cSender === sender && (body.includes('claim') || body.includes('wallet:'))) {
        duplicateDetected = 'yes (user)';
        break;
      }
      if (wallet && body.includes(wallet.toLowerCase()) && (body.includes('paid') || body.includes('suggested payout'))) {
        duplicateDetected = 'yes (wallet)';
        break;
      }
    }

    // 4. Wallet Check
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

    // 5. Article Check
    let articleResult = null;
    if (articleUrl) {
      articleResult = await checkArticle(articleUrl);
    }

    const responseBody = `
## Automated Verification for @${sender}

| Check | Result |
|-------|--------|
| Follows @Scottcjn | ${follows === 'yes' ? '✅ Yes' : '❌ No'} |
| Scottcjn repos starred | **${starCount}** / ${scottRepos.length} |
| Wallet \`${wallet || 'N/A'}\` exists | ${walletExists === 'yes' ? `✅ Yes (Balance: ${walletBalance})` : '❌ Not Found'} |
| Duplicate claim | ${duplicateDetected === 'no' ? '✅ None' : `⚠️ Warning (${duplicateDetected})`} |
${articleResult ? `| Article Live | ${articleResult.isLive ? '✅ Yes' : '❌ No'} |` : ''}
${articleResult && articleResult.isLive ? `| Word Count | ${articleResult.wordCount} (${articleResult.quality} quality) |` : ''}

**Suggested action**: ${follows === 'yes' && starCount > 0 && duplicateDetected === 'no' ? '✅ Ready for payout review' : '⚠️ Manual review required'}
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
