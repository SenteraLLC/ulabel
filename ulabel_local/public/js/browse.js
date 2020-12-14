/* global $ */

$(document).ready(function() {

    var cur = {
        collection: null,
        job: null,
        task: null
    };



    function load_collections() {

        // TODO fetch with AJAX
        collections = [
            {
                name: "collection 1",
                id: 1,
                crop: "soybean"
            },
            {
                name: "collection 2",
                id: 2,
                crop: "corn"
            },
            {
                name: "collection 3",
                id: 3,
                crop: "soybean"
            },
            {
                name: "collection 4",
                id: 4,
                crop: "corn"
            }
        ];

        // Clear what's presently there
        $("div#c1-list-content").html("");

        // Fill in from response
        let even = "";
        for (var i = 0; i < collections.length; i++) {
            if (i%2 == 0) {
                even = " even";
            }
            else {
                even = " odd";
            }
            $("div#c1-list-content").append(`<a class="bt-list-item${even}" href="#">Item!</a>`)
        }

        // Hide loading message
        // TODO

    }

    function load_jobs(collection_id) {
        
    }

    function load_tasks(job_id) {

    }

    // Start loading collections right away
    load_collections();

    // Create listeners

    $("a.collection").on("click", function() {

    });

    $("a.job").on("click", function() {

    });
    
    $("a.task").on("click", function() {

    });
    $("a.task").on("dblclick", function() {

    });


});