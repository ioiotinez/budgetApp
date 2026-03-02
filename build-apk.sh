#!/bin/bash

set -e

PROJECT_DIR="/project/app"
OUTPUT_DIR="$PROJECT_DIR/apk-output"
KEYSTORE_DIR="$PROJECT_DIR/android/app"

export NODE_OPTIONS="--no-experimental-strip-types"

echo "========================================"
echo "  Building BudgetApp APK (Release)"
echo "========================================"

cd "$PROJECT_DIR"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

if [ -d "android" ]; then
    echo "Cleaning android directory..."
    rm -rf android
fi

echo "Running expo prebuild..."
npx expo prebuild --platform android

if [ ! -f "$KEYSTORE_DIR/debug.keystore" ]; then
    echo "Creating debug keystore..."
    keytool -genkeypair -v -storetype PKCS12 -keystore "$KEYSTORE_DIR/debug.keystore" -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
fi

echo "Building release APK (with bundled JS)..."
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a

mkdir -p "$OUTPUT_DIR"
cp app/build/outputs/apk/release/app-release.apk "$OUTPUT_DIR/budgetapp-release.apk"

echo "========================================"
echo "  APK built successfully!"
echo "========================================"
echo "Output: $OUTPUT_DIR/budgetapp-release.apk"
