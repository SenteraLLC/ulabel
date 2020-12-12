/* global $ */
/* global ULabel */
/* global uuidv4 */

$(document).ready(function() {
    function on_save(annotations) {
        console.log("Save");
        console.log(JSON.stringify(annotations, null, 2));
    }

    function on_exit(annotations) {
        console.log("Exit");
        console.log(JSON.stringify(annotations, null, 2));
    }

    function on_done(annotations) {
        console.log("Done");
        var element = document.createElement('a');
        element.setAttribute("href", 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(annotations, null, 2)));
        element.setAttribute("download", "annotations.json");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // Initial ULabel configuration
    let ulabel = new ULabel(
        "container", // ID of container to build ULabel inside
        "/demo_image.jpg", // Image to annotate
        "TestUser", // User ID
        [
            {
                "type": "class",
                "id": 2
            }
        ], // Taxonomy
        {
            "1": {
                "name": "Weed",
                "color": "orange"
            }
        }, // Class Definitions
        on_save, // Save callback
        on_exit, // Exit callback
        on_done, // Done callback
        ["polygon", "bbox", "contour"], // Allowed annotation modes
        null, // Resume from
        {
            "task_meta": "is_assigned_to_the_top_level",
            "task_id": uuidv4(),
            "batch_id": uuidv4(),
            "image_id": uuidv4()
        }, // task_meta
        {
            "annotation_meta": "is_assigned_to_each_annotation"
        } // annotation_meta
    );

    // Wait for ULabel instance to finish initialization
    ulabel.init(function() {
        // ULabel is now ready for use
    });

});