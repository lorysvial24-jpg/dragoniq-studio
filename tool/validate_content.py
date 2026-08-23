#!/usr/bin/env python3
"""Valide le contenu editorial avant qu'il n'atteigne l'app.

Deux niveaux :
  1. JSON Schema  -> forme des fichiers
  2. Regles metier -> ce que le schema ne sait pas exprimer

Sort en code 1 a la premiere erreur bloquante. Les avertissements
(champs PLACEHOLDER encore vides) ne bloquent pas : ils sont normaux
tant que tu n'as pas redige le contenu de la semaine.
"""
from __future__ import annotations

import json
import pathlib
import sys

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError:
    sys.exit("pip install jsonschema")

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

errors: list[str] = []
warnings: list[str] = []


def load(path: pathlib.Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        sys.exit(f"BLOQUANT {path.relative_to(ROOT)} : JSON invalide -> {exc}")


def check_schema(doc: dict, schema_path: pathlib.Path, label: str) -> None:
    validator = Draft202012Validator(load(schema_path), format_checker=FormatChecker())
    for err in sorted(validator.iter_errors(doc), key=lambda e: list(e.path)):
        where = "/".join(str(p) for p in err.path) or "(racine)"
        errors.append(f"{label} @ {where} : {err.message}")


def walk_localized(node, path: str, codes: set[str]) -> list[tuple[str, dict]]:
    """Retrouve les blocs LocalizedText : un dict dont toutes les cles sont des codes langue."""
    found = []
    if isinstance(node, dict):
        keys = set(node)
        if keys and keys <= codes and all(isinstance(v, str) for v in node.values()):
            found.append((path, node))
        else:
            for key, value in node.items():
                found += walk_localized(value, f"{path}/{key}", codes)
    elif isinstance(node, list):
        for index, value in enumerate(node):
            found += walk_localized(value, f"{path}[{index}]", codes)
    return found


def main() -> int:
    manifest_path = CONTENT / "v1" / "manifest.json"
    manifest = load(manifest_path)
    check_schema(manifest, CONTENT / "schema" / "manifest.schema.json", "manifest.json")

    content_path = CONTENT / "v1" / manifest.get("files", {}).get("content", "content.json")
    if not content_path.exists():
        sys.exit(f"BLOQUANT manifest.files.content pointe sur {content_path.name}, introuvable")
    content = load(content_path)
    check_schema(content, CONTENT / "schema" / "content.schema.json", content_path.name)

    if errors:
        report()
        return 1

    codes = {lang["code"] for lang in manifest["languages"]}
    default = manifest["default_language"]

    # -- coherence manifest <-> content -------------------------------------
    if manifest["content_version"] != content["content_version"]:
        errors.append(
            "content_version desynchronise : manifest="
            f"{manifest['content_version']} content={content['content_version']}. "
            "L'app ne telechargerait pas la mise a jour."
        )
    if manifest["schema_version"] != content["schema_version"]:
        errors.append("schema_version desynchronise entre manifest et content")
    if default not in codes:
        errors.append(f"default_language '{default}' absent de languages")

    # -- toutes les langues declarees existent partout ----------------------
    for path, block in walk_localized(content, "", codes):
        missing = codes - set(block)
        if missing:
            errors.append(
                f"{path} : langue(s) manquante(s) {sorted(missing)}. "
                "Une cle doit exister pour chaque langue declaree, meme vide."
            )
        if not block.get(default, "").strip():
            warnings.append(f"{path}/{default} : PLACEHOLDER vide -> l'app affichera N/A")

    # -- unicite des identifiants -------------------------------------------
    slots = [s["slot"] for s in content["loadout"]["slots"]]
    if len(slots) != len(set(slots)):
        errors.append("loadout.slots : numeros de slot dupliques")

    ids = [s["id"] for s in content["spots"]]
    if len(ids) != len(set(ids)):
        errors.append("spots : ids dupliques")

    # -- resolution d'image : au moins une piste par slot --------------------
    for slot in content["loadout"]["slots"]:
        if not slot["image_url"] and not slot["api_id"] and not slot["name"].strip():
            errors.append(
                f"loadout.slot {slot['slot']} : ni image_url, ni api_id, ni name. "
                "L'image ne pourra pas etre resolue."
            )

    # -- spots trop proches : marqueurs superposes sur la map ----------------
    for i, a in enumerate(content["spots"]):
        for b in content["spots"][i + 1:]:
            if abs(a["x"] - b["x"]) < 2 and abs(a["y"] - b["y"]) < 2:
                warnings.append(
                    f"spots {a['id']} et {b['id']} : distants de moins de 2%, "
                    "les marqueurs vont se chevaucher"
                )

    # -- dates de saison coherentes -----------------------------------------
    if content["season"]["starts_at"] >= content["season"]["ends_at"]:
        errors.append("season : starts_at doit preceder ends_at")

    report()
    return 1 if errors else 0


def report() -> None:
    for warning in warnings:
        print(f"  avertissement  {warning}")
    for error in errors:
        print(f"  BLOQUANT       {error}")
    if errors:
        print(f"\n{len(errors)} erreur(s) bloquante(s) — le contenu n'est pas publiable.")
    else:
        print(f"\nContenu valide. {len(warnings)} avertissement(s), non bloquant(s).")


if __name__ == "__main__":
    sys.exit(main())
