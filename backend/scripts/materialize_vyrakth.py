from pathlib import Path
import sys


CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.cosmos_core import materialize_vyrakth  # noqa: E402


def main() -> None:
    world = materialize_vyrakth()
    print("[END COSMOS CORE] VYRAKTH ∞ materialized")
    print(f"world_id={world.get('world_id')}")
    print(f"title={world.get('title')}")
    print(f"status={world.get('status')}")


if __name__ == "__main__":
    main()
