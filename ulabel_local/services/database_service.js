const { spawnSync } = require('child_process');
const path = require('path');

exports.get_jobs = function() {
    adb_proc = spawnSync(
        'poetry', ['run', 'dbapi', 'get-jobs'], {
            cwd: path.resolve(__dirname, '../py-dbapi')
        }
    )
    if (adb_proc.status == 0) {
        result = JSON.parse(adb_proc.stdout.toString());
        console.log(JSON.stringify(result, null, 2));
    }
    else {
        console.log("IPC error getting jobs")
        console.log(adb_proc.stderr.toString());
        result = null;
    }
    return result;
}
exports.get_jobs();