"""Unit tests for the reusable notification helpers."""
import unittest
from unittest.mock import MagicMock, patch

from backend.shared.notifications import (
    NotificationStatus,
    Notifier,
)
from backend.shared.notifications import email_provider, sms_provider
from backend.shared.notifications import push_provider, whatsapp_provider
from backend.shared.notifications.config import EmailConfig, PushConfig, TwilioConfig
from backend.shared.notifications.email_provider import EmailProvider
from backend.shared.notifications.push_provider import PushProvider
from backend.shared.notifications.sms_provider import SmsProvider
from backend.shared.notifications.whatsapp_provider import WhatsAppProvider


class TestNotConfigured(unittest.TestCase):
    """With no env vars, every channel reports not_configured and never raises."""

    def test_email_not_configured(self):
        provider = EmailProvider(
            EmailConfig(host=None, port=587, username=None, password=None, sender=None, use_tls=True, timeout=15)
        )
        result = provider.send("jane@example.com", "Hi", "Body")
        self.assertEqual(result.status, NotificationStatus.NOT_CONFIGURED)
        self.assertFalse(result.success)
        self.assertEqual(result.recipient, "j***e@example.com")  # masked

    def test_sms_not_configured(self):
        provider = SmsProvider(
            TwilioConfig(account_sid=None, auth_token=None, sms_from=None, whatsapp_from=None, timeout=15)
        )
        result = provider.send("+15551234567", "Body")
        self.assertEqual(result.status, NotificationStatus.NOT_CONFIGURED)

    def test_push_not_configured(self):
        provider = PushProvider(PushConfig(server_key=None, timeout=15))
        result = provider.send("token123456", "Title", "Body")
        self.assertEqual(result.status, NotificationStatus.NOT_CONFIGURED)
        self.assertEqual(result.recipient, "***3456")  # masked


class TestConfiguredChannels(unittest.TestCase):
    def test_reports_per_channel(self):
        notifier = Notifier(
            email=EmailProvider(
                EmailConfig(host="smtp.test", port=587, username="u", password="p", sender="a@b.com", use_tls=True, timeout=15)
            ),
            sms=SmsProvider(
                TwilioConfig(account_sid=None, auth_token=None, sms_from=None, whatsapp_from=None, timeout=15)
            ),
        )
        channels = notifier.configured_channels()
        self.assertTrue(channels["email"])
        self.assertFalse(channels["sms"])


class TestEmailSendSuccess(unittest.TestCase):
    def test_sends_via_smtp(self):
        cfg = EmailConfig(
            host="smtp.test", port=587, username="u", password="p", sender="from@test.com", use_tls=True, timeout=15
        )
        provider = EmailProvider(cfg)
        fake_server = MagicMock()
        ctx = MagicMock()
        ctx.__enter__.return_value = fake_server
        with patch.object(email_provider.smtplib, "SMTP", return_value=ctx) as smtp_cls:
            result = provider.send("jane@example.com", "Hi", "Body", html="<b>Body</b>")
        self.assertEqual(result.status, NotificationStatus.SENT)
        self.assertTrue(result.success)
        smtp_cls.assert_called_once()
        fake_server.starttls.assert_called_once()
        fake_server.login.assert_called_once_with("u", "p")
        fake_server.send_message.assert_called_once()


