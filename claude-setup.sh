#!/bin/bash

echo "🤖 Setting up Claude Code for debugging interview..."

# Make API key helper executable first
chmod +x ./apiKeyHelper.sh

# Check if ANTHROPIC_API_KEY is available and create temp file for installation
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "🔑 Found ANTHROPIC_API_KEY, preparing for installation..."
    
    # Validate API key format (Anthropic keys start with sk-ant-api03-)
    if [[ $ANTHROPIC_API_KEY =~ ^sk-ant-api03- ]]; then
        echo "✅ API key format is valid"
        
        # Create temporary file for Claude Code installation
        echo "$ANTHROPIC_API_KEY" > /tmp/anthropic_api_key
        chmod 600 /tmp/anthropic_api_key
        
        # Ensure it's in shell profile for persistence
        if ! grep -q "ANTHROPIC_API_KEY" ~/.bashrc; then
            echo "export ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY\"" >> ~/.bashrc
            echo "✅ Added ANTHROPIC_API_KEY to shell profile"
        fi
        
        # Export for current session
        export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    else
        echo "⚠️  API key format appears invalid (should start with sk-ant-api03-)"
    fi
else
    echo "⚠️  No ANTHROPIC_API_KEY found - Claude Code will need manual authentication"
fi

# Install Claude Code
echo "📦 Installing Claude Code..."
curl -fsSL https://claude.ai/install.sh | bash

# Add to PATH for current session
export PATH="$HOME/.claude/bin:$PATH"

# Add to shell profile for persistence
echo 'export PATH="$HOME/.claude/bin:$PATH"' >> ~/.bashrc

# Get absolute path for apiKeyHelper
HELPER_PATH="$(pwd)/apiKeyHelper.sh"

# Create Claude configuration directory
mkdir -p ~/.claude

# Create user-level Claude settings.json with apiKeyHelper
echo "🔧 Creating Claude Code settings.json with apiKeyHelper..."

cat > ~/.claude/settings.json << EOF
{
  "apiKeyHelper": "$HELPER_PATH",
  "env": {
    "ANTHROPIC_API_KEY": "\${ANTHROPIC_API_KEY}"
  },
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Bash",
      "Edit", 
      "Write",
      "Read",
      "Glob",
      "Grep",
      "LS",
      "MultiEdit",
      "WebFetch",
      "WebSearch"
    ]
  },
  "includeCoAuthoredBy": true,
  "cleanupPeriodDays": 7
}
EOF

echo "✅ Created ~/.claude/settings.json with apiKeyHelper: $HELPER_PATH"

# Create project-level settings for this debugging exercise
mkdir -p .claude

cat > .claude/settings.json << 'EOF'
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Bash(npm:*, node:*, git:*)",
      "Edit",
      "Write", 
      "Read",
      "Glob",
      "Grep",
      "LS",
      "MultiEdit"
    ],
    "additionalDirectories": [
      "./backend",
      "./frontend"
    ]
  },
  "env": {
    "NODE_ENV": "development"
  }
}
EOF

echo "✅ Created project .claude/settings.json for debugging interview"

# Configure git to ignore local Claude settings
if [ ! -f .gitignore ]; then
    touch .gitignore
fi

if ! grep -q ".claude/settings.local.json" .gitignore; then
    echo ".claude/settings.local.json" >> .gitignore
fi

# Verify Claude Code installation
if command -v claude &> /dev/null; then
    echo "✅ Claude Code installed successfully!"
    claude --version
    
    # Test the apiKeyHelper script directly
    echo ""
    echo "🧪 Testing apiKeyHelper script..."
    API_KEY_OUTPUT=$($HELPER_PATH 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$API_KEY_OUTPUT" ]; then
        echo "✅ apiKeyHelper script working correctly"
        
        # Test Claude Code with the new settings
        echo "🧪 Testing Claude Code authentication..."
        if claude doctor 2>/dev/null | grep -q "Authentication.*OK\|Valid"; then
            echo "✅ Claude Code authentication working!"
        else
            echo "⚠️  Claude Code authentication needs attention"
            echo "💡 Try: claude auth (for manual authentication)"
        fi
    else
        echo "⚠️  apiKeyHelper script needs debugging"
        echo "🔧 Check ANTHROPIC_API_KEY: echo \$ANTHROPIC_API_KEY"
    fi
    
    # Display configuration info
    echo ""
    echo "📋 Claude Code Configuration:"
    echo "   User settings: ~/.claude/settings.json"
    echo "   Project settings: ./.claude/settings.json"
    echo "   API Key Helper: $HELPER_PATH"
    echo ""
    echo "🎯 Ready to debug! Try these commands:"
    echo "   claude doctor                    # Check configuration"
    echo "   claude config list               # View current settings"  
    echo "   claude -p \"analyze this bug\"     # Quick question"
    echo "   claude                          # Interactive mode"
    echo "   ./apiKeyHelper.sh               # Manual API key setup"
else
    echo "❌ Claude Code installation may have failed."
    echo "🔍 Try running: curl -fsSL https://claude.ai/install.sh | bash"
fi

# Clean up temporary file
rm -f /tmp/anthropic_api_key

echo ""
echo "🎯 Setup complete! Claude Code configured with apiKeyHelper for automatic authentication."