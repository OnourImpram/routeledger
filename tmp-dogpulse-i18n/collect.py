#!/usr/bin/env python3
"""Temporary build-only collector for DogPulse 3.1.0 locale artifacts."""
from __future__ import annotations

import base64
import hashlib
import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "collector-output"
BASE = "https://tnyzqxvygoaatldwckwr.supabase.co/storage/v1/object/public/tmp-dogpulse-i18n-20260809"
FULL = ["de", "fr", "it", "es", "pt-BR", "nl", "pl", "ro", "el", "ru", "uk", "ja", "ko"]
CHUNKED = ["ar", "hi", "id", "zh-Hans"]
ALL = FULL + CHUNKED
PLACEHOLDER = re.compile(r"\{[^{}]+\}|%[sd]")
FORBIDDEN_MARKERS = ("ZXQPH", "ZXQP", "QXZ", "\ue000", "\ue001", "\uf000", "\uf001")
SCRIPT = {
    "el": re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]"),
    "ru": re.compile(r"[\u0400-\u04ff]"),
    "uk": re.compile(r"[\u0400-\u04ff]"),
    "ar": re.compile(r"[\u0600-\u06ff]"),
    "hi": re.compile(r"[\u0900-\u097f]"),
    "zh-Hans": re.compile(r"[\u3400-\u9fff]"),
    "ja": re.compile(r"[\u3040-\u30ff\u3400-\u9fff]"),
    "ko": re.compile(r"[\uac00-\ud7af]"),
}
META = {
    "de": ("Deutsch", "de-DE", "ltr"),
    "fr": ("Français", "fr-FR", "ltr"),
    "it": ("Italiano", "it-IT", "ltr"),
    "es": ("Español", "es-ES", "ltr"),
    "pt-BR": ("Português do Brasil", "pt-BR", "ltr"),
    "nl": ("Nederlands", "nl-NL", "ltr"),
    "pl": ("Polski", "pl-PL", "ltr"),
    "ro": ("Română", "ro-RO", "ltr"),
    "el": ("Ελληνικά", "el-GR", "ltr"),
    "ru": ("Русский", "ru-RU", "ltr"),
    "uk": ("Українська", "uk-UA", "ltr"),
    "ar": ("العربية", "ar", "rtl"),
    "hi": ("हिन्दी", "hi-IN", "ltr"),
    "id": ("Bahasa Indonesia", "id-ID", "ltr"),
    "zh-Hans": ("简体中文", "zh-CN", "ltr"),
    "ja": ("日本語", "ja-JP", "ltr"),
    "ko": ("한국어", "ko-KR", "ltr"),
}


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "DogPulse-i18n-collector/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def load_sources() -> tuple[dict[str, str], dict[str, str]]:
    chunks = []
    for index in range(6):
        chunks.append((ROOT / f"tmp-dogpulse-i18n/payload-chunks/chunk-{index:02d}.b64").read_text().strip())
    payload = base64.b64decode("".join(chunks))
    expected = "84bd2b5ce202f1fef5ec4de6f6a8ead70f33ca97a9777ff02aa46aa66a1b4b69"
    actual = hashlib.sha256(payload).hexdigest()
    if actual != expected:
        raise RuntimeError(f"source payload SHA256 mismatch: {actual}")
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        return (
            json.loads(archive.read("ui-en.json")),
            json.loads(archive.read("content-en.json")),
        )


def load_full(language: str) -> tuple[dict[str, str], dict[str, str]]:
    data = fetch(f"{BASE}/{language}.zip")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        return (
            json.loads(archive.read(f"ui/{language}.json")),
            json.loads(archive.read(f"content/{language}.json")),
        )


