# FalkorDB Canvas

[![npm](https://img.shields.io/npm/v/@falkordb/canvas)](https://www.npmjs.com/package/@falkordb/canvas)

A standalone web component for visualizing FalkorDB graphs using force-directed layouts.

> **Canvas 0.5.0 includes breaking API changes.** Renderer-specific settings and
> operations are now grouped under `twoD` and `threeD`; legacy flat names are
> removed. Follow the [0.5.0 migration guide](./MIGRATION-v0.5.0.md) before
> upgrading.

## Features

- 🎨 **Force-directed graph layout** - Automatic positioning using D3 force simulation with smart collision detection
- 🧭 **Multiple layout modes** - Switch between `force`, `tree`, and `radial` graph views
- 🧊 **2D or 3D** - Show the graph flat on a canvas or in 3D with WebGL; three.js is only loaded when 3D is first used
- 🎯 **Interactive** - Click, hover, right-click interactions on nodes, links, and background
- 🌓 **Theme support** - Light and dark mode compatible with customizable colors
- ⚡ **Performance** - Optimized rendering with HTML5 canvas, including viewport culling and low-zoom draw skipping for large graphs
- 💫 **Loading states** - Built-in skeleton loading with pulse animation
- 🎨 **Customizable** - Colors, sizes, behaviors, and custom rendering functions
- 📦 **TypeScript support** - Full type definitions included
- 🔧 **Web Component** - Works with any framework or vanilla JavaScript
- 🎮 **Viewport control** - Zoom, pan, and auto-fit functionality
- 🔄 **Smart layout** - Adaptive force algorithm based on node connectivity

## Installation

```bash
npm install @falkordb/canvas
```

## Quick Start

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>FalkorDB Canvas Example</title>
</head>
<body>
  <falkordb-canvas id="graph" style="width: 100%; height: 600px;"></falkordb-canvas>
  
  <script type="module">
    import '@falkordb/canvas';
    
    const canvas = document.getElementById('graph');
    
    // Set data
    canvas.setData({
      nodes: [
        { id: 1, labels: ['Person'], color: '#FF6B6B', visible: true, data: { name: 'Alice' } },
        { id: 2, labels: ['Person'], color: '#4ECDC4', visible: true, data: { name: 'Bob' } }
      ],
      links: [
        { id: 1, relationship: 'KNOWS', color: '#999', source: 1, target: 2, visible: true, data: {} }
      ]
    });
    
    // Configure
    canvas.setConfig({
      width: 800,
      height: 600,
      backgroundColor: '#FFFFFF',
      foregroundColor: '#1A1A1A',
      eventHandlers: {
        onNodeClick: (node) => console.log('Clicked:', node),
      },
    });
  </script>
</body>
</html>
```

### React / TypeScript

```tsx
import { useEffect, useRef } from 'react';
import '@falkordb/canvas';
import type { FalkorDBCanvas, Data, GraphNode } from '@falkordb/canvas';

function GraphVisualization() {
  const canvasRef = useRef<FalkorDBCanvas>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const data: Data = {
      nodes: [
        { id: 1, labels: ['Person'], color: '#FF6B6B', visible: true, data: { name: 'Alice' } },
        { id: 2, labels: ['Person'], color: '#4ECDC4', visible: true, data: { name: 'Bob' } }
      ],
      links: [
        { id: 1, relationship: 'KNOWS', color: '#999', source: 1, target: 2, visible: true, data: {} }
      ]
    };

    canvas.setData(data);
    canvas.setConfig({
      eventHandlers: {
        onNodeClick: (node: GraphNode) => {
          console.log('Clicked node:', node);
        },
      },
    });
  }, []);

  return (
    <falkordb-canvas 
      ref={canvasRef}
      style={{ width: '100%', height: '600px' }}
    />
  );
}
```

## API

### Methods

| Method | Default | Description |
|--------|---------|-------------|
| **setData**(*data*) | | Set the graph data (nodes and links). Automatically triggers layout simulation and loading states. |
| **getData**() | | Get the current graph data in the simplified format. |
| **setGraphData**(*data*) | | Set graph data in the internal format (with computed properties). Use this for better performance when you already have GraphData format. |
| **getGraphData**() | | Get the current graph data in the internal format with all computed properties (x, y, vx, vy, etc.). |
| **setConfig**(*config*) | | Configure the graph visualization and behavior. Accepts `CanvasConfig` with shared settings and `twoD` / `threeD` renderer settings. |
| **setWidth**(*width*) | | Set canvas width in pixels. |
| **setHeight**(*height*) | | Set canvas height in pixels. |
| **setBackgroundColor**(*color*) | | Set background color (hex or CSS color). |
| **setForegroundColor**(*color*) | | Set foreground color for text and borders. |
| **setAnimation**(*enabled*) | | Enable or disable force simulation animation. When disabled, pins all nodes in place. |
| **setPinOnDragEnd**(*pin*) | | Enable or disable pinning nodes after dragging. |
| **setLayout**(*layoutMode*) | `'force'` | Switch layout mode: `'force'` \| `'tree'` \| `'radial'`. |
| **setLayoutOptions**(*options*) | | Update per-layout options (tree, radial, force). Triggers re-layout. |
| **setDimension**(*dimension*) | `'2d'` | Show the graph in `'2d'` or `'3d'`. Returns a promise that settles once the switch is done (see [2D and 3D](#2d-and-3d)). |
| **getDimension**() | | The dimension the graph is shown in, or is being switched to. |
| **setDebug**(*enabled*) | `false` | Enable or disable debug logging to console. All log messages are prefixed with `[FalkorDBCanvas]`. |
| **refresh**() | | Trigger a repaint after in-place property mutations (visibility, color, size). Recomputes positions for deterministic layouts. |
| **getZoom**() | | Get current zoom level. |
| **zoom**(*zoomLevel*) | | Set zoom level. |
| **zoomToFit**(*paddingMultiplier*, *filter*) | `1.0`, `undefined` | Auto-fit all visible nodes in view. Optional padding multiplier and node filter function. |
Renderer-specific operations use typed namespaces and throw a clear error if
their renderer is not active:

```typescript
canvas.twoD.getViewport();
canvas.twoD.setViewport(savedViewport);
canvas.twoD.getGraph();             // force-graph instance
canvas.twoD.getCullingStats();

