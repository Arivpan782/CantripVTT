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

        elif msg_type == "token_delete":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "token_delete",
                    "token_id": data["token_id"],
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "author": event["author"],
            "text": event["text"],
            "time": event["time"],
        }))

    async def token_move(self, event):
        await self.send(text_data=json.dumps({
            "type": "token_move",
            "token_id": event["token_id"],
            "x": event["x"],
            "y": event["y"],
        }))

    async def map_change(self, event):
        await self.send(text_data=json.dumps({
            "type": "map_change",
            "background_url": event["background_url"],
        }))

    async def token_add(self, event):
        await self.send(text_data=json.dumps({
            "type": "token_add",
            "token": event["token"],
        }))

    async def token_clear(self, event):
        await self.send(text_data=json.dumps({
            "type": "token_clear",
        }))

    async def token_delete(self, event):
        await self.send(text_data=json.dumps({
            "type": "token_delete",
            "token_id": event["token_id"],
        }))

    async def dice_roll(self, event):
        await self.send(text_data=json.dumps({
            "type": "dice_roll",
            "author": event["author"],
            "notation": event["notation"],
            "results": event["results"],
            "total": event["total"],
            "bonus": event.get("bonus", 0),
        }))
