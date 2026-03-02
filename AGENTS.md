# AGENTS.md - Instrucciones para el Desarrollo de BudgetApp

Este documento contiene las directrices, estándares y decisiones arquitectónicas que deben seguir los agentes de IA al modificar o extender esta aplicación.

## 🏗 Arquitectura y Estado

- **Offline-First**: Toda la lógica de negocio es local. Los respaldos se gestionan mediante exportación de archivos JSON.
- **SQLite (expo-sqlite)**: Fuente única de verdad local. Usa `src/db/database.ts` para obtener la conexión y añade nuevos métodos en servicios específicos (`categoryService`, `transactionService`, etc.).
- **Zustand**: Gestión de estado global. Se prefiere sobre React Context para evitar re-renders innecesarios.
  - Cada dominio tiene su propio store en `src/store/`.
  - Al modificar datos en la DB, se debe actualizar el estado del store correspondiente inmediatamente.

## 🗃 Estándares de Base de Datos

- **Tipado**: Todas las consultas SQL deben estar tipadas mediante interfaces en `src/types/index.ts`.
- **Fechas**: Almacenar fechas siempre en formato ISO `YYYY-MM-DD` como `TEXT`.
- **Claves Foráneas**: Siempre habilitar `PRAGMA foreign_keys = ON`.
- **Integridad**: Usa transacciones (`BEGIN TRANSACTION` / `COMMIT`) para operaciones que afecten múltiples tablas (ej. restauración de backups).

## 🎨 UI & Estética (Material Design 3)

- **React Native Paper**: Usa componentes de esta librería para mantener la consistencia.
- **Temas**: Acceder a colores mediante `useTheme()` de `react-native-paper`. Nunca uses colores "hardcoded" fuera de `src/theme/theme.ts`.
- **Gráficos**: No instales librerías pesadas de gráficos si no es necesario. Actualmente usamos `react-native-svg` para charts personalizados por ser más ligero y compatible.

## 📥 Gestión de Backups (JSON)

- **Formato de Backup**: La estructura del JSON exportado debe coincidir con la interfaz `BackupData` definida en `src/types/index.ts`.
- **Restore**: Ofrecer sempre la opción de "Fusionar" (usar `INSERT OR REPLACE`) para no perder datos generados localmente post-backup.

## 📝 Convenciones de Código

- **TypeScript**: Estricto. Evitar el uso de `any`.
- **Estructura de Carpetas**:
  - `src/db`: Lógica SQL pura.
  - `src/services`: Lógica de exportación/importación y sistema de archivos.
  - `src/hooks`: Lógica de derivación de datos (ej. cálculos de reportes o alertas).
  - `src/screens`: Solo componentes de vista y orquestación de store.


## ⚠️ Consideraciones de Ejecución

- Al actualizar el esquema en `src/db/schema.ts`, recuerda que los usuarios actuales necesitarán migraciones o borrar la DB local (`budget.db`) para ver los cambios en desarrollo.
- Usa `npx tsc --noEmit` para verificar tipos antes de dar por finalizada una tarea.

## 🔨 Build y Distribución

- **Referencia principal**: Ver `BUILD_INSTRUCTIONS.md` para comandos completos.
- **Build release**: `docker-compose up -d && docker exec budgetapp_app-build_1 ./build-apk.sh`
- **Output**: `apk-output/budgetapp-release.apk` (~131 MB)
- **La APK release incluye JS bundle embebido** (funciona sin Metro)
- **Nota**: Primer build = 20-30 min, posteriores = 5-10 min

## 💬 Comunicación

- **Respuestas concretas**: Máx 3-4 oraciones, enfocadas en lo esencial
- **Sin introducciones/conclusiones** innecesarias
- **Evitar info redundante** o tangencial