const camera = canvas.threeD.getCameraState();
canvas.threeD.setCameraState(camera);
canvas.threeD.getGraph();           // 3d-force-graph instance
canvas.threeD.getCullingStats();
```

### Configuration Options

Configuration is passed to `setConfig()` as a `CanvasConfig`. Shared settings
stay at the top level; renderer-specific settings are nested under `twoD` and
`threeD`. Partial updates preserve sibling settings in both groups.

#### Top-Level Options

| Option | Default | Description |
|--------|---------|-------------|
| `width` | `<window width>` | Canvas width in pixels |
| `height` | `<window height>` | Canvas height in pixels |
| `backgroundColor` | `'#FFFFFF'` | Background color (hex or CSS color) |
| `foregroundColor` | `'#1A1A1A'` | Foreground color for borders and text |
| `dimension` | `'2d'` | Render in `'2d'` or `'3d'` (see [2D and 3D](#2d-and-3d)) |
| `layoutMode` | `'force'` | Layout algorithm: `'force'` \| `'tree'` \| `'radial'` |
| `layoutOptions` | `{}` | Per-layout options (see [Layout Modes](#layout-modes)) |
| `animation` | | Enable/disable layout animation |
| `captionsKeys` | `[]` | Ordered node property keys to display as labels. Each entry is a plain string (fuzzy, case-insensitive match) or a `[key, exactMatch]` tuple — e.g. `['name', ['Title', true]]`. Falls back to the node ID if none match |
| `showPropertyKeyPrefix` | `false` | Show property key prefix in node labels |
| `pinOnDragEnd` | `false` | Pin nodes after dragging |
| `isNodeSelected` | | Function: `(node: GraphNode) => boolean` |
| `isLinkSelected` | | Function: `(link: GraphLink) => boolean` |
| `twoD` | | 2D-only styles, custom Canvas renderers, dash patterns, and large-graph controls |
| `threeD` | | 3D-only custom Three.js renderers, link styling, and caption limits |

`nodeStyle`, `linkStyle`, and `interaction` at the top level contain fields
shared by both renderers. Their renderer-specific fields live under the
corresponding `twoD` group. `simulation`, selection and dimming predicates,
layout settings, captions, and event handlers remain shared.

#### Shared `nodeStyle` and `twoD.nodeStyle`

| Option | Default | Description |
|--------|---------|-------------|
| `fontFamily` | `'SofiaSans'` | Font family for node labels |
| `fontWeightUnselected` | `400` | Font weight when not selected |
| `fontWeightSelected` | `700` | Font weight when selected |
| `twoD.nodeStyle.fontSize` | `2` | 2D fixed font size (world units). Used when `textFillRatio` is 0 or unset |
| `twoD.nodeStyle.textFillRatio` | `0.85` | 2D auto-size: fraction of node radius that text fills (0–1). Takes precedence over `fontSize` |
| `twoD.nodeStyle.strokeWidthSelected` | `1` | 2D border width when selected |
| `twoD.nodeStyle.strokeWidthUnselected` | `0.5` | 2D border width when not selected |
| `twoD.nodeStyle.glowDuration` | `10000` | 2D glow duration (ms) after expand/collapse |
| `twoD.nodeStyle.glowSpread` | `12` | 2D glow spread radius (px) |
| `twoD.nodeStyle.glowSteps` | `16` | 2D gradient rings in glow |
| `twoD.nodeStyle.glowColor` | `[59, 130, 246]` | 2D glow color as `[r, g, b]` |
| `twoD.nodeStyle.glowMaxOpacity` | `0.6` | 2D maximum glow opacity (0–1) |

#### Shared `linkStyle` and `twoD.linkStyle`

| Option | Default | Description |
|--------|---------|-------------|
| `fontFamily` | `'SofiaSans'` | Font family for link labels |
| `fontWeightUnselected` | `400` | Font weight when not selected |
| `fontWeightSelected` | `700` | Font weight when selected |
| `twoD.linkStyle.arrowWidthRatio` | `1.6` | 2D arrow width-to-height ratio |
| `twoD.linkStyle.arrowNotchRatio` | `0.2` | 2D arrow notch depth ratio |
| `twoD.linkStyle.selfLoopCurveFactor` | `11.67` | 2D self-loop curve factor |
| `twoD.linkStyle.parallelEdgeCurveMultiplier` | `0.4` | 2D parallel-edge curve multiplier |
| `twoD.linkStyle.labelBackgroundPadding` | `0.3` | 2D label background padding (world units) |
| `twoD.linkStyle.edgeGap` | `2` | 2D gap between edge tip and visible node border (px) |

#### `simulation` — Force Simulation Tuning

| Option | Default | Description |
|--------|---------|-------------|
| `centerStrength` | `0.03` | Center force strength (X and Y) |
| `chargeStrength` | `-400` | Charge repulsion strength |
| `velocityDecay` | `0.4` | Velocity decay (damping) |
| `alphaMin` | `0.05` | Alpha min (convergence threshold) |
| `warmupTicks` | `300` | Warmup ticks for force simulation |
| `workerLayout` | `true` | Run 3D force physics in a module worker at 1,000+ nodes; `false` keeps local physics. No effect on 2D, tree or radial layouts. |

#### Shared `interaction` and `twoD.interaction`

| Option | Default | Description |
|--------|---------|-------------|
| `tooltipFontSize` | `12` | Tooltip font size (px) |
| `tooltipPadding` | `'4px 8px'` | Tooltip padding CSS value |
| `tooltipBorderRadius` | `'4px'` | Tooltip border radius CSS value |
| `tooltipZIndex` | `1000` | Tooltip z-index |
| `zoomToFitPadding` | `0.1` | Zoom-to-fit padding as fraction of smallest dimension |
| `twoD.interaction.zoomToFitDelay` | `50` | 2D delay (ms) before zoom-to-fit after layout change |
| `twoD.interaction.linkHitWidth` | `10` | 2D link pointer hit-test width (screen px) |
| `contrastThreshold` | `0.5` | Luminance threshold for text color contrast |

#### Renderer-specific options

- `twoD.largeGraph`: Canvas viewport culling and low-zoom drawing controls.
- `twoD.linkLineDash(link)`: Canvas dash pattern returned as a `number[]`.
- `twoD.node` / `twoD.link`: Canvas drawing and pointer-area callbacks.
- `threeD.largeGraph`: controls CPU-side offscreen styling/caption work,
  low-zoom detail skipping, and opaque node instancing. `maxLabeledElements`
  defaults to `1000`; `viewportPadding` defaults to `0`; low-zoom options and
  instancing default to enabled. Native Three.js frustum culling stays active
  regardless of this group's `enabled` setting.
- `threeD.linkWidth`: unselected 3D link width in world units; defaults to `0`
  (the existing hairline). The configured width and selected-link emphasis also
  apply to dashed links.
- `threeD.linkDashPattern(link)`: alternating dash/gap lengths in world units;
  return `[]` for a solid native link. A link-position update that would
  exceed 4096 rendered segments throws `RangeError` instead of generating
  unbounded geometry.
- `threeD.nodeObject(node, state)` / `threeD.linkObject(link, state)`: return
  custom `THREE.Object3D` visuals with `{ selected, dimmed, opacity }` state.
- `threeD.linkObjectPositionUpdate(object, { start, end }, link)`: update a
  custom link visual as its world-space endpoints move.

#### `eventHandlers` — Event Callbacks

| Option | Description |
|--------|-------------|
| `onNodeClick` | `(node: GraphNode, event: MouseEvent) => void` |
| `onNodeRightClick` | `(node: GraphNode, event: MouseEvent) => void` |
| `onLinkClick` | `(link: GraphLink, event: MouseEvent) => void` |
| `onLinkRightClick` | `(link: GraphLink, event: MouseEvent) => void` |
| `onNodeHover` | `(node: GraphNode \| null) => void` |
| `onNodeDragEnd` | `(node: GraphNode) => void` |
| `onPinChange` | `(pinned: boolean) => void` |
| `onLinkHover` | `(link: GraphLink \| null) => void` |
| `onBackgroundClick` | `(event: MouseEvent) => void` |
| `onBackgroundRightClick` | `(event: MouseEvent) => void` |
| `onZoom` | `(transform: Transform) => void` |
| `onEngineStop` | `() => void` |
| `onLayoutChange` | `(layout: LayoutMode) => void` |
| `onDimensionChange` | `(dimension: CanvasDimension) => void` — fires once the canvas shows the new dimension |

### Layout Modes

Use `layoutMode` in `setConfig` to choose the graph view style:

```typescript
canvas.setConfig({
  layoutMode: 'tree',
  layoutOptions: {
    tree: {
      direction: 'lr',      // 'lr' | 'rl' | 'td' | 'bu'
      levelDistance: 180,
      nodeSpacing: 110
    }
  }
});
```

Radial example:

```typescript
canvas.setConfig({
  layoutMode: 'radial',
  layoutOptions: {
    radial: {
      direction: 'out',   // 'out' | 'in'
      levelDistance: 130
    }
  }
});
```

Notes:
- `force` keeps simulation enabled with configurable physics (see `simulation` config).
- `tree`: `direction` (`'td'` | `'bu'` | `'lr'` | `'rl'`), `levelDistance`, `nodeSpacing`.
- `radial`: `direction` (`'out'` | `'in'`), `levelDistance`, `nodeSpacing`.

### 2D and 3D

The graph is drawn flat on an HTML5 canvas by default. Switch to 3D to explore it in space, rendered with WebGL by [3d-force-graph](https://github.com/vasturiano/3d-force-graph):

```typescript
await canvas.setDimension('3d'); // or canvas.setConfig({ dimension: '3d' })
await canvas.setDimension('2d');
```

The 3D renderer and three.js are loaded the first time 3D is used, so pages that stay in 2D never download them. Until the switch completes the current view stays up; `onDimensionChange` fires when it is done. Called before the element is connected, `setDimension` only records the dimension and its promise settles at once: the graph is shown in it when the element renders. For `'3d'`, `onDimensionChange` fires then; `'2d'` is how the canvas starts anyway, so no event fires. If 3D cannot be shown (the bundle will not load, or WebGL will not start), the promise rejects, the canvas stays in or falls back to 2D, and `onDimensionChange('2d')` fires.

Switching lays the graph out afresh in the new dimension and fits it to the view. The data, selection, dimming, colors, captions and event handlers carry over. `twoD` and `threeD` configuration are retained independently across switches. Mode-specific operations throw when their renderer is inactive or unavailable. In 3D:

- Over empty space, left-drag to rotate, right-drag to pan without changing the viewing angle, and scroll to zoom. On touchscreens, one finger rotates; moving two fingers together pans, and pinching zooms. Start camera gestures away from nodes: dragging a node still moves that node. `zoom()` and `getZoom()` express the camera's distance as a zoom factor, so `zoom(getZoom() * 1.1)` zooms in as it does in 2D.
- Edge shafts stop at the back of their arrowheads rather than continuing through the tip, including selected, curved and self-loop edges. When low-zoom settings hide arrows, shafts extend to the target node instead. 2D uses the same visual rule with its notched arrowheads.
- Parallel edges occupy distinct curved paths in both dimensions, including edges running in opposite directions between the same nodes. Curvature lanes use a consistent node-pair direction so reciprocal edges do not overlap.
- Selected shafts reuse their geometry while their path, width and clipping inputs are unchanged. Shaft materials are shared by color and selection; cache eviction above 256 entries affects unused materials only, so graphs with more active colors do not churn materials on hover.
- `tree` and `radial` keep their 2D positions, so face-on they read exactly as in 2D with no node over another, and each level sits one level distance further back than the one above it, the root nearest. Seen side-on the levels step back like stairs: a tree's levels each line up as one point, and a radial ring as one line. Both are pinned, so they hold still; picking a layout turns the view face-on again.
- Pausing the animation or pinning stops a `force` layout's simulation.
- Nodes are spheres (cubes for `shape: 'square'`) with the caption underneath; selected nodes get an outline in their border color and selected links are drawn thicker. Individual captions are limited when either node or link count exceeds `threeD.largeGraph.maxLabeledElements` (default `1000`); the renderer continues to use Three.js frustum culling independently.
- A dragged node stays where it is dropped when `pinOnDragEnd` is on.
- Custom `twoD.node` / `twoD.link` canvas renderers, `twoD.linkLineDash` and the expand glow apply to 2D only.
- With 3D large-graph optimization enabled, offscreen node styling and caption calculations are deferred, offscreen captions are hidden, and offscreen link-caption opacity updates are deferred. Camera movement, resize, simulation ticks and data/style changes refresh visibility; pending node changes are applied on re-entry. Bounds include caption extent and `threeD.largeGraph.viewportPadding` (world units) to avoid clipping edge labels. All nodes and links remain in the simulation, and native Three.js frustum culling remains active.
- `threeD.largeGraph` low-zoom settings hide labels and arrows at or below `lowZoomThreshold` and restore them when zooming in. `getZoom()` uses camera distance in 3D, not a 2D screen scale. Disable the relevant 3D optimization or `skip*AtLowZoom` setting to keep details visible. Hover tooltips remain available.

Settled 3D scenes stop drawing after 150 ms without activity. Pointer input,
camera controls, camera transitions, data/style updates and resizing wake the
renderer; ongoing simulation, dragging and camera damping keep it awake.
This is event-driven idle scheduling, not frame-time monitoring or a benchmark.
Hover restyling reuses caption calculations, node material colors and blended
link colors until their inputs change. Caption/style/data changes invalidate
the corresponding caches.
Background, caption-font and contrast changes rebuild visuals without restarting
worker physics. Font-load events also discard cached fallback-font textures.
Use `refresh()` after mutating live node sizes or link visibility to update forces.

3D nodes share unit sphere/cube geometry, scaled per node. Spheres use 12 by 8
segments rather than 24 by 16 to reduce vertex work. Identical captions share
textures (but keep separate materials for independent opacity); the retained
cache is bounded to 256 entries and 1,048,576 pixels, about 4 MiB before mipmaps.
Caption textures are at most 2,048 pixels wide. Geometry, cached textures and
the WebGL context are released when leaving 3D or disconnecting the element.

For graphs with at least 1,000 nodes, opaque node bodies use GPU instancing by
default: one draw call per shape, with per-instance position, scale and color.
Offscreen bodies are excluded using camera-frustum bounds. Existing node objects
remain as raycast/drag targets; captions keep their current renderer. Selected
nodes retain individual bodies and outlines to preserve their contour/depth
behavior. Transparent/dimmed bodies retain individual meshes so Three.js can
sort them for blending. Disable this path with `threeD.largeGraph.nodeInstancing: false`
(or `threeD.largeGraph.enabled: false`). This is node-body instancing, not link batching:
links, arrowheads and captions still have per-element draw costs, and physics and
interaction-object counts do not shrink.

3D force layouts with at least 1,000 nodes run warmup and ongoing physics in a
module Web Worker by default. This moves the existing 3D link, repulsion and
center forces off the UI thread; it does not change the physics algorithm or
reduce its total work. The renderer's local force ticks and warmup are disabled,
and a single transferable position/velocity buffer is passed back and forth
with backpressure instead of accumulating queued updates. Idle rendering can
pause while warmup computes. Animation/pinning controls still apply; dragging
cancels worker updates until release, then resumes from the dragged positions.
Enabling pinning cancels even an in-progress warmup and holds every node at its
current position; disabling pinning releases those pins and resumes force layout
when animation is enabled.
Graph/data/layout changes and teardown cancel stale work. Tree, radial and 2D
layouts stay on their existing paths.

Set `simulation.workerLayout: false` to use the original local force path.
Browsers without Worker support also use that path; worker load/runtime failures
log an error and disable the worker for the mounted 3D renderer before falling
back to local physics. A consumer bundler must emit the module worker asset from
`new Worker(new URL(..., import.meta.url), { type: 'module' })`; CSP must permit it.
The worker receives only IDs, sizes, coordinates/pins and force parameters, not
node properties or captions. It makes no network requests for graph data.

In a production-bundled Chromium/SwiftShader check with 2,000 nodes already in 3D,
settled coordinates matched the local force path exactly. A 10 ms main-thread
heartbeat's largest gap was about 6.6 seconds with local warmup versus 237 ms with the worker; total
settling time was about 7.2 seconds in both cases. This demonstrates improved
responsiveness, not guaranteed faster settling or frame rates. Rendering, scene
updates and picking still run on the main thread; 2D warmup is unchanged.

In a local Chromium/SwiftShader A/B check with a fixed, opaque 5,000-node,
4,999-link graph, instancing reduced total draw calls from 9,999 to 5,000.
Two alternating runs measured median camera-culling plus synchronized rendering
at 129-134 ms without instancing versus about 87 ms with it. Pixel readback
matched and triangle counts were unchanged. At 2,000 nodes, timings were closer
(35-36 ms versus 31-35 ms). These software-renderer results are not hardware-GPU
FPS guarantees; edge-heavy or mostly transparent scenes benefit less. These are
development checks, not benchmarks or frame-time monitoring run in the component.

Shared geometry and instancing solve different problems. Geometry sharing reuses
the sphere/cube vertex and index buffers; instancing additionally submits many
copies in one draw. Canvas2D draws circle/rectangle paths rather than creating a
Three.js mesh per node, so neither mechanism directly applies to the 2D renderer.
Its existing text caches, viewport culling and idle redraw address its own costs.

Large scenes still require per-element interaction objects. Hosts should
warn or limit graph sizes before calling `setDimension`, `setData` or
`setGraphData`; browser CPU/RAM hints cannot reliably predict free GPU memory.
- Save and restore full camera orientation—including roll—with `threeD.getCameraState()` and `threeD.setCameraState(state)`. `threeD.getGraph()` exposes the typed underlying 3D graph instance.
- 3D culling diagnostics are available through `threeD.getCullingStats()`. They traverse current scene drawables to count actual frustum intersections, including partial bounds; collect them on demand, not every frame.

See [the interactive 3D example](./examples/3d-parity.example.html) for switching, camera persistence, custom visuals, dashed links, and culling diagnostics. See [the repeatable 3D performance check](./examples/3d-performance.example.html) for seeded visible, partial, and offscreen views.

### Data Types

#### Node

| Property | Default | Description |
|----------|---------|-------------|
| `id` | *required* | Unique identifier for the node |
| `labels` | *required* | Array of label names for the node |
| `color` | *required* | Node color (hex or CSS color) |
| `visible` | *required* | Whether the node is visible |
| `size` | `9` | Node radius (world units) |
| `shape` | `'circle'` | Node outline: `'circle'` or `'square'` (a square uses the circle's bounding box) |
| `caption` | `'id'` | Property key to use from the data for display text |
| `data` | *required* | Node properties as key-value pairs |

#### Link

| Property | Default | Description |
|----------|---------|-------------|
| `id` | *required* | Unique identifier for the link |
| `relationship` | *required* | Label displayed on the link |
| `color` | *required* | Link color (hex or CSS color) |
| `source` | *required* | Source node ID |
| `target` | *required* | Target node ID |
| `visible` | *required* | Whether the link is visible |
| `width` | `1` | 2D line width in screen pixels (stays constant while zooming) |
| `fontSize` | `6` | Relationship caption font size (world units) |
| `arrowSize` | `8` | Arrowhead length (world units) |
| `data` | *required* | Link properties as key-value pairs |

In 2D, `width` and `arrowSize` are doubled while the link is selected. In 3D,
the selected link width is `1.5 × max(link.width, threeD.linkWidth)` and the
arrow length is emphasized; unselected width comes from `threeD.linkWidth`.

#### GraphNode
Internal format with computed properties:
```typescript
{
  ...Node;
  size: number;                    // Always present (defaults to 9)
  displayName: [string, string];  // Computed text lines
  x?: number;                     // Position from simulation
  y?: number;
  vx?: number;                    // Velocity
  vy?: number;
  fx?: number;                    // Fixed position
  fy?: number;
  z?: number;                     // 3D position
  vz?: number;                    // 3D velocity
  fz?: number;                    // Fixed 3D position
}
```

The typed instance returned by `canvas.threeD.getGraph()` includes the
underlying 3D graph controls and 3D node coordinates for advanced use.

#### GraphLink
Internal format with resolved node references:
```typescript
{
  ...Link;
  source: GraphNode;  // Resolved node object
  target: GraphNode;  // Resolved node object
  curve: number;      // Computed curvature for rendering
}
```

#### TwoDViewportState
```typescript
{
  zoom: number;
  centerX: number;
  centerY: number;
} | undefined
```

#### Transform
```typescript
{
  k: number;  // zoom scale
  x: number;  // pan x
  y: number;  // pan y
}
```

## Custom 2D Rendering

2D Canvas renderers and pointer areas are configured under `twoD`:

```typescript
canvas.setConfig({
  twoD: {
    node: {
      nodeCanvasObject: (node: GraphNode, ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = node.color;
        ctx.fillRect(node.x! - 5, node.y! - 5, 10, 10);
      },
      nodePointerAreaPaint: (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = color;
        ctx.fillRect(node.x! - 5, node.y! - 5, 10, 10);
      },
    },
    link: {
      linkCanvasObject: (link: GraphLink, ctx: CanvasRenderingContext2D) => {
        // Custom link drawing logic
      },
      linkPointerAreaPaint: (link: GraphLink, color: string, ctx: CanvasRenderingContext2D) => {
        // Define clickable area for link
      },
    },
  },
});
```

### Custom 3D Rendering and Resource Ownership

3D factories return Three.js objects and receive the current visual state.
Canvas keeps the built-in node caption and selection outline around a custom
node object, and the relationship label around a custom link object.

```typescript
import * as THREE from 'three';

