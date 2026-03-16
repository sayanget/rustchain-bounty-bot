# RustChain Bounty Verification Bot

Automated GitHub Action to verify bounty claims (Stars, Follows, Wallets).

## Features
- ✅ **Follow Check**: Verifies user follows @Scottcjn
- ✅ **Star Check**: Counts starred repos under @Scottcjn
- ✅ **Wallet Check**: Queries RustChain node for wallet existence and balance
- ✅ **URL Check**: Verifies article links are live

## Usage
Add this to your `.github/workflows/bounty-verify.yml`:

```yaml
name: Bounty Verification
on:
  issue_comment:
    types: [created]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify Claim
        uses: ./ 
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
        env:
          RUSTCHAIN_NODE_URL: "https://50.28.86.131"
```

## Configuration
The bot triggers on comments containing the keyword **"claiming"**.
It extracts wallets using the pattern `Wallet: <id>`.
