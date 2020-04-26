"use strict";

const Buffer = require("buffer").Buffer;
const fs = require("fs");
const path = require("path");
const csso = require("csso");
const terser = require("terser");
const SVGO = require("svgo");
const utils = require("./utils");

exports.run = async function(directory) {
    let stats = {
        css: { count: 0, ogSize: 0, minSize: 0, skip: 0 },
        js: { count: 0, ogSize: 0, minSize: 0, skip: 0 },
        svg: { count: 0, ogSize: 0, minSize: 0, skip: 0 },
    };

    let svgo = new SVGO.default();

    let startTime = process.hrtime.bigint();

    for (let p of utils.walkDir(directory)) {
        let ext = path.extname(p);
        if (![".css", ".js", ".mjs", ".svg"].includes(ext)) {
            continue;
        }

        let og = fs.readFileSync(p, "utf8");
        let ogSize = fs.statSync(p).size;

        let type, min;

        try {
            switch (ext) {
            case ".css":
                type = "css";
                min = csso.minify(og).css;
                break;
            case ".js":
            case ".mjs":
                type = "js";
                min = terser.minify(og).code;
                break;
            case ".svg":
                type = "svg";
                min = (await svgo.optimize(og)).data;
                break;
            }
        } catch (e) {
            console.error(`min: Error minifying "${utils.urlPath(directory, p)}"`);
        }

        if (min == null) {
            min = og;
        }

        if (Buffer.byteLength(min, "utf8") < Buffer.byteLength(og, "utf8")) {
            fs.writeFileSync(p, min);
        } else {
            min = og;
            stats[type].skip += 1;
        }

        stats[type].count += 1;
        stats[type].ogSize += ogSize;
        stats[type].minSize += fs.statSync(p).size;
    }

    let endTime = process.hrtime.bigint();
    let duration = utils.humanDuration(endTime - startTime);
    console.log(`min: Took ${duration} to complete`);

    for (let type of ["css", "js", "svg"]) {
        let ogSize = utils.humanSize(stats[type].ogSize);
        let minSize = utils.humanSize(stats[type].minSize);
        let savings = 100 - (stats[type].ogSize === 0 ? 100 : stats[type].minSize/stats[type].ogSize * 100);
        console.log(`  ${type}: ${ogSize} => ${minSize} (saved ${savings.toFixed(2)}%) -- ${stats[type].count} file(s), skipped ${stats[type].skip} file(s)`);
    }
}
