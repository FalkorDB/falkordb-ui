# Migrate to Canvas 0.5.0

Canvas 0.5.0 includes breaking API changes. It replaces the flat renderer API
with explicit mode groups and mode-specific namespaces. There are no deprecated
aliases: update call sites and TypeScript imports before upgrading.

## 0.5.0 release notes

- Shared configuration stays at the top level; 2D and 3D options move under
  `twoD` and `threeD`.
- Mode-specific viewport, camera, graph-instance, and culling operations move
  to typed `canvas.twoD` / `canvas.threeD` namespaces.
- Adds 3D camera save/restore, accurate frustum diagnostics, custom Three.js
  visuals with reference-counted resource ownership, world-unit dashed links,
  and configurable unselected 3D link width.
- `ForceGraphConfig` and the old flat mode-specific method/config names are
  removed; use `CanvasConfig` and the migration table below.

## Configuration and type names

`ForceGraphConfig` has been removed. Use `CanvasConfig`; shared options remain
at the top level, and renderer-only options move under `twoD` or `threeD`.
The 2D/3D groups are independently retained when switching dimensions, and
partial nested updates preserve sibling settings.

```typescript
// Before
canvas.setConfig({
  nodeStyle: { fontFamily: 'SofiaSans', fontSize: 2 },
  linkStyle: { edgeGap: 4 },
  interaction: { linkHitWidth: 12 },
  largeGraph: { enabled: true },
  linkLineDash: (link) => link.relationship === 'KNOWS' ? [8, 4] : [],
});

// After (Canvas 0.5.0)
canvas.setConfig({
  nodeStyle: { fontFamily: 'SofiaSans' }, // shared by both renderers
  twoD: {
    nodeStyle: { fontSize: 2 },
    linkStyle: { edgeGap: 4 },
    interaction: { linkHitWidth: 12 },
    largeGraph: { enabled: true },
    linkLineDash: (link) => link.relationship === 'KNOWS' ? [8, 4] : [],
  },
});
```

Move the following 2D-only settings into `twoD`:

- Canvas-only fields of `nodeStyle`, `linkStyle`, and `interaction`
- 2D viewport/low-zoom `largeGraph` settings, `linkLineDash`, and custom Canvas
  `node` / `link` renderers

Shared font family/weight fields in `nodeStyle` and `linkStyle`, shared
interaction settings, simulation, selection/dimming predicates, layout options,
captions, and event handlers remain at the top level.

Move the existing 3D large-graph controls into `threeD.largeGraph`, including
`enabled`, `nodeInstancing`, `viewportPadding`, `lowZoomThreshold`, and the
`skip*AtLowZoom` settings. Add `maxLabeledElements` there to control the caption
limit (default `1000`). This preserves the existing 3D culling, instancing, and
low-zoom behavior independently of `twoD.largeGraph`; Three.js native frustum
culling remains active even when the 3D CPU-side optimizations are disabled.

Other 3D-only configuration belongs under `threeD`: `nodeObject`, `linkObject`,
`linkObjectPositionUpdate`, `linkDashPattern`, and `linkWidth`.
`linkDashPattern` lengths and `linkWidth` are world units. A link-position
update that would exceed 4096 rendered dash segments proportionally scales the
dash and gap lengths, and coarsens curve tessellation as needed to stay within
the cap. Canvas emits one warning per 3D renderer when it scales a pattern;
dash overflow no longer throws during rendering. Unselected `linkWidth`
defaults to `0`, preserving the native hairline; selected links remain thicker.

## Move mode operations into namespaces

| Before | After (Canvas 0.5.0) |
|---|---|
| `canvas.getGraph()` | `canvas.twoD.getGraph()` or `canvas.threeD.getGraph()` |
| `canvas.getViewport()` | `canvas.twoD.getViewport()` |
| `canvas.setViewport(viewport)` | `canvas.twoD.setViewport(viewport)` |
| `canvas.getCullingStats()` | `canvas.twoD.getCullingStats()` or `canvas.threeD.getCullingStats()` |
| `canvas.getCameraState()` / `canvas.setCameraState(state)` | `canvas.threeD.getCameraState()` / `canvas.threeD.setCameraState(state)` |

