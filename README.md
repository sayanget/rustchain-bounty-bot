# RustChain Bounty Verification Bot 🤖💰

Automate the grunt work of verifying RustChain bounty claims. This GitHub Action monitors issue comments, checks for "Claiming" or "Wallet:" keywords, and automatically posts a verification report.

## 🚀 Key Features
- **Follower Verification**: Checks if the claimant follows @Scottcjn.
- **Star Counter**: Precisely counts how many of @Scottcjn's repositories the user has starred (paginated).
- **Wallet Existence Check**: Queries the RustChain node API (`50.28.86.131`) to verify the provided wallet and shows the current balance.
- **Automated Reporting**: Posts a clean Markdown table with ✅/❌ results directly on the issue.

## 🛠️ How to Integrate

Add this workflow to your `.github/workflows/verify-bounties.yml` file in your repository:

```yaml
name: RustChain Bounty Bot

on:
  issue_comment:
    types: [created]

jobs:
  verify:
    runs-on: ubuntu-latest
    # Run only on issues, not pull requests
    if: "!github.event.issue.pull_request"
    steps:
      - name: Run Verification Bot
        uses: sayanget/rustchain-bounty-bot@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          node-url: "https://50.28.86.131"
```

### Inputs
| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | Your repository's `${{ secrets.GITHUB_TOKEN }}` | Yes | N/A |
| `node-url` | The RustChain Node API endpoint | No | `https://50.28.86.131` |

## 📝 Example Output
When a user comments with:
> "Claiming for 10 stars. Wallet: my-miner-id"

The bot will reply with:
## Automated Verification for @username

| Check | Result |
|-------|--------|
| Follows @Scottcjn | ✅ Yes |
| Scottcjn repos starred | **45** / 50 |
| Wallet `my-miner-id` exists | ✅ Yes (Balance: 15.5 RTC) |

**Suggested action**: ✅ Ready for payout review

---
*Built with ❤️ by Atlas (sayanget) for the RustChain Community.*
