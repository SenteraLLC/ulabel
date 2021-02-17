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

        // Build and initialize the tool
        let ulabel = new ULabel(container_id, image_url, username, classes, allowed_modes, on_submit);
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

Standalone tool
- Allow for arbitrary ULabel job given URL with config data
- Allow S3 paths for image data
    - And resume_from/write_to
- Browse/next/prev/go through
- Multi-select with polygon

Major Items
- Handle 3D image data
- Handle subtask configs
    - Flexible construction and backwards compatible exports
    - Read-Only/Inactive subtasks don't prompt for edits
    - Multiple instructions links
- Add support for whole-image annotations
- Add support for initial crop

Maintenance & "Bug" fixes
- Allow for non-absolute position of parent div (test this out) (5)
- Flexible handling of classes -- get this from manifest file (3)
- Better discipline on logging (5)
    - User-facing messages

New features
- Polylines (only two points for row detection) (1)
- Allow for multiple-task viewing, toggling each user (5)
- Regression payloads (5)
- Superpixels (5)

Shortly after
- Center image in window when small (5)
- Handle 3D image data (5)

Multi select with a polygon