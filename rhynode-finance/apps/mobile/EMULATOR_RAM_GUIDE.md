# Guía de trabajo seguro con emulador Android en RAM limitada (~7 GB)

> **Scope:** Esta máquina tiene ~6.9 GB de RAM física y muchos servicios de fondo. El emulador Android (`qemu-system-x86_64`) fue asesinado por el OOM killer. Esta guía documenta cómo inspeccionar, liberar RAM y ejecutar el flujo de desarrollo móvil sin congelar el sistema.
>
> **NO enciendas Android Studio ni el emulador siguiendo solo esta guía:** primero libera RAM, configura límites y monitorea. Aborta si los indicadores de OOM aparecen.

---

## 1. Estado actual detectado

### 1.1 Android SDK / Studio / herramientas

| Componente | Ubicación / estado |
|------------|--------------------|
| Android Studio | Instalado vía snap: `/snap/bin/android-studio` (2026.1.1.10-quail1-patch2, ~1.62 GB) |
| Android SDK | `/home/juan-daniel/Android/Sdk` |
| `emulator` | `/home/juan-daniel/Android/Sdk/emulator/emulator` |
| `adb` | `/home/juan-daniel/Android/Sdk/platform-tools/adb` |
| `sdkmanager` | `/home/juan-daniel/Android/Sdk/cmdline-tools/latest/bin/sdkmanager` |
| ANDROID_HOME | `export ANDROID_HOME=/home/juan-daniel/Android/Sdk` (en `.bashrc`) |
| ANDROID_SDK_ROOT | `export ANDROID_SDK_ROOT=/home/juan-daniel/Android/Sdk` |
| SDK platforms | `android-35`, `android-36`, `android-36.1` |
| Build-tools | `35.0.0`, `36.0.0`, `36.1.0`, `37.0.0` |
| System image | `system-images/android-35/google_apis/x86_64/` |

### 1.2 AVD existente

- **Nombre:** `rhynode_pixel`
- **Archivo:** `/home/juan-daniel/.android/avd/rhynode_pixel.ini`
- **Dispositivo emulado:** Pixel 5 (`pixel_5`), Google APIs
- **API level:** Android 35
- **RAM asignada en AVD:** `hw.ramSize=2048` (2 GB)
- **Cores CPU:** `hw.cpu.ncore=2`
- **GPU aceleración:** `hw.gpu.enabled=no` (software rendering; consume menos RAM/GPU local)
- **Quick boot:** `fastboot.forceFastBoot=yes`, snapshots habilitados por defecto.

### 1.3 Línea base de RAM (instantánea tomada durante esta inspección)

```text
$ free -h
              total       usado       libre  compartido   búf/caché  disponible
Mem:           6,9Gi       3,1Gi       586Mi       421Mi       4,0Gi       3,8Gi
Inter:         7,5Gi       2,8Gi       4,7Gi
```

La memoria "disponible" real es ~3.8 GB gracias a caché/buffers reclamables, pero la RAM libre inmediata es baja (~586 MiB). Con 7 GB físicos, el emulador (2 GB) + Gradle + Metro + Android Studio fácilmente superan el límite si no se paran servicios de fondo.

### 1.4 Servicios de fondo relevantes identificados

Top consumidores de RAM/residentes:

