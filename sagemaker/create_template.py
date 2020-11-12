from pathlib import Path
import json

if __name__ == "__main__":

    # Get ULabel Source for insertion
    ulabel_js_str = ""
    with open(str(Path(__file__).parent.parent.resolve() / "src/ulabel.js")) as f:
        ulabel_js_str = f.read()
    ulabel_css_str = ""
    with open(str(Path(__file__).parent.parent.resolve() / "src/ulabel.css")) as f:
        ulabel_css_str = f.read()

    # Get source of helper files to aid in ULabel setup atop SageMaker's environment
    use_ulabel_js_str = ""
    with open(str(Path(__file__).parent.resolve() / "use_ulabel.js")) as f:
        use_ulabel_js_str = f.read()
    use_ulabel_css_str = ""
    with open(str(Path(__file__).parent.resolve() / "use_ulabel.css")) as f:
        use_ulabel_css_str = f.read()


    liquid_str = """<script src="https://assets.crowd.aws/crowd-html-elements.js"></script>
<script
  src="https://code.jquery.com/jquery-3.5.1.min.js"
  integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0="
  crossorigin="anonymous"></script>

<style type="text/css">
/* ================================== ULABEL.css ================================== */
""" + use_ulabel_css_str + """
/* ================================== ULABEL.css ================================== */
""" + ulabel_css_str + """
</style>

<script>
/* ================================== ULABEL.js ================================== */
""" + ulabel_js_str + """
/* ================================== from CREATE_TEMPLATE.py ================================== */
// The first item is with templating, the second is a backup if tempate isn't run
// If no second item is provided, the first must not fail
var JOB_CONFIG = {
    "strings": {
        "image_url": ["{{image_url}}", "/demo_image.jpg"],
        "container": ["ulabel-cont"],
        "annotator": ["__placeholder__"],
        "batch_id": ["{{batch_id}}", "demo-batch"],
        "dst_field": ["whole-field"]
    },
    "stringified_objs": {
        "taxonomy": [`null`], 
        "class_defs": [`null`], 
        "allowed_modes": [`{{allowed_modes}}`, `["polygon", "bounding-box", "contour"]`],
    }
}
/* ================================== USE_ULABEL.js ================================== */
""" + use_ulabel_js_str + """
</script>

<div id="ulabel-cont"></div>

<crowd-form>
    <input name="whole-field" type="text" />
</crowd-form>"""

    with open(str(Path(__file__).parent / "template.liquid.html"), "w") as f:
        print(liquid_str, file=f)