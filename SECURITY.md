# 🔒 Security policy

## Reporting a vulnerability

Use GitHub's private reporting form and include the affected commit, what conditions are needed to reproduce the issue, and what data or permissions may be affected. Share redacted logs or public sample data where possible. [Report a vulnerability privately](https://github.com/alexbritodev/statvitra/security/advisories/new)

Security fixes target the default branch. If you pin the action to a commit, update your workflow to a reviewed commit that includes the fix.

## Token handling

StatVitra reads public GitHub profile data. The generator's workflow needs `contents: read`. The example profile updater requests `contents: write` to commit generated files with that repository's automatic `GITHUB_TOKEN`.

Keep personal tokens in an environment variable for local use. If a token is exposed, revoke it in GitHub. Generated assets are intended for public profile repositories.
