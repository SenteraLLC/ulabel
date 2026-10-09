# API Specification

This should eventually be replaced with a more comprehensive approach to documentation (e.g., via readthedocs.org), but this markdown file will do for now.

## Keyboard Shortcuts

- `ctrl+z` or `cmd+z`: Undo
- `ctrl+shift+z` or `cmd+shift+z`: Redo
- `scroll`: Zoom -- up for in, down for out
- `ctrl+scroll` or `shift+scroll` or `cmd+scroll`: Change frame -- down for next, up for previous
- `scrollclick+drag`: Pan
- Hold `shift` when closing a polygon to continue annotating a new region or hole.
- Hold `shift` when moving the cursor inside a polygon to begin annotating a new region or hole.
- Press `Escape` or `crtl+z` to cancel the start of a new region or hole.
- Press `Escape` to exit brush/erase mode.
- Press `Tab` to set the zoom to focus on the next annotation
- Press `Shift+Tab` to set the zoom to focus on the previous annotation
- Right-click a hovered annotation (or its entry in the `AnnotationList` toolbox item) to open a context menu with `Change class`, `Copy to`, `Move to`, `Delete`, `Isolate` / `Show all`, and `Details`. `Change class` opens the class pie for that annotation; `Copy to` / `Move to` clone the annotation into another subtask at the same image coordinates (see [`copy_annotation`](#copy_annotationannotation_id-target_subtask_key-class_id-source_subtask_key)) -- a single eligible subtask is named on the item, several open a list to pick from, and `Move to` also deletes the source (one undoable action on the source subtask that also removes the copy and the target's history about it). Both also arm `ctrl+v` with the annotation, and when the target already has a counterpart of it (see [`find_counterparts`](#find_counterpartsannotation_id-source_key-target_key)) a confirm dialog asks before copying again. `Delete from` (`Erase from` for a bitmask) appears for every other writable subtask holding counterparts and removes them there (see [`delete_counterparts`](#delete_counterpartsannotation_id-source_key-target_key)). The view stays on the source subtask unless the class pie opens or [`paste_switch_to_target`](#paste_switch_to_target) is on; `Isolate` hides every other annotation in the subtask (see [`isolate_annotation`](#isolate_annotationannotation_id-subtask_key-redraw)) and reads `Show all` while that annotation is isolated; `Details` lists its id, class, spatial type, last editor/edit time, and `annotation_meta` entries. Read-only subtasks only offer `Copy to`, `Delete from` / `Erase from`, `Isolate`, and `Details`. Press `Escape` or click anywhere to close it. A right-click while drawing a polyline still finishes the polyline and opens no menu.
- Press `Escape` to close an open class pie or context menu.
- `ctrl+c` / `cmd+c` copies the hovered annotation, `ctrl+x` / `cmd+x` cuts it (deletes it after copying; not in read-only subtasks), and `ctrl+v` / `cmd+v` pastes into the current subtask (see [`paste_annotation_from_clipboard`](#paste_annotation_from_clipboardenvelope)). The copy is placed on the system clipboard as JSON, so it can be pasted into another ULabel instance showing an image of the same dimensions; a paste back into the subtask it was copied from keeps its class; the first paste into another subtask keeps the coordinates, and every repeat paste into the same subtask (or any paste back into the source) is offset by a further 20 pixels. These shortcuts are not remappable and are ignored while a text field has focus.

## ULabel Constructor

When the `ulabel.js` file is included, it attaches its class definition to the `window` object. Therefore, within the document, you may create a new annotation session with

```javascript
let ulabel = new ULabel(...);
```

Note that in order to begin the session, you must thereafter call

```javascript
ulabel.init(() => {/* behavior on ready */})
```

`ULabel` is the only name that `ulabel.js` will add to the global namespace.

> ULabel is designed for **a single instance per page**. Toolbox handlers, id dialogs, and global keybinds bind to shared DOM ids and delegated selectors on `document`, so mounting more than one `ULabel` simultaneously is not supported.

The constructor is used to specify the configuration for an "annotation session". It has the following interface

```javascript
class ULabel({
    // Required arguments
    container_id: string,
    image_data: string | string[],
    username: string,
    submit_buttons: function | ULabelSubmitButton[],
    subtasks: object,
    // Optional arguments
    task_meta: object,
    annotation_meta: object,
    px_per_px: number,
    initial_crop: InitialCrop,
    initial_line_size: number,
    instructions_url: string,
    toolbox_order: AllowedToolboxItem[],
    distance_filter_toolbox_item: FilterDistanceConfig,
    image_filters_toolbox_item: ImageFiltersConfig,
    class_counter_toolbox_item: ClassCounterConfig,
    reset_zoom_keybind: string,
    show_full_image_keybind: string,
    create_point_annotation_keybind: string,
    delete_annotation_keybind: string,
    delete_vertex_keybind: string,
    keypoint_slider_default_value: number,
    filter_annotations_on_load: boolean,
    switch_subtask_keybind: string,
    toggle_annotation_mode_keybind: string,
    create_bbox_on_initial_crop_keybind: string,
    toggle_brush_mode_keybind: string,
    toggle_erase_mode_keybind: string,
    increase_brush_size_keybind: string,
    decrease_brush_size_keybind: string,
    mask_annotation_opacity: number,
    default_brush_overlap_mode: BrushOverlapMode,
    brush_overlap_across_subtasks: boolean,
    allow_body_move: boolean,
    paste_class_choice: boolean,
    paste_switch_to_target: boolean,
    annotation_link_meta_key: string | null,
    set_brush_overlap_none_keybind: string,
    set_brush_overlap_exclude_keybind: string,
    set_brush_overlap_overwrite_keybind: string,
    fly_to_next_annotation_keybind: string,
    fly_to_previous_annotation_keybind: string,
    annotation_size_small_keybind: string,
    annotation_size_large_keybind: string,
    annotation_size_plus_keybind: string,
    annotation_size_minus_keybind: string,
    annotation_vanish_keybind: string,
    toggle_class_focus_keybind: string,
    fly_to_max_zoom: number,
    min_zoom_fit_ratio: number,
    n_annos_per_canvas: number,
    auto_destroy_on_detach: boolean,
    on_active_class_change: function,
    on_subtask_change: function,
    on_focus_active_class_change: function,
    on_isolate_change: function,
    on_annotation_change: function,
    on_annotation_change_in_progress: boolean
})
```

### `container_id`

*string* -- The value of the `id` attribute of the `<div>` element that ULabel is meant to occupy. This element must exist in the document at the time the constructor is called.

ULabel has primarily been tested inside of divs that have been styled with `position=absolute;`, and `width`, `height`, `top`, and  `left` set. Stay tuned for official recommendations about this.

### `image_data`

*string* OR *array* -- A reference to the image(s) to be annotated. In the case of a single image session, a simple URL to the image can be provided. It will be assigned directly to an `<img>` tag's `src` attribute.

In the case of a multi-frame annotation job, an array of URLs may be given. Note that for performance reasons, ULabel assumes that each image in the array has the same dimensions as the first image in the array.

### `username`

*string* -- This is intended to be a unique ID for the user performing annotations. It will be assigned to each annotation that this user creates during the session.

### `submit_buttons`

A single async function may be provided for a submit button.

```javascript
async function (obj) => {/* Your on submit behavior here */}
```

If the hook alone is provided, the name will default to `"Submit"` and the button's color will be orange.

If either more than one submit button or more button customization is desired, then `submit_buttons` must be an array of `submit_button` objects. It may be an array of length 1 if only 1 button is desired but you want to change the text or color of the button.

`submit_button` Objects must be provided in the form of

```javascript
{
    name: "<Arbitrary Button Name>", // The button has a set height and width, so the name should be short
    hook: async function (annotations) {
        // Define submit behavior here

        // ULabel instance is bound to this function, and so it can be accessed with this

        // If behavior is to leave this page, use this.set_saved(true) to avoid warning to user

        // If submit is unsuccessful and annotations edits should not be treated as "saved", return false
    },
    color?: "Arbitrary Color" // e.g. "#639", "#3AB890", "rgb(200, 0, 170)", "hsl(0, 100%, 50%)"
    /**
     * If true, will call ulabel.set_saved(true) before the hook is called,
     * thus avoid the "unsaved changes" warning. Defaults to false.
     */
    set_saved?: boolean 
    size_factor?: number // Transform the default button size by this factor.
    row_number?: number // The row number of the button in the toolbox
    // Buttons with lower row numbers will be higher in the toolbox
    // If row_number is not provided, it will default to 0
    // Buttons will be arranged left to right in the order they are provided in the array
    /**
     * Only include these subtask keys in the payload's `annotations` object.
     * Unknown keys are ignored with a warning. Defaults to every subtask.
     */
    subtasks?: string[]
    /**
     * If true, each subtask's list is reduced to the annotations that differ from
     * what the host loaded (via `resume_from`, `set_annotations()`, or
     * `set_annotations_batch()`): created this session and not deleted, loaded and
     * now deleted, or loaded and edited (moved, reclassified, brushed, carved by a
     * delete polygon or an overlapping bitmask stroke, un-deleted...). Undoing an
     * edit removes the annotation from the list again. Annotations hidden only by
     * a filter (confidence slider, row distance) are not edits. Each included
     * annotation carries `edit_type: "created" | "deleted" | "modified"`, and its
     * `deprecated` flag reflects only human deletion (a filter hiding a modified
     * annotation does not make it `deprecated` in this payload). A loaded
     * annotation whose geometry was fully erased is still reported as `"deleted"`.
     * Defaults to false.
     */
    edits_only?: boolean
}
```

The argument to the hook is an object with the format:

```javascript
{
    "task_meta": <obj>, // The task_meta from the constructor
    "annotations": {
        "<subtask 1>": [/* subtask 1 annotations */],
        "<subtask 2>": [/* subtask 2 annotations */],
        ...
    }
}
```

Where `<subtask n>` refers to the nth key in the object provided as the `subtasks` argument to the constructor. With `subtasks` set on the button, only those keys appear; with `edits_only`, each list contains only the annotations that changed since they were loaded (see above), each tagged with an `edit_type` of `"created"`, `"deleted"`, or `"modified"`.

As you can see, each subtask will have a corresponding list of annotation objects. Each annotation object has the following format:

```javascript
{
    // a unique id for this annotation
    "id": "<uuidv4 string>",
    
    // the provided username
    "created_by": "<string>", 
    
    // timestamp when annotation was created
    "created_at": "<ISO datetime string>",

    // the username associated with the most recent modification to the annotation
    "last_edited_by": "<string>",

    // timestamp of the most recent modification to the annotation
    "last_edited_at": "<ISO datetime string>",
    
    // true if annotation was deleted
    "deprecated": "<bool>", 

    // indicates what/who deprecated the annotation, eg { human: false }
    "deprecated_by": "<object>",
    
    // which type of annotation
    "spatial_type": "<string>", 
    
    // (nullable) e.g. [[x1, y1], [x2, y2], ...]
    // For "bitmask" annotations this is instead a run-length-encoded object:
    // { "counts": <number[]>, "size": [<height>, <width>] }. See Bitmask annotations.
    "spatial_payload": "<array | object>", 
    
    // The class associated with the annotation
    "classification_payloads": [ 
        {
            "class_id": 10,
            "confidence": 1
        },
        {
            "class_id": 11,
            "confidence": 0
        },
        {
            "class_id": 12,
            "confidence": 0
        }
    ],

    // (nullable) frame ann was created for
    "frame": "<int>", 
    
    // certain spatial types allow text
    "text_payload": "<string>", 
    
    // as provided to constructor
    "annotation_meta": "<object>"
}
```

### `subtasks`

*object* -- Configuration for each subtask in the annotation session.

In certain cases, you may want to divide your annotations among different tasks. For example, if you are visualizing annotations from two different sources (e.g., different annotators, or one from a model, another from a human). ULabel supports this natively through what we call "subtasks".

Every annotation session requires at least one subtask. Each subtask has its own configuration, which is specified with a JSON object. See below for an example from the `frames.html` demo.

```javascript
{
    "car_detection": {
        "display_name": "Car Detection",
        "classes": [
            {
                "name": "Sedan",
                "color": "blue",
                "id": 10,
                "keybind": "1"
            },
            {
                "name": "SUV",
                "color": "green",
                "id": 11,
                "keybind": "2"
            },
            {
                "name": "Truck",
                "color": "orange",
                "id": 12,
                "keybind": "3"
            },
        ],
        "allowed_modes": ["bbox", "polygon", "contour", "bbox3"],
        "resume_from": null,
        "task_meta": null,
        "annotation_meta": null,
        "read_only": false,
        "inactive_opacity": 0.6
    },
    "frame_review": {
        "display_name": "Frame Review",
        "classes": [
            {
                "name": "Blurry",
                "color": "gray",
                "id": 20
            },
            {
                "name": "Occluded",
                "color": "red",
                "id": 21
            }
        ],
        "allowed_modes": ["whole-image"],
        "resume_from": null,
        "task_meta": null,
        "annotation_meta": null,
        "read_only": false
    }
}
```
The `"keybind"` argument allows the user to select a class for existing annotations (when hovered), for new annotations, or for annotations that are actively being drawn.

With `"read_only": true`, the subtask's annotations can be viewed but not created, edited, moved, deleted, reclassified, or undone/redone by the user. Toggle it at runtime with [`set_subtask_read_only`](#set_subtask_read_onlysubtask_key-read_only).

The full list of `"allowed_modes"` that are currently supported is:

- `"bbox"`: A simple single-frame bounding box
- `"bbox3"`: A bounding box that can extend through multiple frames
- `"polygon"`: A series of points that define a simple or complex polygon
- `"polyline"`: A series of points that does not define a closed polygon
- `"tbar"`: Two lines defining a "T" shape
- `"contour"`: A freehand line
- `"whole-image"`: A label to be applied to an entire frame
- `"global"`: A label to be applied to the entire series of frames
- `"point"`: A keypoint within a single frame
- `"bitmask"`: A raster (per-pixel) segmentation mask, painted with the brush. See [Bitmask annotations](#bitmask-annotations).
- `"delete_polygon"`: Allows drawing a polygon around an area, and all annotations within that area will be deleted
- `"delete_bbox"`: Allows drawing a bounding box around an area, and all annotations within that area will be deleted

#### Bitmask annotations

The `"bitmask"` mode enables raster (per-pixel) segmentation. Each bitmask annotation stores a single binary mask the size of the image.

**Interaction**

- Painting uses the brush, shared with the `polygon` brush. Toggle the brush with `toggle_brush_mode_keybind` (default `g`) or the Brush toolbox item, erase with `toggle_erase_mode_keybind` (default `e`), and resize the brush with `increase_brush_size_keybind` / `decrease_brush_size_keybind` (defaults `]` / `[`) or `alt+scroll`.
- Starting a paint stroke over an existing bitmask of the **currently-selected class** adds to that mask; otherwise (a different class is selected, or you start over empty space) a new bitmask annotation of the selected class is created. Erasing is class-agnostic — it removes from whichever mask is under the brush. (This class-aware joining differs from the `polygon` brush, which joins any polygon under the brush.)
- With the brush off, a mask behaves like any other spatial annotation: hover it for the outline and confidence card, drag its body to move it (see [`allow_body_move`](#allow_body_move)), press a class keybind while hovering to reclassify it, or delete it with the delete keybind. Erasing a mask entirely deprecates the annotation (ULabel's delete semantics).
- Requires the `Brush` toolbox item (`AllowedToolboxItem.Brush`) to be present.

**Overlap modes**

When painting, the brush can enforce mutual exclusivity with *other* undeprecated bitmask annotations. The mode is a single **global** value, persisted to localStorage, and is chosen via the Brush toolbox item (shown in bitmask mode) or the overlap keybinds. Its initial value comes from [`default_brush_overlap_mode`](#default_brush_overlap_mode). Resolution stays within the active subtask unless [`brush_overlap_across_subtasks`](#brush_overlap_across_subtasks) is set.

- `"none"` (default): painting only adds to the active mask; other masks are untouched (pixels may be owned by multiple annotations).
- `"exclude"`: newly-painted pixels never cover pixels owned by other bitmask annotations (existing masks win).
- `"overwrite"`: newly-painted pixels are removed from any other bitmask annotation that owned them (the new mask wins); a mask fully carved away is deprecated.

Resolution is **deferred to the end of a stroke** and only affects the pixels the stroke adds (pre-existing overlaps are left alone). Erase strokes are unaffected. These modes govern *new strokes only* — they do not retroactively de-overlap already-imported masks.

**Serialization**

A bitmask's `spatial_payload` is a COCO-style, uncompressed run-length encoding:

```javascript
{
    // Alternating run lengths in column-major (Fortran) order, always starting
    // with a background (0) run. A leading foreground pixel is a leading 0.
    "counts": [<number>, ...],
    // [height, width] of the mask (matches COCO's size convention)
    "size": [<height>, <width>]
}
```

Note this is the *uncompressed* form (`counts` as an integer array), not the LEB128-packed string used by `pycocotools`. Masks import from and export to this same object shape.

**Raw payload (import only)**

To skip the RLE encode step on the caller side, bitmask annotations may be imported with a raw pixel-buffer payload:

```javascript
{
    // Row-major, one byte per pixel. Non-zero = foreground. Length must be height * width.
    "data": <Uint8Array>,
    // [height, width] of the mask
    "size": [<height>, <width>]
}
```

The `Uint8Array` is defensively copied on load. This shape is accepted for input only — `get_annotations()` always exports the RLE form so downstream consumers see one format. Internally, an annotation loaded with a raw payload is upgraded to RLE on first export or edit.

The render opacity of bitmask annotations is configurable via [`mask_annotation_opacity`](#mask_annotation_opacity).

The `resume_from` attributes are used to import existing annotations into the annotation session for each subtask, respectively. Existing annotations must be provided as a list of annotations of the form specified above.

### `task_meta` and `annotation_meta`

*object* -- Meta about the annotation session to be saved at the task and annotation levels, respectively.

These are provided for convenience. They simply pass their contents to the global output object and to each annotation, respectively.

### `px_per_px`

*number* -- The ratio of rendering resolution to image resolution.

In some cases, you may want the annotations to render at a higher or lower resolution than the underlying image. For example, for very low resolution images like CT scans, you may want to specify a value of 2-4 for aesthetic purposes, whereas for very high resolution images that will only be annotated at a very coarse level, you may want to specify a value of 0.25 - 0.5 for performance purposes.

### `initial_crop`

*InitialCrop* -- A definition for a bounding box that the viewer should fit to at the beginning of the session. Units are pixels in the underlying image.

```javascript
{
    "top": <number>,
    "left": <number>,
    "height": <number>,
    "width": <number>
}
```

### `initial_line_size`

The line width with which new annotations are drawn initially. Units are pixels in the underlying image. When this value is not included, the default value of `5` is used.

### `anno_scaling_mode`

Defines how annotation line size is adjusted based on the zoom level. The following modes are supported:

- `"fixed"`: Line size remains constant regardless of zoom level. (Default. Use for best performance)
- `"match-zoom"`: Line size increases with increased zoom level.
- `"inverse-zoom"`: Line size decreases with increased zoom level.

### `instructions_url`

URL to a page that gives annotation instructions.

### `toolbox_order`
An array of numbers that defines the vertical order of items in the toolbox. At least one item must be included in the array. Any excluded items will not be displayed in the toolbox.

The supported toolbox items are:
```javascript
enum AllowedToolboxItem {
    ModeSelect,       // 0
    ZoomPan,          // 1
    AnnotationResize, // 2
    AnnotationID,     // 3
    RecolorActive,    // 4
    ClassCounter,     // 5
    KeypointSlider,   // 6
    SubmitButtons,    // 7
    FilterDistance,   // 8
    Brush,            // 9
    ImageFilters,     // 10
    AnnotationList,   // 11
    Keybinds,         // 12
    ConfidenceSlider, // 13
}
```
You can access the AllowedToolboxItem enum by calling the static method:
```javascript
const AllowedToolboxItem = ULabel.get_allowed_toolbox_item_enum();
```

### `AnnotationResizeItem`
The `AnnotationResizeItem` can be used to programmatically control annotation size for subtasks. It can be accessed with the static method:
```javascript
const AnnotationResizeItem = ULabel.get_resize_toolbox_item();
```
Using the class, you can call any of its static methods by passing in your `ULabel` instance, the key of the subtask you want to modify, and any other required arguments. For example:

```javascript
AnnotationResizeItem.toggle_subtask_vanished(ulabel, subtask_key);
```
Note that in order to work, the `AnnotationResize` toolbox item MUST be present in your `ULabel` instance.

### `distance_filter_toolbox_item`
Configuration object for the `FilterDistance` toolbox item with the following custom definitions:
```javascript
type DistanceFromPolyline = {
    distance: number // distance in pixels
}

type DistanceFromPolylineClasses = {
    "closest_row": DistanceFromPolyline, // value used in single-class mode
    [key: number]?: DistanceFromPolyline // values for each polyline class id, used in multi-class mode
}

type FilterDistanceConfig = {
    "name"?: string, // Default: Filter Distance From Row
    "component_name"?: string, // Default: filter-distance-from-row
    "filter_min"?: number, // Default: 0 (px)
    "filter_max"?: number, // Default: 400 (px)
    "default_values"?: DistanceFromPolylineClasses, // Default: {"closest_row": {"distance": 40}}
    "step_value"?: number, // Default: 2 (px)
    "multi_class_mode"?: boolean, // Default: false
    "disable_multi_class_mode"?: boolean, // Default: false
    "filter_on_load"?: boolean, // Default: false
    "show_options"?: boolean, // Default: true
    "show_overlay"?: boolean, // Default: false
    "toggle_overlay_keybind"?: string, // Default: "p"
    "filter_during_polyline_move"?: boolean, // Default: true. Set to false for performance boost,
    // since it will not update the filter/overlay until polyline moves/edits are complete.
}
```

### `image_filters_toolbox_item`
Configuration object for the `ImageFilters` toolbox item with the following custom definitions:
```javascript
type ImageFiltersConfig = {
    "default_values"?: {
        "brightness"?: number, // Default: 100 (0-200%)
        "contrast"?: number,   // Default: 100 (0-200%)
        "hueRotate"?: number,  // Default: 0 (0-360 degrees)
        "invert"?: number,     // Default: 0 (0-100%)
        "saturate"?: number    // Default: 100 (0-200%)
    }
}
```

This toolbox item provides CSS filter controls that apply only to the image, not to the UI elements. Users can adjust brightness, contrast, hue rotation, inversion, and saturation using sliders. The filters are hardware-accelerated by modern browsers for optimal performance.

### `annotation_list_toolbox_item`

The `AnnotationList` toolbox item displays all annotations in the current subtask in a scrollable list. This toolbox item provides several features:

**Display Features:**
- Shows each annotation with its spatial type icon (bbox, polygon, point, etc.) and class name
- Displays annotation index (0-based) for easy reference
- Collapsible interface to maximize canvas space

**Filtering Options:**
- **Show Deprecated**: Toggle to show/hide deprecated annotations (default: hidden)
- **Group by Class**: Organize annotations by their classification for easier management

**Navigation:**
- Click any annotation in the list to fly-to and zoom on that annotation
- Toast notification appears showing current position (e.g., "3 / 10") when navigating

**Bidirectional Highlighting:**
- Hover over an annotation in the list to highlight it on the canvas (outline and confidence card)
- Hover over an annotation on the canvas to highlight its corresponding entry in the list

**Isolation:**
- Each entry has an eye button that isolates that annotation: every other annotation in the subtask is hidden from the canvas and from hover, Tab, fly-to, the list, and bulk delete. The list shows only the isolated entry and a **Show all** button appears in the header.
- Clear it with **Show all**, the active eye button, `Escape`, or programmatically with [`isolate_annotation(null)`](#isolate_annotationannotation_id-subtask_key-redraw). It also clears when the isolated annotation is deleted, when a new annotation is created, on subtask switch, and on `set_annotations()`.
- Isolation is a view-only state: nothing is recorded in the action stream and `get_annotations()` is unaffected.

This toolbox item requires no configuration and can be added to the `toolbox_order` array using `AllowedToolboxItem.AnnotationList`.

### `confidence_slider_toolbox_item`

The `ConfidenceSlider` toolbox item (added to `toolbox_order` via `AllowedToolboxItem.ConfidenceSlider`) deprecates (hides) or shows spatial annotations based on their confidence values. Unlike the deprecated `KeypointSlider`, it works with **all** spatial annotation types that have a confidence payload (`bbox`, `bbox3`, `polygon`, `polyline`, `contour`, `tbar`, `point`, and `bitmask`), across every subtask.

It supports two modes:

- **"all" mode** (default): a single slider applies one confidence threshold to every targeted spatial annotation across all subtasks, using each annotation's highest confidence value.
- **Per-class mode**: one slider is shown per targeted class id. Each slider only filters annotations whose assigned (highest-confidence) class matches that slider, using that class's confidence value.

The `class_filter_mode` config controls whether these modes are user-toggleable:
- `"toggle"` (default): a checkbox lets the user switch between the two modes.
- `"all-only"`: only the single global "all" slider is shown.
- `"class-only"`: only the per-class sliders are shown.

Any annotation with a confidence at or above the threshold is shown; any below is deprecated. Thresholds are expressed as percentages, and the slider's range and increment are configurable via `filter_min`, `filter_max`, and `step_value`.

Configuration object with the following custom definitions:
```javascript
type ConfidenceSliderClasses = {
    "all": number, // percentage threshold (0-100) used by the single global slider
    [classId: string]?: number // per-class-id thresholds (class id as a string key)
}

type ConfidenceSliderConfig = {
    "name"?: string, // Default: "Confidence Filter"
    "filter_min"?: number, // Default: 0 (%)
    "filter_max"?: number, // Default: 100 (%)
    "default_values"?: ConfidenceSliderClasses, // Default: {"all": 0}
    "step_value"?: number, // Default: 1 (%)
    "class_filter_mode"?: "toggle" | "all-only" | "class-only", // Default: "toggle"
    "filter_on_load"?: boolean, // Default: true
    // The spatial types to filter. Defaults to all confidence-filterable spatial types.
    "target_spatial_types"?: ULabelSpatialType[],
    // The class ids to create sliders for in class-only/toggle mode. Defaults to all class ids.
    "target_class_ids"?: number[],
}
```

### `class_counter_toolbox_item`

Options for the `ClassCounter` toolbox item (added to `toolbox_order` via `AllowedToolboxItem.ClassCounter`), which displays per-class counts of non-deprecated annotations.

```javascript
type ClassCounterConfig = {
    // Which subtasks to count. "current" follows the active subtask. Default: "current"
    "subtasks"?: string[] | "current",
    // How counts are laid out. Default: "current"
    // - "current": one plain per-class list per counted subtask
    // - "grouped": adds a heading per counted subtask
    // - "flat": merges shared class ids across subtasks into one summed list
    "layout"?: "current" | "grouped" | "flat",
}
```

Both options can also be changed at runtime via [`set_class_counter_options()`](#set_class_counter_optionsoptions-redrawtrue).

### `reset_zoom_keybind`
Keybind to reset the zoom level to the `initial_crop`. Default is `r`.

### `show_full_image_keybind`
Keybind to set the zoom level to show the full image. Default is `shift+r`.

### `create_point_annotation_keybind`
Keybind to create a point annotation at the mouse location. Default is `c`. Requires the active subtask to have a `point` mode.

### `delete_annotation_keybind`
Keybind to delete the annotation that the mouse is hovering over. Default is `d`.

### `delete_vertex_keybind`
Keybind to delete a vertex of a polygon or polyline annotation. The vertex must be the one currently being hovered (showing an edit suggestion) or actively being edited. For polylines, if only one point remains after deletion, the entire polyline is deleted. For polygons, if fewer than 3 points remain in a layer after deletion, that layer is removed. Default is `x`.

### `keypoint_slider_default_value`
Default value for the keypoint slider. Must be a number between 0 and 1. Default is `0`.

> **Deprecated:** The `KeypointSlider` toolbox item only filters `point` annotations. Use the `ConfidenceSlider` toolbox item (`confidence_slider_toolbox_item`) instead, which filters all spatial annotation types and supports per-class targeting and multiple sliders.

### `filter_annotations_on_load`
If true, the annotations will be filtered on load based on the `keypoint_slider_default_value`. Default is `true`.

### `switch_subtask_keybind`
Keybind to switch between subtasks. Default is `z`.

### `toggle_annotation_mode_keybind`
Keybind to toggle between annotation and selection modes. Default is `u`.

### `create_bbox_on_initial_crop_keybind`
Keybind to create a bounding box annotation around the `initial_crop`. Default is `f`. Requires the active subtask to have a `bbox` mode.

### `toggle_brush_mode_keybind`
Keybind to toggle brush mode for `polygon` and `bitmask` annotations. Default is `g`. Requires the active subtask to have a `polygon` or `bitmask` mode.

### `toggle_erase_mode_keybind`
Keybind to toggle erase mode for `polygon` and `bitmask` annotations. Default is `e`. Requires the active subtask to have a `polygon` or `bitmask` mode.

### `increase_brush_size_keybind`
Keybind to increase the brush size. Default is `]`. Requires the active subtask to have a `polygon` or `bitmask` mode.

### `decrease_brush_size_keybind`
Keybind to decrease the brush size. Default is `[`. Requires the active subtask to have a `polygon` or `bitmask` mode.

### `mask_annotation_opacity`
The fill opacity (`0`-`1`) used when rendering `bitmask` (raster segmentation) annotations. Default is `0.4`.

### `default_brush_overlap_mode`
The initial [brush overlap mode](#overlap-modes) for bitmask painting: `"none"` (default), `"exclude"`, or `"overwrite"`. The live value is global and persisted to localStorage, so a user's last choice takes precedence over this default on subsequent sessions.

### `brush_overlap_across_subtasks`
When `true`, [brush overlap resolution](#overlap-modes) also reaches undeprecated bitmask annotations in *other* subtasks: `"exclude"` clips the stroke against them, and `"overwrite"` carves them — except masks in `read_only` subtasks, which act as barriers (the stroke is clipped around them instead). Default is `false`: a stroke only interacts with masks in the active subtask.

### `allow_body_move`
When `true` (the default), a plain left-drag that starts inside a spatial annotation's body moves that annotation. The cursor must actually be inside the shape (a polygon's fill, a bbox, a point's handle, a polyline's stroke, a bitmask's pixels) — being merely near its bounding box still starts a new annotation. A vertex edit handle under the cursor takes precedence and edits that vertex. Hold `Alt` to start a new annotation on top of an existing body instead. Delete modes and read-only subtasks are unaffected. Set to `false` to make every canvas drag start a new annotation.

### `paste_class_choice`
When `true` (the default), a context-menu `Copy to` / `Move to` or a `ctrl+v` paste whose source class has no counterpart in the target subtask (by id, then by name) opens the class pie on the pasted annotation when several classes could take it. Set to `false` to never open the pie: the copy silently takes the target's active class (else its first compatible class). Useful when the source subtask's classes (e.g. `True Positive` / `False Negative`) can never match the target's and the host keeps the target's active class in sync with its own class picker.

### `paste_switch_to_target`
When `true`, a context-menu `Copy to` / `Move to` / `Delete from` / `Erase from` makes the target the current subtask afterwards (firing [`on_subtask_change`](#on_subtask_change)), whether or not the class pie opens. Default is `false`: the view only switches when the class pie opens on the copy. Toggle at runtime with [`set_paste_switch_to_target`](#set_paste_switch_to_targetenabled). `ctrl+v` pastes into the current subtask and is unaffected.

### `annotation_link_meta_key`
An `annotation_meta` key whose value, a string or an array of strings, links annotations across subtasks: two annotations are counterparts when they share any value (see [`find_counterparts`](#find_counterpartsannotation_id-source_key-target_key)). Every copy and paste drops this entry from the copy's `annotation_meta`, so a copy never claims its source's identity. Default is `null` (only `copied_from` links).

### `set_brush_overlap_none_keybind`
Keybind to set the brush overlap mode to `none`. Default is `shift+n`.

### `set_brush_overlap_exclude_keybind`
Keybind to set the brush overlap mode to `exclude`. Default is `shift+e`.

### `set_brush_overlap_overwrite_keybind`
Keybind to set the brush overlap mode to `overwrite`. Default is `shift+o`.

### `fly_to_next_annotation_keybind`
Keybind to set the zoom to focus on the next annotation. Default is `Tab`, which also will disable any default browser behavior for `Tab`.

### `fly_to_previous_annotation_keybind`
Keybind to set the zoom to focus on the previous annotation. Default is `shift+tab`. Supports chord keybinds (e.g., `shift+p`, `ctrl+alt+n`).

### `annotation_size_small_keybind`
Keybind to set the annotation size to small for the current subtask. Default is `s`.

### `annotation_size_large_keybind`
Keybind to set the annotation size to large for the current subtask. Default is `l`.

### `annotation_size_plus_keybind`
Keybind to increment the annotation size for the current subtask. Default is `=`.

### `annotation_size_minus_keybind`
Keybind to decrement the annotation size for the current subtask. Default is `-`.

### `annotation_vanish_keybind`
Keybind to toggle vanish mode for annotations in the current subtask. Default is `v`.

### `annotation_vanish_all_keybind`
Keybind to toggle vanish mode for all subtasks. Default is `shift+v`

### `toggle_class_focus_keybind`
Keybind to toggle `focus_active_class` on the current subtask: with it on, classes other than the active one dim to `defocused_opacity` and drop out of hover, navigation, the annotation list, and bulk delete. Default is `shift+f`.

### `fly_to_max_zoom`
Maximum zoom factor used when flying-to an annotation. Default is `10`, value must be > `0`. 

### `min_zoom_fit_ratio`
Zoom-out floor, expressed as a multiplier of the "whole image just fits the viewport" zoom (the same level reached by the `shift+r` keybind / the toolbox "show whole image" button). Default is `0`, which disables the floor. `1.0` prevents users from zooming out past the fit-to-viewport level. Values `> 1` force the image to always overflow the viewport by that factor. Zoom-in is unaffected. The floor recomputes from live annbox dimensions on every zoom, so it adapts to browser resize.

### `n_annos_per_canvas`
The number of annotations to render on a single canvas. Default is `100`. Increasing this number may improve performance for jobs with a large number of annotations.

### `click_and_drag_poly_annotations`
If `true`, the user can click and drag to contiuously place points for polyline and polygon annotations. Default is `true`.

### `allow_annotations_outside_image`
When `false`, new annotations will be limited to points within the image, and attempts to move annotations outside the image will bounce back to inside the image. Default is `true`. 

### `auto_destroy_on_detach`
When `true` (the default), ULabel installs a `MutationObserver` on the container's root and calls [`destroy()`](#destroy) automatically after the container is removed from the DOM. The observer holds the ULabel instance through a `WeakRef` (so it cannot pin the instance in memory on its own) and defers the teardown decision by one animation frame so brief detach/reattach cycles (portals, jQuery `.detach()`, layout reparenting) do not trigger a false-positive teardown. Set to `false` to opt out and manage teardown manually via [`destroy()`](#destroy).

> **Same-id replacement caveat.** With the default `true`, the one-frame grace period means a caller who removes the old container and mounts a new `<div>` with the same `container_id` *within the same animation frame* can briefly have two `ULabel` instances attached to `document`; when the old instance's teardown runs it will remove `.ulabel`-namespaced document/window handlers belonging to the new instance too. If your SPA does synchronous same-id replacement, set `auto_destroy_on_detach: false` and call `oldUlabel.destroy()` yourself *before* mounting the replacement — `destroy()` is synchronous, so this ordering is race-free.

### `on_active_class_change`
*(subtask_key: string, class_id: number) => void* -- Called after a subtask's active class actually changes, whatever the writer: `set_active_class`, a toolbox class-button click, or a class-select keybind (including keybinds users customize through the `Keybinds` toolbox item). Not called for no-op re-selections, rejected ids, or delete-mode toggles (which freeze the selection). Default is `null`.

### `on_subtask_change`
*(subtask_key: string, old_subtask_key: string) => void* -- Called after the current subtask actually changes, whatever the writer: `set_subtask`, a toolbox tab click, or the `switch_subtask_keybind`. Not called when the target subtask is already current. Default is `null`.

### `on_focus_active_class_change`
*(subtask_key: string, enabled: boolean) => void* -- Called after a subtask's `focus_active_class` flag actually changes, whatever the writer: `set_focus_active_class` or the `toggle_class_focus_keybind`. Not called when the flag is already at the target value, so a host may re-sync other subtasks from the callback without recursing. Default is `null`.

### `on_isolate_change`
*(subtask_key: string, annotation_id: string | null) => void* -- Called after a subtask's isolated annotation actually changes, whatever the writer: `isolate_annotation`, the list's eye button, `Show all`, `Escape`, or one of the automatic clears (deletion, creation, subtask switch, `set_annotations`). `annotation_id` is `null` when the isolation clears. Default is `null`.

### `on_annotation_change`
*(change: ULabelAnnotationChange) => void* -- Called once per recorded, undone, or redone action that changes committed annotation state (geometry, position, deprecation, or class), so a host can recompute derived data (e.g. a live diff against fixed predictions) without polling the action stream. Default is `null`. Exceptions thrown by the callback are caught and logged as warnings.

```javascript
{
    subtask_key: string,                 // subtask whose action stream holds the action
    annotation_id: string | null,
    act_type: ULabelActionType,
    kind: "do" | "undo" | "redo",
    affected: { subtask_key, annotation_id }[],  // other annotations the action edited
    previous_classification_payloads: ULabelClassificationPayload[] | null,
}
```

- One call per action, never per annotation. Cross-subtask actions record on one stream and list the other side in `affected`: `paste_annotation` records on the target; `move_annotation` records on the source with the target copy in `affected`; a `bitmask_stroke` that resolves overlap lists the other masks. A host interested in one subtask checks both `subtask_key` and `affected`.
- `previous_classification_payloads` is set for `assign_annotation_id` only and is always what the annotation had immediately before this event (for every `kind`); the annotation itself already holds the new payloads.
- Not reported: `continue_*` (in-progress draw/edit/move/brush) unless `on_annotation_change_in_progress` is `true`; `begin_annotation`, `begin_edit`, `begin_move`, `begin_brush`, `start_complex_polygon`, and `create_nonspatial_annotation` on `"do"` (nothing is committed until the matching `finish_*`/`create_annotation`; their `"undo"`/`"redo"` do fire since that is what reverts or re-applies the change); the internal `simplify_polygon_complex_layer` / `merge_polygon_complex_layer` steps of finishing a polygon (the `finish_annotation` that follows reports the final geometry); `edit_text_payload`; a zero-distance move; re-picking an annotation's current class.
- Not fired by `set_annotations`, `set_annotations_batch`, `set_saved`, or `resume_from` on init: those replace state without recording actions.

### `on_annotation_change_in_progress`
*boolean* -- Also report `continue_annotation`, `continue_edit`, `continue_move`, `continue_brush`, and `continue_bitmask` to `on_annotation_change`. These fire on every mouse move during a drag. Default is `false`.


## Display Utility Functions

Display utilities are provided for a constructed `ULabel` object.

### `swap_frame_image(new_src, frame=0)`

*(string, int) => Promise&lt;string&gt;* -- Changes the image source for a given frame. Displays the loading spinner while the new image loads. Returns a `Promise` that resolves with the old source once the new image has been decoded; `await` it if you need to run code after the swap completes.

The new image must match the dimensions this instance was initialized with: the canvases, zoom math, and loaded annotations are all in the init-time image's coordinate space. On a mismatch the old image is restored and the returned `Promise` rejects. Rebuild the ULabel instance to change image dimensions.

### `swap_anno_bg_color(new_bg_color)`

*(string) => string* -- Changes the background color for the annotation box. Returns the old color.

### `get_current_subtask_key()`

*() => string* -- Returns the key of the current subtask.

### `get_current_subtask()`

*() => object* -- Returns the current subtask object.

### `get_annotations(subtask)`

*(string) => array* -- Gets the current list of annotations within the provided subtask.

### `set_annotations(new_annotations, subtask, skip_toolbox_update=false, show_loader=true)`

*(array, string, bool, bool) => Promise&lt;void&gt;* -- Sets the annotations for the provided subtask. Displays the loading spinner while re-initializing the annotations (similar to a new init); pass `show_loader = false` to swap silently, e.g. when the target subtask isn't the one on screen. Returns a `Promise` that resolves once the annotations have been set and redrawn; `await` it if you need to run code after the update completes.

When batching several per-subtask swaps, prefer [`set_annotations_batch()`](#set_annotations_batchannotations_by_subtask-show_loadertrue); alternatively pass `skip_toolbox_update = true` on each call to suppress the per-call distance-filter and toolbox updates, then call [`refresh_toolbox()`](#refresh_toolbox) once at the end.

### `set_annotations_batch(annotations_by_subtask, show_loader=true)`

*(object, bool) => Promise&lt;void&gt;* -- Replaces several subtasks' annotations as a single update: one loader cycle and one toolbox refresh for the whole set (per-subtask calls would flash the loader once per layer). `annotations_by_subtask` maps subtask keys to annotation arrays in `resume_from` form; unknown keys are warned and skipped. Pass `show_loader = false` to swap silently, e.g. when every changed subtask is a background layer.

### `refresh_toolbox()`

*() => void* -- Runs the deferred half of a batched [`set_annotations()`](#set_annotationsnew_annotations-subtask-skip_toolbox_updatefalse) sequence: recomputes distance filtering and redraws the toolbox items once.

### `set_class_color(class_id, color, redraw=true)`

*(number | string, string, bool) => void* -- Sets a class's color and syncs every view of it: `color_info`, the id-toolbox swatch, and the id-dialog color pies. When `redraw` is `true`, annotations are redrawn immediately; pass `false` when batching several color changes, then call `redraw_all_annotations()` once at the end.

### `set_class_counter_options(options, redraw=true)`

*(ClassCounterConfig, bool) => bool* -- Updates the [`ClassCounter`](#class_counter_toolbox_item) toolbox item's options at runtime; omitted options keep their current values. When `redraw` is `true` the counter re-renders immediately. Returns whether the `ClassCounter` toolbox item was found.

### `set_saved(saved)`

*(bool) => void* -- Allows js script implementing the ULabel class to set saved status, e.g., during callback.

### `has_edits(subtasks?)`

*(subtasks?: string[] | null) => boolean* -- Whether a submit button with `edits_only` (and this `subtasks` list; default all subtasks) would send any annotation. Unlike `state.edited`, which stays set until [`set_saved(true)`](#set_savedsaved), this turns `false` again when every edit is undone. It compares against what was loaded via `resume_from` / `set_annotations()`, not the last save. Builds the payload on each call.

### `remove_listeners()`

*() => void* -- Removes persistent event listeners from the document and window. Listeners attached directly to html elements are not explicitly removed.
Note that ULabel will not function properly after this method is called. Designed for use in single-page applications before navigating away from the annotation page.

> Prefer [`destroy()`](#destroy) for new code — it also releases the heavy per-annotation bitmask caches and the container DOM.

### `destroy()`

*() => void* -- Fully tears down this ULabel instance. Idempotent (subsequent calls are no-ops). Releases:

- per-bitmask runtime state (`_mask` `Uint8Array`, `_mask_render` tinted stencil canvas, `_bitmask_box_hint`),
- action stream and redo stack (which retain per-stroke `before_rle` / `after_rle` payloads),
- toolbox item back-references to the instance,
- resize observers and (if [`auto_destroy_on_detach`](#auto_destroy_on_detach) installed one) the auto-teardown `MutationObserver`,
- pending toast/interaction timers,
- all DOM under the configured container.

After calling `destroy()` the instance MUST NOT be used again. `set_annotations()`, `get_annotations()`, and `redraw_all_annotations()` short-circuit with a warning if called on a destroyed instance.

With [`auto_destroy_on_detach`](#auto_destroy_on_detach) enabled (the default), `destroy()` is called automatically after the container is removed from the DOM. Callers that opt out of the auto path should call `destroy()` explicitly during their unmount / teardown.

### `fly_to_next_annotation(increment)`
Sets the zoom to focus on a non-deprecated, spatial annotation in the active subtask's ordering that is an `<increment>` number away from the previously focused annotation, if any. Returns `true` on success and `false` on failure (eg, no valid annotations exist, or an annotation is currently actively being edited).

### `fly_to_annotation_id(annotation_id, subtask_key, max_zoom)`
Sets the zoom to focus on the provided annotation id, and switches to its subtask. Returns `true` on success and `false` on failure (eg, annotation doesn't exist in subtask, is not a spatial annotation, or is deprecated).

### `fly_to_annotation(annotation, subtask_key, max_zoom)`
Sets the zoom to focus on the provided annotation, and switches to its subtask if provided. Returns `true` on success and `false` on failure (eg, annotation doesn't exist in subtask, is not a spatial annotation, or is deprecated).

### `show_context_menu(annotation_id, client_x, client_y)`

*(annotation_id: string, client_x: number, client_y: number) => boolean* -- Opens the right-click context menu for the given annotation in the current subtask at the given viewport position (clamped to stay on screen). Returns `false` and opens nothing if the annotation is unknown or deprecated. Any open menu is replaced.

### `hide_context_menu()`

*() => void* -- Closes the context menu if open and clears the hover highlight it was holding. No-op otherwise. Called internally on Escape, any mousedown, zoom, `set_subtask`, and when the target annotation is deleted.

### `is_context_menu_open()`

*() => boolean* -- Whether the context menu is currently open.

### `copy_annotation(annotation_id, target_subtask_key, class_id?, source_subtask_key?)`

*(annotation_id: string, target_subtask_key: string, class_id?: number | null, source_subtask_key?: string | null) => string | null* -- Clones a spatial annotation from one subtask (default: the current one) into another at the same image coordinates and returns the new annotation's id, or `null` when the target is read-only, does not allow the annotation's spatial type, or has no class that accepts it. The class defaults to the target class matching the source class by id, else by name, else the target's active class, else its first compatible class. The copy's `annotation_meta.copied_from` is set to `{ subtask_key, annotation_id }` of the source (merged into the source's `annotation_meta` when that is an object), so the copy's origin survives serialization and `edits_only` payloads. The paste is recorded on the target subtask's action stream (`paste_annotation`) and can be undone there.

### `find_pasted_copy(annotation_id, source_key, target_key)`

*(annotation_id: string, source_key: string, target_key: string) => string | null* -- Id of an annotation in `target_key` whose `annotation_meta.copied_from` names `annotation_id` in `source_key` and that has not been deleted by a human (copies hidden by a confidence/distance filter still count), or `null`. Undoing the paste (or deleting the copy) clears it; redo re-arms it. The context menu uses this to ask before copying the same annotation into a subtask twice; `ctrl+v` does not check (a repeat paste there is deliberate and offset).

### `find_counterparts(annotation_id, source_key, target_key)`

*(annotation_id: string, source_key: string, target_key: string) => string[]* -- Ids of the spatial annotations in `target_key` linked to `annotation_id` in `source_key`: copies of it, the annotation it was copied from (both via `annotation_meta.copied_from`), and annotations sharing a value under [`annotation_link_meta_key`](#annotation_link_meta_key). Human-deleted annotations are skipped; filter-hidden ones count. Empty when `source_key === target_key`. The context menu uses this for the copy confirm and for `Delete from` / `Erase from`.

### `delete_counterparts(annotation_id, source_key, target_key)`

*(annotation_id: string, source_key: string, target_key: string) => string[]* -- Removes the counterparts (see [`find_counterparts`](#find_counterpartsannotation_id-source_key-target_key)) from `target_key`, which must not be read-only; the source may be. A bitmask source is subtracted from its bitmask counterparts (a mask erased to nothing is deleted) and other counterparts are left alone; any other source deletes its counterparts. Recorded as one `delete_counterparts` action on the target subtask's stream (undo there restores every mask and deletion) and reported to [`on_annotation_change`](#on_annotation_change) with the target as `subtask_key` and the changed counterparts as `affected`. Returns the changed ids; nothing is recorded when none changed. When something changed and [`paste_switch_to_target`](#paste_switch_to_target) is on, the target becomes the current subtask.

### `set_paste_switch_to_target(enabled)` / `get_paste_switch_to_target()`

*(enabled: boolean) => void* / *() => boolean* -- Read or change [`paste_switch_to_target`](#paste_switch_to_target) at runtime.

### `copy_annotation_to_clipboard(annotation_id?, cut?)`

*(annotation_id?: string | null, cut?: boolean) => ULabelClipboardEnvelope | null* -- Stores a copy of an annotation in the current subtask (default: the hovered one) on the in-memory clipboard and returns the envelope `{ ulabel_annotation: 1, copy_id, copied_at, image_width, image_height, source_subtask_key, source_class_name, annotation }`. With `cut`, the source is deleted afterwards (refused in read-only subtasks). Returns `null` for deprecated, non-spatial, or delete-mode annotations.

### `paste_annotation_from_clipboard(envelope?)`

*(envelope?: ULabelClipboardEnvelope | null) => string | null* -- Pastes an envelope (default: the in-memory clipboard) into the current subtask and returns the new annotation's id. When the given envelope and the in-memory clipboard hold different copies, the newer `copied_at` wins (so a menu copy whose system clipboard write failed still pastes). Refused with a warning when the envelope's image dimensions differ from the current image or when no class in the current subtask accepts the annotation. A paste back into `source_subtask_key` keeps its class. The first paste into another subtask keeps the coordinates; each repeat paste into the same subtask, and any paste back into the source, is offset by a further 20 pixels (`paste_counts`, per target subtask, tracked per `copy_id`). When the source class has no counterpart in the target (by id, then by name; the envelope's `source_class_name`) and several classes could take the annotation, the class pie opens on the pasted annotation unless [`paste_class_choice`](#paste_class_choice) is `false`. The copy's `annotation_meta.copied_from` records the envelope's `source_subtask_key` and the source annotation id.

### `set_subtask_read_only(subtask_key, read_only)`

*(subtask_key: string, read_only: boolean) => void* -- Make a subtask read-only or editable without recreating ULabel. Making the current subtask read-only first completes an active mouse drag, then discards other in-progress work as `Escape` would (a complex polygon layer being started, an unfinished annotation), turns the brush off, and closes the class pie and context menu. Non-spatial rows are re-rendered with or without their controls. Zoom, isolation, class focus, active class, and the undo history are kept; user undo/redo is blocked while the current subtask, or any subtask the action touched, is read-only. Unknown subtask keys log a warning; setting the current value does nothing. Not recorded and does not mark the session edited; the toggle itself fires no callback, but the completed drag and discarded work are recorded and reported to [`on_annotation_change`](#on_annotation_change) exactly as the mouse-up or `Escape` would be.

### `isolate_annotation(annotation_id, subtask_key?, redraw?)`

*(annotation_id: string | null, subtask_key?: string | null, redraw?: boolean) => boolean* -- Isolate one annotation in a subtask (default: the current one): every other annotation is hidden from the canvas and from input until cleared by passing `null`. Returns `false` and changes nothing for an unknown subtask or an unknown/deprecated annotation. View-only: not recorded, does not mark the session edited. Fires [`on_isolate_change`](#on_isolate_change) on an actual change.

### `get_isolated_annotation_id(subtask_key?)`

*(subtask_key?: string | null) => string | null* -- The isolated annotation id in a subtask (default: the current one), or `null`.

### `get_keypoint_slider_value()`

*() => number | null* -- Returns the current keypoint slider value as a number between 0 and 1. Returns `null` if the KeypointSlider toolbox item is not active or the slider element is not found.

> **Deprecated:** Prefer `get_confidence_slider_value()` with the `ConfidenceSlider` toolbox item.

### `get_distance_filter_value()`

*() => object | null* -- Returns an object mapping class identifiers to their distance filter values (in pixels). The object always includes a `closest_row` key for the single-class slider. In multi-class mode, additional keys correspond to each class ID. Returns `null` if the FilterDistance toolbox item is not active or no sliders are found.

### `get_confidence_slider_value()`

*() => object | null* -- Returns an object mapping class identifiers to their confidence threshold values (as percentages, 0–100). The object always includes an `all` key for the single global slider. In per-class mode, additional keys correspond to each class ID. Returns `null` if the ConfidenceSlider toolbox item is not active or no sliders are found.

## Generic Callbacks

Callbacks can be provided by calling `.on(fn, callback)` on a `ULabel` object.
For example:

```javascript
let ulabel = new ULabel(...);
ulabel.on(ulabel.begin_annotation, () => {
    // Define some custom behavior here
    console.log("The user just began a new annotation.");
});
```
