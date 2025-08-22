#!/bin/bash

# API Key Helper Script for Claude Code Authentication
# This script is designed to be called by Claude Code's apiKeyHelper setting

# Function to validate API key format
validate_api_key() {
    local key="$1"
    if [[ $key =~ ^sk-ant-api03-[a-zA-Z0-9_-]{95}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to source environment variables from common locations
source_env_vars() {
    # Try to source common shell profiles to get environment variables
    [ -f ~/.bashrc ] && source ~/.bashrc 2>/dev/null
    [ -f ~/.bash_profile ] && source ~/.bash_profile 2>/dev/null
    [ -f ~/.profile ] && source ~/.profile 2>/dev/null
    [ -f ~/.zshrc ] && source ~/.zshrc 2>/dev/null
}

# Function to get API key (for Claude Code apiKeyHelper)
get_api_key_for_claude() {
    # Source environment variables in case they're not inherited
    source_env_vars
    
    # Try multiple sources for the API key
    local api_key=""
    
    # 1. Check environment variable
    if [ -n "$ANTHROPIC_API_KEY" ]; then
        api_key="$ANTHROPIC_API_KEY"
    # 2. Check if passed as argument
    elif [ $# -eq 1 ]; then
        api_key="$1"
    # 3. Try to read from a temporary file (if setup script created one)
    elif [ -f "/tmp/anthropic_api_key" ]; then
        api_key=$(cat /tmp/anthropic_api_key 2>/dev/null)
    # 4. Try to extract from shell profile
    elif [ -f ~/.bashrc ]; then
        api_key=$(grep "export ANTHROPIC_API_KEY=" ~/.bashrc 2>/dev/null | tail -1 | sed 's/.*ANTHROPIC_API_KEY="\([^"]*\)".*/\1/')
    fi
    
    # Validate and output the API key
    if [ -n "$api_key" ] && validate_api_key "$api_key"; then
        # Output ONLY the API key for Claude Code
        echo "$api_key"
        exit 0
    else
        # Exit with error if no valid key found
        exit 1
    fi
}

# Function for interactive setup (when called directly by user)
interactive_setup() {
    echo "🔑 Claude Code API Key Helper"
    echo "==============================="
    echo ""
    
    # Source environment variables
    source_env_vars
    
    # Check current status
    if [ -n "$ANTHROPIC_API_KEY" ]; then
        echo "🔍 Found existing ANTHROPIC_API_KEY in environment"
        
        if validate_api_key "$ANTHROPIC_API_KEY"; then
            echo "✅ API key format is valid"
            echo "🎯 Claude Code should authenticate automatically!"
            echo ""
            echo "🧪 Test with: claude doctor"
            return 0
        else
            echo "❌ API key format appears invalid"
            echo "Expected format: sk-ant-api03-[95 characters]"
            echo "Found: ${ANTHROPIC_API_KEY:0:20}..."
        fi
    else
        echo "⚠️  No ANTHROPIC_API_KEY found in environment"
    fi
    
    echo ""
    echo "🔧 Setup Options:"
    echo ""
    echo "1. 📋 Set API key for current session:"
    echo "   export ANTHROPIC_API_KEY=\"your-api-key-here\""
    echo ""
    echo "2. 💾 Set API key permanently:"
    echo "   echo 'export ANTHROPIC_API_KEY=\"your-key\"' >> ~/.bashrc"
    echo "   source ~/.bashrc"
    echo ""
    echo "3. 🔗 Get an API Key:"
    echo "   Visit: https://console.anthropic.com/settings/keys"
    echo ""
    
    # If API key provided as argument, set it up
    if [ $# -eq 1 ]; then
        local provided_key="$1"
        echo "🔍 Validating provided API key..."
        
        if validate_api_key "$provided_key"; then
            echo "✅ API key format is valid"
            
            # Export for current session
            export ANTHROPIC_API_KEY="$provided_key"
            
            # Add to shell profile
            if ! grep -q "ANTHROPIC_API_KEY" ~/.bashrc; then
                echo "export ANTHROPIC_API_KEY=\"$provided_key\"" >> ~/.bashrc
                echo "✅ Added ANTHROPIC_API_KEY to ~/.bashrc"
            else
                echo "ℹ️  Updating ANTHROPIC_API_KEY in ~/.bashrc"
                sed -i "s/export ANTHROPIC_API_KEY=.*/export ANTHROPIC_API_KEY=\"$provided_key\"/" ~/.bashrc
            fi
            
            # Create temporary file for Claude Code to read during installation
            echo "$provided_key" > /tmp/anthropic_api_key
            chmod 600 /tmp/anthropic_api_key
            
            echo "🎯 API key configured! Test with: claude doctor"
            return 0
        else
            echo "❌ Invalid API key format"
            echo "Expected: sk-ant-api03-[95 characters]"
            echo "Provided: ${provided_key:0:20}..."
            return 1
        fi
    fi
    
    echo "💡 After setting up your API key, verify with:"
    echo "   claude doctor"
    echo "   claude -p \"Hello, can you help me?\""
}

# Determine how script was called
if [ $# -eq 0 ] && [ ! -t 1 ]; then
    # Called by Claude Code's apiKeyHelper (no args, no terminal output)
    get_api_key_for_claude
elif [ $# -eq 1 ] && [[ "$1" =~ ^sk-ant-api03- ]]; then
    # Called with API key argument - do interactive setup
    interactive_setup "$1"
else
    # Called interactively or with wrong args
    interactive_setup "$@"
fi