| Proceso | RSZ aprox | Ubicación / propósito | ¿Seguro detener para dev local? |
|---------|-----------|------------------------|---------------------------------|
| `warp-terminal` | ~485 MB | Terminal IDE | No mientras se use la sesión actual |
| `claude` CLI | ~419 MB | Claude Code agente | No mientras esté activo |
| `sidekiq` (Chatwoot) | ~225 MB | Background jobs Chatwoot | Sí, si no se está atendiendo chats |
| MARC `bot-start.ts` | ~159 MB | Bot de MARC | Sí |
| `gnome-shell` | ~131 MB | Desktop GNOME | **NO** (congela la UI) |
| Chatwoot `puma` | ~104 MB | Web server Chatwoot | Sí |
| `n8n` MainThread | ~79 MB | Automaciones n8n | Sí si no hay flujos críticos corriendo |
| MARC `proactive-scheduler.ts` | ~47 MB | Scheduler MARC | Sí |
| MARC `report-worker.ts` | ~47 MB | Report worker MARC | Sí |
| `ollama serve` | ~45 MB + modelos descargados | Modelos locales | **Cuidado:** detener libera mucho más si hay modelos cargados |
| MARC `notification-worker.ts` | ~43 MB | Notificaciones MARC | Sí |
| MARC `agent-worker.ts` | ~43 MB | Agent worker MARC | Sí |
| `dockerd` | ~56 MB | Docker daemon | Sí si no hay contenedores críticos |
| `containerd` | ~35 MB | Runtime Docker | Se detiene con docker.service |
| PostgreSQL (varios) | ~15–35 MB c/u | MARC, Chatwoot, evolution | Evaluar: si se paran, apps dependientes fallan |

Otros servicios visibles: n8n task-runner, Next.js (`next-server`), varios workers de MARC, postgres para `marc`, `chatwoot`, `evolution`, pgbouncer.

> **Docker:** `docker ps` no mostró contenedores en ejecución en el momento de la inspección, pero `docker.service` está activo. Verificar siempre antes de detener.

---

## 2. Pre-vuelo: liberar RAM antes de desarrollar móvil

Antes de abrir Android Studio o encender el emulador, asegúrate de tener al menos **~4.5 GB de RAM disponible** (`free -h` columna `disponible`). Si no, detén servicios no esenciales.

### 2.1 Comandos para detener servicios de fondo (usar con criterio)

Detener servicios que NO sean críticos en este momento. Estos comandos requieren `systemctl` y privilegios de usuario/admin según el servicio.

```bash
# 1. Ver qué está activo y cuánto consume
free -h
ps -eo pid,ppid,pcpu,pmem,rsz,comm,args --sort=-pmem | head -40

# 2. Detener servicios MARC (bot, workers, scheduler)
systemctl --user stop marc-bot marc-workers marc-scheduler 2>/dev/null || true
# O si no tienen unit files nombrados, matar por patrón de directorio:
pkill -f "marc.*bot-start.ts"
pkill -f "marc.*report-worker.ts"
pkill -f "marc.*notification-worker.ts"
pkill -f "marc.*agent-worker.ts"
pkill -f "marc.*proactive-scheduler.ts"

# 3. Detener n8n (si no hay automatizaciones críticas corriendo)
sudo systemctl stop n8n 2>/dev/null || pkill -f "/usr/local/bin/n8n"

# 4. Detener Chatwoot (deja de atender mensajes/chat)
sudo systemctl stop chatwoot.target chatwoot-sidekiq chatwoot-web 2>/dev/null || true
# O si usa docker-compose:
# docker compose -f /ruta/a/chatwoot/docker-compose.yaml down

# 5. Detener Ollama (libera RAM de modelos cargados además del daemon)
sudo systemctl stop ollama 2>/dev/null || true

# 6. Detener Docker si no hay contenedros críticos
sudo systemctl stop docker.socket docker.service containerd.service 2>/dev/null || true

# 7. PostgreSQL solo si realmente no se necesita durante la sesión de dev móvil
# (si se para, MARC/Chatwoot/nextjs que dependan de él fallarán)
sudo systemctl stop postgresql@16-main pgbouncer 2>/dev/null || true
# ADVERTENCIA: no detener postgres si vas a testear endpoints de la app.

# 8. Verificar liberación
free -h
```

### 2.2 Servicios que NUNCA debes detener

- `gnome-shell`, `Xwayland`, `gdm`: congelan la interfaz gráfica.
- `systemd-journald`, `systemd-*` esenciales.
- `warp-terminal` o el emulador de terminal que estés usando a menos que puedas continuar por SSH/TTY.
- Cualquier proceso del propio `claude` / agente si lo estás usando para la sesión.

### 2.3 Liberar caché de kernel (opcional, temporal)

