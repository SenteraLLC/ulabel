import sys
import json

from analytics_db.connection import session_scope
import analytics_db.services.query as dbquery


def send_collections(req):
    result = []
    with session_scope(env="prod") as session:
        result_attached = dbquery.collections(session)
        result = [
            {
                "id": c.id,
                "name": c.name,
                "crop": str(c.crop_type),
                "created_at": c.created_at.timestamp()
            }
            for c in result_attached
        ]
    print(json.dumps(result))
    sys.stdout.flush()


def api():
    request = json.loads(sys.argv[1])
    # TODO dispatch based on sys.argv
    if request["from"] =="collections":
        send_collections(request)


def main():
    print("Hello, world! (main)")


if __name__ == "__main__":
    main()