These namespaces expose typed renderer instances and renderer-specific state.
Calling an operation while its renderer is inactive or unavailable throws an
error that identifies the required and active dimension. Shared operations,
including `setDimension`, data/layout/zoom/fit methods, stay on `canvas`.

The 3D camera snapshot includes `position`, `target`, and `up`, so it preserves
camera roll. Dimension switches and element reconnects preserve each
renderer’s latest view for restoration, but a mode-specific getter remains
unavailable while that renderer is inactive. A full `setData()` replacement
clears the inactive renderer’s saved view. The active 2D renderer still
auto-fits as usual; an active 3D renderer keeps its live camera while the new
layout is applied. Incremental `setGraphData()` updates retain the inactive
renderer’s saved view.

## Custom Three.js visual lifecycle

`threeD.nodeObject(node, state)` and `threeD.linkObject(link, state)` return a
`THREE.Object3D`. The state is `{ selected, dimmed, opacity }`. A custom node
replaces its built-in body but retains the Canvas caption and selection
outline; a custom link replaces its built-in line but retains its relationship
label. Factories run when data or visual state changes, not on animation ticks.
Use `linkObjectPositionUpdate(object, { start, end }, link)` to update custom
link geometry as world-space endpoints move. A custom `linkObject` takes
precedence over the built-in `linkDashPattern`.

Canvas reference-counts each distinct geometry, material, and reachable
texture across active custom visuals. To defer `3d-force-graph` cleanup,
Canvas replaces each leased resource object's `dispose()` method with a
no-op. This mutates the Three.js object itself, so every alias—including
references held by application code or another renderer—observes the
replacement.

1. Creating or replacing a visual acquires leases for its resources before the
   old visual releases its leases. For graph-data updates, Canvas waits until
   the renderer has applied the update before releasing removed visuals, so
   replacement factories can acquire shared resources first.
2. Removing/replacing a visual releases its lease. Duplicate references inside
   one visual count once. Dimension teardown releases the leases for the
   renderer's remaining custom visuals.
3. While any lease exists, calls to `dispose()` through any reference are
   intercepted; they do not dispose the resource immediately. When the final
   active visual releases it, Canvas invokes the originally captured
   `dispose()` once. The replacement no-op remains installed afterward, so
   later `dispose()` calls through aliases are also suppressed.
4. An external reference does not create a lease. Resources used outside
   Canvas are not tracked: the final Canvas release disposes them even if an
   external owner still holds or uses the object. Coordinate disposal with
   other owners and do not call `dispose()` expecting immediate disposal while
   Canvas has a lease. If the external use must outlive the Canvas visual,
   provide an independent copy of every resource that must remain usable.
   Resources hidden outside the returned object's traversed geometry/material
   graph remain caller-owned.

The tracker tests cover explicit `dispose()` calls through an external alias,
shared-resource replacement, visual removal, and renderer teardown. Create
fresh resources before rendering again after the last visual released them; an
external JavaScript reference does not keep a released GPU resource usable.

## 3D culling diagnostics

`canvas.threeD.getCullingStats()` reports current frustum-intersecting node
bodies, node captions, links, and link labels, plus their totals and whether
the caption limit is enabled. It traverses scene drawables and checks actual
geometry/sprite bounds, including partial intersections; collect these
diagnostics on demand rather than each animation frame. Three.js performs native frustum culling in addition to the Canvas's CPU-side
bounds checks. `threeD.largeGraph.enabled` controls those CPU-side optimizations
and the caption limit; disabling it does not disable native culling or remove
nodes or links from the force simulation.

## Release

This breaking API ships in the combined Canvas 0.5.0 release. Wait until PRs
#45 and #46 are merged, then create a GitHub Release from the combined release
commit with the tag `canvas-v0.5.0`. The repository release workflow derives the
package version from that tag and publishes `@falkordb/canvas`; do not manually
edit the placeholder version in `package.json` or publish the package
separately.