def load_chunked(language: str, ui_source: dict[str, str], content_source: dict[str, str]) -> tuple[dict[str, str], dict[str, str]]:
    layers: dict[str, dict[str, str]] = {}
    for layer, source in (("ui", ui_source), ("content", content_source)):
        combined: dict[str, str] = {}
        for start in range(0, len(source), 120):
            url = f"{BASE}/parts/{language}/{layer}-{start:04d}.json"
            part = json.loads(fetch(url))
            overlap = set(combined).intersection(part)
            if overlap:
                raise RuntimeError(f"{language}:{layer} duplicate keys in part {start}: {sorted(overlap)[:3]}")
            combined.update(part)
        layers[layer] = {key: combined[key] for key in source}
    return layers["ui"], layers["content"]


def placeholders(value: str) -> list[str]:
    return sorted(PLACEHOLDER.findall(value))


def validate(language: str, ui_source: dict[str, str], content_source: dict[str, str], ui: dict[str, str], content: dict[str, str]) -> dict[str, object]:
    expected_ui_keys = list(ui_source)
    expected_content_keys = list(content_source)
    if list(ui) != expected_ui_keys:
        raise RuntimeError(f"{language}: UI key order or contract differs from English")
    if list(content) != expected_content_keys:
        raise RuntimeError(f"{language}: content key order or contract differs from English")
    native_name, locale, direction = META[language]
    expected_meta = {
        "languageStatus": "complete",
        "languageName": native_name,
        "languageLocale": locale,
        "languageDirection": direction,
    }
    for key, value in expected_meta.items():
        if ui.get(key) != value:
            raise RuntimeError(f"{language}:{key} expected {value!r}, received {ui.get(key)!r}")
    errors = []
    script_samples = []
    for layer, source, target in (("ui", ui_source, ui), ("content", content_source, content)):
        for key, source_value in source.items():
            value = target.get(key)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{layer}:{key}:empty")
                continue
            if placeholders(source_value) != placeholders(value):
                errors.append(f"{layer}:{key}:placeholder")
            lowered = value.lower()
            if any(marker.lower() in lowered for marker in FORBIDDEN_MARKERS):
                errors.append(f"{layer}:{key}:marker")
            if len(source_value) >= 8 and source_value == value and source_value not in content_source:
                errors.append(f"{layer}:{key}:unchanged")
            if len(value) >= 12:
                script_samples.append(value)
    if errors:
        raise RuntimeError(f"{language}: structural validation failed: {errors[:20]}")
    pattern = SCRIPT.get(language)
    if pattern and not any(pattern.search(value) for value in script_samples):
        raise RuntimeError(f"{language}: expected writing system not found")
    return {
        "language": language,
        "uiKeys": len(ui),
        "contentKeys": len(content),
        "direction": direction,
        "scriptChecked": bool(pattern),
    }


def main() -> None:
    ui_source, content_source = load_sources()
    (OUT / "translations/ui").mkdir(parents=True, exist_ok=True)
    (OUT / "translations/content").mkdir(parents=True, exist_ok=True)
    report = []
    for language in ALL:
        print(f"Collecting {language}", flush=True)
        ui, content = load_full(language) if language in FULL else load_chunked(language, ui_source, content_source)
        report.append(validate(language, ui_source, content_source, ui, content))
        (OUT / f"translations/ui/{language}.json").write_text(json.dumps(ui, ensure_ascii=False, indent=2) + "\n")
        (OUT / f"translations/content/{language}.json").write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n")
    manifest = {
        "sourceSha256": "84bd2b5ce202f1fef5ec4de6f6a8ead70f33ca97a9777ff02aa46aa66a1b4b69",
        "languages": report,
    }
    (OUT / "translations/manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    archive_path = ROOT / "DogPulse-v3.1.0-translations.zip"
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted((OUT / "translations").rglob("*")):
            if file.is_file():
                archive.write(file, file.relative_to(OUT))
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    (OUT / "translations/SHA256SUMS.txt").write_text(f"{digest}  {archive_path.name}\n")
    print(json.dumps({"archive": str(archive_path), "sha256": digest, "languages": len(report)}, indent=2))


if __name__ == "__main__":
    main()
