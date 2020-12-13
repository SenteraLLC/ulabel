import sys
import json

from analytics_db.connection import session_scope
import analytics_db.services.query as dbquery


def api():
    result = []
    with session_scope(env="prod") as session:

        result_attached = dbquery.collections(session)
        result = [
            c.name for c in result_attached
        ]
    print(json.dumps({
        "message": "Hello!",
        "result": result
    }))
    sys.stdout.flush()


def main():
    print("Hello, world! (main)")


if __name__ == "__main__":
    main()