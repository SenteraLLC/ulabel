import json
from pathlib import Path

import requests

expl_data = (Path(__file__).parent / "expl_data").resolve()
input_dir = expl_data / "input"
output_dir = expl_data / "output"

url = 'http://localhost:8081/new'
config = {
    "image_data": str(input_dir / "image.jpg"),
    "resume_from": str(input_dir / "annotations.json"),
    "output_file": str(output_dir / "new_annotations.json")
}
print(requests.post(url, data=json.dumps(config)).text)