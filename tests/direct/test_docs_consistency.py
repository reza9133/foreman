"""The in-app docs and lifecycle diagram must not drift from the contract."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = (ROOT / "contracts" / "foreman.py").read_text()
DOCS_TS = (ROOT / "frontend" / "lib" / "docs.ts").read_text()
LIFECYCLE_TS = (ROOT / "frontend" / "lib" / "lifecycle.ts").read_text()


def public_methods():
    out = {}
    for m in re.finditer(r"@gl\.public\.(view|write(?:\.payable)?)\s*\n\s*def (\w+)\(", CONTRACT):
        out[m.group(2)] = m.group(1)
    return out


def documented_methods():
    return {m.group(1): m.group(2) for m in re.finditer(r'name: "(\w+)", kind: "(\w+)"', DOCS_TS)}


def test_every_public_method_is_documented_and_vice_versa():
    assert set(public_methods()) == set(documented_methods())


def test_documented_kind_matches_contract_decorator():
    kinds = {"view": "view", "write": "write", "write.payable": "payable"}
    for name, kind in public_methods().items():
        assert documented_methods()[name] == kinds[kind], name


def test_lifecycle_methods_exist_on_the_contract():
    used = set(re.findall(r'method: "(\w+)"', LIFECYCLE_TS))
    assert used and used <= set(public_methods())


def test_documented_version_matches_contract():
    version = re.search(r'CONTRACT_VERSION = "([\d.]+)"', CONTRACT).group(1)
    assert version == "2.0.0"


def test_documented_hostile_url_case_count_is_accurate():
    adversarial = (ROOT / "tests" / "direct" / "test_foreman_adversarial.py").read_text()
    start = adversarial.index("BAD_URLS = [")
    block = adversarial[start : adversarial.index("\n]\n", start)]
    cases = len(re.findall(r"^\s+\(", block, re.M))
    claimed = int(re.search(r"\((\d+) cases\)", DOCS_TS).group(1))
    assert cases == claimed
