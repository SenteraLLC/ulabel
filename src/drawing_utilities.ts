/* 
This file is designed to hold all the functions 
required for drawing to the canvas
*/

import { ULabelAnnotation } from './annotation';
import { VALID_HTML_COLORS } from "./colors";

/* Receives a base color and applies a gradient to it based on its confidence
The reason for passing in the get confidence function is so that we can apply
a gradient based on diffrent confidence statistics if we choose to do so. */
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
    if (color.toLowerCase() in VALID_HTML_COLORS){
        return VALID_HTML_COLORS[color.toLowerCase()];
    }
    return color;
}