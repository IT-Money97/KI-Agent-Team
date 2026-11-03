"""Tests fuer die Preis-Erkennung. Aufruf: python -m pytest  (oder python test_preis.py)"""
from preis import parse_preis


def test_parse():
    assert parse_preis("13,250") == 13250
    assert parse_preis("13.250") == 13250
    assert parse_preis("1,234,567") == 1234567
    assert parse_preis("950") == 950
    assert parse_preis(" 28,561\n") == 28561
    assert parse_preis("") is None
    assert parse_preis("0") is None
    assert parse_preis("13,25") is None      # abgeschnitten: lieber ueberspringen
    assert parse_preis("1,3,250") is None
    assert parse_preis(". ,") is None


if __name__ == "__main__":
    test_parse()
    print("OK")
