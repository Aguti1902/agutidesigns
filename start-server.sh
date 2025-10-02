#!/bin/bash

# Script para iniciar la Calculadora de Presupuesto AGUTIDESIGNS
# Autor: AGUTIDESIGNS
# Descripción: Inicia un servidor HTTP local para probar la calculadora

echo "🚀 Iniciando Calculadora de Presupuesto AGUTIDESIGNS..."
echo "📁 Directorio: $(pwd)"
echo ""

# Verificar que los archivos necesarios existan
if [ ! -f "index.html" ]; then
    echo "❌ Error: No se encuentra index.html"
    exit 1
fi

if [ ! -d "css" ] || [ ! -f "css/styles.css" ]; then
    echo "❌ Error: No se encuentra css/styles.css"
    exit 1
fi

if [ ! -d "js" ] || [ ! -f "js/calculator.js" ]; then
    echo "❌ Error: No se encuentra js/calculator.js"
    exit 1
fi

echo "✅ Todos los archivos están presentes"
echo ""

# Buscar un puerto disponible
PORT=8000
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    PORT=$((PORT+1))
done

echo "🌐 Iniciando servidor en puerto $PORT..."
echo "📱 Accede desde tu navegador en:"
echo "   👉 http://localhost:$PORT"
echo "   👉 http://127.0.0.1:$PORT"
echo ""
echo "💡 Para detener el servidor, presiona Ctrl+C"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Intentar abrir el navegador automáticamente (macOS)
if command -v open >/dev/null 2>&1; then
    echo "🔄 Abriendo navegador automáticamente..."
    sleep 2 && open "http://localhost:$PORT" &
fi

# Iniciar servidor HTTP de Python
if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server $PORT
elif command -v python >/dev/null 2>&1; then
    python -m http.server $PORT
else
    echo "❌ Error: Python no está instalado"
    echo "💡 Instala Python o usa otro servidor web"
    exit 1
fi 