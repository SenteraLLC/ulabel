<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>{% block title %}ULabel{% endblock %}</title>
    <link rel="icon" href="/public/media/Favicon.png" sizes="192x192" />

    {% block head %}
    <link rel="stylesheet" href="/public/css/base.css">
    <script
        src="https://code.jquery.com/jquery-3.5.1.min.js"
        integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0="
        crossorigin="anonymous"></script>
    {% endblock %}
</head>
<body>
    <div id="header">
        <div id="header-content">
            <div id="header-left">
                <a href="/" id="header-logo">ULabel</a>
            </div>
            <div id="header-right">
                <a href="https://github.com/SenteraLLC/ULabel/">View on GitHub</a>
            </div>
        </div>
    </div>

    {% block content %}{% endblock %}
</body>
</html>