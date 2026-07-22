/**
 * Type-level tests for the ulabel package.
 * This file is compiled (but not executed) against the packed npm tarball
 * to verify that type declarations are correct and accessible to consumers.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import ULabel, {
    AllowedToolboxItem,
    ULabelAnnotation,
    ULabelSubtask,
    Configuration,
    Toolbox,
    ULabelConstructorArgs,
    ULabelSubmitButton,
    ULabelSubtasks,
} from "ulabel";

// === Static methods return correct types ===

// get_allowed_toolbox_item_enum returns the enum object, not a single value
const toolbox_enum = ULabel.get_allowed_toolbox_item_enum();
const mode_select: AllowedToolboxItem = toolbox_enum.ModeSelect;
const zoom_pan: AllowedToolboxItem = toolbox_enum.ZoomPan;
const brush: AllowedToolboxItem = toolbox_enum.Brush;
const keybinds: AllowedToolboxItem = toolbox_enum.Keybinds;

// get_resize_toolbox_item returns the class (constructor), not an instance
const ResizeItem = ULabel.get_resize_toolbox_item();
const instance = new ResizeItem({} as any);

// version returns a string
const ver: string = ULabel.version();

// === Constructor accepts kwargs object ===

const submit_button: ULabelSubmitButton = {
    name: "Submit",
    hook: (data) => {},
};

const kwargs: ULabelConstructorArgs = {
    container_id: "container",
    image_data: "image.png",
    username: "TestUser",
    submit_buttons: [submit_button],
    subtasks: {} as ULabelSubtasks,
};

// This should compile without error
declare const ulabel: ULabel;

// === Instance methods have correct parameter types ===

// get_annotations takes a string (subtask key), not a ULabelSubtask object
const annotations: ULabelAnnotation[] = ulabel.get_annotations("my_subtask");

// set_annotations takes a string (subtask key), not a ULabelSubtask object
ulabel.set_annotations([], "my_subtask");

// instance version()
const instance_ver: string = ulabel.version();

// === Exported types are accessible ===

const annotation: ULabelAnnotation = {} as ULabelAnnotation;
const subtask: ULabelSubtask = {} as ULabelSubtask;
const config: Configuration = {} as Configuration;
const toolbox: Toolbox = {} as Toolbox;

// === AllowedToolboxItem enum members are accessible ===

const all_items: AllowedToolboxItem[] = [
    AllowedToolboxItem.ModeSelect,
    AllowedToolboxItem.ZoomPan,
    AllowedToolboxItem.AnnotationResize,
    AllowedToolboxItem.AnnotationID,
    AllowedToolboxItem.RecolorActive,
    AllowedToolboxItem.ClassCounter,
    AllowedToolboxItem.KeypointSlider,
    AllowedToolboxItem.SubmitButtons,
    AllowedToolboxItem.FilterDistance,
    AllowedToolboxItem.Brush,
    AllowedToolboxItem.ImageFilters,
    AllowedToolboxItem.AnnotationList,
    AllowedToolboxItem.Keybinds,
    AllowedToolboxItem.ConfidenceFilter,
];
