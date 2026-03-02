# Build de APK con Docker

Este proyecto usa Docker para compilar la APK de Android sin necesidad de instalar Java/Android SDK localmente.

## Requisitos

- Docker instalado
- Docker Compose instalado

## Archivos

- `docker-compose.yml` - Configuración del contenedor
- `build-apk.sh` - Script de automatización del build
- `apk-output/` - Directorio donde se genera la APK

## Builds

### Build release (default -recommended)

```bash
# Iniciar contenedor
docker-compose up -d

# Ejecutar build
docker exec budgetapp_app-build_1 ./build-apk.sh

# La APK se genera en: apk-output/budgetapp-release.apk (~131 MB)

# Detener contenedor
docker-compose down
```

La APK release incluye:
- JS bundle embebido (funciona sin Metro bundler)
- Código optimizado y minificado
- Firmada con keystore de debug (instalable en dispositivos)

### Build debug

Editar `build-apk.sh` y cambiar `./gradlew assembleRelease` por `./gradlew assembleDebug`:

```bash
cd android
./gradlew assembleDebug
```

Output: `apk-output/budgetapp-debug.apk` (~254 MB)

### Build para una sola arquitectura (más rápido)

Editar `build-apk.sh` y agregar el flag:

```bash
# Para x86_64 (emuladores)
cd android
./gradlew assembleRelease -PreactNativeArchitectures=x86_64

# Para arm64-v8a (mayoría de dispositivos reales)
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## Notas

- El primer build puede tomar ~12-15 minutos (Old Architecture + todas las arquitecturas)
- Builds subsiguientes son más rápidos (~3-5 min) gracias al caché de Gradle
- La APK release es más pequeña (~120-125 MB) que debug (~254 MB) por las optimizaciones
- Este proyecto usa **Old Architecture** (legacy) para tiempos de build más rápidos

## Troubleshooting

### El build falla por memoria insuficiente

En `docker-compose.yml`, aumentar memoria:
```yaml
deploy:
  resources:
    limits:
      memory: 4G
```

### Limpiar cache de Gradle

```bash
docker exec budgetapp_app-build_1 rm -rf ~/.gradle/caches
```

### Limpiar android/ y node_modules/ (necesario tras cambios en config native)

```bash
docker exec budgetapp_app-build_1 rm -rf /project/app/android /project/app/node_modules
```

### Ver logs del build

```bash
docker logs budgetapp_app-build_1
```

### Build personalizado con tu keystore

Para producción, reemplaza `android/app/debug.keystore` con tu keystore de producción y actualiza `android/app/build.gradle` con tus credenciales.
