import json
from pathlib import Path

import requests

expl_data = (Path(__file__).parent / "expl_data").resolve()
input_dir = expl_data / "input"
output_dir = expl_data / "output"

url = 'http://localhost:8081/new'
config = {
    "image_data": str(input_dir / "demo_image.jpg"),
    "subtasks": {
        "main": {
            "display_name": "MF Stand",
            "classes": [
                {
                    "name": "Male Stand",
                    "color": "blue",
                    "id": 10
                },
                {
                    "name": "Female Stand",
                    "color": "pink",
                    "id": 11
                },
            ],
            "allowed_modes": ["polygon"],
            "resume_from": str(input_dir / "annotations.json"),
            "task_meta": None,
            "annotation_meta": None
        }
    },
    "output_file": str(output_dir / "new_annotations.json"),
    "open": True
}
requests.post(url, data=json.dumps(config))