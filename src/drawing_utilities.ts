/* 
This file is designed to hold all the functions 
required for drawing to the canvas
*/

import { ULabelAnnotation } from './annotation';

/*recieves a base color and applies a gradient to it based on its confidence
The reason for passing in the get confidence function is so that we can apply
a gradient based on diffrent confidence statistics if we choose to do so*/
export function apply_gradient(
    annotation_object: ULabelAnnotation, 
    base_color: string, 
    get_annotation_confidence: Function, 
    gradient_maximum: number) {
        
    //if the gradient toggle is checked off, then don't apply a gradient
    if ($("#gradient-toggle").prop("checked") == false) {
        return base_color
    }

    if (annotation_object.classification_payloads == null) {
        return base_color
    }
    
    const annotation_confidence = get_annotation_confidence(annotation_object)

    //if the annotation confidence is greater than the max gradient endpoint, then
    //don't apply a gradient
    if (annotation_confidence > gradient_maximum) {
        return base_color
    }

    let base_color_hex = color_to_hex(base_color)
    
    //gradient_quantity is how strong you want the gradient to be
    //made it a variable to make it easy to change in the future
    let gradient_quantity = 0.85

    //Have the gradient color be a lightened version of the base color that is gradient_quantity% white
    //and the remaining percent is base color
    //Decimal numbers
    let grad_r = Math.round(((1 - gradient_quantity) * (parseInt(base_color_hex.slice(1,3), 16))) + gradient_quantity * 255)
    let grad_g = Math.round(((1 - gradient_quantity) * (parseInt(base_color_hex.slice(3,5), 16))) + gradient_quantity * 255)
    let grad_b = Math.round(((1 - gradient_quantity) * (parseInt(base_color_hex.slice(5,7), 16))) + gradient_quantity * 255)

    //Grab individual r g b values from the hex string and convert them to decimal
    let r = parseInt(base_color_hex.slice(1,3), 16)
    let g = parseInt(base_color_hex.slice(3,5), 16)
    let b = parseInt(base_color_hex.slice(5,7), 16)

    //Apply a linear gradient based on the confidence
    let new_r = Math.round((1 - (annotation_confidence / gradient_maximum)) * grad_r + (annotation_confidence / gradient_maximum) * r)
    let new_g = Math.round((1 - (annotation_confidence / gradient_maximum)) * grad_g + (annotation_confidence / gradient_maximum) * g)
    let new_b = Math.round((1 - (annotation_confidence / gradient_maximum)) * grad_b + (annotation_confidence / gradient_maximum) * b)

    //Turn the new rgb values to a hexadecimal version
    let new_r_hex = new_r.toString(16)
    let new_g_hex = new_g.toString(16)
    let new_b_hex = new_b.toString(16)

    //If the hex value is a single digit pad the front with a 0 to 
    //ensure its two digits long
    if (new_r_hex.length == 1) {
        new_r_hex = "0" + new_r.toString(16)
    }
    if (new_g_hex.length == 1) {
        new_g_hex = "0" + new_g.toString(16)
    }
    if (new_b_hex.length == 1) {
        new_b_hex = "0" + new_b.toString(16)
    }

    let final_hex = "#".concat(new_r_hex, new_g_hex, new_b_hex)

    //Since hex values should always be a string with length 7, if its not
    //then return the base color just in case.
    if (final_hex.length == 7) {
        return final_hex
    } else {
        return base_color_hex
    }
}

/*takes in a string of any valid css color and returns its hex value
if given string is not a valid css color, returns the string passed in */
export function color_to_hex(color: string) {
    let colors = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",

    "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2",
    "brown":"#a52a2a","burlywood":"#deb887",

    "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed",
    "cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",

    "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400",
    "darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f","darkorange":"#ff8c00","darkorchid":"#9932cc",
    "darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f",
    "darkturquoise":"#00ced1","darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969",
    "dodgerblue":"#1e90ff",

    "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",

    "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000",
    "greenyellow":"#adff2f",

    "honeydew":"#f0fff0","hotpink":"#ff69b4",

    "indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0",

    "khaki":"#f0e68c",

    "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6",
    "lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2","lightgrey":"#d3d3d3","lightgreen":"#90ee90",
    "lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899",
    "lightsteelblue":"#b0c4de","lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",

    "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3",
    "mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee","mediumspringgreen":"#00fa9a",
    "mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1",
    "moccasin":"#ffe4b5",

    "navajowhite":"#ffdead","navy":"#000080",

    "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",

    "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5",
    "peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",

    "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",

    "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d",
    "silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f",
    "steelblue":"#4682b4",

    "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",

    "violet":"#ee82ee",

    "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",

    "yellow":"#ffff00","yellowgreen":"#9acd32"};

    if (typeof colors[color.toLowerCase()] != 'undefined'){
        return colors[color.toLowerCase()];
    }
    return color;
}