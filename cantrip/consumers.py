import json
from channels.generic.websocket import AsyncWebsocketConsumer

class BoardChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope["url_route"]["kwargs"]["board_id"]
        self.room_group_name = f"board_{self.board_id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")

        if msg_type == "chat":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "author": data["author"],
                    "text": data["text"],
                    "time": data["time"],
                }
            )

        elif msg_type == "token_move":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "token_move",
                    "token_id": data["token_id"],
                    "x": data["x"],
                    "y": data["y"],
                }
            )

        elif msg_type == "map_change":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "map_change",
                    "background_url": data["background_url"],
                }
            )

        elif msg_type == "token_add":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "token_add",
                    "token": data["token"],
                }
            )

        elif msg_type == "token_clear":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "token_clear",
                }
            )

    async def chat_message(self, event):
        print("ENVIANDO A CLIENTE:", event)
        await self.send(text_data=json.dumps(event))

    async def token_move(self, event):
        await self.send(text_data=json.dumps(event))

    async def map_change(self, event):
        await self.send(text_data=json.dumps(event))

    async def token_add(self, event):
        await self.send(text_data=json.dumps(event))

    async def token_clear(self, event):
        await self.send(text_data=json.dumps(event))
