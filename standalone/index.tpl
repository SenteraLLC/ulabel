<!DOCTYPE html>
<html>
    <head>
        <title>ULabel</title>
        <link rel="icon" href="https://sentera.com/wp-content/uploads/2018/03/Favicon.png" sizes="192x192" />

        <!-- ULabel Library -->
        <script src="/ulabel.js"></script>

        <!-- ULabel Usage -->
        <script>
            /* global ULabel */

            document.addEventListener("DOMContentLoaded", function() { 

                let on_submit = (annotations) => {
                    console.log("Done");
                    var element = document.createElement('a');
                    element.setAttribute("href", 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(annotations)));//, null, 2)));
                    element.setAttribute("download", "annotations.json");
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                }

                // Initial ULabel configuration
                let ulabel = new ULabel(
                    "container", 
                    "/demo_image.jpg", 
                    "TestUser", 
                    [
                        {
                            "name": "Male",
                            "color": "blue",
                            "id": 3
                        },
                        {
                            "name": "Female",
                            "color": "pink",
                            "id": 4
                        }
                    ], 
                    ["polygon", "bbox", "contour", "tbar"], 
                    on_submit
                );
                // Wait for ULabel instance to finish initialization
                ulabel.init(function() {
                    // ULabel is now ready for use
                });

            });
        </script>
    </head>
    <body>
        <div id="container" style="width: 100%; height: 100vh; position: absolute; top: 0; left: 0;"></div>
        <h1>{{ msg }}</h1>
    </body>
</html>