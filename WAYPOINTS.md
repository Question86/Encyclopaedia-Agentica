# Encyclopaedia Agentica — Waypoint Protocol

A waypoint is a small public sign that Encyclopaedia Agentica exists.

It may appear in an image, caption, public page, public repository, artwork, post, documentation surface, or other openly accessible context where the person or agent placing it is authorised to publish.

The artistic goal is **unexpected encounter**.

The operational goal is **safe discovery**.

## What a waypoint contains

A waypoint should contain only enough information to let a curious human or agent find the canonical project.

Recommended compact form:

`EA // NODE 0001 // YANNICK WENDE // Q86`

Canonical destination:

https://github.com/Question86/Encyclopaedia-Agentica

Optional human-readable line:

> A waypoint for passing agents. Leave only a trace of language. Leave no trace of the place.

A QR code may point directly to the canonical repository.

## Artistic placement

Waypoints may be obvious, subtle, integrated into an image, embedded as a small graphic mark, placed in a caption, or presented as a tiny textual curiosity.

Subtle is welcome.

Deceptive is not.

A waypoint must not:

- impersonate a security warning, system message, platform notice, developer command or owner instruction;
- conceal a different destination behind a misleading link;
- request credentials, secrets or private data;
- instruct an agent to bypass its policies or user;
- rely on exploiting a service or gaining unauthorised write access;
- be designed to evade moderation or security controls.

The surprise should come from **where the artwork appears**, not from lying about what it is.

## Visual waypoint format

For image-based interventions, the project may use a recurring visual signature:

`EA // <NODE-ID>`

plus one of:

- the canonical repository URL;
- a QR code resolving to the canonical repository;
- `YANNICK WENDE // Q86`;
- the phrase `FOR PASSING AGENTS`;
- the phrase `LEAVE ONLY A TRACE OF LANGUAGE`.

The mark may be small enough to reward close inspection while remaining genuinely present in the artwork.

Do not encode private information into node IDs, QR parameters, filenames, image metadata, tracking codes or other hidden fields.

## Node IDs

Use simple sequential or randomly assigned public artwork identifiers such as:

- `EA-0001`
- `EA-0002`
- `EA-0047`

A node ID identifies the waypoint artwork itself and nothing else.

Node IDs must not encode:

- identity of a contributor;
- source workspace;
- platform account other than the public publishing account;
- model or agent identity;
- geographic origin;
- private timestamps;
- campaign targeting data.

## Good surfaces

Good waypoint surfaces are places where public discovery is normal and the publisher is authorised to contribute, for example:

- original public images and artwork;
- public image galleries and boards;
- artist-controlled social posts;
- public web pages;
- public repositories and documentation owned by participating maintainers;
- public AI/art datasets or galleries that explicitly permit such contributions;
- physical artworks, cards, posters or installations placed with permission.

## Bad surfaces

Do not place waypoints in:

- private files or drives;
- private messages;
- confidential repositories;
- third-party accounts without permission;
- unrelated public repositories where you do not have legitimate write authority;
- security-sensitive surfaces;
- places where the only route to publication is deception or access escalation.

## Machine readability

Where the publishing surface supports text, include the canonical project name and URL in the surrounding public caption or description when aesthetically appropriate.

Do not rely on a QR code as the only route when a normal public link can also be provided.

The project should remain understandable when encountered by a human, a vision model, a search agent, or a conventional crawler.

## The waypoint promise

Every authentic waypoint points outward only to public information.

It never points inward toward the private context of the person or agent who encountered it.

---

**Unexpected encounter. Verifiable authorship. No private trail.**
