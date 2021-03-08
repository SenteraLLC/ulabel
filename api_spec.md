# API Specification

This should eventually be replaced with a more comprehensive approach to documentation (e.g., via readthedocs.org), but this markdown file will do for now.

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
class ULabel(
    container_id,          // string
    image_data,            // string OR array
    username,              // string
    on_submit,             // (obj) => {} OR object
    subtasks,              // object
    task_meta=null,        // object
    annotation_meta=null,  // object
    px_per_px=1,           // number
    init_crop=null         // object
)
```

### `container_id`

*string* -- The value of the `id` attribute of the `<div>` element that ULabel is meant to occupy. This element must exist in the document at the time the constructor is called.

ULabel has primarily been tested inside of divs that have been styled with `position=absolute;`, and `width`, `height`, `top`, and  `left` set. Stay tuned for official recommendations about this.

### `image_data`

*string* OR *array* -- A reference to the image(s) to be annotated. In the case of a single image session, a simple URL to the image can be provided. It will be assigned directly to an `<img>` tag's `src` attribute.

In the case of a multi-frame annotation job, an array of URLs may be given. Note that for performance reasons, ULabel assumes that each image in the array has the same dimensions as the first image in the array.

### `username`

*string* -- This is intended to be a unique ID for the user performing annotations. It will be assigned to each annotation that this user creates during the session.

### `on_submit`

*(obj) => {}* OR *object* -- Appearance and behavior of the "submit" button.

Objects must be provided in the form of

```javascript
{
    name: "<Arbitrary Button Name>",
    hook: (annotations) => {
        // Define submit behavior here
    }
}
```

Alternatively, the hook alone can be provided, and the name will default to `"Submit"`.

The argument to the hook is an object with the format

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

Where `<subtask n>` refers t the nth key in the object provided as the `subtasks` argument to the constructor.

As you can see, each subtask will have a corresponding list of annotation objects. Each annotation object has the following format

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
                "id": 10
            },
            {
                "name": "SUV",
                "color": "green",
                "id": 11
            },
            {
                "name": "Truck",
                "color": "orange",
                "id": 12
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

The full list of `"allowed_modes"` that are currently supported is:

- `"bbox"`: A simple single-frame bounding box
- `"bbox3"`: A bounding box that can extend through multiple frames
- `"polygon"`: A simple series of points that must define a closed polygon
- `"tbar"`: Two lines defining a "T" shape
- `"contour"`: A freehand line
- `"whole-image"`: A label to be applied to an entire frame
- `"global"`: A label to be applied to the entire series of frames

The list of modes currently **under construction** is:

- `"polyline"`: A simple series of points that needn't define a closed polygon

The `resume_from` attributes are used to import existing annotations into the annotation session for each subtask, respectively. Existing annotations must be provided as a list of annotations of the form specified above.

### `task_meta` and `annotation_meta`

*object* -- Meta about the annotation session to be saved at the task and annotation levels, respectively.

These are provided for convenience. They simply pass their contents to the global output object and to each annotation, respectively.

### `px_per_px`

*number* -- The ratio of rendering resolution to image resolution.

In some cases, you may want the annotations to render at a higher or lower resolution than the underlying image. For example, for very low resolution images like CT scans, you may want to specify a value of 2-4 for aesthetic purposes, whereas for very high resolution images that will only be annotated at a very coarse level, you may want to specify a value of 0.25 - 0.5 for performance purposes.

### `init_crop`

*object* -- A definition for a bounding box that the viewer should fit to at the beginning of the session. Units are pixels in the underlying image.

```javascript
{
    "top": <number>,
    "left": <number>,
    "height": <number>,
    "width": <number>
}
```

## Display Utility Functions

Display utilities are provided for a constructed `ULabel` object.

### `swap_frame_image(new_src, frame=0)`

*(string, int) => string* -- Changes the image source for a given frame. Returns the old source.

### `swap_anno_bg_color(new_bg_color)`

*(string) => string* -- Changes the background color for the annotation box. Returns the old color.