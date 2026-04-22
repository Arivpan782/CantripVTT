# Cantrip VTT

Cantrip VTT es un tablero virtual pensado para dirigir y jugar campañas de rol de forma sencilla y sin depender de herramientas pesadas. Todo funciona en tiempo real mediante WebSockets, y la idea es que tanto el DM como los jugadores puedan centrarse en la partida sin pelearse con la interfaz.

## Características principales

### Tablero interactivo
- Canvas optimizado para mover tokens, hacer zoom y desplazar el mapa.
- Tokens circulares con imágenes, tamaños configurables y etiquetas.
- Movimiento sincronizado en tiempo real para todos los jugadores.

### Gestión de mapas
- Selección de mapas estáticos incluidos en el proyecto.
- Subida de mapas personalizados por parte del DM.
- Cambio de mapa sincronizado para todos los jugadores.
- Ajuste automático de escala para encajar el mapa en el tablero.

### Tokens personalizables
- Tokens de personajes de campaña.
- Tokens estáticos predefinidos.
- Subida de imágenes personalizadas.
- Creación rápida con nombre y tamaño.
- Eliminación individual o limpieza global.

### Chat integrado
- Chat en tiempo real para toda la mesa.
- Mensajes con autor y hora.
- Las tiradas de dados se muestran automáticamente en el chat.

### Sistema de dados
- Tiradas rápidas desde un modal dedicado.
- Soporte para d4, d6, d8, d10, d12, d20 y d100.
- Bonificadores positivos o negativos.
- Resultado enviado automáticamente al chat.

### Sincronización en tiempo real
- Todas las acciones se transmiten mediante WebSockets.
- Cada cambio del DM o de un jugador se refleja al instante en todos los clientes.

## Tecnologías utilizadas
- Django + Channels para backend y WebSockets.
- JavaScript para la interacción del tablero.
- Canvas 2D para renderizar mapas y tokens.
- HTML y CSS para la interfaz.
- Docker para despliegue y entorno estable.

## Objetivo del proyecto
Crear un VTT ligero, rápido y totalmente personalizable, sin depender de plataformas externas ni sistemas cerrados. La intención es ofrecer una herramienta práctica para dirigir campañas sin complicaciones.
