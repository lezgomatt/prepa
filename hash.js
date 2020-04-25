"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const utils = require("./utils");

const HashLength = 16;

exports.run = async function(directory) {
    let renames = [];

    let startTime = process.hrtime.bigint();

    for (let ogPath of utils.walkDir(directory)) {
        let ext = path.extname(ogPath);
        if (["", ".htm", ".html", ".json", ".txt", ".xml"].includes(ext)) {
            continue;
        }

        let hash = await computeHash(fs.createReadStream(ogPath));

        let p = path.parse(ogPath);
        let nameParts = p.base.split(".");
        let fullExtension = nameParts.slice(1).join(".");
        let newName = `${nameParts[0]}-${hash}.${fullExtension}`;
        let newPath = path.join(p.dir, newName);

        fs.renameSync(ogPath, newPath);

        renames.push({ og: ogPath, new: newPath });
    }

    let endTime = process.hrtime.bigint();
    let hDuration = utils.humanDuration(endTime - startTime);
    console.log(`hash: Took ${hDuration} to complete`);

    fs.writeFileSync(path.join(directory, "prepa-renames.json"), JSON.stringify(renames, null, 2));
}

async function computeHash(inputStream) {
    let hash = await new Promise((resolve, reject) => {
        let result = crypto.createHash("BLAKE2b512");
        inputStream.on("error", (err) => { reject(err); });
        inputStream.on("data", (chunk) => { result.update(chunk); });
        inputStream.on("end", () => { resolve(result.digest("base64")); });
    });

    return base64Url(hash.slice(0, HashLength));
}

const UrlFriendly = { "+": "-", "/": "_", "=": "" };

function base64Url(base64) {
    return base64.replace(/[+/=]/g, (char) => UrlFriendly[char]);
}
