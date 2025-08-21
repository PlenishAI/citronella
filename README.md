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
cd debugging-interview-app
npm run install:all
npm run dev