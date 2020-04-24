const fs = require("fs");
const path = require("path");

exports.walkDir = walkDir;
exports.humanSize = humanSize;

function* walkDir(directory, options) {
    for (let file of fs.readdirSync(directory, { withFileTypes: true })) {
        let filePath = path.join(directory, file.name);

        if (file.isFile()) {
            if (options.ext == null || options.ext.includes(path.extname(filePath))) {
                yield filePath;
            }
        } else if (file.isDirectory()) {
            yield* walkDir(filePath, options);
        } else {
            throw new Error(`unexpected file "${filePath}"`);
        }
    }
}

function humanSize(bytes) {
    let size = bytes;
    let unit = null;

    for (let u of ["KiB", "MiB", "GiB"]) {
        if (size < 1024) {
            break;
        }

        size /= 1024;
        unit = u;
    }

    return unit == null ? `${size} byte(s)` : `${size.toFixed(2)} ${unit}`;
}
