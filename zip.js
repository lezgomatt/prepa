"use strict";

const fs = require("fs");
const zlib = require("zlib");
const utils = require("./utils");

const TextExtensions = [".css", ".htm", ".html", ".js", ".json", ".mjs", ".txt", ".xml"];

exports.run = async function(directory) {
    for (let path of utils.walkDir(directory, { ext: TextExtensions })) {
        let size = fs.statSync(path).size;
        await Promise.all([makeGzip(path, size), makeBrotli(path, size)]);
    }
}

function makeGzip(ogPath, ogSize) {
    let gzPath = ogPath + ".gz";
    let gzInput = fs.createReadStream(ogPath);
    let gzOutput = fs.createWriteStream(gzPath);

    let compressor = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

    gzInput.pipe(compressor).pipe(gzOutput);

    return new Promise((resolve) => {
        gzOutput.on("close", () => {
            let gzSize = fs.statSync(gzPath).size;
        
            if (gzSize > ogSize) {
                fs.unlinkSync(gzPath);
            }
            
            resolve();
        });
    });
}

function makeBrotli(ogPath, ogSize) {
    let brPath = ogPath + ".br";
    let brInput = fs.createReadStream(ogPath);
    let brOutput = fs.createWriteStream(brPath);

    let compressor = zlib.createBrotliCompress({
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: ogSize,
    });

    brInput.pipe(compressor).pipe(brOutput);

    return new Promise((resolve) => {
        brOutput.on("close", () => {
            let brSize = fs.statSync(brPath).size;
        
            if (brSize > ogSize) {
                fs.unlinkSync(brPath);
            }
            
            resolve();
        });
    });
}
