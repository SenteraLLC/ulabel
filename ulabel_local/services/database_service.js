const { spawn } = require('child_process');
const path = require('path');

exports.get_jobs = function() {
    adb_proc = spawn(
        'poetry', ['run', 'dbapi', 'get-jobs'], {
            cwd: path.resolve(__dirname, '../dbapi')
        }
    )
    adb_proc.stdout.on('data', (data) => {
        console.log(JSON.stringify(
            JSON.parse(data.toString()), null, 2
        ));
    });  
}

exports.get_jobs();