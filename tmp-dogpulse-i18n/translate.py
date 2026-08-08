#!/usr/bin/env python3
from __future__ import annotations

import base64
import html
import json
import os
import random
import re
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAYLOAD = ROOT / "payload.zip.b64"
WORK = ROOT / "work"
OUT = ROOT / "out"

LANGUAGES = {
    "de": ("de", "Deutsch", "de-DE", "ltr"),
    "fr": ("fr", "Français", "fr-FR", "ltr"),
    "it": ("it", "Italiano", "it-IT", "ltr"),
    "es": ("es", "Español", "es-ES", "ltr"),
    "pt-BR": ("pt", "Português do Brasil", "pt-BR", "ltr"),
    "nl": ("nl", "Nederlands", "nl-NL", "ltr"),
    "pl": ("pl", "Polski", "pl-PL", "ltr"),
    "ro": ("ro", "Română", "ro-RO", "ltr"),
    "el": ("el", "Ελληνικά", "el-GR", "ltr"),
    "ru": ("ru", "Русский", "ru-RU", "ltr"),
    "uk": ("uk", "Українська", "uk-UA", "ltr"),
    "ar": ("ar", "العربية", "ar-SA", "rtl"),
    "hi": ("hi", "हिन्दी", "hi-IN", "ltr"),
    "id": ("id", "Bahasa Indonesia", "id-ID", "ltr"),
    "zh-Hans": ("zh-CN", "简体中文", "zh-CN", "ltr"),
    "ja": ("ja", "日本語", "ja-JP", "ltr"),
    "ko": ("ko", "한국어", "ko-KR", "ltr"),
}

# These terms are product identifiers, standards, units or interpolation tokens.
PROTECTED_RE = re.compile(
    r"\{[^{}]+\}|%[sd]|https?://\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|"
    r"\b(?:DogPulse|PDF|CSV|GPS|MB|kg|lb|cm|AKC|WSAVA|AAHA|AVSAB|Face ID|Google Play|SQLite|Supabase|RevenueCat)\b"
)
MARKER_RE = re.compile(r"__DPSEP_(\d{4})__")
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")


def decode_payload() -> None:
    shutil.rmtree(WORK, ignore_errors=True)
    shutil.rmtree(OUT, ignore_errors=True)
    WORK.mkdir(parents=True)
    OUT.mkdir(parents=True)
    raw = base64.b64decode(PAYLOAD.read_text(encoding="utf-8").strip(), validate=True)
    archive = WORK / "payload.zip"
    archive.write_bytes(raw)
    with zipfile.ZipFile(archive) as zf:
        zf.extractall(WORK)


def protect(text: str) -> tuple[str, dict[str, str]]:
    mapping: dict[str, str] = {}

    def repl(match: re.Match[str]) -> str:
        token = f"ZXQPH{len(mapping):03d}QXZ"
        mapping[token] = match.group(0)
        return token

    return PROTECTED_RE.sub(repl, text), mapping


def restore(text: str, mapping: dict[str, str]) -> str:
    for token, value in mapping.items():
        # Google occasionally inserts spaces into opaque tokens.
        loose = r"\s*".join(re.escape(char) for char in token)
        text = re.sub(loose, lambda _m, v=value: v, text, flags=re.IGNORECASE)
    return html.unescape(text).strip()


