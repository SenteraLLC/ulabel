# ULabel wheel-zoom uses viewport coords instead of annbox-relative coords

**Package:** `ulabel@0.26.2`
**Impact:** When the ULabel container is not positioned at `(0, 0)` of the
browser viewport — e.g. hosted inside a centered dialog, a padded panel, or
anything below a header — mouse-wheel zoom does not zoom toward the cursor.
The image snaps by an offset roughly equal to the annbox's screen position.

## Root cause

`handle_wheel` in [`src/index.js`](../../ulabel/src/index.js) passes raw
viewport-relative coordinates straight into `rezoom`:

```js
// src/index.js, handle_wheel (~L6646)
this.rezoom(wheel_event.clientX, wheel_event.clientY);
```

but `rezoom` (`src/index.js` ~L6795) treats those two params as **annbox-local**
offsets — it uses them to compute a new scroll position for the annbox:

```js
// non-abs branch, ~L6841
new_left = (old_left + foc_x) * new_width / old_width - foc_x;
new_top  = (old_top  + foc_y) * new_height / old_height - foc_y;
```

`old_left`/`old_top` are annbox scroll offsets, so `foc_x`/`foc_y` need to be
measured from the annbox's top-left. `clientX`/`clientY` are measured from the
viewport's top-left, so the focal point is off by exactly the annbox's screen
position. When the annbox happens to sit at viewport `(0, 0)` the two frames
coincide and the bug is invisible.

## Fix

Convert the wheel event's viewport coordinates to annbox-relative coordinates
before calling `rezoom`. In `handle_wheel`:

```js
// src/index.js, handle_wheel (~L6646) — replace:
this.rezoom(wheel_event.clientX, wheel_event.clientY);

// with:
const annbox = document.getElementById(this.config["annbox_id"]);
const rect = annbox.getBoundingClientRect();
this.rezoom(
    wheel_event.clientX - rect.left,
    wheel_event.clientY - rect.top,
);
```

`getBoundingClientRect` is the right primitive: it accounts for any ancestor
transform / scroll / positioning, so this works regardless of how the host
embeds the ULabel container.

`wheel_event.offsetX`/`offsetY` would be tempting but is unreliable — its origin
is the immediate event target, which for wheels over an annotation overlay
child is *not* the annbox.

## Suggested test

Add a Playwright test (or unit-level DOM test) that:

1. Renders ULabel inside a wrapper offset from the viewport origin
   (e.g. `<div style="padding: 200px 300px">`).
2. Dispatches a `wheel` event with a known `clientX/clientY` over a
   distinguishable image feature (e.g. a corner marker).
3. Asserts that after the zoom, that feature's screen position is unchanged
   (± 1 px). Today it moves by roughly `(300, 200)`.
