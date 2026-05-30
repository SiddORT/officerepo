"""Unit tests for the Lead Management validation/sanitization helpers."""
import unittest

from backend.app.modules.lead_management import validators as v


class TestCleanText(unittest.TestCase):
    def test_trims_and_collapses_whitespace(self):
        self.assertEqual(v.clean_text("  hello   world  "), "hello world")

    def test_strips_html_and_script(self):
        self.assertEqual(v.clean_text("<script>alert(1)</script>Acme"), "alert(1)Acme")
        self.assertEqual(v.clean_text("<b>Bold</b>"), "Bold")

    def test_empty_becomes_none(self):
        self.assertIsNone(v.clean_text("   "))
        self.assertIsNone(v.clean_text(None))


class TestValidateEmail(unittest.TestCase):
    def test_valid_email_lowercased(self):
        self.assertEqual(v.validate_email("Jane@Acme.COM"), "jane@acme.com")

    def test_invalid_email_raises(self):
        with self.assertRaises(ValueError):
            v.validate_email("not-an-email")

    def test_required_missing_raises(self):
        with self.assertRaises(ValueError):
            v.validate_email("", required=True)

    def test_optional_missing_returns_none(self):
        self.assertIsNone(v.validate_email(""))

    def test_too_long_raises(self):
        with self.assertRaises(ValueError):
            v.validate_email("a" * 250 + "@x.com")


class TestValidatePhone(unittest.TestCase):
    def test_valid_phone(self):
        self.assertEqual(v.validate_phone(" 555 000 0000 "), "555 000 0000")

    def test_invalid_phone_raises(self):
        with self.assertRaises(ValueError):
            v.validate_phone("abc123")

    def test_optional_missing_returns_none(self):
        self.assertIsNone(v.validate_phone(None))


class TestValidateCountryCode(unittest.TestCase):
    def test_adds_plus_prefix(self):
        self.assertEqual(v.validate_country_code("1"), "+1")
        self.assertEqual(v.validate_country_code("+44"), "+44")

    def test_invalid_raises(self):
        with self.assertRaises(ValueError):
            v.validate_country_code("++12abc")

    def test_empty_returns_none(self):
        self.assertIsNone(v.validate_country_code(""))


class TestValidateChoice(unittest.TestCase):
    def test_valid_choice(self):
        self.assertEqual(v.validate_choice("New", ["New", "Won"]), "New")

    def test_invalid_choice_raises(self):
        with self.assertRaises(ValueError):
            v.validate_choice("Bogus", ["New", "Won"])

    def test_required_missing_raises(self):
        with self.assertRaises(ValueError):
            v.validate_choice("", ["New"], required=True)


class TestValidateLength(unittest.TestCase):
    def test_within_bounds(self):
        self.assertEqual(v.validate_length("Acme", min_len=2, max_len=10), "Acme")

    def test_too_short_raises(self):
        with self.assertRaises(ValueError):
            v.validate_length("A", min_len=2)

    def test_too_long_raises(self):
        with self.assertRaises(ValueError):
            v.validate_length("A" * 11, max_len=10)

    def test_required_missing_raises(self):
        with self.assertRaises(ValueError):
            v.validate_length("", required=True)


if __name__ == "__main__":
    unittest.main()
