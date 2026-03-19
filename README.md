CantripVTT - Virtual TableTop para jugar DnD

Requisitos:

Modelo User con variables:
email
nombre de usuario
contraseña

Modelo Campaña con variables:
jugadores (lista de users foreign key one to many, un usuario puede ser jugador de varias campañas)
dungeon master (user foreign key one to many, un usuario puede ser dungeon master de varias campañas)
nombre
fecha de creación (automática)

Modelo Personaje con variables:
nombre
user (usuario foreign key one to many, un usuario puede tener varios personajes)
estadísticas generales de una character sheet de dnd 5º edición (quizá simplificada)

Chat en tiempo real donde los jugadores pueden enviar mensajes y donde se verán los resultados de los dados

Funciones de dados: dado D4, dado D6, dado D8, dado D10,  dado D12, dado D20 y dado D100. Se selecciona cuantos tirar y sale el resultado en el chat

Cuadrado en cuadrículas que servirá para poner un mapa de fondo y los tokens de los jugadores y npc

Botón para abrir un bloc de notas para tomar apuntes, el dungeon master tienen el suyo propio y los jugadores también

El dungeon master puede poner un mapa, poner tokens de personajes y npcs y moverlos. Los jugadores solo pueden mover sus tokens de personaje.

Botón donde habrá una sección para elegir mapas y tokens de free assets (solo puede verlo el dungeon master)
