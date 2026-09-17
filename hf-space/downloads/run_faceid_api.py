#!/usr/bin/env python3
"""Minimal local ComfyUI runner for the Encyclopaedia Agentica FaceID example.

Usage:
  python run_faceid_api.py \
    --workflow comfyui_faceid_api.json \
    --base base_input.png \
    --face face_reference.png \
    --style style_reference.png \
    --prompt "cinematic portrait in a modern interior"

Requires:
  pip install requests
"""
from __future__ import annotations

import argparse
import json
import pathlib
import random
import time
import requests


def upload_image(base_url: str, path: pathlib.Path) -> str:
    with path.open("rb") as f:
        response = requests.post(
            f"{base_url}/upload/image",
            files={"image": (path.name, f, "application/octet-stream")},
            data={"type": "input", "overwrite": "true"},
            timeout=120,
        )
    response.raise_for_status()
    return response.json()["name"]


def queue_prompt(base_url: str, workflow: dict) -> str:
    response = requests.post(
        f"{base_url}/prompt",
        json={"prompt": workflow},
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("node_errors"):
        raise RuntimeError(json.dumps(payload["node_errors"], indent=2))
    return payload["prompt_id"]


def wait_for_history(base_url: str, prompt_id: str, timeout: int = 600) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        response = requests.get(f"{base_url}/history/{prompt_id}", timeout=60)
        response.raise_for_status()
        payload = response.json()
        if prompt_id in payload:
            return payload[prompt_id]
        time.sleep(1)
    raise TimeoutError(f"Prompt {prompt_id} did not finish within {timeout}s")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workflow", default="comfyui_faceid_api.json")
    ap.add_argument("--base", required=True, help="Base / pose image")
    ap.add_argument("--face", required=True, help="Face identity reference")
    ap.add_argument("--style", required=True, help="Style / composition reference")
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    workflow = json.loads(pathlib.Path(args.workflow).read_text(encoding="utf-8"))

    workflow["20"]["inputs"]["image"] = upload_image(args.server, pathlib.Path(args.base))
    workflow["21"]["inputs"]["image"] = upload_image(args.server, pathlib.Path(args.face))
    workflow["102"]["inputs"]["image"] = upload_image(args.server, pathlib.Path(args.style))
    workflow["46"]["inputs"]["text"] = args.prompt
    workflow["76"]["inputs"]["seed"] = args.seed if args.seed is not None else random.randrange(1, 2**48)

    prompt_id = queue_prompt(args.server, workflow)
    print(f"queued: {prompt_id}")

    history = wait_for_history(args.server, prompt_id)
    print(json.dumps(history.get("outputs", {}), indent=2))


if __name__ == "__main__":
    main()