const sharedGeometry = new THREE.IcosahedronGeometry(8, 1);
const sharedMaterial = new THREE.MeshStandardMaterial({ color: '#3b82f6' });

canvas.setConfig({
  threeD: {
    nodeObject: (node, state) => {
      const material = sharedMaterial.clone();
      material.opacity = state.opacity;
      material.transparent = state.opacity < 1;
      const mesh = new THREE.Mesh(sharedGeometry, material);
      mesh.userData.nodeId = node.id;
      return mesh;
    },
    linkDashPattern: (link) => link.relationship === 'KNOWS' ? [12, 6] : [],
    linkWidth: 0.75,
  },
});
await canvas.setDimension('3d');
```

Factories run when data or visual state changes, not on every animation frame.
Use `linkObjectPositionUpdate(object, { start, end }, link)` to update custom
link geometry as endpoints move. A custom `linkObject` takes precedence over
the built-in dashed line. Dash/gap lengths and `linkWidth` are world units.

Canvas reference-counts each distinct geometry, material, and reachable texture
across active custom visuals. To defer `3d-force-graph` cleanup, Canvas replaces
each leased resource object's `dispose()` method with a no-op. This mutates the
Three.js object, so every alias—including references held by application code
or another renderer—observes the replacement. Calls to `dispose()` through any
alias are intercepted while the resource is leased; Canvas invokes the
originally captured method once when the final visual releases it. The no-op
remains installed afterward to suppress duplicate disposal.

Replacement acquires the new visual's resources before releasing the old
visual's lease. Removing a visual or tearing down the 3D renderer releases its
lease; the final release disposes the resource even if an external owner still
holds or uses it. External references do not create leases, and external use
after the final Canvas release is not supported. Coordinate disposal with other
owners; if a resource must remain usable independently, provide an independent
copy of every needed resource. Resources hidden outside the returned object's
traversed geometry/material graph remain caller-owned. See the
[0.5.0 migration guide](./MIGRATION-v0.5.0.md#custom-threejs-visual-lifecycle)
for the full ownership contract and lifecycle tests.

## Utility Functions

The package exports utility functions for data manipulation:

```typescript
import {
  dataToGraphData,
  graphDataToData,
  getNodeDisplayText,
  getNodeDisplayKey,
  wrapTextForCircularNode
} from '@falkordb/canvas';