class TestSmsSendSuccess(unittest.TestCase):
    def test_sends_via_twilio(self):
        cfg = TwilioConfig(
            account_sid="AC123", auth_token="tok", sms_from="+1000", whatsapp_from=None, timeout=15
        )
        provider = SmsProvider(cfg)
        fake_resp = MagicMock()
        fake_resp.status_code = 201
        fake_resp.json.return_value = {"sid": "SM123"}
        with patch.object(sms_provider.httpx, "post", return_value=fake_resp) as post:
            result = provider.send("+15551234567", "Body")
        self.assertEqual(result.status, NotificationStatus.SENT)
        self.assertEqual(result.message_id, "SM123")
        post.assert_called_once()

    def test_twilio_error_is_reported(self):
        cfg = TwilioConfig(
            account_sid="AC123", auth_token="tok", sms_from="+1000", whatsapp_from=None, timeout=15
        )
        provider = SmsProvider(cfg)
        fake_resp = MagicMock()
        fake_resp.status_code = 400
        fake_resp.json.return_value = {"message": "Invalid 'To' number"}
        with patch.object(sms_provider.httpx, "post", return_value=fake_resp):
            result = provider.send("bad", "Body")
        self.assertEqual(result.status, NotificationStatus.FAILED)
        self.assertEqual(result.error, "Invalid 'To' number")


class TestWhatsAppSendSuccess(unittest.TestCase):
    def test_sends_via_twilio(self):
        cfg = TwilioConfig(
            account_sid="AC123", auth_token="tok", sms_from=None, whatsapp_from="whatsapp:+1000", timeout=15
        )
        provider = WhatsAppProvider(cfg)
        fake_resp = MagicMock()
        fake_resp.status_code = 201
        fake_resp.json.return_value = {"sid": "WA123"}
        with patch.object(whatsapp_provider.httpx, "post", return_value=fake_resp) as post:
            result = provider.send("+15551234567", "Body")
        self.assertEqual(result.status, NotificationStatus.SENT)
        self.assertEqual(result.message_id, "WA123")
        post.assert_called_once()
        sent_to = post.call_args.kwargs["data"]["To"]
        self.assertTrue(sent_to.startswith("whatsapp:"))  # auto-prefixed

    def test_twilio_error_is_reported(self):
        cfg = TwilioConfig(
            account_sid="AC123", auth_token="tok", sms_from=None, whatsapp_from="whatsapp:+1000", timeout=15
        )
        provider = WhatsAppProvider(cfg)
        fake_resp = MagicMock()
        fake_resp.status_code = 400
        fake_resp.json.return_value = {"message": "Invalid channel"}
        with patch.object(whatsapp_provider.httpx, "post", return_value=fake_resp):
            result = provider.send("bad", "Body")
        self.assertEqual(result.status, NotificationStatus.FAILED)
        self.assertEqual(result.error, "Invalid channel")


class TestPushSendSuccess(unittest.TestCase):
    def test_sends_via_fcm(self):
        provider = PushProvider(PushConfig(server_key="key123", timeout=15))
        fake_resp = MagicMock()
        fake_resp.status_code = 200
        fake_resp.json.return_value = {"success": 1, "results": [{"message_id": "0:1"}]}
        with patch.object(push_provider.httpx, "post", return_value=fake_resp) as post:
            result = provider.send("token123456", "Title", "Body", data={"k": "v"})
        self.assertEqual(result.status, NotificationStatus.SENT)
        self.assertTrue(result.success)
        post.assert_called_once()

    def test_fcm_failure_is_reported(self):
        provider = PushProvider(PushConfig(server_key="key123", timeout=15))
        fake_resp = MagicMock()
        fake_resp.status_code = 200
        fake_resp.json.return_value = {"success": 0, "results": [{"error": "NotRegistered"}]}
        with patch.object(push_provider.httpx, "post", return_value=fake_resp):
            result = provider.send("token123456", "Title", "Body")
        self.assertEqual(result.status, NotificationStatus.FAILED)
        self.assertEqual(result.error, "NotRegistered")

    def test_fcm_http_error_is_reported(self):
        provider = PushProvider(PushConfig(server_key="key123", timeout=15))
        fake_resp = MagicMock()
        fake_resp.status_code = 401
        with patch.object(push_provider.httpx, "post", return_value=fake_resp):
            result = provider.send("token123456", "Title", "Body")
        self.assertEqual(result.status, NotificationStatus.FAILED)
        self.assertEqual(result.error, "HTTP 401")


if __name__ == "__main__":
    unittest.main()
