# CantripVTT

Virtual Tabletop sencilla y centrada para jugar a juegos de rol. Permite usar mapas y tokens gratuitos o importar imágenes propias, crear campañas, personajes e invitar jugadores a una mesa virtual ágil y sin distracciones.

## Características

- Tablero virtual interactivo con zoom, paneo y movimiento de tokens
- Soporte para mapas estáticos y subida de mapas personalizados
- Tokens de personajes de la campaña, tokens estáticos y subida de imágenes propias
- Chat en tiempo real mediante WebSockets
- Tirada de dados (d4, d6, d8, d10, d12, d20, d100) con resultados compartidos en el chat
- Bloc de notas personal por usuario y tablero con guardado automático
- Ficha de personaje visual con atributos, modificadores y habilidades
- Roles de Dungeon Master y Jugador con permisos diferenciados
- Gestión de campañas y personajes (crear, editar, eliminar)
- Autenticación de usuarios con registro, login y logout
- Interfaz responsive con Bootstrap 5 y tema oscuro personalizado
- Panel de administración vía Django Admin
- Despliegue con Docker y Docker Compose

---

## Tecnologías

### Backend
- **Django** 6.0 - Framework web Python
- **Python** 3.12 - Lenguaje de programación
- **PostgreSQL** 16 - Base de datos relacional
- **Daphne** - Servidor ASGI para WebSockets
- **Channels** - Manejo de WebSockets y comunicación en tiempo real
- **Pillow** 12.1.1 - Procesamiento de imágenes
- **WhiteNoise** - Servicio de archivos estáticos

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos personalizados con variables CSS
- **JavaScript** - Lógica del tablero, modales y comunicación WebSocket
- **Bootstrap 5** - Framework CSS

### Infraestructura
- **Docker** + **Docker Compose** - Contenedorización
- **GitHub Actions** - CI/CD automatizado (opcional)

---

## Inicio Rápido (Docker)

### 1. Clonar y configurar

```bash
git clone https://github.com/Arivpan782/CantripVTT.git
cd CantripVTT
cp .env.example .env
# Edita .env con tus valores
```

### 2. Ejecutar con Docker Compose

```bash
docker compose up -d
```

Esto inicia:
1. Base de datos PostgreSQL
2. Aplicación web con Daphne en http://localhost:8000

### 3. Crear un superusuario

```bash
docker compose exec web python manage.py createsuperuser
```

### 4. Acceder

- Aplicación: http://localhost:8000
- Panel de administración: http://localhost:8000/admin/

---

## Desarrollo Local (sin Docker)

### Requisitos
- Python 3.12+
- PostgreSQL 16+

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar entorno
cp .env.example .env
# Edita .env, establece DB_HOST=localhost y otras variables

# Ejecutar migraciones
python manage.py migrate

# Ejecutar servidor de desarrollo
python manage.py runserver
```

---

## Estructura del Proyecto

```
CantripVTT/
├── cantrip/                       # Aplicación principal (lógica de negocio)
│   ├── models.py                  # Modelos: Campaign, Character, Board, Token, BoardNote
│   ├── views.py                   # Vistas CBV y FBV para campañas, personajes, tablero, API
│   ├── forms.py                   # Formularios de campañas, personajes y confirmación de borrado
│   ├── admin.py                   # Registro de modelos en Django Admin
│   ├── consumers.py               # Consumidor WebSocket para chat, tokens, dados y mapas
│   ├── urls.py                    # Rutas de la aplicación
│   ├── templatetags/
│   │   └── cantrip_filters.py     # Filtros personalizados (basename)
│   └── static/
│       └── cantrip/
│           ├── js/
│           │   ├── board.js       # Lógica completa del tablero virtual
│           │   └── character_create.js  # Selector de imagen en formulario de personaje
│           └── css/
│               └── styles.css     # Estilos personalizados (variables, modales, tablero, chat)
├── accounts/                      # Aplicación de usuarios personalizada
│   ├── models.py                  # Modelo User custom (AbstractUser)
│   ├── forms.py                   # Formularios de registro y login
│   ├── views.py                   # Vistas de autenticación
│   └── urls.py                    # Rutas de cuentas
├── config/                        # Configuración del proyecto Django
│   ├── settings.py                # Configuración unificada (desarrollo y producción)
│   ├── urls.py                    # Rutas principales
│   ├── asgi.py                    # Punto de entrada ASGI (Daphne + Channels)
│   └── wsgi.py                    # Punto de entrada WSGI
├── static/                        # Archivos estáticos globales
│   ├── assets/
│   │   ├── maps/                  # Mapas estáticos predefinidos
│   │   ├── tokens/                # Tokens estáticos predefinidos
│   │   ├── dice/                  # Iconos de dados
│   │   └── misc/                  # Imágenes varias (home)
│   ├── css/
│   │   └── styles.css             # Estilos base (Bootstrap + personalizados)
│   └── js/                        # Scripts adicionales
├── templates/                     # Plantillas HTML
│   ├── base.html                  # Plantilla base con navbar y footer
│   ├── cantrip/
│   │   ├── home.html              # Página de inicio con carruseles de mapas y tokens
│   │   ├── campaign_*.html        # CRUD de campañas
│   │   ├── character_*.html       # CRUD de personajes
│   │   └── board_detail.html      # Tablero virtual con chat, dados, notas y ficha
│   └── accounts/
│       ├── login.html
│       ├── logout.html
│       └── register.html
├── media/                         # Archivos subidos (mapas, tokens, imágenes de personajes)
├── Dockerfile                     # Imagen Docker de la aplicación
├── docker-compose.yml             # Orquestación de contenedores
├── wait-for-db.sh                 # Script para esperar a que la BD esté lista
├── requirements.txt               # Dependencias de Python
└── manage.py                      # Script de gestión de Django
```


---

## Variables de Entorno

| Variable | Descripción |
|---|---|
| `SECRET_KEY` | Clave secreta de Django |
| `DB_NAME` | Nombre de la base de datos PostgreSQL |
| `DB_USER` | Usuario de PostgreSQL |
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `DB_HOST` | Host de la BD (por defecto `db`) |
| `DB_PORT` | Puerto de la BD (por defecto `5432`) |
| `ALLOWED_HOSTS` | Hosts permitidos separados por comas |

---

## Uso

1. Registra una cuenta o inicia sesión.
2. Crea una campaña como Dungeon Master.
3. Invita jugadores mediante su email.
4. Crea personajes para la campaña.
5. Abre el tablero virtual.
6. Como DM: carga un mapa, añade tokens, mueve fichas.
7. Como Jugador: mueve tu token, chatea, tira dados, toma notas.
8. Consulta la ficha de tu personaje en cualquier momento.

---

## Notas de Seguridad

- Protección CSRF de Django en todos los formularios y peticiones fetch
- Autenticación con usuario custom basado en email
- Permisos diferenciados por rol (DM vs Jugador) en vistas y acciones
- Validación de archivos de imagen en subidas de mapas y tokens
- Canal WebSocket por tablero con grupo único