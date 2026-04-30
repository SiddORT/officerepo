#!/bin/bash
set -e

echo "=== Office Repo post-merge setup ==="

# Install Python packages if requirements changed
if [ -f requirements.txt ]; then
    pip install -r requirements.txt --quiet
fi

# Install / update frontend dependencies
echo "Installing frontend dependencies..."
cd frontend-web
npm install --silent
cd ..

echo "=== Post-merge setup complete ==="
