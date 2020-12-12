/* global JOB_CONFIG */

function not_templated(key) {
    return (key.substring(0,2) == "{" + "{");
}

function process_configuration(raw_cfg) {
    let cfg = {
        "strings": {},
        "stringified_objs": {}
    };
    for (const [key, val] of Object.entries(raw_cfg["strings"])) {
        if (not_templated(val[0])) {
            console.log("Template value for " + key + " was not provided. Using default value.");
            cfg["strings"][key] = val[1];
        }
        else {
            cfg["strings"][key] = val[0];
        }
    }
    for (const [key, val] of Object.entries(raw_cfg["stringified_objs"])) {
        if (not_templated(val[0])) {
            console.log("Template value for " + key + " was not provided. Using default value.");
            cfg["stringified_objs"][key] = JSON.parse(val[1]);
        }
        else {
            cfg["stringified_objs"][key] = JSON.parse(val[0]);
        }
    }
    return cfg;
}

$(document).ready(function() {
    // If template didn't run, show demo instead
    var cfg = process_configuration(JOB_CONFIG);

    function save_callback(payload) {
        // TODO handles what to do when the platform wants to save
        console.log("Called save on:", payload);
    }
    
    function exit_callback(payload) {
        // TODO handles what to do when the platform wants to exit before finishing
        console.log("Called exit on:", payload);
    }
    
    function done_callback(payload) {
        // TODO handles what to do when the platform is indicating that the user has finished
        $("#" + cfg["strings"]["dst_field"]).val(JSON.stringify(payload));
        $("crowd-button").click();
    }

    var ulabel = new ULabel(
        cfg["strings"]["container"],
        cfg["strings"]["image_url"],
        cfg["strings"]["annotator"],
        cfg["stringified_objs"]["taxonomy"],
        cfg["stringified_objs"]["class_defs"],
        save_callback,
        exit_callback,
        done_callback,
        cfg["stringified_objs"]["allowed_modes"],
        cfg["stringified_objs"]["resume_from"],
        {
            "task_id": cfg["strings"]["task_id"],
            "batch_id": cfg["strings"]["batch_id"],
            "image_id": cfg["strings"]["image_id"]
        }, // task_meta
        {
            "task_id": cfg["strings"]["task_id"],
            "batch_id": cfg["strings"]["batch_id"],
            "image_id": cfg["strings"]["image_id"]
        } // annotation_meta
    );
    ulabel.init(function() {
        console.log("inited!");
    });
});