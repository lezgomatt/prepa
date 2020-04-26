const fs = require("fs");
const path = require("path");

exports.walkDir = walkDir;
exports.humanSize = humanSize;
exports.humanDuration = humanDuration;
exports.urlPath = urlPath;

function* walkDir(directory) {
    for (let file of fs.readdirSync(directory, { withFileTypes: true })) {
        let filePath = path.join(directory, file.name);

        if (file.isFile()) {
            yield filePath;
        } else if (file.isDirectory()) {
            yield* walkDir(filePath);
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

function humanDuration(nanoseconds) {
    let smallDuration = 0n;
    let smallUnit = "ms";
    let bigDuration = nanoseconds / 1_000_000n;
    let bigUnit = "ms";

    let seconds = bigDuration / 1_000n;
    if (seconds < 60n) {
        let justSeconds = Number(bigDuration) / 1000;

        return `${justSeconds.toFixed(3)}s`
    }

    smallDuration = bigDuration % 1_000n;
    smallUnit = bigUnit;
    bigDuration = seconds;
    bigUnit = "s";

    for (let unit of ["m", "h"]) {
        if (bigDuration < 60n) {
            break;
        }

        smallDuration = bigDuration % 60n;
        smallUnit = bigUnit;
        bigDuration = bigDuration / 60n;
        bigUnit = unit;
    }

    return `${bigDuration}${bigUnit} ${smallDuration}${smallUnit}`;
}

function urlPath(baseDir, p) {
    let result = path.relative(baseDir, p);
    if (process.platform === "win32") {
        result = result.replace(/\\/g, "/");
    }

    return path.posix.resolve("/", result);
}
