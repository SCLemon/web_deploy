#!/bin/bash
set -e

# 移除舊版本
if [ -d "web_deploy" ]; then
  echo "Removing previous version of web_deploy..."
  rm -rf web_deploy
fi

# 下載新版
echo "Downloading the latest version of web_deploy..."
if ! git clone https://github.com/SCLemon/web_deploy.git; then
  echo "❌ Git clone failed."
  exit 1
fi

# 安裝前端依賴
echo "Installing npm packages for web_deploy..."
cd web_deploy
npm install --legacy-peer-deps

# 安裝後端依賴
cd projects
echo "Installing npm packages for backend for skyAcademy..."
cd skyAcademy
npm install --legacy-peer-deps
cd ../

echo "Installing npm packages for backend for moruvi..."
cd moruvi
npm install --legacy-peer-deps
cd ../



