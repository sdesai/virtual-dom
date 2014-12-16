var h = require("./index.js")

// http://www.w3.org/TR/SVGTiny12/attributeTable.html
var svgAttributes = {
    "about": true,
    "accent-height": true,
    "accumulate": true,
    "additive": true,
    "alphabetic": true,
    "arabic-form": true,
    "ascent": true,
    "attributeName": true,
    "attributeType": true,
    "bandwidth": true,
    "baseProfile": true,
    "bbox": true,
    "begin": true,
    "by": true,
    "calcMode": true,
    "cap-height": true,
    "class": true,
    "content": true,
    "contentScriptType": true,
    "cx": true,
    "cy": true,
    "d": true,
    "datatype": true,
    "defaultAction": true,
    "descent": true,
    "dur": true,
    "editable": true,
    "end": true,
    "ev:event": true,
    "event": true,
    "externalResourcesRequired": true,
    "fill": true,
    "focusHighlight": true,
    "focusable": true,
    "font-family": true,
    "font-stretch": true,
    "font-style": true,
    "font-variant": true,
    "font-weight": true,
    "from": true,
    "g1": true,
    "g2": true,
    "glyph-name": true,
    "gradientUnits": true,
    "handler": true,
    "hanging": true,
    "height": true,
    "horiz-adv-x": true,
    "horiz-origin-x": true,
    "id": true,
    "ideographic": true,
    "initialVisibility": true,
    "k": true,
    "keyPoints": true,
    "keySplines": true,
    "keyTimes": true,
    "lang": true,
    "mathematical": true,
    "max": true,
    "mediaCharacterEncoding": true,
    "mediaContentEncodings": true,
    "mediaSize": true,
    "mediaTime": true,
    "min": true,
    "nav-down": true,
    "nav-down-left": true,
    "nav-down-right": true,
    "nav-left": true,
    "nav-next": true,
    "nav-prev": true,
    "nav-right": true,
    "nav-up": true,
    "nav-up-left": true,
    "nav-up-right": true,
    "observer": true,
    "offset": true,
    "origin": true,
    "overlay": true,
    "overline-position": true,
    "overline-thickness": true,
    "panose-1": true,
    "path": true,
    "pathLength": true,
    "phase": true,
    "playbackOrder": true,
    "points": true,
    "preserveAspectRatio": true,
    "propagate": true,
    "property": true,
    "r": true,
    "rel": true,
    "repeatCount": true,
    "repeatDur": true,
    "requiredExtensions": true,
    "requiredFeatures": true,
    "requiredFonts": true,
    "requiredFormats": true,
    "resource": true,
    "restart": true,
    "rev": true,
    "role": true,
    "rotate": true,
    "rx": true,
    "ry": true,
    "slope": true,
    "snapshotTime": true,
    "stemh": true,
    "stemv": true,
    "strikethrough-position": true,
    "strikethrough-thickness": true,
    "syncBehavior": true,
    "syncBehaviorDefault": true,
    "syncMaster": true,
    "syncTolerance": true,
    "syncToleranceDefault": true,
    "systemLanguage": true,
    "target": true,
    "timelineBegin": true,
    "to": true,
    "transform": true,
    "transformBehavior": true,
    "type": true,
    "typeof": true,
    "u1": true,
    "u2": true,
    "underline-position": true,
    "underline-thickness": true,
    "unicode": true,
    "unicode-range": true,
    "units-per-em": true,
    "values": true,
    "version": true,
    "viewBox": true,
    "width": true,
    "widths": true,
    "x": true,
    "x-height": true,
    "x1": true,
    "x2": true,
    "xlink:actuate": true,
    "xlink:arcrole": true,
    "xlink:href": true,
    "xlink:role": true,
    "xlink:show": true,
    "xlink:title": true,
    "xlink:type": true,
    "xml:base": true,
    "xml:id": true,
    "xml:lang": true,
    "xml:space": true,
    "y": true,
    "y1": true,
    "y2": true,
    "zoomAndPan": true
}

var SVG_NAMESPACE = "http://www.w3.org/2000/svg"

module.exports = svg

function svg(tagName, properties, children) {
    if (!children && isChildren(properties)) {
        children = properties
        properties = {}
    }

    properties = properties || {}

    // set namespace for svg
    properties.namespace = SVG_NAMESPACE

    var attributes = properties.attributes || (properties.attributes = {})

    for (var key in properties) {
        if (!properties.hasOwnProperty(key)) {
            continue
        }

        if (svgAttributes[key] !== true) {
            continue
        }

        var value = properties[key]
        if (typeof value !== "string" &&
            typeof value !== "number" &&
            typeof value !== "boolean"
        ) {
            continue
        }

        attributes[key] = value
    }

    return h(tagName, properties, children)
}

function isChildren(x) {
    return typeof x === "string" || Array.isArray(x)
}
