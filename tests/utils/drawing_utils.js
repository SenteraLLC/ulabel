/**
 * Draw a bounding box and return its spatial payload.
 *
 * @param {*} page
 * @param {[number, number]} top_left
 * @param {[number, number]} bottom_right
 * @returns {Promise<[[number, number], [number, number]]>} The bbox spatial payload in image coordinates.
 */
export async function draw_bbox(page, top_left, bottom_right) {
    // Switch to bbox mode
    await page.click("a#md-btn--bbox");

    // Mouse down at starting point
    await page.mouse.move(top_left[0], top_left[1]);
    await page.mouse.down();
    // Drag to bottom right point
    await page.mouse.move(bottom_right[0], bottom_right[1]);
    await page.mouse.up();

    // Convert coordinates to image space
    return await page.evaluate(([tl, br]) => {
        const topLeft = window.ulabel.get_image_aware_mouse_x_y(
            { pageX: tl[0], pageY: tl[1] },
        );
        const bottomRight = window.ulabel.get_image_aware_mouse_x_y(
            { pageX: br[0], pageY: br[1] },
        );
        return [topLeft, bottomRight];
    }, [top_left, bottom_right]);
}

/**
 * Draw a point and return its spatial payload.
 * @param {*} page
 * @param {[number, number]} position
 * @returns {Promise<[[number, number]]>} The point spatial payload in image coordinates.
 */
export async function draw_point(page, position) {
    // Switch to point mode
    await page.click("a#md-btn--point");
    // Click at the specified position
    await page.mouse.click(position[0], position[1]);
    // Convert coordinates to image space
    return await page.evaluate(([pos]) => {
        const point = window.ulabel.get_image_aware_mouse_x_y(
            { pageX: pos[0], pageY: pos[1] },
        );
        return [point];
    }, [position]);
}
