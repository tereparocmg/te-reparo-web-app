#!/bin/bash
# ============================================================
# Te Reparo Manager - Launcher macOS (.command)
# ============================================================
# Doble clic desde Finder para abrir la app en tu navegador.
# Cierra esta terminal para detener el servidor.
# ============================================================
# En macOS, los archivos .command son equivalentes a .sh
# pero Finder los reconoce como ejecutables al hacer doble clic.
# ============================================================

# Reutiliza el mismo codigo de start.sh
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
exec ./start.sh
