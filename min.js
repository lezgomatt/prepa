"use strict";

const fs = require("fs");
const path = require("path");
const csso = require("csso");
const terser = require("terser");
const SVGO = require("svgo");
const utils = require("./utils");

exports.run = async function(directory) {
    let svgo = new SVGO.default();

    for (let p of utils.walkDir(directory, { ext: [".css", ".js", ".mjs", ".svg"] })) {
        let ext = path.extname(p);
        let og = fs.readFileSync(p, "utf8");

        let min = null;
        switch (ext) {
        case ".css":
            min = csso.minify(og).css;
            break;
        case ".js":
        case ".mjs":
            min = terser.minify(og).code;
            break;
        case ".svg":
            min = (await svgo.optimize(og)).data;
            break;
        }

        fs.writeFileSync(p, min);
    }
}
