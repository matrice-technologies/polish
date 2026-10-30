# Security

Please report vulnerabilities privately, not in a public issue: use
[GitHub's private vulnerability reporting](https://github.com/matrice-technologies/polish/security/advisories/new)
for this repository. We'll acknowledge within a few days and keep you posted
until it's fixed.

Worth knowing when you look:

- **API keys** never leave the device. The desktop app encrypts them with the
  OS keychain (Electron `safeStorage`) and sends text straight to the chosen
  provider; nothing passes through the Polish server.
- **Account data** is protected by Postgres row-level security: every table is
  readable and writable only by its owner, and `device_links` only by the
  server.
- **Desktop sign-in** is a device flow. The app holds a 256-bit device code;
  the short user code only works for a signed-in person who approves it within
  ten minutes, and each link can be used once.
