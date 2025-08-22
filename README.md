# Debugging Interview Challenge

## 🐛 Known Issues

### Issue 1: Login Case Sensitivity
Users report login issues with email case sensitivity:
- ✅ `john@example.com` / `password123` 
- ❌ `John@Example.com` / `password123`

### Issue 2: Performance & Comments
- Application becomes slow when viewing posts with comments
- Server console shows excessive database queries
- Comments feature has validation issues

## 🚀 Quick Start

### Codespace (Recommended)
1. Click the Codespace link provided by your interviewer
2. Wait for environment to load (~30 seconds)  
3. Run: `npm run dev`
4. Start debugging!

### Local Development
```bash
git clone [this-repo]
cd citronella
npm run install:all
npm run dev
```

## 🔧 Interviewer Setup

### Claude Code Configuration
This repository is pre-configured to use Claude Code with Anthropic's API:

1. **For GitHub Codespaces (Recommended):**
   - Add `ANTHROPIC_API_KEY` as a Codespaces secret in your GitHub settings
   - Claude Code and Live Share extensions will auto-install
   - Authentication uses the environment variable directly (no apiKeyHelper)
   - Everything configures automatically on codespace creation

2. **For Local Development:**
   ```bash
   # Option 1: Set environment variable (recommended)
   export ANTHROPIC_API_KEY="your-key-here"
   ./claude-setup.sh
   
   # Option 2: Use the helper script (for environments without API key)
   ./apiKeyHelper.sh "your-key-here"
   ```

3. **Configuration Files:**
   - `.claude/settings.json` - Project-level Claude Code settings
   - `.devcontainer/devcontainer.json` - Codespaces configuration
   - `apiKeyHelper.sh` - Automatic API key authentication helper
   - `claude-setup.sh` - Complete Claude Code setup script