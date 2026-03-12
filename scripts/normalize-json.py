#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

EXCLUDED_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
    ".next",
    "dist",
    "build",
}


def should_skip(path: Path) -> bool:
    return any(part in EXCLUDED_DIRS for part in path.parts)


def read_json_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8-sig")


def normalize_json(path: Path, check_only: bool) -> tuple[str, str]:
    raw = read_json_text(path)
    cleaned = raw.lstrip("\ufeff")
    parsed = json.loads(cleaned)
    normalized = json.dumps(parsed, ensure_ascii=False, indent=2) + "\n"

    if cleaned == normalized:
        return ("unchanged", "")

    if check_only:
        return ("needs-format", "")

    path.write_text(normalized, encoding="utf-8")
    return ("updated", "")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Normalize and validate JSON files across the repository."
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Root directory to scan (default: current directory)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check mode: do not write changes; return non-zero if formatting is needed or files are invalid.",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    files = sorted(p for p in root.rglob("*.json") if p.is_file() and not should_skip(p))

    updated = 0
    unchanged = 0
    needs_format = 0
    invalid = []

    for file_path in files:
        try:
            status, _ = normalize_json(file_path, args.check)
            if status == "updated":
                updated += 1
                print(f"UPDATED  {file_path}")
            elif status == "needs-format":
                needs_format += 1
                print(f"NEEDS_FMT {file_path}")
            else:
                unchanged += 1
        except Exception as error:
            invalid.append((file_path, str(error)))
            print(f"INVALID  {file_path} | {error}")

    print("\nSUMMARY")
    print(f"- scanned: {len(files)}")
    print(f"- unchanged: {unchanged}")
    print(f"- updated: {updated}")
    print(f"- needs-format: {needs_format}")
    print(f"- invalid: {len(invalid)}")

    if invalid:
        return 2
    if args.check and needs_format:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
