# ULabel

A browser-based tool for annotating images.

## Usage

ULabel is an entirely "frontend" tool. It can be incorporated into any HTML page using either the unpkg cdn

```html
<script src="https://unpkg.com/ulabel/dist/ulabel.js"></script>
```

Or you can use npm to install it and serve the `dist/ulabel.js` file from `node_modules` locally.

```bash
npm install ulabel
```

```html
<script src="/node_modules/ulabel/dist/ulabel.js"></script>
```

An API spec can be found [here](https://github.com/SenteraLLC/ulabel/blob/main/api_spec.md), but as a brief overview: Once the script is included in your HTML doc, you can create a ULabel annotation session as follows.

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/ulabel/dist/ulabel.js"></script>
</head>
<body>
    <div id="ulabel-container" style="height: 800px; width: 1200px; position: absolute; top: 0; left: 0;"></div>

    <script>
        // Specify destination
        let container_id = "ulabel-container";

        // Configure the annotation session
        let classes = ["Class 1", "Class 2"];
        let allowed_modes = ["polygon", "bbox", "contour"];
        let username = "demo_user";
        let image_url = "https://tinyurl.com/y6mxeuxs";

        // Specify submit behavior
        let on_submit = (annotations) => {
            // Download annotations as a json file
            let el = document.createElement('a');
            el.setAttribute("href", 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(annotations, null, 2)));
            el.setAttribute("download", "annotations.json");
            el.style.display = 'none';
            document.body.appendChild(el);
            el.click();
            document.body.removeChild(el);
        };

        let subtasks = {
            "first_task": {
                "display_name": "Task 1",
                "classes": [
                    {"name": "Class 1", "color": "blue", "id": 10},
                    {"name": "Class 2", "color": "pink", "id": 11},
                ],
                "allowed_modes": ["contour", "polygon"],
                "resume_from": null,
                "task_meta": null,
                "annotation_meta": null
            },
            "second_task": {
                "display_name": "Task 2",
                "classes": [
                    {"name": "Class 2", "color": "pink", "id": 11},
                    {"name": "Class 3", "color": "green", "id": 12},
                ],
                "allowed_modes": ["bbox", "polygon", "tbar"],
                "resume_from": null,
                "task_meta": null,
                "annotation_meta": null
            }
        };

        // Build and initialize the toollet ulabel = new ULabel(
        let ulabel = new ULabel(container_id, image_url, username, on_submit, subtasks);
        ulabel.init(function() {
            console.log("ULabel is now ready");
        });

    </script>
</body>
</html>
```

## Development

The recommended way to develop new features is to use the tool as if you were running the demo. For testing new API features, you can create a new HTML file in `demo/`. The server in `demo.js` runs a static server from `demo/` so it will be served at `localhost:8080/<new-file>.html` automatically.

### Requirements
- [npm](https://www.npmjs.com/get-npm) 
- [nodejs](https://nodejs.org/en/download/)

### Install Dependencies

```bash
npm install
```

### Usage

You should now be able to run the launcher from the repository root.

```bash
pwd # Should be /path/to/ulabel
node demo.js
```

### Build

The repository ships with the built `dist/ulabel.js` file. This file is not to be edited directly. Edits should be made in the `src/` dir and the package is built with 

```bash
npm run build
```

## Attribution

The three demo images were downloaded from the [CityScapes dataset](https://www.cityscapes-dataset.com/). In particular, they are sampled from the first few frames of the `leftImg8bit_demoVideo`.
