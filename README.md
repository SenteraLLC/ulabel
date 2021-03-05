# ULabel

A browser-based tool for creating image annotations.

## Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script src="/ulabel.js"></script>
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

## Demo

### Requirements
- npm (`sudo apt install npm`)
- nodejs (`sudo apt install nodejs`)

### Install Dependencies

```bash
npm install
```

### Usage

You should now be able to run the launcher from the repository root.

```bash
pwd # Should be /path/to/ULabel
node demo/server.js
```

## TODO

- I should really start writing a spec