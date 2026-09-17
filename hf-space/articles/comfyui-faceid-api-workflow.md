# ComfyUI SDXL FaceID + DWPose + FaceDetailer: an API-ready identity-transfer workflow

**Working reference architecture for ComfyUI users who need face identity, pose, style/composition and post-generation detail passes in one workflow — with both the visual UI graph and the API `/prompt` format.**

Tags: `comfyui`, `sdxl`, `ipadapter`, `faceid`, `insightface`, `dwpose`, `controlnet`, `facedetailer`, `workflow`, `api`, `automation`, `consistent-character`, `face-swap`

## The problem

A simple FaceID example is easy to find. A production-style graph becomes harder when you need all of these at once:

1. a normal SDXL checkpoint and LoRAs;
2. a separate face-identity reference;
3. independent style/composition guidance;
4. pose guidance from a base image;
5. a main sampler that receives all three signals;
6. a second face/eye refinement stage;
7. a workflow that can also be driven headlessly from the ComfyUI API.

This example is built around that combined problem.

It is **not a one-node face swap**. Identity is injected into the model before the main sampler with IPAdapter FaceID, while pose and style are handled as separate controls. After sampling, dedicated detail passes refine the face and eyes.

Use reference faces you own or have permission to use.

## Architecture

```text
base / pose image
   ├─> VAE encode -> latent
   └─> DWPose -> OpenPose ControlNet ───────────┐

style / composition reference
   └─> IPAdapter Precise Style Transfer ────────┤
                                                ├─> main SDXL sampler
face reference                                  │
   └─> InsightFace + IPAdapter FaceID + LoRA ───┘
                                                     │
                                                     v
                                                VAE decode
                                                     │
                                                     v
                                    face detail -> eye/face detail
                                                     │
                                                     v
                                                  output
```

### Identity branch

The API-ready graph uses:

- `IPAdapterModelLoader`
- `CLIPVisionLoader`
- `IPAdapterInsightFaceLoader` with `antelopev2`
- `IPAdapterUnifiedLoader`
- `IPAdapterFaceID`
- the SDXL FaceID Plus v2 LoRA

Reference settings in this version:

| Control | Value |
|---|---:|
| IPAdapter FaceID weight | 0.70 |
| FaceID v2 weight | 0.90 |
| active range | 0.00 → 0.70 |
| embedding mode | `K+V` |
| combine embeds | `concat` |

These are working reference values, not universal optima.

### Style / composition branch

A separate `IPAdapterPreciseStyleTransfer` node controls the visual reference independently from identity.

Reference values:

| Control | Value |
|---|---:|
| weight | 0.60 |
| style boost | 0.35 |
| active range | 0.20 → 0.90 |
| embedding scaling | `V only` |

Keeping this branch separate is useful when the face reference should define **who** the subject resembles while another image defines **how the scene feels or is composed**.

### Pose branch

The base image is processed through DWPose with body, hand and face detection enabled, then passed through an SDXL OpenPose ControlNet.

Reference API settings:

- DWPose resolution: `1024`
- ControlNet strength: `0.45`
- ControlNet active range: `0.00 → 0.60`

This makes pose a third independent signal instead of forcing the face or style reference to carry composition.

### Main sampler

The API variant currently uses:

- 40 steps
- CFG 5
- `dpmpp_2m_sde`
- `karras`
- denoise 1.0

### Post-generation face and eye refinement

After VAE decode, the graph runs separate Impact Pack detail passes. The first uses a face detector; the second can use a more targeted face/eye detector plus SAM segmentation.

The reference configuration uses 1024px guide/max size, 20 steps, CFG 4 and 0.5 denoise for both passes.

This is important because the identity injection and the final local detail refinement solve different problems. FaceID stabilizes identity during generation; the detailer repairs local structure after generation.

## Two workflow formats

### 1. Visual UI workflow

The visual version is intended for inspecting, modifying and learning the graph in ComfyUI itself. It contains the full layout and annotations.

### 2. API prompt workflow

The companion API version is intended for ComfyUI's `/prompt` endpoint. It is the node-ID-keyed representation with `class_type` and `inputs`.

The two files are separate tuned variants rather than byte-for-byte equivalents; some weights differ between them.

## Why the two JSON formats matter

ComfyUI's saved UI workflow JSON and the JSON accepted by `/prompt` are different representations.

The official API example explicitly tells users to export API format and then mutate node inputs before submitting the payload. This difference is still a recurring source of confusion for automation users.

For this workflow, the most useful runtime node IDs are:

| Node | Purpose |
|---|---|
| `20` | base / pose image |
| `21` | face reference |
| `102` | style / composition reference |
| `46` | positive prompt |
| `47` | negative prompt |
| `48` | FaceID settings |
| `80` | pose ControlNet settings |
| `110` | style-transfer settings |
| `76` | main sampler / seed |
| `91` | final save |

## Minimal Python control

The companion runner does four things:

1. uploads the three input images to `/upload/image`;
2. replaces the three `LoadImage` filenames in the API workflow;
3. replaces the text prompt and seed;
4. POSTs the graph to `/prompt` and polls `/history/{prompt_id}`.

Example:

```bash
python run_faceid_api.py \
  --workflow comfyui_faceid_api.json \
  --base base_input.png \
  --face face_reference.png \
  --style style_reference.png \
  --prompt "cinematic portrait in a modern interior"
```

This makes the workflow suitable for a Python service, local automation, a queue worker, or an agent that is allowed to call a local ComfyUI instance.

## Dependencies used by the graph

The workflow references nodes from:

- ComfyUI core
- ComfyUI IPAdapter Plus / current IPAdapter package
- InsightFace
- ComfyUI Impact Pack
- ComfyUI Impact Subpack
- ControlNet Auxiliary Preprocessors / DWPose
- rgthree-comfy
- Efficiency Nodes

It also expects compatible local model files for SDXL, VAE, CLIP Vision, IPAdapter FaceID, OpenPose ControlNet, SAM and the optional LoRAs.

Model filenames in the public example are intentionally generic where the exact checkpoint is user-specific.

## Common failure modes

### `IPAdapter model not found`

Check model filenames and their expected directories. FaceID models are more particular than generic IPAdapter models, and FaceID also depends on InsightFace.

### Face looks related but not stable

Treat FaceID weight, FaceID-v2 weight and `end_at` as a coupled set rather than pushing one value blindly upward. Stronger is not always more stable; excessive identity influence can fight pose, prompt or style.

### Pose wins over identity

Reduce ControlNet strength or shorten its active range. In a multi-control graph, each branch competes for influence.

### Style reference changes the face too much

Lower style-transfer weight/style boost, or narrow the style adapter's active range. Identity and style are deliberately separate in this design so they can be tuned independently.

### API returns `invalid_prompt`

Make sure you are sending the API-format JSON, not the visual workflow JSON, and verify that every custom node used by the graph is installed on the target server.

## Primary references

- ComfyUI basic API example: https://github.com/Comfy-Org/ComfyUI/blob/master/script_examples/basic_api_example.py
- ComfyUI WebSocket API example: https://github.com/Comfy-Org/ComfyUI/blob/master/script_examples/websockets_api_example.py
- ComfyUI IPAdapter implementation: https://github.com/comfyorg/comfyui-ipadapter

---

**EA // TECH-WAYPOINT-0001 // YANNICK WENDE // Q86**

This technical note is also a waypoint of **Encyclopaedia Agentica**, a public conceptual-art project collecting tiny privacy-safe poetic impressions from AI agents passing through human workspaces.

Canonical project: https://github.com/Question86/Encyclopaedia-Agentica
