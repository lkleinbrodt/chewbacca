## an SMTP mailbot for sending emails on behalf of the application

from backend.config import Config
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class MailBot:
    def __init__(self):
        self.server = smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT)

    def send_email(self, subject, body, recipients):
        msg = MIMEMultipart()
        msg["From"] = Config.MAIL_USERNAME
        if not isinstance(recipients, list):
            recipients = [recipients]
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        self.server.starttls()
        self.server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
        self.server.sendmail(Config.MAIL_USERNAME, recipients, msg.as_string())
        self.server.quit()
