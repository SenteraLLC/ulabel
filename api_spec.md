# API Specification

This should eventually be replaced with a more comprehensive approach to documentation (e.g., via readthedocs.org), but this markdown file will do for now.

## Keyboard Shortcuts

- `ctrl+z` or `cmd+z`: Undo
- `ctrl+shift+z` or `cmd+shift+z`: Redo
- `scroll`: Zoom -- up for in, down for out
- `ctrl+scroll` or `shift+scroll` or `cmd+scroll`: Change frame -- down for next, up for previous
- `scrollclick+drag` or `ctrl+drag`: Pan
- Hold `shift` when closing a polygon to continue annotating a new region or hole.
- Hold `shift` when moving the cursor inside a polygon to begin annotating a new region or hole.
- Press `Escape` or `crtl+z` to cancel the start of a new region or hole.
- Press `Escape` to exit brush/erase mode.

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
    container_id: string,
    image_data: string | array,
    username: string,
    submit_buttons: function | object[],
    subtasks: object,
    task_meta: object,
    annotation_meta: object,
    px_per_px: number,
    initial_crop: object,
    initial_line_size: number,
    instructions_url: string,
    config_data: object,
    toolbox_order: AllowedToolboxItem[]
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
    set_saved?: boolean // If true, will call ulabel.set_saved(true) before the hook is called, thus avoiding the "unsaved changes" warning
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

    // true if was created this session
    "new": <bool>, 
    
    // (nullable) id of ann that was edited to create this one
    "parent_id": "<uuidv4 string>", 
    
    // the provided username
    "created_by": "<string>", 
    
    // timestamp when annotation was created
    "created_at": "<ISO datetime string>",
    
    // true if annotation was deleted
    "deprecated": <bool>, 
    
    // which type of annotation
    "spatial_type": "<string>", 
    
    // (nullable) e.g. [[x1, y1], [x2, y2], ...]
    "spatial_payload": <array>, 
    
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
    "line_size": <number>, 

    // (nullable) frame ann was created for
    "frame": <int>, 
    
    // certain spatial types allow text
    "text_payload": "<string>", 
    
    // as provided to constructor
    "annotation_meta": <object> 
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

*object* -- A definition for a bounding box that the viewer should fit to at the beginning of the session. Units are pixels in the underlying image.

```javascript
{
    "top": <number>,
    "left": <number>,
    "height": <number>,
    "width": <number>
}
```

### `initial_line_size`

The line width with which new annotations are drawn initially. Units are pixels in the underlying image. When this value is not included, the default value of `4` is used and scaled by the current zoom value when a new annotation is drawn. When an `initial_line_size` is included, it is used as the line width for new annotations regardless of the current zoom value.

### `instructions_url`

URL to a page that gives annotation instructions.

### `config_data`

*object* -- An object to configure much of ULabel's behaviors.

```javascript
{
    default_toolbox_item_order: AllowedToolboxItem[],

    default_keybinds = {
        "annotation_size_small": string,
        "annotation_size_large": string,
        "annotation_size_plus": string,
        "annotation_size_minus": string,
        "annotation_vanish": string
    },

    distance_filter_toolbox_item: FilterDistanceConfig,

    change_zoom_keybind: string,

    create_point_annotation_keybind: string,

    default_annotation_size: number,
    
    delete_annotation_keybind: string,
    
    keypoint_slider_default_value: number,

    filter_annotations_on_load: boolean,
    
    switch_subtask_keybind: string,
    
    toggle_annotation_mode_keybind: string,

    create_bbox_on_initial_crop: string,

    annotation_gradient_default: boolean

    toggle_brush_mode_keybind: string

    toggle_erase_mode_keybind: string

    increase_brush_size_keybind: string

    decrease_brush_size_keybind: string
}
```
With the following custom definitions.
```Javascript
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
    Brush             // 9
}

type AnnotationClassDistanceData = {
    "single": number,
    [key: number]?: number
}

type FilterDistanceConfig = {
    "name"?: string,
    "component_name"?: string,
    "filter_min"?: number,
    "filter_max"?: number,
    "default_values"?: AnnotationClassDistanceData,
    "step_value"?: number,
    "multi_class_mode"?: boolean,
    "filter_on_load"?: boolean,
    "show_options"?: boolean,
    "toggle_overlay_keybind"?: string,
    "show_overlay_on_load"?: boolean
}
```
Where all `config_data` properties are optional.

## Display Utility Functions

Display utilities are provided for a constructed `ULabel` object.

### `swap_frame_image(new_src, frame=0)`

*(string, int) => string* -- Changes the image source for a given frame. Returns the old source.

### `swap_anno_bg_color(new_bg_color)`

*(string) => string* -- Changes the background color for the annotation box. Returns the old color.

### `get_annotations(subtask)`

*(string) => array* -- Gets the current list of annotations within the provided subtask.

### `set_annotations(new_annotations, subtask)`

*(array, string) => void* -- Sets the annotations for the provided subtask.

### `set_saved(saved)`

*(bool) => void* -- Allows js script implementing the ULabel class to set saved status, e.g., during callback.

### `remove_listeners()`

*() => void* -- Deletes all ULabel event listeners from the page.

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
