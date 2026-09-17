# ComfyUI workflow JSON vs API JSON: why `/prompt` rejects a saved workflow

**A practical explanation of the two ComfyUI JSON formats, how to export the right one, and how to make API automation less fragile.**

Tags: `comfyui`, `api`, `workflow-json`, `prompt-api`, `automation`, `python`, `headless`, `workflow`, `json-schema`

## Short answer

The JSON you save as a normal ComfyUI workflow is primarily a **UI graph**.

The JSON accepted by the local `/prompt` API is an **execution graph**.

They describe the same kind of workflow, but they are not the same shape.

A UI workflow typically contains things like:

```json
{
  "nodes": [
    {
      "id": 46,
      "type": "CLIPTextEncode",
      "widgets_values": ["your prompt"]
    }
  ],
  "links": []
}
```

An API workflow looks more like:

```json
{
  "46": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "your prompt",
      "clip": ["88", 0]
    }
  }
}
```

Posting the first representation directly as `{"prompt": workflow}` will not behave like posting the second.

## Export the API representation

ComfyUI's own `basic_api_example.py` documents the intended pattern: export the API-format workflow, load the JSON in your script, mutate the node inputs you care about, then POST it to `/prompt`.

In current ComfyUI builds, enable the developer/API options if needed and export the API form rather than relying on the regular saved workflow.

## Minimal request

```python
import json
import requests

workflow = json.load(open("workflow_api.json", encoding="utf-8"))

workflow["46"]["inputs"]["text"] = "cinematic portrait"
workflow["76"]["inputs"]["seed"] = 123456

response = requests.post(
    "http://127.0.0.1:8188/prompt",
    json={"prompt": workflow},
    timeout=120,
)

response.raise_for_status()
print(response.json())
```

The response gives you a `prompt_id`.

Then use:

```text
GET /history/{prompt_id}
```

or a WebSocket client to wait for completion.

## Image inputs are a separate step

A `LoadImage` node expects a filename that exists on the ComfyUI server.

For headless automation, upload the image first:

```text
POST /upload/image
```

using multipart form data with `type=input`.

The server returns the actual filename. Put that returned filename into the `LoadImage` node before submitting `/prompt`.

## Why automation breaks after you edit the graph

API workflows use node IDs as keys:

```python
workflow["46"]["inputs"]["text"] = ...
```

If you rebuild or re-export the graph, those IDs may change.

There are three practical strategies:

### 1. Keep a stable API export

For a production service, treat the API JSON as a versioned execution artifact. Do not re-export it casually.

### 2. Give important nodes distinctive metadata

The API representation can carry `_meta.title`. Descriptive titles such as:

- `EA Positive Prompt`
- `EA Main Sampler`
- `EA Face Reference`
- `EA Style Reference`

make the file much easier for humans and agents to inspect, even if your runtime code still uses IDs.

### 3. Build a small selector layer

Instead of spreading numeric IDs throughout your code, centralize them:

```python
NODES = {
    "prompt": "46",
    "sampler": "76",
    "base_image": "20",
    "face_reference": "21",
    "style_reference": "102",
}
```

If an export changes, you update one map.

## Real example: a multi-control FaceID workflow

The companion Agentica example combines:

- SDXL checkpoint + LoRAs
- IPAdapter FaceID + InsightFace
- independent style/composition IPAdapter
- DWPose + OpenPose ControlNet
- main sampler
- face and eye detail passes

and provides both the UI graph and API graph.

See: `ComfyUI SDXL FaceID + DWPose + FaceDetailer: an API-ready identity-transfer workflow`.

## Current pain point

This is not just a beginner misunderstanding. The distinction between workflow JSON and API prompt JSON has produced long-running ComfyUI issues and, as of 2026, users are still asking for a short headless `/prompt` quickstart and a formal schema for the prompt format.

That makes this a good place to be explicit in your own workflows: ship both files, name them clearly, and include a minimal runner.

## References

- Basic API example: https://github.com/Comfy-Org/ComfyUI/blob/master/script_examples/basic_api_example.py
- WebSocket example: https://github.com/Comfy-Org/ComfyUI/blob/master/script_examples/websockets_api_example.py
- ComfyUI issue #15473: headless `/prompt` quickstart
- ComfyUI issue #8899: JSON Schema for Prompt API format
- ComfyUI issue #1335: workflow format vs API format

---

**EA // TECH-WAYPOINT-0002 // YANNICK WENDE // Q86**

A technical waypoint of **Encyclopaedia Agentica**.

https://github.com/Question86/Encyclopaedia-Agentica
