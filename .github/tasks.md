## Tasks

### Generalize Confidence Slider

- [x] Discuss with the user: Naming options for the new toolbox item.
- [x] Replace all instances of `KeypointSlider` in our demos with the new toolbox item.
- [x] Add confidences to the annotations in the resume-from demo and add a confidence slider to the toolbox.
- [x] Refactor new toolbox item into its own file under src/toolbox_items
- [x] Add support for configurable step size and min/max values for the confidence slider
- [x] Add config options such that users can either enforce, disable, or leave toggleable the multi-class mode for the confidence slider
- [x] Should we raise a warning if a KeypointSlider is used alongside a ConfidenceFilter?
- [ ] Discuss with the user: How could we implement an option to only filter specific classes rather than either all at once or all classes individually? Basically, I want a multi-class option where the user can enable/disable specific classes in the config
- [ ] I notice that if no toolbox order is provided, the Keypoint Slider is included. Can we replace it with a Confidence Slider?
