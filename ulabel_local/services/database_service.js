const { spawnSync } = require('child_process');
const path = require('path');


exports.query_db = (arg) => {
    adb_proc = spawnSync(
        'poetry', ['run', 'dbapi', arg], {
            cwd: path.resolve(__dirname, '../py-dbapi'),
            env: {
                ...process.env,
                "DB_ENV": "prod",
                "SSH_CONNECT": "True"
            }
        }
    )
    if (adb_proc.status == 0) {
        result = JSON.parse(adb_proc.stdout.toString());
        // console.log(JSON.stringify(result, null, 2));
    }
    else {
        console.log("IPC error getting jobs")
        if (adb_proc.stderr != null) {
            console.log(adb_proc.stderr.toString());
        }
        else {
            console.log(JSON.stringify(adb_proc, null, 2));
        }
        result = null;
    }
    return result;
}