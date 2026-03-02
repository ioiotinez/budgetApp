FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    unzip \
    curl \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Install Android SDK
RUN mkdir -p /opt/android-sdk/cmdline-tools
WORKDIR /opt/android-sdk/cmdline-tools

RUN wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O tools.zip && \
    unzip -q tools.zip && \
    mv cmdline-tools latest && \
    rm tools.zip

ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

RUN yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true
RUN $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

WORKDIR /workspace
COPY . /workspace/

RUN npm install
RUN npx expo prebuild --platform android

WORKDIR /workspace/android
RUN ./gradlew assembleRelease

CMD ["ls", "-la", "app/build/outputs/apk/release/"]
