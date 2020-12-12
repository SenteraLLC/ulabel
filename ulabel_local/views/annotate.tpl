{% extends 'base.tpl' %}

{% block title %}Annotate | {% parent %}{% endblock %}

{% block head %}
    {% parent %}
    <link rel="stylesheet" href="/ulabel/ulabel.css">
    <script src="/ulabel/ulabel.js"></script>
    <script src="/public/js/annotate.js"></script>
{% endblock %}

{% block content %}
    {% parent %}
    <div id="container" style="width: 100%; height: 100vh; position: absolute; top: 0; left: 0;"></div>
{% endblock %}