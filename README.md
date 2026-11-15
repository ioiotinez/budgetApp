# BudgetApp 💸

Gestor de finanzas personales móvil desarrollado con **React Native** y **Expo** (Managed Workflow). La aplicación está diseñada para funcionar de forma **offline-first**, utilizando **SQLite** para el almacenamiento local y exportaciones **JSON** para respaldos.

## ✨ Características

-   **Registro de Transacciones**: Control total de ingresos y gastos con categorías, fechas y descripciones.
-   **Tarjeta de Crédito**: Los gastos pagados con tarjeta se registran sin afectar el presupuesto ni el balance, con su propio total y alertas contra un límite mensual configurable.
-   **Presupuestos Mensuales**: Configuración de límites por categoría. Permite inicializar el mes desde una plantilla maestra o copiando el mes anterior.
-   **Detección de Desvíos**: Visualización en tiempo real del estado de tus presupuestos con alertas de color (Verde/Ámbar/Rojo).
-   **Reportes Visuales**: Gráficos donut de gastos por categoría y resúmenes de balance mensual.
-   **Importación/Exportación**: Respalda y restaura tus datos en formato JSON localmente.
-   **Interfaz Moderna**: Diseño limpio basado en **Material Design 3** con soporte para Modo Oscuro.

## 🛠️ Stack Tecnológico

-   **Framework**: React Native + Expo (TypeScript)
-   **Base de Datos**: `expo-sqlite`
-   **Estado Global**: `zustand`
-   **Componentes UI**: `react-native-paper`
-   **Gráficos**: `react-native-svg` (Custom Donut Charts)
-   **Navegación**: `react-navigation` (Tabs + Stacks)

## 📁 Estructura del Proyecto

```
src/
├── db/          # Servicios de base de datos y esquema SQLite
├── hooks/       # Hooks personalizados (reportes, desviaciones)
├── navigation/  # Configuración de React Navigation
├── screens/     # Pantallas principales (Dashboard, Transacciones, etc.)
├── services/    # Lógica de Exportación e Importación JSON
├── store/       # Estados globales con Zustand
├── theme/       # Configuración de temas Light/Dark
├── types/       # Definiciones de TypeScript
└── utils/       # Formateadores y utilidades de fecha/moneda
```

## 🚀 Instalación y Uso

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar el proyecto
npx expo start
```

Usa la app **Expo Go** en tu dispositivo Android para escanear el código QR.

### Build de APK (Docker)

Este proyecto usa Docker para compilar la APK de Android sin necesidad de instalar Java/Android SDK localmente.

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

### Build Debug

Editar `build-apk.sh` y cambiar `./gradlew assembleRelease` por `./gradlew assembleDebug`:

```bash
cd android
./gradlew assembleDebug
```

Output: `apk-output/budgetapp-debug.apk` (~254 MB)

### Build para una sola arquitectura (más rápido)

```bash
# Para arm64-v8a (mayoría de dispositivos reales)
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

## 🗄️ Esquema de Base de Datos

La base de datos local `budget.db` consta de 5 tablas principales:
- `categories`: Catálogo de tipos de gastos/ingresos.
- `transactions`: Movimientos de dinero.
- `monthly_budgets`: Presupuesto asignado por mes/año/categoría.
- `budget_templates`: Montos base para generar presupuestos nuevos.
- `settings`: Configuración de la app y tokens.

## 📝 Notas

- El primer build puede tomar ~12-15 minutos
- Builds subsiguientes son más rápidos (~3-5 min) gracias al caché de Gradle
- Este proyecto usa **Old Architecture** (legacy) para tiempos de build más rápidos

---

Desarrollado con ❤️ para una mejor salud financiera.
