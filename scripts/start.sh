#!/bin/bash
# ============================================================
# Te Reparo Manager - Launcher macOS / Linux
# ============================================================
# Doble clic para abrir la app en tu navegador.
# Cierra esta terminal para detener el servidor.
# ============================================================
# Nota macOS: para que Finder permita ejecutar .command:
#   chmod +x start.command
#   xattr -d com.apple.quarantine start.command  (solo primera vez)
# ============================================================

set -e
cd "$(dirname "$0")"

# Path absoluto a la DB SQLite (persiste entre reinicios)
DB_PATH="$(pwd)/data/te-reparo.db"

# Crear carpeta data si no existe
mkdir -p "data"

# Si no existe la DB, copiar la seed
if [ ! -f "$DB_PATH" ]; then
    if [ -f "prisma/te-reparo.db" ]; then
        echo "[start] Copiando base de datos inicial..."
        cp "prisma/te-reparo.db" "$DB_PATH"
    fi
fi

# Detectar Node.js (bundled primero, luego PATH)
NODE_EXE=""
if [ -x "node/bin/node" ]; then
    NODE_EXE="$(pwd)/node/bin/node"
elif [ -x "node/node" ]; then
    NODE_EXE="$(pwd)/node/node"
elif command -v node >/dev/null 2>&1; then
    NODE_EXE="node"
fi

if [ -z "$NODE_EXE" ]; then
    echo ""
    echo "[ERROR] No se encontro Node.js."
    echo ""
    echo "Soluciones:"
    echo "  1. Instala Node.js desde https://nodejs.org (recomendado LTS)"
    echo "  2. O usa la version portable que ya incluye Node.js bundled"
    echo ""
    read -p "Presiona Enter para cerrar..."
    exit 1
fi

echo "[start] Usando Node.js: $NODE_EXE"
echo "[start] Base de datos: $DB_PATH"
echo "[start] Iniciando servidor en http://localhost:3000 ..."
echo ""

export DATABASE_URL="file:$DB_PATH"
export PORT=3000
export NODE_ENV=production

# Abrir navegador despues de 4 segundos
(
    sleep 4
    if [ "$(uname)" = "Darwin" ]; then
        open http://localhost:3000
    else
        xdg-open http://localhost:3000 2>/dev/null || sensible-browser http://localhost:3000 2>/dev/null || true
    fi
) &

# Ejecutar el servidor en foreground (Ctrl+C para detener)
"$NODE_EXE" "app/server.js"

echo ""
echo "[start] Servidor detenido. Presiona Enter para cerrar."
read -p ""
