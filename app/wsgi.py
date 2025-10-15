"""WSGI entrypoint for Gunicorn.

This module performs any early runtime bootstrapping required for the
worker environment (for example eventlet monkey-patching) then exposes the
Flask WSGI application object as ``app`` so servers like Gunicorn can use
``app.wsgi:app`` as their target.
"""

try:
    import eventlet

    eventlet.monkey_patch()
except Exception:
    pass

from .app import app

__all__ = ["app"]
