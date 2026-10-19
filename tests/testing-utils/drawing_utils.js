/**
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Draw a bounding box and return its spatial payload.
 *
 * @param {Page} page
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
        const top_left = window.ulabel.get_image_aware_mouse_x_y(
            { pageX: tl[0], pageY: tl[1] },
        );
        const bottom_right = window.ulabel.get_image_aware_mouse_x_y(
            { pageX: br[0], pageY: br[1] },
        );
        return [top_left, bottom_right];
    }, [top_left, bottom_right]);
}

/**
 * Draw a point and return its spatial payload.
 * @param {Page} page
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

/**
 * Draw a polygon and return its spatial payload.
 *
 * @param {Page} page
 * @param {[number, number][]} points
 * @returns {Promise<[ [number, number][] ]>} The polygon spatial payload in image coordinates.
 */
export async function draw_polygon(page, points) {
    // Switch to polygon mode
    await page.click("a#md-btn--polygon");

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        await page.mouse.move(point[0], point[1]);
        await page.mouse.click(point[0], point[1]);
    }

    // Close the polygon
    await page.click(".ender_outer");
    await page.waitForTimeout(200);

    // Convert coordinates to image space
    // Polygon spatial payload is an array of layers, where each layer has points with first/last duplicated
    return await page.evaluate((pts) => {
        const image_points = pts.map((pt) =>
            window.ulabel.get_image_aware_mouse_x_y(
                { pageX: pt[0], pageY: pt[1] },
            ),
        );
        // Duplicate the first point at the end to close the polygon (ulabel format)
        image_points.push([...image_points[0]]);
        return [image_points];
    }, points);
}

/**
 * Draw a polyline and return its spatial payload.
 *
 * @param {Page} page
 * @param {[number, number][]} points
 * @returns {Promise<[ [number, number][] ]>} The polyline spatial payload in image coordinates.
 */
export async function draw_polyline(page, points) {
    // Switch to polyline mode
    await page.click("a#md-btn--polyline");

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        await page.mouse.move(point[0], point[1]);
        await page.mouse.click(point[0], point[1]);
    }

    // Finish the polyline by right clicking in place
    await page.mouse.click(points[points.length - 1][0], points[points.length - 1][1], { button: "right" });
    await page.waitForTimeout(200);

    // Convert coordinates to image space
    return await page.evaluate((pts) => {
        const image_points = pts.map((pt) =>
            window.ulabel.get_image_aware_mouse_x_y(
                { pageX: pt[0], pageY: pt[1] },
            ),
        );
        return [image_points];
    }, points);
}
