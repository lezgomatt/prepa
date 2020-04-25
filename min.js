"use strict";

const fs = require("fs");
const path = require("path");
const csso = require("csso");
const terser = require("terser");
const SVGO = require("svgo");
const utils = require("./utils");

exports.run = async function(directory) {
    let stats = {
        css: { count: 0, ogSize: 0, minSize: 0 },
        js: { count: 0, ogSize: 0, minSize: 0 },
        svg: { count: 0, ogSize: 0, minSize: 0 },
    };

    let svgo = new SVGO.default();

    let startTime = process.hrtime.bigint();

    for (let p of utils.walkDir(directory, { ext: [".css", ".js", ".mjs", ".svg"] })) {
        let ext = path.extname(p);
        let og = fs.readFileSync(p, "utf8");
        let ogSize = fs.statSync(p).size;

        let type, min;
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

        fs.writeFileSync(p, min);

        stats[type].count += 1;
        stats[type].ogSize += ogSize;
        stats[type].minSize += fs.statSync(p).size;
    }

    let endTime = process.hrtime.bigint();
    let hDuration = utils.humanDuration(endTime - startTime);
    console.log(`min: Took ${hDuration} to complete`);

    for (let type of ["css", "js", "svg"]) {
        let ogSize = utils.humanSize(stats[type].ogSize);
        let minSize = utils.humanSize(stats[type].minSize);
        let savings = 100 - (stats[type].ogSize === 0 ? 100 : stats[type].minSize/stats[type].ogSize * 100);
        console.log(`  ${type}: ${ogSize} => ${minSize} (saved ${savings.toFixed(2)}%) -- ${stats[type].count} file(s)`);
    }
}
