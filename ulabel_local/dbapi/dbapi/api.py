import sys
import json

import analytics_db


def api():
    print(json.dumps({"message": "Hello!"}))


def main():
    print("Hello, world! (main)")


if __name__ == "__main__":
    main()