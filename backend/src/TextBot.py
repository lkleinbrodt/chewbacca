"""
For now, this is just using a twilio implementation
in the future we can abstract this so it would work with other providers as well
"""

from twilio.rest import Client
from datetime import datetime, timedelta
from backend.config import Config


class RateLimitError(Exception):
    def __init__(self, ip, message="Rate limit exceeded"):
        self.ip = ip
        self.message = message
        super().__init__(self.message)


class TextBot:
    def __init__(self, ip_limit=5, suffix=""):
        self.client = Client(Config.TWILIO_ACCOUNT_SID, Config.TWILIO_AUTH_TOKEN)
        self.to_number_history = {}
        self.from_ip_history = {}
        self.suffix = suffix

        self.ip_window_limit = timedelta(minutes=5)
        self.ip_limit = ip_limit
        phone_number = Config.TWILIO_PHONE_NUMBER
        if str(phone_number)[0] != "+":
            phone_number = "+" + str(phone_number)
        assert phone_number[:2] == "+1", phone_number
        self.phone_number = phone_number

    def update_ip_rate(self, ip):
        "If this IP has tried to send more than `limit` messages in that last n_minutes, raise ratelimit exception"
        if ip not in self.from_ip_history:
            self.from_ip_history[ip] = {"count": 1, "timestamp": datetime.utcnow()}
            return True

        if self.from_ip_history[ip]["count"] >= self.ip_limit:
            block_until = self.message_counts[ip]["timestamp"] + self.ip_window_limit
            current_time = datetime.utcnow()
            if current_time >= block_until:
                # Reset attempts after block expires
                self.message_counts[ip] = {"count": 1, "timestamp": datetime.now()}
            else:
                raise RateLimitError(ip)
        else:
            self.message_counts[ip]["count"] += 1
            self.message_counts[ip]["timestamp"] = datetime.utcnow()

        return True

    def send_message(self, to_number, message_body, from_ip=None):

        if str(to_number)[0] != "+":
            to_number = "+" + str(to_number)
        assert to_number[:2] == "+1", to_number

        if from_ip is not None:
            self.update_ip_rate(from_ip)

        self.check_message_history(to_number)

        message_body = message_body[:1600] + self.suffix

        # Send a text message using Twilio
        message = self.client.messages.create(
            body=message_body, from_=self.phone_number, to=to_number
        )

        # Track the number of messages sent to each recipient
        self._update_message_history(to_number)

        return message.sid

    def check_message_history(self, to_number, n_minutes=60, limit=4):
        """if there have been more than limit messages to the number in the last n_minutes, return false"""
        timestamps = self.to_number_history.get(to_number, [])
        current_time_utc = datetime.utcnow()
        filtered_timestamps = [
            timestamp
            for timestamp in timestamps
            if current_time_utc - timestamp <= timedelta(minutes=n_minutes)
        ]
        if len(filtered_timestamps) >= limit:
            raise RateLimitError(
                None, message="Too many messages sent to this number in the last hour"
            )

    def _update_message_history(self, to_number):
        current_time_utc = datetime.utcnow()
        self.to_number_history[to_number] = self.to_number_history.get(
            to_number, []
        ) + [current_time_utc]
