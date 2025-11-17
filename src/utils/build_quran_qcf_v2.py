import json
import time
import sys
from pathlib import Path

import requests


API_BASE = "https://api.quran.com/api/v4"
OUTPUT_PATH = Path("src/data/quran-qcf-v2.json")

# На всякий случай, чтобы не долбить API слишком быстро
REQUEST_DELAY = 0.2  # секунды между запросами
TIMEOUT = 20  # секунд на запрос


def fetch_chapter_qcf(chapter: int):
    """
    Забирает все аяты суры через /verses/by_chapter/{chapter}
    и возвращает список словарей вида:
    {
      "verse_key": "2:3",
      "code_v2": "...",
      "v2_page": 2
    }
    """
    per_page = 50
    page = 1
    results = []

    while True:
        url = (
            f"{API_BASE}/verses/by_chapter/{chapter}"
            f"?page={page}"
            f"&per_page={per_page}"
            f"&fields=code_v2,v2_page"
            f"&words=false"
        )

        print(f"[sura {chapter}] request page {page} ...", flush=True)
        try:
            resp = requests.get(url, timeout=TIMEOUT)
        except Exception as e:
            print(f"ERROR: request failed for chapter {chapter}, page {page}: {e}", file=sys.stderr)
            break

        if resp.status_code != 200:
            print(f"ERROR: status {resp.status_code} for {url}", file=sys.stderr)
            break

        data = resp.json()
        verses = data.get("verses") or []

        if not verses:
            # Ничего нет — выходим из цикла по страницам
            break

        for v in verses:
            verse_key = v.get("verse_key")
            code_v2 = v.get("code_v2")
            v2_page = v.get("v2_page")

            if not verse_key:
                continue

            if code_v2 is None or v2_page is None:
                print(f"WARNING: missing code_v2/v2_page for verse {verse_key}", file=sys.stderr)
                continue

            results.append(
                {
                    "verse_key": verse_key,
                    "code_v2": code_v2,
                    "v2_page": v2_page,
                }
            )

        # Проверяем пагинацию
        pagination = data.get("pagination") or {}
        total_pages = pagination.get("total_pages") or 1
        if page >= total_pages:
            break

        page += 1
        time.sleep(REQUEST_DELAY)

    return results


def build_qcf_map():
    """
    Пройтись по всем 114 сура́м и собрать карту:
    {
      "2:3": { "page": 2, "code_v2": "…" },
      ...
    }
    """
    qcf_map = {}

    for chapter in range(1, 115):
        print(f"=== Fetching chapter {chapter} ===")
        verses = fetch_chapter_qcf(chapter)
        for v in verses:
            key = v["verse_key"]  # "sura:ayah"
            qcf_map[key] = {
                "page": v["v2_page"],
                "code_v2": v["code_v2"],
            }

    return qcf_map


def main():
    qcf_map = build_qcf_map()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(qcf_map, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Done. Written {len(qcf_map)} ayahs to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
