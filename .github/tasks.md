## Tasks
- [x] Read the discussion in issue [#159](https://github.com/SenteraLLC/ulabel/issues/159)
- [x] Implement a vertex deletion keybind for polygon and polyline spatial types it should:
  - [x] Delete the vertex when pressed when hovering over it such that the edit suggestion is showing
  - [x] Delete the vertex when pressed when dragging/editing the vertex
  - [x] For polylines, if only one point remains in the polyline, it should delete the polyline
  - [x] For polygons, if fewer than 3 points remain in a polygon layer, the layer should be removed
- [ ] Add a test for the keybind in keybind-functionality.spec.js
- [ ] Update the api_spec and changelog

