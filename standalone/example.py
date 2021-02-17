import json
from pathlib import Path

import requests

expl_data = (Path(__file__).parent / "expl_data").resolve()
input_dir = expl_data / "input"
output_dir = expl_data / "output"

url = 'http://localhost:8081/new'
config = {
    "image_data": "/home/helle246/code/sentera/ULabel/standalone/expl_data/input/demo_image.jpg",
    "username": "AnnotatorName",
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
                }
            ],
            "allowed_modes": ["polygon"],
            "resume_from":  "/home/helle246/code/sentera/ULabel/standalone/expl_data/input/resume_from.json",
            "task_meta": None,
            "annotation_meta": None
        }
    },
    "output_file": "/home/helle246/code/sentera/ULabel/standalone/expl_data/output/new_annotations.json",
    "allow_overwrite": True,
    "open": True
}
requests.post(url, data=json.dumps(config))