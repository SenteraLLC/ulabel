{% extends 'base.tpl' %}

{% block title %}Browse | {% parent %}{% endblock %}

{% block head %}
    {% parent %}
    <link rel="stylesheet" href="/public/css/browse.css">
    <script src="/public/js/browse.js"></script>
{% endblock %}

{% block content %}
    {% parent %}
    <div id="browse-content">
        <div id="browse-message-center">
            <p id="loading-message" class="message lvl-info">Loading collections...</p>
        </div>
        <div id="options-pane">
            <a id="create-job-opt" class="op-opt">Create Annotation Job</a>
            <a id="annotate-opt" class="op-opt">Annotate</a>
            <a id="edit-opt" class="op-opt">Edit</a>
        </div>
        <div id="filter-pane">
            <div id="filter-container">
                <a href="#" id="submit-filters">Filter</a>
            </div>
        </div><!--
        --><div id="results-pane">
            <div id="table-container">
                <div id="browse-table">
                    <div id="c1-list" class="bt-list">
                        <div id="c1-header" class="cell header-cell">Collections</div>
                        <div id="c1-list-content" class="list-content">
                            <div class="bt-loader"><div class="ball-scale-multiple"><div></div><div></div><div></div></div></div>
                        </div>
                    </div><!--
                    --><div id="c2-list" class="bt-list">
                        <div id="c2-header" class="cell header-cell waiting">Images</div>
                        <div id="c2-list-content" class="list-content">
                            <div class="bt-waiting">Please select from Collections</div>
                        </div>
                    </div><!--
                    --><div id="c3-list" class="bt-list">
                        <div id="c3-header" class="cell header-cell waiting">Annotation Tasks</div>
                        <div id="c3-list-content" class="list-content">
                            <div class="bt-waiting">Please select from Images</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{% endblock %}