#!/usr/bin/env python3
"""Genera el PDF del informe de migración Tauri + NestJS"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Preformatted, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import os

OUTPUT = '/home/z/my-project/download/Informe-Migracion-Tauri-NestJS.pdf'

# Paleta
RED = HexColor('#E63946')
BLACK = HexColor('#1A1A1A')
GRAY = HexColor('#6B6B6B')
LIGHT = HexColor('#F5F5F5')
WHITE = HexColor('#FFFFFF')

# Estilos
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('CustomTitle', fontName='Helvetica-Bold', fontSize=24, textColor=RED, spaceAfter=20, alignment=TA_CENTER))
styles.add(ParagraphStyle('CustomH1', fontName='Helvetica-Bold', fontSize=18, textColor=RED, spaceBefore=20, spaceAfter=10))
styles.add(ParagraphStyle('CustomH2', fontName='Helvetica-Bold', fontSize=14, textColor=BLACK, spaceBefore=15, spaceAfter=8))
styles.add(ParagraphStyle('CustomH3', fontName='Helvetica-Bold', fontSize=12, textColor=BLACK, spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle('CustomBody', fontName='Helvetica', fontSize=10, leading=15, alignment=TA_JUSTIFY, spaceAfter=6))
styles.add(ParagraphStyle('CustomCode', fontName='Courier', fontSize=8, leading=11, textColor=BLACK, backColor=LIGHT, leftIndent=10, rightIndent=10, spaceBefore=5, spaceAfter=5))
styles.add(ParagraphStyle('CoverTitle', fontName='Helvetica-Bold', fontSize=28, textColor=RED, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle('CoverSubtitle', fontName='Helvetica', fontSize=14, textColor=GRAY, alignment=TA_CENTER, spaceAfter=30))
styles.add(ParagraphStyle('TableCell', fontName='Helvetica', fontSize=9, leading=12))
styles.add(ParagraphStyle('TableHeader', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=WHITE))

def make_table(data, col_widths=None):
    """Crea una tabla con estilo consistente"""
    available = 16 * cm
    if not col_widths:
        col_widths = [available / len(data[0])] * len(data[0])
    
    styled_data = []
    for i, row in enumerate(data):
        styled_row = []
        for cell in row:
            if isinstance(cell, str):
                if i == 0:
                    styled_row.append(Paragraph(cell, styles['TableHeader']))
                else:
                    styled_row.append(Paragraph(cell, styles['TableCell']))
            else:
                styled_row.append(cell)
        styled_data.append(styled_row)
    
    t = Table(styled_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLACK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#CCCCCC')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    return t

story = []

# ============ PORTADA ============
story.append(Spacer(1, 6*cm))
story.append(Paragraph('Te Reparo Manager', styles['CoverTitle']))
story.append(Paragraph('Informe de Migración', styles['CoverSubtitle']))
story.append(Paragraph('Aplicación de Escritorio con Tauri<br/>API REST con NestJS<br/>Sincronización en la Nube', styles['CoverSubtitle']))
story.append(Spacer(1, 4*cm))
story.append(Paragraph('2025 · Cuba', ParagraphStyle('Footer', fontName='Helvetica', fontSize=10, textColor=GRAY, alignment=TA_CENTER)))
story.append(PageBreak())

# ============ ÍNDICE ============
story.append(Paragraph('Índice', styles['CustomH1']))
story.append(Spacer(1, 0.3*cm))
indice = [
    ['Parte 1: Migración a Aplicación de Escritorio con Tauri', ''],
    ['  1. Objetivo', ''],
    ['  2. Arquitectura Propuesta', ''],
    ['  3. Ventajas de Tauri sobre Electron', ''],
    ['  4. Pasos de Migración', ''],
    ['  5. Sincronización Offline', ''],
    ['  6. Build y Distribución', ''],
    ['Parte 2: API REST con NestJS', ''],
    ['  1. Objetivo', ''],
    ['  2. Arquitectura', ''],
    ['  3. Base de Datos en la Nube', ''],
    ['  4. Estructura del Proyecto', ''],
    ['  5. Endpoints Principales', ''],
    ['  6. Seguridad', ''],
    ['  7. Despliegue', ''],
    ['Parte 3: Conexión entre la App y la API', ''],
    ['  1. Flujo de Autenticación', ''],
    ['  2. Flujo de Datos con TanStack Query', ''],
    ['  3. Sincronización Bidireccional', ''],
    ['  4. Tabla de Cambios (Change Log)', ''],
    ['  5. Configuración en la App', ''],
    ['  6. Cronograma de Migración', ''],
]
story.append(make_table(indice, [14*cm, 2*cm]))
story.append(PageBreak())

# ============ PARTE 1 ============
story.append(Paragraph('Parte 1: Migración a Aplicación de Escritorio con Tauri', styles['CustomH1']))

story.append(Paragraph('1. Objetivo', styles['CustomH2']))
story.append(Paragraph(
    'Migrar la aplicación web actual de Te Reparo Manager (Next.js) a una aplicación de escritorio '
    'nativa usando Tauri, manteniendo toda la interfaz React pero reemplazando la capa de datos '
    'para consumir una API REST remota en lugar del store local en memoria. El objetivo principal '
    'es permitir que el administrador pueda realizar cambios de datos desde cualquier lugar y que '
    'estos se sincronicen automáticamente con todas las aplicaciones conectadas, ya sean de '
    'escritorio o futuras aplicaciones móviles.', styles['CustomBody']))

story.append(Paragraph('2. Arquitectura Propuesta', styles['CustomH2']))
story.append(Paragraph(
    'La arquitectura se compone de tres capas principales: el frontend React que corre dentro '
    'del WebView nativo de Tauri, el runtime de Tauri en Rust que gestiona el acceso al sistema '
    'de archivos y la caché offline con SQLite, y la API REST remota con NestJS que centraliza '
    'todos los datos en una base de datos PostgreSQL en la nube.', styles['CustomBody']))

arch_data = [
    ['Componente', 'Tecnología', 'Función'],
    ['Frontend', 'React + Vite + TypeScript', 'Interfaz de usuario (misma que la web)'],
    ['Runtime', 'Tauri (Rust)', 'WebView nativo, archivos locales, SQLite'],
    ['API REST', 'NestJS + Prisma', 'Lógica de negocio, autenticación JWT'],
    ['Base de Datos', 'PostgreSQL (Nube)', 'Almacenamiento centralizado'],
]
story.append(make_table(arch_data))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph('3. Ventajas de Tauri sobre Electron', styles['CustomH2']))
story.append(Paragraph(
    'Tauri ofrece ventajas significativas frente a Electron para esta aplicación. El tamaño del '
    'binario es considerablemente menor (3-10 MB frente a 150-200 MB de Electron), el consumo de '
    'memoria RAM es mucho más eficiente (30-50 MB frente a 150-300 MB), y utiliza el WebView '
    'nativo del sistema operativo en lugar de empaquetar Chromium, lo que reduce drásticamente '
    'el tamaño de la aplicación. Además, la capa backend en Rust proporciona mayor seguridad y '
    'rendimiento.', styles['CustomBody']))

tauri_data = [
    ['Aspecto', 'Tauri', 'Electron'],
    ['Tamaño binario', '3-10 MB', '150-200 MB'],
    ['Consumo RAM', '30-50 MB', '150-300 MB'],
    ['Seguridad', 'Alta (Rust)', 'Media'],
    ['WebView', 'Nativo del OS', 'Chromium incluido'],
    ['Backend', 'Rust (opcional)', 'Node.js'],
]
story.append(make_table(tauri_data))
story.append(PageBreak())

story.append(Paragraph('4. Pasos de Migración', styles['CustomH2']))
story.append(Paragraph(
    'La migración se divide en siete fases que deben ejecutarse secuencialmente. Cada fase '
    'produce un entregable verificable antes de avanzar a la siguiente.', styles['CustomBody']))

pasos_data = [
    ['Fase', 'Descripción', 'Duración'],
    ['1. Configuración Tauri', 'Crear proyecto con React + Vite + TypeScript', '1 día'],
    ['2. Configurar Tailwind', 'Migrar paleta rojo/negro y estilos', '1 día'],
    ['3. Migrar Componentes', 'Mover componentes reemplazando useStore por TanStack Query', '3 días'],
    ['4. Configurar API Client', 'Axios con interceptores JWT', '1 día'],
    ['5. Configurar Tauri', 'tauri.conf.json, permisos, CSP', '1 día'],
    ['6. Sincronización Offline', 'SQLite local + sync bidireccional', '3 días'],
    ['7. Build y Distribución', 'Generar instaladores (.msi, .dmg, .deb)', '2 días'],
]
story.append(make_table(pasos_data))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph('5. Sincronización Offline', styles['CustomH2']))
story.append(Paragraph(
    'La sincronización offline es un componente crítico del sistema. Cuando la aplicación de '
    'escritorio pierde conexión a internet, debe poder seguir funcionando con los datos locales '
    'y sincronizar los cambios cuando se recupere la conexión. Para esto se utiliza el plugin '
    'tauri-plugin-sqlite que permite almacenar una caché local de los datos y una cola de '
    'cambios pendientes.', styles['CustomBody']))
story.append(Paragraph(
    'El flujo es el siguiente: cuando el usuario hace un cambio sin conexión, se guarda en la '
    'base de datos SQLite local con un flag synced=0. Cuando se recupera la conexión, un proceso '
    'automático envía todos los cambios pendientes a la API REST mediante el endpoint POST /sync/push. '
    'La API confirma cada cambio y la app los marca como sincronizados.', styles['CustomBody']))

story.append(Paragraph('6. Build y Distribución', styles['CustomH2']))
story.append(Paragraph(
    'Tauri genera instaladores nativos para cada sistema operativo: archivos .msi o .exe para '
    'Windows, .dmg para macOS, y .deb o .AppImage para Linux. El comando npm run tauri build '
    'produce automáticamente estos instaladores. Para distribución se puede usar GitHub Releases, '
    'un servidor propio de descargas, o integrar actualizaciones automáticas con el plugin '
    'tauri-plugin-updater.', styles['CustomBody']))

story.append(PageBreak())

# ============ PARTE 2 ============
story.append(Paragraph('Parte 2: API REST con NestJS', styles['CustomH1']))

story.append(Paragraph('1. Objetivo', styles['CustomH2']))
story.append(Paragraph(
    'Crear un servidor API REST con NestJS que centralice todos los datos de Te Reparo Manager. '
    'Esta API permite que la aplicación de escritorio (Tauri), la aplicación web actual, y '
    'futuras aplicaciones móviles se conecten a una base de datos unificada en la nube. El '
    'administrador puede realizar cambios desde cualquier dispositivo y estos se propagan a '
    'todas las aplicaciones conectadas mediante el sistema de sincronización.', styles['CustomBody']))

story.append(Paragraph('2. Base de Datos en la Nube', styles['CustomH2']))
story.append(Paragraph(
    'Se recomienda utilizar un proveedor de PostgreSQL administrado en la nube. Las opciones '
    'principales son Supabase (que ofrece 500 MB gratuitos con Auth y Realtime incluido), Neon '
    '(PostgreSQL serverless con 3 GB gratuitos y branching), Railway (despliegue fácil por $5/mes), '
    'y Render (con 90 días gratuitos). Para Te Reparo Manager se recomienda Supabase por su plan '
    'gratuito generoso y las funcionalidades adicionales de autenticación y tiempo real.', styles['CustomBody']))

bd_data = [
    ['Proveedor', 'Plan Gratuito', 'Ventajas'],
    ['Supabase', '500 MB', 'PostgreSQL + Auth + Realtime'],
    ['Neon', '3 GB', 'Serverless, branching de DB'],
    ['Railway', '$5/mes', 'Despliegue con un clic'],
    ['Render', '90 días', 'PostgreSQL + despliegue web'],
]
story.append(make_table(bd_data))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph('3. Estructura del Proyecto NestJS', styles['CustomH2']))
story.append(Paragraph(
    'El proyecto NestJS se organiza en módulos, cada uno con su controlador, servicio y DTOs. '
    'Los módulos principales son: Auth (JWT con Passport), Users, Workshops, Products, Pieces, '
    'Categories, Sales, Services, Clients, Operarios, Movements, Purchases, OperatorPayments, '
    'Devoluciones, Dashboard, Config y Sync (módulo nuevo para sincronización).', styles['CustomBody']))

story.append(Paragraph('4. Endpoints Principales', styles['CustomH2']))
story.append(Paragraph(
    'La API expone endpoints REST para cada entidad del sistema. Todos los endpoints están '
    'protegidos con JWT y validados con class-validator. Los roles se controlan con el decorador '
    '@Roles() y el RolesGuard. A continuación se listan los endpoints principales:', styles['CustomBody']))

endpoints_data = [
    ['Método', 'Endpoint', 'Descripción'],
    ['POST', '/api/auth/login', 'Login, devuelve JWT'],
    ['GET', '/api/sync/changes', 'Cambios desde una fecha'],
    ['POST', '/api/sync/push', 'Enviar cambios locales'],
    ['GET', '/api/operarios', 'Listar operarios'],
    ['POST', '/api/servicios', 'Crear servicio'],
    ['POST', '/api/sales', 'Crear venta'],
    ['GET', '/api/products', 'Listar productos'],
    ['PATCH', '/api/config', 'Actualizar configuración'],
]
story.append(make_table(endpoints_data))
story.append(Spacer(1, 0.3*cm))

story.append(Paragraph('5. Seguridad', styles['CustomH2']))
story.append(Paragraph(
    'La seguridad se implementa en múltiples capas: JWT con expiración de 24 horas y refresh '
    'token, Guards de roles que verifican el rol del usuario en cada petición, CORS configurado '
    'para permitir únicamente los orígenes autorizados (tauri://localhost y la URL del frontend '
    'web), validación de entrada con class-validator y class-transformer en todos los DTOs, y '
    'rate limiting con @nestjs/throttler para prevenir abusos de la API.', styles['CustomBody']))

story.append(PageBreak())

# ============ PARTE 3 ============
story.append(Paragraph('Parte 3: Conexión entre la App y la API', styles['CustomH1']))

story.append(Paragraph('1. Flujo de Autenticación', styles['CustomH2']))
story.append(Paragraph(
    'Cuando el usuario inicia la aplicación de escritorio, se muestra la pantalla de login. Al '
    'ingresar sus credenciales, la app envía una petición POST /api/auth/login a la API REST. '
    'Si las credenciales son válidas, la API devuelve un access_token JWT que se almacena en '
    'memoria (no en localStorage por seguridad en apps de escritorio). Todas las peticiones '
    'subsiguientes incluyen este token en el header Authorization: Bearer.', styles['CustomBody']))

story.append(Paragraph('2. Flujo de Datos con TanStack Query', styles['CustomH2']))
story.append(Paragraph(
    'TanStack Query gestiona el cache de datos del lado del cliente. Cada entidad (productos, '
    'piezas, ventas, servicios) se obtiene mediante useQuery y se cachea durante 5 minutos. '
    'Cuando se hace una mutación (crear venta, editar producto), se invalida el cache '
    'correspondiente para que la próxima consulta obtenga datos frescos. El flag '
    'refetchOnWindowFocus: true asegura que al volver a la app se actualicen los datos.', styles['CustomBody']))

story.append(Paragraph('3. Sincronización Bidireccional', styles['CustomH2']))
story.append(Paragraph(
    'La sincronización bidireccional es el componente más importante de la arquitectura. Permite '
    'que los cambios realizados por el administrador desde la web se propaguen automáticamente '
    'a la aplicación de escritorio, y viceversa. Existen dos escenarios principales:', styles['CustomBody']))

story.append(Paragraph(
    '<b>Escenario A — Admin hace cambios desde la web:</b> El administrador modifica un producto '
    'desde la aplicación web. La API REST guarda el cambio en PostgreSQL y lo registra en la '
    'tabla change_log. La app de escritorio, cada 5 minutos, consulta GET /api/sync/changes '
    'con la fecha del último sync. La API devuelve los cambios, y la app actualiza su cache local.', 
    styles['CustomBody']))

story.append(Paragraph(
    '<b>Escenario B — App desktop hace cambios sin conexión:</b> El usuario hace cambios sin '
    'conexión a internet. Los cambios se guardan en SQLite local con flag synced=0. Cuando se '
    'recupera la conexión, la app envía POST /api/sync/push con todos los cambios pendientes. '
    'La API los aplica y confirma, y la app los marca como sincronizados.', styles['CustomBody']))

story.append(Paragraph('4. Tabla de Cambios (Change Log)', styles['CustomH2']))
story.append(Paragraph(
    'El backend mantiene una tabla change_log que registra cada modificación con: tabla afectada, '
    'ID del registro, tipo de acción (INSERT/UPDATE/DELETE), datos nuevos en formato JSON, '
    'fecha del cambio, usuario que lo realizó, y un flag de sincronización. Esta tabla permite '
    'que las apps consulten solo los cambios desde su última sincronización, optimizando el '
    'tráfico de red.', styles['CustomBody']))

story.append(Paragraph('5. Configuración en la App', styles['CustomH2']))
story.append(Paragraph(
    'En la pantalla de Configuración de Te Reparo Manager se añade una sección de Sincronización '
    'con Servidor que muestra el estado de conexión, la fecha de la última sincronización, la '
    'cantidad de cambios pendientes, y botones para solicitar cambios manualmente o sincronizar '
    'inmediatamente. También permite configurar la URL del servidor y la frecuencia de '
    'sincronización automática.', styles['CustomBody']))

story.append(Paragraph('6. Cronograma de Migración', styles['CustomH2']))

cron_data = [
    ['Fase', 'Duración', 'Entregable'],
    ['1. Configurar NestJS + Prisma + PostgreSQL', '1 semana', 'API básica funcionando'],
    ['2. Migrar endpoints uno a uno', '2 semanas', 'API completa'],
    ['3. Configurar proyecto Tauri', '3 días', 'App de escritorio base'],
    ['4. Migrar componentes React', '1 semana', 'UI funcional'],
    ['5. Implementar sincronización', '1 semana', 'Sync bidireccional'],
    ['6. Testing y despliegue', '1 semana', 'App en producción'],
    ['Total', '~6 semanas', 'Sistema completo'],
]
story.append(make_table(cron_data))

# Generar PDF
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    topMargin=2*cm,
    bottomMargin=2*cm,
    leftMargin=2*cm,
    rightMargin=2*cm,
    title='Informe de Migración — Te Reparo Manager',
    author='Te Reparo Manager',
    subject='Migración a Tauri + NestJS',
)

doc.build(story)
print(f'PDF generado: {OUTPUT}')
print(f'Tamaño: {os.path.getsize(OUTPUT) / 1024:.1f} KB')