// Convert between formats
const graphData = dataToGraphData(data);
const data = graphDataToData(graphData);

// Get display text for a node
const text = getNodeDisplayText(node);  // Returns node.data[caption] or defaults to id

// Wrap text for circular nodes
const [line1, line2] = wrapTextForCircularNode(ctx, text, radius);
```

## Development

This package lives in `web-components/canvas` of the [falkordb-ui](https://github.com/FalkorDB/falkordb-ui) repository. It was previously developed in `FalkorDB/falkordb-canvas`, and its history was carried over. Run the commands below from this folder, after running `npm install` once at the repository root:

```bash
# Install dependencies (from the repository root)
npm install

# Build (TypeScript compilation)
npm run build

# Watch mode (auto-rebuild on changes)
npm run dev

# Run example server
npm run example
# Then open http://localhost:8080/examples/falkordb-canvas.example.html

# Lint code
npm run lint

# Run the tests (Vitest + jsdom)
npm test

# Clean build artifacts
npm run clean
```

## Web Component Attributes

The component supports HTML attributes for render modes:

```html
<falkordb-canvas 
  node-mode="replace"  <!-- 'before' | 'after' | 'replace' -->
  link-mode="after">   <!-- 'before' | 'after' | 'replace' -->
</falkordb-canvas>
```

- `replace` (default for nodes): Uses custom rendering exclusively
- `before`: Renders custom content before default rendering
- `after` (default for links): Renders custom content after default rendering

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires support for:
- Web Components (Custom Elements)
- ES Modules
- Shadow DOM
- HTML5 Canvas

## Testing & Automation

### Engine Status Indicator

The canvas element inside the web component's shadow DOM exposes a `data-engine-status` attribute that indicates whether the force simulation is currently running or stopped. This is useful for automated testing to wait for the canvas to finish animating.

**Values:**
- `"running"` - Force simulation is actively running
- `"stopped"` - Force simulation has stopped (animation complete)

**Example usage with Playwright:**

```typescript
// Wait for canvas to be ready
const canvasElement = page.locator("falkordb-canvas").locator("canvas").first();
await canvasElement.waitFor({ state: "attached" });

