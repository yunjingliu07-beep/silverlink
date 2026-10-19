# Silver Link project workflow

## Required GitHub synchronization

The owner requested on 2026-10-19 that all future changes to this project also be synchronized to GitHub.

- GitHub repository: https://github.com/yunjingliu07-beep/silverlink
- Target branch: main
- Sites project: appgprj_6ad4822ebc7c8191adf2dc3b10a2d39e
- Live site: https://silver-link-sg-yunjing.nh5001-5877.chatgpt.site

After changing the site, synchronize all changed application files, assets, tests and documentation to the GitHub repository as well as the Sites source repository. Do not treat a Sites-only push as completion. Verify the GitHub branch contains the intended files and report the GitHub commit or any blocker.

Read the latest GitHub branch before writing. Preserve other people's changes; do not force-push or replace divergent history. Use the connected GitHub tools if Git transport credentials are unavailable. Preserve branch protections and use a pull request if they require one.

For source changes, run npm test and npm run build. Follow the Sites publishing workflow for website updates, preserving the existing audience. Documentation-only synchronization does not require changing the live website.
