define([
    "dojo/topic",
    "epi/dependency",
    "epi-cms/core/ContentReference",
    "epi-cms/contentediting/PageDataController",
    "epi-cms/widget/overlay/_OverlayItemInfoMixin",
    "episerver-labs-block-enhancements/content-draft-view/command-provider",
    "xstyle/css!episerver-labs-block-enhancements/content-draft-view/styles.css"
], function (
    topic,
    dependency,
    ContentReference,
    PageDataController,
    _OverlayItemInfoMixin,
    CommandProvider
) {
    var isDraftViewEnabled = false;

    function registerCommandProvider() {
        // registers new command provider which contains "Content Draft View" command

        var commandregistry = dependency.resolve("epi.globalcommandregistry");
        commandregistry.registerProvider("epi.cms.globalToolbar", new CommandProvider());
    }

    function patchOverlay() {
        // modify the overlay code so it displays the draft background in Draft View mode

        var originalPostCreate = _OverlayItemInfoMixin.prototype.postCreate;
        _OverlayItemInfoMixin.prototype.postCreate = function () {
            originalPostCreate.apply(this, arguments);

            var _this = this;

            function isDraft () {
                if (_this.params &&
                    _this.params.sourceItemNode &&
                    _this.params.sourceItemNode.dataset &&
                    _this.params.sourceItemNode.dataset.epiBlockId) {
                    var contentReference = new ContentReference(_this.params.sourceItemNode.dataset.epiBlockId);

                    return contentReference.workId;
                }
                return false;
            }

            _this.own(_this.viewModel.watch("contentStatus", function () {
                if (isDraftViewEnabled && isDraft()) {
                    var overlayItemInfo = _this.get("overlayItemInfo");
                    overlayItemInfo.set("class", "epi-overlay-content-invisible");
                }
            }));
        };
    }

    function patchPostMixinProperties() {
        // modify pagedatacontroller

        var originalPostMixInProperties = PageDataController.prototype.postMixInProperties;
        PageDataController.prototype.postMixInProperties = function () {
            originalPostMixInProperties.apply(this, arguments);
            this.own(
                // update the current view when switching to Draft View mode
                topic.subscribe("/epi/setcommondraftview", function (isInDraftView) {
                    if (!this._previewQueryParameters) {
                        this._previewQueryParameters = {};
                    }
                    isDraftViewEnabled = isInDraftView;
                    this._previewQueryParameters.commondrafts = isInDraftView;
                    this._onViewRequireReload();
                }.bind(this)),

                // update the view after inline block action was done
                topic.subscribe("/refresh/ui", function () {
                    this.contentDataStore.refresh(this._currentViewModel.contentLink).then(function () {
                        if (this._previewQueryParameters && this._previewQueryParameters.commondrafts) {
                            this._onViewRequireReload();
                        }
                    }.bind(this));
                }.bind(this)));
        };
    }

    return function () {
        registerCommandProvider();
        patchOverlay();
        patchPostMixinProperties();
    };
});
