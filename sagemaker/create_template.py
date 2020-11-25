from pathlib import Path
import json

if __name__ == "__main__":

    # Get current version
    with (Path(__file__).parent.parent / ".version").open() as f:
        version = f.read()

    print()
    new_version = input("Enter version number [{}]: ".format(version))
    if new_version != "":
        version = new_version
        with (Path(__file__).parent.parent / ".version").open("w") as f:
            f.write(version)

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

<script src="https://cdnjs.cloudflare.com/ajax/libs/uuid/8.1.0/uuidv4.min.js"></script>


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
        "image_url": ["{{task.input.source-ref | grant_read_access}}", "/demo_image.jpg"],
        "image_id": ["{{task.input.id}}", "__no_image_id_provided__"],
        "container": ["ulabel-cont"],
        "annotator": ["__placeholder__"],
        "batch_id": ["{{task.input.batch_id}}", "__no_batch_id_provided__"],
        "task_id": ["{{task.input.task_id}}", "__no_task_id_provided__"],
        "dst_field": ["whole-field"]
    },
    "stringified_objs": {
        "taxonomy": [`null`], 
        "class_defs": [`null`],
        "allowed_modes": [`["polygon", "bbox", "contour"]`],
    }
}
console.log(JOB_CONFIG);
/* ================================== USE_ULABEL.js ================================== */
""" + use_ulabel_js_str + """
</script>

<div id="ulabel-cont"></div>

<crowd-form>
    <input id="whole-field" name="whole-field" type="text" />
</crowd-form>"""

    destination = Path(__file__).parent / "ulabel-{}.liquid.html".format(version)
    with open(str(destination), "w") as f:
        print(liquid_str, file=f)

    print()
    print("Template successfully created at {}".format(str(destination)))
    print()
    print("Use the following commands to upload the new template to s3")
    print()
    print("aws s3 cp {} s3://sentera-labeling-jobs/ulabel-templates/{}".format(
        str(destination), destination.name
    ))
    print()
    print("aws s3 cp s3://sentera-labeling-jobs/ulabel-templates/{} s3://sentera-labeling-jobs/ulabel-templates/ulabel-latest.liquid.html".format(
        destination.name
    ))
    print()