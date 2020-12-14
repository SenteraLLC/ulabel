import sys
import json

from analytics_db.connection import session_scope
import analytics_db.services.query as dbquery


def api():
    # TODO dispatch based on sys.argv
    result = []
    with session_scope(env="prod") as session:
        result_attached = dbquery.collections(session)
        result = [
            c.name for c in result_attached
        ]
    print(json.dumps({
        "error": False,
        "result": result
    }))
    sys.stdout.flush()


def main():
    print("Hello, world! (main)")


if __name__ == "__main__":
    main()