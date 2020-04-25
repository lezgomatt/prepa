"use strict";

const fs = require("fs");
const zlib = require("zlib");
const utils = require("./utils");

const TextExtensions = [".css", ".htm", ".html", ".js", ".json", ".mjs", ".txt", ".xml"];

exports.run = async function(directory) {
    let stats = {
        og: { count: 0, size: 0 },
        gz: { count: 0, size: 0 },
        br: { count: 0, size: 0 },
    };
    
    let startTime = process.hrtime.bigint();

    for (let path of utils.walkDir(directory, { ext: TextExtensions })) {
        let size = fs.statSync(path).size;
        stats.og.count += 1;
        stats.og.size += size;

        let [gzSize, brSize] = await Promise.all([makeGzip(path, size), makeBrotli(path, size)]);

        if (gzSize != null) {
            stats.gz.count += 1;
            stats.gz.size += gzSize;
        } else {
            stats.gz.size += size;
        }
        
        if (brSize != null) {
            stats.br.count += 1;
            stats.br.size += brSize;
        } else {
            stats.br.size += size;
        }
    }

    let endTime = process.hrtime.bigint();
    let hDuration = utils.humanDuration(endTime - startTime);
    console.log(`zip: Took ${hDuration} to complete`);

    let ogSize = utils.humanSize(stats.og.size);
    console.log(`  original: ${ogSize}, ${stats.og.count} text file(s)`);

    for (let [name, type] of [["gzip", "gz"], ["brotli", "br"]]) {
        let size = utils.humanSize(stats[type].size);
        let savings = 100 - (stats.og.size === 0 ? 100 : stats[type].size/stats.og.size * 100);
        let skip = stats.og.count - stats[type].count;
        console.log(`  ${name}: ${size} (saved ${savings.toFixed(2)}%), skipped ${skip} file(s)`);
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
                resolve(null);
            }
            
            resolve(gzSize);
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
                resolve(null);
            }
            
            resolve(brSize);
        });
    });
}