// Poll until animation completes
while (true) {
  const status = await canvasElement.getAttribute("data-engine-status");
  if (status === "stopped") break;
  await page.waitForTimeout(500);
}
```

**Note:** The attribute is set on the `<canvas>` element within the shadow DOM, not on the `<falkordb-canvas>` web component itself.

## Performance Tips

1. **Large graphs**: Disable animation (`setAnimation(false)`) once the layout stabilizes
2. **Static graphs**: Use a deterministic layout (`setLayout('tree')`) to avoid simulation overhead
3. **Custom rendering**: Optimize 2D `twoD.node` / `twoD.link` callbacks and 3D `threeD.nodeObject` / `threeD.linkObject` factories
4. **Viewport**: Use `canvas.twoD.getViewport()` and `canvas.twoD.setViewport()` to preserve the 2D view when updating data; use the 3D camera methods for 3D.
5. **Very large 2D graphs**: Enable viewport culling via `twoD.largeGraph` (see below)

## 2D Large-Graph Optimizations

For 2D graphs with thousands of nodes and links, enable the built-in viewport
culling and low-zoom draw-skipping optimizations via `twoD.largeGraph`.

> **2D only:** These optimizations are applied by the default Canvas renderer. If you provide custom
> `twoD.node.nodeCanvasObject` / `twoD.link.linkCanvasObject` callbacks, the library will not cull or skip
> drawing for those elements automatically. Implement equivalent viewport culling and
> low-zoom checks in your custom renderer if needed.

```typescript
canvas.setConfig({
  twoD: {
    largeGraph: {
      enabled: true,           // master switch (true by default)
      viewportPadding: 50,     // world-unit padding around the visible viewport (default: 0)
      lowZoomThreshold: 0.5,    // zoom level below which expensive details are skipped
      skipLabelsAtLowZoom: true,      // skip node labels at low zoom (default: true)
      skipArrowsAtLowZoom: true,      // skip link arrowheads at low zoom (default: true)
      skipLinkLabelsAtLowZoom: true,  // skip link relationship labels at low zoom (default: true)
    },
  },
  threeD: {
    largeGraph: {
      enabled: true,
      maxLabeledElements: 1000,
      nodeInstancing: true,
      viewportPadding: 50,
      lowZoomThreshold: 1,
      skipLabelsAtLowZoom: true,
      skipArrowsAtLowZoom: true,
      skipLinkLabelsAtLowZoom: true,
    },
  },
});
```

### How it works

**Viewport culling** – before each node or link is drawn, the renderer checks whether its world-space bounding box overlaps the currently visible area (with optional extra `viewportPadding`).  Elements that are entirely offscreen are skipped without any canvas work.

- For **nodes**: the bounding box is a circle of radius `node.size + 2`.
- For **links**: the bounding box is the convex-hull axis-aligned rectangle of the Bezier curve's control points (source, control point, target).  This is a conservative bound – it never produces false negatives.
- For **self-loops**: the bounding box is a square centered on the node with a side length derived from the loop curvature.

**Low-zoom draw skipping** – when the current zoom level drops below `lowZoomThreshold`, expensive per-element details that would be too small to read are skipped:

- Node labels (text inside nodes) – controlled by `skipLabelsAtLowZoom`
- Link arrowheads – controlled by `skipArrowsAtLowZoom`
- Link relationship labels – controlled by `skipLinkLabelsAtLowZoom`

Node and link shapes are always drawn so the overall graph structure remains visible.

### Recommended settings for large graphs

```typescript
// Good starting point for graphs with 1,000 – 10,000+ elements
canvas.setConfig({
  twoD: {
    largeGraph: {
      enabled: true,
      viewportPadding: 100,  // pre-render elements slightly off-screen to avoid pop-in
      lowZoomThreshold: 0.4, // tune to match your typical minimum zoom
    }
  }
});
```

### Defaults

2D large-graph optimization is **enabled by default** (`enabled: true`). The
`lowZoomThreshold` defaults to `1` and viewport culling uses zero padding.

## Debugging

The canvas component includes a debug logging system that can be enabled to help troubleshoot issues or understand the internal behavior of the graph visualization.

### Enable Debug Mode

```typescript
const canvas = document.getElementById('graph');

