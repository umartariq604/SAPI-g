#!/bin/bash

# Set variables
SERVER_IP="18.215.186.3"
SSH_KEY="secureapi-key-2.pem"
REMOTE_DIR="/var/www/secureapi"
GITHUB_REPO="https://github.com/umartariq604/SAPI-g.git"  # Replace with your actual GitHub repo URL

# Create directory and clone from GitHub
echo "Setting up application directory..."
ssh -i $SSH_KEY ubuntu@$SERVER_IP "sudo mkdir -p $REMOTE_DIR && \
    sudo chown -R ubuntu:ubuntu $REMOTE_DIR && \
    cd $REMOTE_DIR && \
    git clone $GITHUB_REPO ."

# Install dependencies and start services
echo "Installing dependencies and starting services..."
ssh -i $SSH_KEY ubuntu@$SERVER_IP "cd $REMOTE_DIR && \
    # Install Python dependencies
    source venv/bin/activate && \
    pip install numpy==1.24.3 pandas==2.0.3 scikit-learn==1.3.0 tensorflow-cpu==2.13.0 flask==2.3.3 pymongo==4.5.0 python-dotenv==1.0.0 requests==2.31.0 joblib==1.3.2 && \
    # Start Python backend
    cd backend && \
    nohup python3 app.py > ../backend.log 2>&1 & \
    cd .. && \
    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
    sudo apt-get install -y nodejs && \
    # Install Node.js dependencies
    npm install && \
    # Start Node.js server
    nohup node server.js > ../server.log 2>&1 &"

echo "Deployment completed! Check backend.log and server.log for any errors." 