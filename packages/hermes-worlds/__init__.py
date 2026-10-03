"""Draw planted worlds. The scene is the dashboard pane and the Desktop page.

``register()`` is empty on purpose. This package adds no tools, hooks, or
middleware. The catalog pins that fact. Dashboard discovery still reads
``dashboard/manifest.json``.
"""


def register(ctx):
    return None
