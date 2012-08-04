#!/usr/bin/env python
# -*- coding: utf-8 -*-


import sys, os

from flask import Flask, request, jsonify
from database import db_session

PROJECT_ROOT = os.path.normpath(os.path.realpath(os.path.dirname(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from models import Restaurant

app = Flask(__name__)

import uuid

@app.teardown_request
def shutdown_session(exception=None):
    db_session.remove()


@app.route("/", methods=['GET'])
def slash():
    pass

@app.route("/create", methods=['POST'])
def create():
    guid = uuid.uuid1()
    pass

@app.route("/order", methods=['POST'])
def order():
    pass

if __name__ == "__main__":
    app.run(debug=True)


# vim: filetype=python
