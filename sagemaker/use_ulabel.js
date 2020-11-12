/* global JOB_CONFIG */

function lq_wrap(key) {
    return "{" + "{" + key + "}" + "}";
}

function process_configuration(raw_cfg) {
    let cfg = {
        "strings": {},
        "stringified_objs": {}
    };
    for (const [key, val] of Object.entries(raw_cfg["strings"])) {
        if (val[0] != lq_wrap(key)) {
            cfg["strings"][key] = val[0];
        }
        else {
            console.log("Template value for " + key + " was not provided. Using default value.");
            cfg["strings"][key] = val[1];
        }
    }
    for (const [key, val] of Object.entries(raw_cfg["stringified_objs"])) {
        if (val[0] != lq_wrap(key)) {
            cfg["stringified_objs"][key] = JSON.parse(val[0]);
        }
        else {
            console.log("Template value for " + key + " was not provided. Using default value.");
            cfg["stringified_objs"][key] = JSON.parse(val[1]);
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
        console.log("Called done on:", payload);
    }

    var ulabel = new ULabel(
        cfg["strings"]["container"],
        cfg["strings"]["image_url"],
        cfg["strings"]["annotator"],
        cfg["strings"]["batch_id"],
        cfg["stringified_objs"]["taxonomy"],
        cfg["stringified_objs"]["class_defs"],
        save_callback,
        exit_callback,
        done_callback,
        cfg["stringified_objs"]["allowed_modes"], 
        null
    );
    ulabel.init(function() {
        console.log("inited!");
    });
});