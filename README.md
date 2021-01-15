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

## TODO List Prior to Open Source

- ~~Condense with webpack~~
- Allow for non-absolute position of parent div
- Flexible handling of classes/hierarchy
- Better discipline on logging

Shortly after
- Center image in window when small
- Handle 3D image data