```bash
# Solo si realmente estás al límite; requiere sudo
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

Esto limpia pagecache, dentries e inodes. No afecta a procesos en ejecución.

---

## 3. Lanzar el emulador con RAM limitada

### 3.1 Verificar AVDs disponibles

```bash
emulator -list-avds
# Salida esperada:
# rhynode_pixel
```

### 3.2 Opciones recomendadas para baja RAM

Lanzar desde terminal, NUNCA con Android Studio GUI, para controlar exactamente los parámetros:

```bash
# Fórmula mínima segura para esta máquina
emulator -avd rhynode_pixel \
  -memory 2048 \
  -no-snapshot-save \
  -no-boot-anim \
  -gpu swiftshader_indirect \
  -cores 2 \
  -skin 720x1280
```

Explicación de flags:

| Flag | Efecto |
|------|--------|
| `-memory 2048` | Limita RAM del guest a 2 GB (coincide con `hw.ramSize` actual). No subir a 3 GB en esta máquina. |
| `-no-snapshot-save` | Cold boot completo; no guarda snapshot al salir. Ahorra I/O y evita corrupción de snapshots, pero el boot tarda más. |
| `-no-boot-anim` | Omite animación de boot; ahorra CPU/GPU. |
| `-gpu swiftshader_indirect` | Renderizado por software en el host; más lento pero consume menos recursos y es estable sin GPU dedicada. |
| `-cores 2` | Restringe a 2 cores (`hw.cpu.ncore=2` ya está configurado así). |
| `-skin 720x1280` | Resolución fija de Pixel 5; evita escalados extra. |

### 3.3 Cold boot vs Quick boot

- **Quick boot** (por defecto): usa snapshots. El arranque es rápido, pero el snapshot puede crecer y consumir I/O. Si el snapshot está corrupto o la RAM es muy baja, falla.
- **Cold boot** (`-no-snapshot-load -no-snapshot-save`): arranca desde cero. Es más lento la primera vez, pero más predecible y limpio en memoria.
- **Recomendación para esta máquina:** usar **cold boot** cuando la RAM libre sea < 1 GB; usar quick boot solo después de liberar RAM y con `-no-snapshot-save` si no quieres que el snapshot crezca.

### 3.4 Reducir aún más la RAM del emulador (opción extrema)

Si 2 GB sigue siendo mucho, puedes reducir la RAM editando la AVD:

```bash
# Editar config.ini de la AVD
nano /home/juan-daniel/.android/avd/rhynode_pixel.avd/config.ini
```

Cambiar:
```ini
hw.ramSize=1536
hw.cpu.ncore=2
hw.gpu.enabled=no
```

Luego lanzar con:
```bash
emulator -avd rhynode_pixel -memory 1536 -no-snapshot-save -no-boot-anim -gpu swiftshader_indirect
```

> **Nota:** Menos de 1.5 GB de RAM en el emulador hará que apps modernas de React Native/Expo sufran y posiblemente se cierren. 1.5–2 GB es el rango práctico mínimo.

---

## 4. Monitoreo de RAM durante build/emulación

### 4.1 Comandos básicos

```bash
# Vista global cada 2 segundos
watch -n 2 free -h

# Top por uso de memoria residente (RSZ)
ps -eo pid,pcpu,pmem,rsz,comm,args --sort=-rsz | head -20

# htop interactivo (si está instalado)
htop --sort-key PERCENT_MEM
```

### 4.2 Monitorear el emulador específicamente

```bash
# RAM del proceso qemu del emulador
ps -p $(pgrep -f qemu-system) -o pid,rsz,vsz,comm,args

# Ver logs del kernel por OOM
sudo dmesg -T | grep -iE "killed process|oom|qemu" | tail -20

