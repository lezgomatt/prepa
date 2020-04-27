#!/usr/bin/env node

"use strict";

const fs = require("fs");
const min = require("./min");
const hash = require("./hash");
const zip = require("./zip");

process.title = "prepa";

let args = process.argv.slice(2);

let cmd = null;
let flag = null;
let dir = null;

function help() {
    const lines = [
        "Usage: prepa <command> --replace <directory>",
        "",
        "Flags:",
        "  --replace  Replace files in the directory (required to prevent accidents)",
        "",
        "Commands:",
        "  go         Run min, hash, and zip in one go",
        "  min        Minify assets",
        "  hash       Fingerprint assets",
        "  rename     Like `hash` but without fixing references",
        "  zip        Precompress assets",
    ];

    for (let line of lines) {
        console.error(line);
    }
}

if (args.length <= 0) {
    help();
    process.exit(1);
} else {
    cmd = args[0];
}

if (!["go", "min", "hash", "rename", "zip"].includes(cmd)) {
    console.error(`Unrecognized command: ${cmd}`);
    process.exit(1);
}

if (args.length <= 1 || !args[1].startsWith("-")) {
    console.error("Missing required flag: --replace");
    process.exit(1);
} else {
    flag = args[1];
}

if (flag !== "--replace") {
    console.error(`Unrecognized flag: ${flag}`);
    process.exit(1);    
}

if (args.length <= 2) {
    console.error("Missing directory");
    process.exit(1);
} else {
    dir = args[2];
}

if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`Invalid directory: ${dir}`);
    process.exit(1);
}

if (args.length > 3) {
    console.error(`Unexpected arguments after the directory`);
    process.exit(1);
}

switch (cmd) {
case "go":
    go(dir);
    break;
case "min":
    min.run(dir);
    break;
case "hash":
    hash.run(dir, true);
    break;
case "rename":
    hash.run(dir, false);
    break;
case "zip":
    zip.run(dir);
    break;
}

async function go(dir) {
    await min.run(dir);
    await hash.run(dir);
    await zip.run(dir);
}
