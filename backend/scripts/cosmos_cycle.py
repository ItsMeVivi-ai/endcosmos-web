from pathlib import Path
import sys


CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[1]
PROJECT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.cosmos_core import interpret_and_generate, scan_images  # noqa: E402


def main() -> None:
    print("[END COSMOS CORE] OBSERVA -> escaneando imágenes...")
    index = scan_images(PROJECT_DIR / "public" / "assets" / "images")

    print("[END COSMOS CORE] INTERPRETA/ORDENA -> clasificando universo...")
    universe = interpret_and_generate(index)

    summary = universe["summary"]
    print("[END COSMOS CORE] EJECUTA/EVOLUCIONA -> estado actualizado")
    print(
        "Resumen:",
        f"total={summary['total_images']}",
        f"worlds={summary['worlds']}",
        f"entities={summary['entities']}",
        f"portals={summary['portals']}",
        f"maps={summary['maps']}",
        f"events={summary['events']}",
    )


if __name__ == "__main__":
    main()