# Ver journal de OOM
journalctl -k | grep -iE "killed process|oom|qemu" | tail -20
```

### 4.3 Android Studio: reducir su propio consumo

Aunque esta guía recomienda lanzar el emulador desde terminal, si se usa Android Studio:

1. Editar `studio.vmoptions` (ruta típica del snap):
   ```bash
   nano /snap/android-studio/current/bin/studio64.vmoptions
   ```
   O la ubicación de usuario:
   ```bash
   nano /home/juan-daniel/.AndroidStudio*/studio64.vmoptions
   ```

2. Forzar límites bajos:
   ```text
   -Xms256m
   -Xmx1536m
   -XX:MaxMetaspaceSize=512m
   -XX:ReservedCodeCacheSize=240m
   ```

3. Deshabilitar plugins no usados desde Android Studio: `File > Settings > Plugins` (por ej. desactivar NDK, Firebase, App Links si no se usan).

---

## 5. Build de Android con Gradle en RAM limitada

### 5.1 Configuración actual

El archivo `/home/juan-daniel/rhynode-finance/apps/mobile/android/gradle.properties` ya tiene un límite conservador:

```properties
org.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=384m
```

Esto es correcto para esta máquina. **No aumentar** este valor por encima de 2048 m sin liberar mucha RAM.

### 5.2 Construcciones aún más ligeras

Si el build falla por OOM, puedes bajar a 1 GB de heap de Gradle (más lento, más GC):

```bash
# Línea de comando (sobrescribe gradle.properties)
cd /home/juan-daniel/rhynode-finance/apps/mobile/android
./gradlew assembleDebug -Dorg.gradle.jvmargs="-Xmx1024m -XX:MaxMetaspaceSize=256m" --no-daemon
```

Flags útiles:

| Flag | Propósito |
|------|-----------|
| `--no-daemon` | No deja el daemon Gradle residente en memoria entre builds. Pierde aceleración incremental pero libera RAM inmediatamente. |
| `--offline` | Evita descargar dependencias (usa caché local). Reduce actividad de red/disco. |
| `-Pandroid.enableBuildCache=false` | Deshabilita build cache para ahorrar memoria a costa de velocidad. |
| `--max-workers=1` | Limita tareas paralelas de Gradle a 1, reduce pico de RAM. |

### 5.3 Build desde Expo (React Native)

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile

# Metro bundler puede consumir RAM; limitar workers de transformación si es posible
npx expo start --android

# O build local con límite de memoria explícito
npx expo run:android --no-install
```

Para limitar aún más el consumo de Metro, puedes setear antes:
```bash
export NODE_OPTIONS="--max-old-space-size=1536"
```

### 5.4 Construir APK sin Android Studio

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile/android
./gradlew assembleDebug --no-daemon --offline --max-workers=1
```

El APK resultante estará en `app/build/outputs/apk/debug/app-debug.apk`.

---

## 6. Cuándo preferir EAS cloud build vs build local

El proyecto usa Expo y tiene `eas.json` configurado. En esta máquina con 7 GB de RAM, **la opción preferida para builds de producción/preview es EAS Build en la nube**.

| Escenario | Recomendación |
|-----------|---------------|
| Iteración rápida de UI en emulador local | Build local con Metro + emulador, pero liberando RAM previamente. |
| Build de `apk` para distribución interna | `eas build --profile preview --platform android` |
| Build de `aab` para Play Store | `eas build --profile production --platform android` |
| Builds de release con ProGuard/R8 | EAS Build (consume mucha memoria localmente). |
| CI/CD automatizado | EAS Build o GitHub Action con runner de mayor RAM. |

Comandos EAS:

```bash
cd /home/juan-daniel/rhynode-finance/apps/mobile
npx eas build --profile preview --platform android
# o para producción
npx eas build --profile production --platform android
```

**Ventajas EAS en esta máquina:**
- No consume RAM local.
- No requiere Android Studio ni emulador encendido.
- Produce AAB/APK firmados y listos para subir.
- Evita problemas de OOM en Gradle.

**Desventajas:**
- Tiempo de cola en plan gratuito.
- Requiere cuenta Expo/EAS y proyecto configurado.

---

## 7. Señales de advertencia: abortar antes del OOM

Detén inmediatamente Android Studio, el emulador o el build si ves:

1. **`free -h` muestra `disponible` < 500 MB** mientras el emulador o Gradle están corriendo.
2. **El sistema empieza a escribir/swappear fuertemente** (`vmstat 1` muestra `si`/`so` altos).
3. **La UI de GNOME se vuelve lenta, el cursor se congela o las ventanas no responden.**
4. **`dmesg` o `journalctl` muestran `Out of memory: Killed process ...`.**
5. **El emulador se cierra solo** (`qemu-system-x86_64` desaparece de `ps`).
6. **Gradle devuelve `java.lang.OutOfMemoryError`**.
7. **Load average (`uptime`) supera el número de cores por más de 5 minutos** y la memoria disponible sigue bajando.

### Plan de aborto rápido

```bash
# 1. Matar emulador
pkill -f qemu-system

