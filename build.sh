#!/bin/bash
set -e

echo "=== BudgetApp Build Script ==="

# 1. Instalar Java 17
if ! command -v java &> /dev/null; then
    echo "Installing Java 17..."
    sudo apt-get update
    sudo apt-get install -y openjdk-17-jdk
fi

# 2. Configurar Android SDK
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

if [ ! -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    echo "Installing Android SDK..."
    mkdir -p $ANDROID_HOME/cmdline-tools
    cd $ANDROID_HOME/cmdline-tools
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O tools.zip
    unzip -q tools.zip
    mv cmdline-tools latest
    rm tools.zip
    
    # Aceptar licencias e instalar componentes
    yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true
    $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
fi

# 3. Build de la app
cd "$(dirname "$0")"

echo "Running prebuild..."
npx expo prebuild --platform android

echo "Building APK..."
cd android
./gradlew assembleRelease

echo "=== Build complete ==="
ls -la app/build/outputs/apk/release/