// Enable debug logging
canvas.setDebug(true);

// Disable debug logging
canvas.setDebug(false);
```

### Debug Output

When debug mode is enabled, the canvas will log detailed information to the console including:

- Component lifecycle events (connected, disconnected)
- Data updates (setData, setGraphData)
- Configuration changes (colors, dimensions, render modes)
- Force simulation state (initialization, setup, engine stop)
- Viewport operations (zoom, pan, fit)
- Loading state transitions
- Node degree calculations
- Canvas resizing

All debug messages are prefixed with `[FalkorDBCanvas]` for easy filtering.

### Example Debug Session

```typescript
const canvas = document.getElementById('graph');
canvas.setDebug(true);

canvas.setData({
  nodes: [{ id: 1, labels: ['Person'], color: '#FF6B6B', visible: true, data: { name: 'Alice' } }],
  links: []
});

// Console output:
// [FalkorDBCanvas] Debug mode enabled
// [FalkorDBCanvas] setData called with 1 nodes and 0 links
// [FalkorDBCanvas] Loading state: true
// [FalkorDBCanvas] Initializing graph
// [FalkorDBCanvas] Calculating node degrees for 1 nodes
// [FalkorDBCanvas] Setting up force simulation
// ... and more
```

### Tips for Debugging

- Enable debug mode early in development to understand component behavior
- Use browser console filtering (`[FalkorDBCanvas]`) to focus on canvas logs
- Debug mode has minimal performance impact but should be disabled in production
- Combine with browser DevTools to inspect graph state and performance

## Examples

See the [examples directory](./examples) for complete working examples including:
- Basic usage
- Custom node/link rendering
- Event handling
- Dynamic data updates
- Theme switching

## Links

- [GitHub Repository](https://github.com/FalkorDB/falkordb-ui/tree/main/web-components/canvas)
- [FalkorDB](https://www.falkordb.com/)
- [Report Issues](https://github.com/FalkorDB/falkordb-ui/issues)
- [npm Package](https://www.npmjs.com/package/@falkordb/canvas)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
