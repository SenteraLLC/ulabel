/* global $ */

$(document).ready(function() {

    var cur = {
        collection: null,
        job: null,
        task: null
    };

    function format_etime(etime) {
        let date = new Date(etime*1000);
        return date.toLocaleString("en-US"); 
    }

    function format_crop(crop) {
        return crop.substr(9);
    }

    function load_collections() {

        // Get collections asynchronously with AJAX
        request = {
            from: "collections"
        }
        $.post("/query", request, function(collections) {
            // TODO delete later
            console.log(collections);
            collections.unshift({
                id: "ID",
                name: "Name",
                crop: "Crop Type",
                created_at: "Created At"
            })

            // Clear what's presently there
            $("div#c1-list-content").html("");

            // Fill in from response
            let even = "";
            let created = "";
            let crop = "";
            for (var i = 0; i < collections.length; i++) {
                if (i == 0) {
                    lilhead = " lilhead";
                    created = collections[i].created_at;
                    crop = collections[i].crop;
                }
                else {
                    lilhead = "";
                    created = format_etime(collections[i].created_at);
                    crop = format_crop(collections[i].crop);
                }
                if (i%2 == 0) {
                    even = " even";
                }
                else {
                    even = " odd";
                }
                let id = collections[i].id;
                let name = collections[i].name;
                $("div#c1-list-content").append(`
                    <a class="bt-list-item${even}${lilhead}" href="#">
                        <span class="item-attr id-attr">${id}</span><!--
                        --><span class="item-attr name-attr">${name}</span><!--
                        --><span class="item-attr crop-attr">${crop}</span><!--
                        --><span class="item-attr created-attr">${created}</span>
                    </a>
                `);
            }

            // Hide loading message
            $("#loading-message").remove();


        });


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