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
    reset_zoom_keybind: string,
    show_full_image_keybind: string,
    create_point_annotation_keybind: string,
    default_annotation_size: number,
    delete_annotation_keybind: string,
    keypoint_slider_default_value: number,
    filter_annotations_on_load: boolean,
    switch_subtask_keybind: string,
    toggle_annotation_mode_keybind: string,
    create_bbox_on_initial_crop_keybind: string,
    toggle_brush_mode_keybind: string,
    toggle_erase_mode_keybind: string,
    increase_brush_size_keybind: string,
    decrease_brush_size_keybind: string,
    fly_to_next_annotation_keybind: string,
    fly_to_previous_annotation_keybind: string,
    annotation_size_small_keybind: string,
    annotation_size_large_keybind: string,
    annotation_size_plus_keybind: string,
    annotation_size_minus_keybind: string,
    annotation_vanish_keybind: string,
    fly_to_max_zoom: number,
    n_annos_per_canvas: number
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

Where `<subtask n>` refers to the nth key in the object provided as the `subtasks` argument to the constructor.

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
    "spatial_payload": "<array>", 
    
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

    // size in underlying image pixels
    "line_size": "<number>", 

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
- `"delete_polygon"`: Allows drawing a polygon around an area, and all annotations within that area will be deleted
- `"delete_bbox"`: Allows drawing a bounding box around an area, and all annotations within that area will be deleted

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

The line width with which new annotations are drawn initially. Units are pixels in the underlying image. When this value is not included, the default value of `4` is used.

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
    AnnotationList    // 11
}
```
You can access the AllowedToolboxItem enum by calling the static method:
```javascript
const AllowedToolboxItem = ULabel.get_allowed_toolbox_item_enum();
```

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
- Hover over an annotation in the list to highlight it on the canvas with the ID dialog
- Hover over an annotation on the canvas to highlight its corresponding entry in the list

This toolbox item requires no configuration and can be added to the `toolbox_order` array using `AllowedToolboxItem.AnnotationList`.

### `reset_zoom_keybind`
Keybind to reset the zoom level to the `initial_crop`. Default is `r`.

### `show_full_image_keybind`
Keybind to set the zoom level to show the full image. Default is `shift+r`.

### `create_point_annotation_keybind`
Keybind to create a point annotation at the mouse location. Default is `c`. Requires the active subtask to have a `point` mode.

### `default_annotation_size`
Default size of annotations in pixels. Default is `6`.

### `delete_annotation_keybind`
Keybind to delete the annotation that the mouse is hovering over. Default is `d`.

### `keypoint_slider_default_value`
Default value for the keypoint slider. Must be a number between 0 and 1. Default is `0`.

### `filter_annotations_on_load`
If true, the annotations will be filtered on load based on the `keypoint_slider_default_value`. Default is `true`.

### `switch_subtask_keybind`
Keybind to switch between subtasks. Default is `z`.

### `toggle_annotation_mode_keybind`
Keybind to toggle between annotation and selection modes. Default is `u`.

### `create_bbox_on_initial_crop_keybind`
Keybind to create a bounding box annotation around the `initial_crop`. Default is `f`. Requires the active subtask to have a `bbox` mode.

### `toggle_brush_mode_keybind`
Keybind to toggle brush mode for polygon annotations. Default is `g`. Requires the active subtask to have a `polygon` mode.

### `toggle_erase_mode_keybind`
Keybind to toggle erase mode for polygon annotations. Default is `e`. Requires the active subtask to have a `polygon` mode.

### `increase_brush_size_keybind`
Keybind to increase the brush size. Default is `]`. Requires the active subtask to have a `polygon` mode.

### `decrease_brush_size_keybind`
Keybind to decrease the brush size. Default is `[`. Requires the active subtask to have a `polygon` mode.

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
Keybind to toggle vanish mode for annotations in the current subtask (lowercase toggles current subtask, uppercase toggles all subtasks). Default is `v`.

### `fly_to_max_zoom`
Maximum zoom factor used when flying-to an annotation. Default is `10`, value must be > `0`. 

### `n_annos_per_canvas`
The number of annotations to render on a single canvas. Default is `100`. Increasing this number may improve performance for jobs with a large number of annotations.

### `click_and_drag_poly_annotations`
If `true`, the user can click and drag to contiuously place points for polyline and polygon annotations. Default is `true`.

### `allow_annotations_outside_image`
When `false`, new annotations will be limited to points within the image, and attempts to move annotations outside the image will bounce back to inside the image. Default is `true`. 


## Display Utility Functions

Display utilities are provided for a constructed `ULabel` object.

### `swap_frame_image(new_src, frame=0)`

*(string, int) => string* -- Changes the image source for a given frame. Returns the old source.

### `swap_anno_bg_color(new_bg_color)`

*(string) => string* -- Changes the background color for the annotation box. Returns the old color.

### `get_current_subtask_key()`

*() => string* -- Returns the key of the current subtask.

### `get_current_subtask()`

*() => object* -- Returns the current subtask object.

### `get_annotations(subtask)`

*(string) => array* -- Gets the current list of annotations within the provided subtask.

### `set_annotations(new_annotations, subtask)`

*(array, string) => void* -- Sets the annotations for the provided subtask.

### `set_saved(saved)`

*(bool) => void* -- Allows js script implementing the ULabel class to set saved status, e.g., during callback.

### `remove_listeners()`

*() => void* -- Removes persistent event listeners from the document and window. Listeners attached directly to html elements are not explicitly removed.
Note that ULabel will not function properly after this method is called. Designed for use in single-page applications before navigating away from the annotation page.

### `fly_to_next_annotation(increment)`
Sets the zoom to focus on a non-deprecated, spatial annotation in the active subtask's ordering that is an `<increment>` number away from the previously focused annotation, if any. Returns `true` on success and `false` on failure (eg, no valid annotations exist, or an annotation is currently actively being edited).

### `fly_to_annotation_id(annotation_id, subtask_key, max_zoom)`
Sets the zoom to focus on the provided annotation id, and switches to its subtask. Returns `true` on success and `false` on failure (eg, annotation doesn't exist in subtask, is not a spatial annotation, or is deprecated).

### `fly_to_annotation(annotation, subtask_key, max_zoom)`
Sets the zoom to focus on the provided annotation, and switches to its subtask if provided. Returns `true` on success and `false` on failure (eg, annotation doesn't exist in subtask, is not a spatial annotation, or is deprecated).

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
