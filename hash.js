"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const utils = require("./utils");

exports.run = async function(directory, fixRefs) {
    let renames = Object.create(null);

    let startTime = process.hrtime.bigint();

    for (let ogPath of utils.walkDir(directory)) {
        let ext = path.extname(ogPath);
        if (["", ".css", ".htm", ".html", ".json", ".txt", ".xml"].includes(ext)) {
            continue;
        }

        let newPath = await computeHash(ogPath);
        fs.renameSync(ogPath, newPath);
        renames[utils.urlPath(directory, ogPath)] = utils.urlPath(directory, newPath);
    }

    for (let ogPath of utils.walkDir(directory)) {
        let ext = path.extname(ogPath);
        if (ext !== ".css") {
            continue;
        }

        if (fixRefs) {
            let css = fs.readFileSync(ogPath, "utf8");
            let cssDir = path.posix.dirname(utils.urlPath(directory, ogPath));
    
            try {
                fs.writeFileSync(ogPath, fixCssRefs(css, cssDir, renames));
            } catch (e) {
                console.error(`hash: Error replacing refs for "${utils.urlPath(directory, ogPath)}"`);
            }
        }

        let newPath = await computeHash(ogPath);
        fs.renameSync(ogPath, newPath);
        renames[utils.urlPath(directory, ogPath)] = utils.urlPath(directory, newPath);
    }

    if (fixRefs) {
        for (let p of utils.walkDir(directory)) {
            let ext = path.extname(p);
            if (![".htm", ".html"].includes(ext)) {
                continue;
            }

            let html = fs.readFileSync(p, "utf8");
            let htmlDir = path.posix.dirname(utils.urlPath(directory, p));

            try {
                fs.writeFileSync(p, fixHtmlRefs(html, htmlDir, renames));
            } catch (e) {
                console.error(`hash: Error replacing refs for "${utils.urlPath(directory, p)}"`);
            }
        }
    }

    let endTime = process.hrtime.bigint();
    let duration = utils.humanDuration(endTime - startTime);
    console.log(`hash: Took ${duration} to complete`);

    if (!fixRefs) {
        fs.writeFileSync(path.join(process.cwd(), "prepa-renames.json"), JSON.stringify(renames, null, 2));
    }
}

const HtmlRefPatt = /(<[^/][^>]*\s(href|src)\s*=\s*)(("[^"]*")|('[^']*'))/mg;
const SrcsetPatt = /(<[^/][^>]*\s(srcset)\s*=\s*)(("[^"]*")|('[^']*'))/mg;

function fixHtmlRefs(html, htmlDir, renames) {
    html = html.replace(HtmlRefPatt, (match, prefix, attr, quotedVal, dQuote, sQuote) => {
        let val = quotedVal.slice(1, quotedVal.length - 1).trim();

        return `${prefix}"${fixUrl(val, htmlDir, renames)}"`;
    });

    html = html.replace(SrcsetPatt, (match, prefix, attr, quotedVal, dQuote, sQuote) => {
        let val = quotedVal.slice(1, quotedVal.length - 1).trim();

        let newSrcset = val
            .split(/\s*,\s*/)
            .map(src => src.replace(/^\S+/, (url) => fixUrl(url, htmlDir, renames)))
            .join(", ")
        ;

        return `${prefix}"${newSrcset}"`;
    });

    return html;
}

const CssRefPatt = /url\(\s*(("[^"]+")|('[^']+')|([^\)]+))\s*\)/g;

function fixCssRefs(css, cssDir, renames) {
    return css.replace(CssRefPatt, (match, quotedVal, dQuote, sQuote, quoteless) => {
        let val = quoteless != null ? quoteless.trim() : quotedVal.slice(1, quotedVal.length - 1);

        return `url("${fixUrl(val, cssDir, renames)}")`;
    });
}

const UrlPatt = /^(.+:)?([^?#]*)((\?[^#]*)?(#.*)?)$/;

function fixUrl(url, dir, renames) {
    let [match, scheme, refPath, suffix, query, fragment] = url.match(UrlPatt);

    if (scheme != null) {
        return url;
    }

    let decPath = refPath.split("/").map(c => decodeURIComponent(c)).join("/")
    let ogPath = path.posix.resolve(dir, decPath);

    if (!(ogPath in renames)) {
        return url;
    }

    let newPath = (refPath[0] === "/") ? renames[ogPath] : path.posix.relative(dir, renames[ogPath]);
    let encPath = newPath.split("/").map(c => encodeURIComponent(c)).join("/");

    return encPath + suffix;
}

const HashLength = 16;

async function computeHash(filePath) {
    let inputStream =fs.createReadStream(filePath);

    let hash = await new Promise((resolve, reject) => {
        let result = crypto.createHash("BLAKE2b512");
        inputStream.on("error", (err) => { reject(err); });
        inputStream.on("data", (chunk) => { result.update(chunk); });
        inputStream.on("end", () => { resolve(result.digest("base64")); });
    });

    hash = base64Url(hash.slice(0, HashLength));

    let p = path.parse(filePath);
    let nameParts = p.base.split(".");
    let fullExtension = nameParts.slice(1).join(".");
    let newName = `${nameParts[0]}-${hash}.${fullExtension}`;
    let newPath = path.join(p.dir, newName);

    return newPath;
}

const UrlFriendly = { "+": "-", "/": "_", "=": "" };

function base64Url(base64) {
    return base64.replace(/[+/=]/g, (char) => UrlFriendly[char]);
}