def request_translation(text: str, target: str) -> str:
    params = urllib.parse.urlencode({
        "client": "gtx",
        "sl": "en",
        "tl": target,
        "dt": "t",
        "q": text,
    })
    endpoints = [
        "https://translate.googleapis.com/translate_a/single",
        "https://translate.google.com/translate_a/single",
    ]
    last_error: Exception | None = None
    for attempt in range(8):
        endpoint = endpoints[attempt % len(endpoints)]
        request = urllib.request.Request(
            f"{endpoint}?{params}",
            headers={
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
                "Accept": "application/json,text/plain,*/*",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
            translated = "".join(piece[0] or "" for piece in payload[0] if piece and piece[0] is not None)
            if translated.strip():
                return translated
            raise RuntimeError("empty translation response")
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            delay = min(30.0, (1.65 ** attempt) + random.random())
            print(f"translation retry {attempt + 1}/8 for {target}: {exc}; sleeping {delay:.1f}s", flush=True)
            time.sleep(delay)
    raise RuntimeError(f"translation failed for {target}: {last_error}")


def make_batches(items: list[tuple[str, str]], max_chars: int = 3200, max_items: int = 24) -> list[list[tuple[str, str]]]:
    batches: list[list[tuple[str, str]]] = []
    current: list[tuple[str, str]] = []
    chars = 0
    for item in items:
        cost = len(item[1]) + 32
        if current and (len(current) >= max_items or chars + cost > max_chars):
            batches.append(current)
            current = []
            chars = 0
        current.append(item)
        chars += cost
    if current:
        batches.append(current)
    return batches


def translate_batch(batch: list[tuple[str, str]], target: str) -> dict[str, str]:
    protected: list[tuple[str, str, dict[str, str]]] = []
    chunks: list[str] = []
    for index, (key, source) in enumerate(batch):
        value, mapping = protect(source)
        protected.append((key, value, mapping))
        chunks.append(f"__DPSEP_{index:04d}__\n{value}")
    joined = "\n".join(chunks)
    translated = request_translation(joined, target)
    matches = list(MARKER_RE.finditer(translated))
    if len(matches) != len(batch):
        if len(batch) == 1:
            key, value, mapping = protected[0]
            return {key: restore(request_translation(value, target), mapping)}
        midpoint = len(batch) // 2
        result = translate_batch(batch[:midpoint], target)
        result.update(translate_batch(batch[midpoint:], target))
        return result

    result: dict[str, str] = {}
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(translated)
        key, _value, mapping = protected[index]
        candidate = restore(translated[start:end].strip(), mapping)
        if not candidate:
            candidate = restore(request_translation(protected[index][1], target), mapping)
        result[key] = candidate
    return result


def translate_dictionary(source: dict[str, str], target: str, preserve_values: set[str] | None = None) -> dict[str, str]:
    preserve_values = preserve_values or set()
    output: dict[str, str] = {}
    translate_items: list[tuple[str, str]] = []
    value_cache: dict[str, str] = {}

    for key, value in source.items():
        if not isinstance(value, str):
            output[key] = value
        elif value in preserve_values:
            output[key] = value
        elif key in {"languageStatus", "languageName", "languageLocale", "languageDirection"}:
            continue
        elif value in value_cache:
            output[key] = value_cache[value]
        else:
            translate_items.append((key, value))

    batches = make_batches(translate_items)
    for number, batch in enumerate(batches, start=1):
        translated = translate_batch(batch, target)
        for key, value in translated.items():
            output[key] = value
            value_cache[source[key]] = value
        if number % 10 == 0 or number == len(batches):
            print(f"{target}: translated batch {number}/{len(batches)}", flush=True)
        time.sleep(0.12 + random.random() * 0.12)

    # Restore original key order.
    return {key: output[key] for key in source if key in output}


def main() -> None:
    decode_payload()
    ui_en: dict[str, str] = json.loads((WORK / "ui-en.json").read_text(encoding="utf-8"))
    content_en: dict[str, str] = json.loads((WORK / "content-en.json").read_text(encoding="utf-8"))

    # Official breed names are product taxonomy identifiers. Descriptions and care guidance are translated.
    breed_names = {
        match.group(1)
        for text in content_en.values()
        if isinstance(text, str)
        for match in [re.match(r"^(.+?) is presented as an? ", text)]
        if match
    }
    print(f"Preserving {len(breed_names)} official breed-name identifiers.", flush=True)

    for code, (target, native_name, locale, direction) in LANGUAGES.items():
        print(f"\n=== {code} ({target}) ===", flush=True)
        ui = translate_dictionary(ui_en, target)
        ui["languageStatus"] = "complete"
        ui["languageName"] = native_name
        ui["languageLocale"] = locale
        ui["languageDirection"] = direction
        ui = {key: ui[key] for key in ui_en}

        content = translate_dictionary(content_en, target, preserve_values=breed_names)
        content = {key: content[key] for key in content_en}

        ui_path = OUT / "ui" / f"{code}.json"
        content_path = OUT / "content" / f"{code}.json"
        ui_path.parent.mkdir(parents=True, exist_ok=True)
        content_path.parent.mkdir(parents=True, exist_ok=True)
        ui_path.write_text(json.dumps(ui, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        content_path.write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    shutil.make_archive(str(ROOT / "dogpulse-i18n-output"), "zip", OUT)
    print("Translation output created.", flush=True)


if __name__ == "__main__":
    main()
