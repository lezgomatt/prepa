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

        let min;
        switch (ext) {
        case ".css":
            min = csso.minify(og).css;
            fs.writeFileSync(p, min);

            stats.css.count += 1;
            stats.css.ogSize += ogSize;
            stats.css.minSize += fs.statSync(p).size;
            break;
        case ".js":
        case ".mjs":
            min = terser.minify(og).code;
            fs.writeFileSync(p, min);

            stats.js.count += 1;
            stats.js.ogSize += ogSize;
            stats.js.minSize += fs.statSync(p).size;
            break;
        case ".svg":
            min = (await svgo.optimize(og)).data;
            fs.writeFileSync(p, min);

            stats.svg.count += 1;
            stats.svg.ogSize += ogSize;
            stats.svg.minSize += fs.statSync(p).size;
            break;
        }
    }

    let endTime = process.hrtime.bigint();
    let hDuration = utils.humanDuration(endTime - startTime);
    console.log(`min: Took ${hDuration} to complete`);

    let cssOgHSize = utils.humanSize(stats.css.ogSize);
    let cssMinHSize = utils.humanSize(stats.css.minSize);
    let cssMinRatio = (stats.css.minSize/stats.css.ogSize * 100).toFixed(2);
    console.log(`  css: ${cssOgHSize} => ${cssMinHSize} (${cssMinRatio}% of original) -- ${stats.css.count} file(s)`);

    let jsOgHSize = utils.humanSize(stats.js.ogSize);
    let jsMinHSize = utils.humanSize(stats.js.minSize);
    let jsMinRatio = (stats.js.minSize/stats.js.ogSize * 100).toFixed(2);
    console.log(`  js: ${jsOgHSize} => ${jsMinHSize} (${jsMinRatio}% of original) -- ${stats.js.count} file(s)`);

    let svgOgHSize = utils.humanSize(stats.svg.ogSize);
    let svgMinHSize = utils.humanSize(stats.svg.minSize);
    let svgMinRatio = (stats.svg.minSize/stats.svg.ogSize * 100).toFixed(2);
    console.log(`  svg: ${svgOgHSize} => ${svgMinHSize} (${svgMinRatio}% of original) -- ${stats.svg.count} file(s)`);
}