# 2. Matar Android Studio
pkill -f android-studio

# 3. Matar Gradle daemon
pkill -f "gradle.*Daemon"
pkill -f "java.*GradleDaemon"

# 4. Matar Metro bundler
pkill -f "expo.*start"
pkill -f "react-native.*metro"

# 5. Verificar liberación
free -h
```

---

## 8. Flujo recomendado paso a paso para una sesión de dev móvil

1. **Inspeccionar**:
   ```bash
   free -h
   ps -eo pid,ppid,pcpu,pmem,rsz,comm,args --sort=-pmem | head -30
   ```

2. **Liberar RAM** deteniendo MARC workers, n8n, Chatwoot, Ollama y Docker si no son críticos.

3. **Verificar** que `disponible` >= 4.5 GB.

4. **Lanzar emulador desde terminal** con límite de 2 GB y cold boot:
   ```bash
   emulator -avd rhynode_pixel -memory 2048 -no-snapshot-save -no-boot-anim -gpu swiftshader_indirect
   ```

5. **En otra terminal, monitorear**:
   ```bash
   watch -n 2 free -h
   ```

6. **Iniciar Metro / Expo** con límite de heap:
   ```bash
   cd /home/juan-daniel/rhynode-finance/apps/mobile
   export NODE_OPTIONS="--max-old-space-size=1536"
   npx expo start --android
   ```

7. **Si se necesita build de release/preview:** no hacerlo localmente; usar `eas build`.

8. **Abortar** si aparece cualquiera de las señales de advertencia de la sección 7.

---

## 9. Referencias rápidas de comandos

```bash
# Paths
ANDROID_HOME=/home/juan-daniel/Android/Sdk
AVD_NAME=rhynode_pixel
AVD_DIR=/home/juan-daniel/.android/avd/rhynode_pixel.avd
PROJECT=/home/juan-daniel/rhynode-finance/apps/mobile

# Inspección
emulator -list-avds
adb devices
free -h
ps -eo pid,pcpu,pmem,rsz,comm,args --sort=-rsz | head -20

# Liberar RAM de servicios comunes
pkill -f "marc.*bot-start.ts"
pkill -f "marc.*worker.ts"
pkill -f "marc.*scheduler.ts"
sudo systemctl stop n8n ollama docker.socket docker.service pgbouncer postgresql@16-main

# Emulador seguro
emulator -avd rhynode_pixel -memory 2048 -no-snapshot-save -no-boot-anim -gpu swiftshader_indirect

# Build ligero local
cd $PROJECT/android
./gradlew assembleDebug --no-daemon --offline --max-workers=1 \
  -Dorg.gradle.jvmargs="-Xmx1024m -XX:MaxMetaspaceSize=256m"

# Build en la nube (recomendado)
cd $PROJECT
npx eas build --profile preview --platform android

# Aborto de emergencia
pkill -f qemu-system
pkill -f android-studio
pkill -f "GradleDaemon"
pkill -f "expo.*start"
```

---

## 10. Notas de esta inspección

- Fecha de la inspección: 2026-06-28.
- Android Studio instalado vía snap; Android SDK en `/home/juan-daniel/Android/Sdk`; variables de entorno en `.bashrc`.
- AVD `rhynode_pixel` (Pixel 5, Android 35, 2 GB RAM, 2 cores, GPU software) está lista para usar con los límites descritos.
- No se encontraron procesos `qemu-system` ni `android-studio` corriendo durante la inspección.
- Gradle ya está configurado con `-Xmx1536m`, adecuado para esta máquina.
- La recomendación principal es: **no mezclar servicios de fondo con desarrollo móvil local**. Liberar RAM previamente o usar EAS Build para compilar.
