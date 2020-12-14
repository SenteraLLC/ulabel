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
        <div id="browse-table">
            <div id="c1-list" class="bt-list">
                <div id="c1-header" class="cell header-cell">Collections</div>
                <div id="c1-list-content" class="list-content">
                    <div class="bt-loader"><div class="ball-scale-multiple"><div></div><div></div><div></div></div></div>
                </div>
            </div><!--
            --><div id="c2-list" class="bt-list">
                <div id="c2-header" class="cell header-cell waiting">Annotation Jobs</div>
                <div id="c2-list-content" class="list-content">
                    <div class="bt-waiting">Please select from Collections</div>
                </div>
            </div><!--
            --><div id="c3-list" class="bt-list">
                <div id="c3-header" class="cell header-cell waiting">Annotation Tasks</div>
                <div id="c3-list-content" class="list-content">
                    <div class="bt-waiting">Please select from Annotation Jobs</div>
                </div>
            </div>
        </div>
    </div>
{% endblock %}