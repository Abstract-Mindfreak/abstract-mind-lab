from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scan a prompt JSON directory and build meta_summary.json."
    )
    parser.add_argument("input_dir", help="Directory containing JSON prompt files")
    parser.add_argument(
        "--output",
        default=None,
        help="Optional output path. Defaults to <input_dir>/meta_summary.json",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = Path(args.input_dir).resolve()

    if not input_dir.exists() or not input_dir.is_dir():
        raise SystemExit(f"Input directory does not exist: {input_dir}")

    output_path = Path(args.output).resolve() if args.output else input_dir / "meta_summary.json"

    path_frequency: Counter[str] = Counter()
    records: list[dict[str, Any]] = []

    for file_path in sorted(input_dir.rglob("*.json")):
        if file_path.name == "meta_summary.json":
            continue

        relative_path = file_path.relative_to(input_dir).as_posix()

        try:
            raw_text = file_path.read_text(encoding="utf-8")
            data = json.loads(raw_text)
        except Exception:
            continue

        if not isinstance(data, dict):
            continue

        top_level_keys = sorted(data.keys())
        collect_paths(data, "", path_frequency)
        records.append(
            {
                "file_id": relative_path,
                "file_name": file_path.name,
                "size": file_path.stat().st_size,
                "top_level_keys": top_level_keys,
                "markers": collect_markers(data),
                "mmss_type": infer_mmss_type(data),
                "base_name": infer_base_name(data, file_path.name),
            }
        )

    files_manifest: dict[str, dict[str, Any]] = {}
    used_names: Counter[str] = Counter()

    for record in records:
        smart_name = build_smart_name(record, used_names)
        files_manifest[record["file_id"]] = {
            "smart_name": smart_name,
            "size": record["size"],
            "top_level_keys": record["top_level_keys"],
            "mmss_type": record["mmss_type"],
        }

    payload = {
        "global_stats": {
            "total_files": len(records),
            "key_path_frequency": dict(
                sorted(path_frequency.items(), key=lambda item: (-item[1], item[0]))
            ),
        },
        "files_manifest": files_manifest,
    }

    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {output_path} with {len(records)} files")
    return 0


def collect_paths(value: Any, prefix: str, path_frequency: Counter[str]) -> None:
    if not isinstance(value, dict):
        return

    for key, nested_value in value.items():
        next_path = f"{prefix}.{key}" if prefix else key
        path_frequency[next_path] += 1

        if isinstance(nested_value, dict):
            collect_paths(nested_value, next_path, path_frequency)


def collect_markers(data: dict[str, Any]) -> list[str]:
    marker_paths = [
        "name",
        "fileName",
        "category",
        "data.architecture",
        "payload.type",
        "system_state.mode",
        "ui.title",
        "ui.variant",
    ]
    markers: list[str] = []

    for path in marker_paths:
        value = get_value_by_path(data, path)
        if isinstance(value, str) and value.strip():
            markers.append(value.strip())

    return dedupe(markers)


def infer_mmss_type(data: dict[str, Any]) -> str | None:
    for path in ("payload.type", "category", "data.architecture", "system_state.mode"):
        value = get_value_by_path(data, path)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def infer_base_name(data: dict[str, Any], file_name: str) -> str:
    for path in ("name", "fileName", "ui.title"):
        value = get_value_by_path(data, path)
        if isinstance(value, str) and value.strip():
            return value.strip()

    return Path(file_name).stem


def build_smart_name(record: dict[str, Any], used_names: Counter[str]) -> str:
    base_name = sanitize_name(record["base_name"])
    markers = [sanitize_name(marker) for marker in record["markers"] if sanitize_name(marker)]
    candidate_parts = [base_name]

    for marker in markers:
        if marker.lower() != base_name.lower():
            candidate_parts.append(marker)
        candidate_name = " | ".join(candidate_parts)
        if used_names[candidate_name] == 0:
            used_names[candidate_name] += 1
            return candidate_name

    fallback_hash = short_signature(record)
    candidate_name = f"{base_name} | {fallback_hash}"

    if used_names[candidate_name] == 0:
        used_names[candidate_name] += 1
        return candidate_name

    used_names[candidate_name] += 1
    return f"{candidate_name} #{used_names[candidate_name]}"


def short_signature(record: dict[str, Any]) -> str:
    payload = {
        "file_id": record["file_id"],
        "top_level_keys": record["top_level_keys"],
        "mmss_type": record["mmss_type"],
    }
    digest = hashlib.sha1(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()
    return digest[:8]


def get_value_by_path(source: dict[str, Any], path: str) -> Any:
    current: Any = source
    for key in path.split("."):
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        lowered = value.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        result.append(value)
    return result


def sanitize_name(value: str) -> str:
    return " ".join(value.replace("\n", " ").split())


if __name__ == "__main__":
    raise SystemExit(main())
