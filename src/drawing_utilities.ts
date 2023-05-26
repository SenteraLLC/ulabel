/* 
This file is designed to hold helper functions for drawing to the canvas
*/

import { ULabelAnnotation } from './annotation';
import { VALID_HTML_COLORS } from "./colors";

/**
 * Applies a linear gradient to a color channel based on its confience.
 * 
 * @param {number} color_channel Color channel
 * @param {number} gradient_strength How strong the gradient is
 * @param {number} confidence Confidence of this particular color channel
 * @param {number} maximum_confidence Maximum confidence to apply the gradient up to
 * @returns {string} A color channel in hexadecimal
 */
function apply_gradient_math(
    color_channel: number, 
    gradient_strength: number, // How strong the gradient is. Number between 0-1
    confidence: number,
    maximum_confidence: number
    ): string {
    // Calculate the value of the gradient channel
    const gradient_channel: number = Math.round(((1 - gradient_strength) * (color_channel)) + gradient_strength * 255)

    /* Apply the gradient to the color based on linear gradient from 0 - maximum_confidence, where if the confidence = 0 then the 
       color channel will be 100% the gradient_channel, if the confidence is >= the maximum_confidence the color channel won't 
       have any gradient applied. The confidence values between 0 - maximum_confidence will have the gradient applied linearly. */
    const new_color: number = Math.round((1 - (confidence / maximum_confidence)) * gradient_channel + (confidence / maximum_confidence) * color_channel)

    // Convert the color channel to a hexadecimal string
    let new_color_hex: string = new_color.toString(16)

    // If the value is one digit, pad the front with a 0
    if (new_color_hex.length == 1) {
        new_color_hex = "0" + new_color_hex
    }

    return new_color_hex
}

/**
 * Takes in a hex color i.e. "#D973EA", and applies a gradient to it based on a confidence value.
 * @param color_hex 
 * @param gradient_strength 
 * @param confidence 
 * @param maximum_confidence 
 * @returns 
 */
function apply_gradient(
    color_hex: string,
    gradient_strength: number, 
    confidence: number,
    maximum_confidence: number
): string {
    // Grab individual r g b values from the hex string and convert them to decimal
    let r = parseInt(color_hex.slice(1,3), 16)
    let g = parseInt(color_hex.slice(3,5), 16)
    let b = parseInt(color_hex.slice(5,7), 16)

    // Apply the gradient to the rgb values
    const r_with_gradient = apply_gradient_math(r, gradient_strength, confidence, maximum_confidence)
    const g_with_gradient = apply_gradient_math(g, gradient_strength, confidence, maximum_confidence)
    const b_with_gradient = apply_gradient_math(b, gradient_strength, confidence, maximum_confidence)

    // Concatenate the channels together to form the hex
    return "#" + r_with_gradient + g_with_gradient + b_with_gradient
}

/**
 * Applies a gradient to an annotation_object based on its confidence from the get_annotation_confidence function. If the confidence = 0, 
 * the color will be the gradient color. If the confience is >= maximum_confidence, the color won't be changed. The color will change 
 * linearly between 0 and maximum_confidence
 * 
 * @param {ULabelAnnotation} annotation_object 
 * @param {string} base_color 
 * @param {Function} get_annotation_confidence 
 * @param {number} maximum_confidence 
 * @returns 
 */
export function get_gradient(
    annotation_object: ULabelAnnotation, 
    base_color: string, 
    get_annotation_confidence: Function, 
    maximum_confidence: number) {
        
    // If the gradient toggle is checked off, then don't apply a gradient
    if ($("#gradient-toggle").prop("checked") === false) return base_color

    // Error checking
    if (annotation_object.classification_payloads === null) return base_color
    
    // Get the annotation confidence
    const confidence = get_annotation_confidence(annotation_object)

    // Only apply a gradient when the confidence is less than the maximum_confidence
    if (confidence >= maximum_confidence) return base_color

    // Convert css color keywords to hex strings
    let base_color_hex = color_to_hex(base_color)

    // Strength of the gradient
    const gradient_strength = 0.85
    
    const final_hex = apply_gradient(base_color_hex, gradient_strength, confidence, maximum_confidence)

    // Since hex values should always be a string with length 7, if its not then return the base color just in case.
    if (final_hex.length !== 7) return base_color_hex
    return final_hex
}

/**
 * Takes in a CSS keyword and returns its corresponding color hex.
 * 
 * @param {string} color CSS color keyword or color hex
 * @returns {string} Color hex
 */
export function color_to_hex(color: string) {
    if (color.toLowerCase() in VALID_HTML_COLORS) return VALID_HTML_COLORS[color.toLowerCase()];
    return color;
}