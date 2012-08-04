#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys, os

from flask import Flask, request, render_template
from werkzeug.routing import BaseConverter
from database import db_session

PROJECT_ROOT = os.path.normpath(os.path.realpath(os.path.dirname(__file__)))
sys.path.insert(0, PROJECT_ROOT)

app = Flask(__name__)
app.config.from_envvar('FRIENDLY_FEAST_SETTINGS')

class RegexConverter(BaseConverter):
    def __init__(self, url_map, *items):
        super(RegexConverter, self).__init__(url_map)
        self.regex = items[0]

app.url_map.converters['regex'] = RegexConverter

import uuid
import datetime
import hashlib
import random

import ordrin
from database import db_session, init_db
from invite import send_feast_invite
from forms import FeastForm
from models import Feast, FeastParticipant

import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

@app.teardown_request
def shutdown_session(exception=None):
    db_session.remove()


@app.route("/", methods=['GET','POST'])
def create():
    form = FeastForm(request.form, csrf_enabled=False)
    if form.validate_on_submit():
        feast = Feast(str(uuid.uuid1()), datetime.datetime.utcnow(), 302)
        creator = FeastParticipant(form.email.data, 
            hashlib.sha1(bytes(random.random())).hexdigest(), is_creator=True)

        feast.participants = [creator]

        for email in form.invitees.data.split(','):
            participant = FeastParticipant(email, 
                hashlib.sha1(bytes(random.random())).hexdigest())
            feast.participants.append(participant)

        db_session.add(feast)

        try:
            db_session.commit()
            send_feast_invite(app.config["SENDGRID_USERNAME"], 
                app.config["SENDGRID_PASSWORD"],
                app.config["ORDRIN_API_KEY"], feast)
        except Exception as e:
            pass

    return render_template('create.html', form=form)


@app.route('/<regex("[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}"):feast_guid>/<regex("[a-zA-Z0-9]{40}"):hash>')
def feast(feast_guid, hash):
    feast = Feast.query.filter_by(guid=feast_guid).first()
    if feast: 
        participant = [x for x in feast.participants if x.hash == hash]

        if participant:
            api = ordrin.APIs(app.config["ORDRIN_API_KEY"], ordrin.TEST) 
            restaurant = api.restaurant.get_details(feast.restaurant_id)
            return render_template('feast.html', feast=feast,
                participant=participant[0], restaurant=restaurant)


@app.route("/order", methods=['POST'])
def order():
    print request.data
    return render_template('thankyou.html')


@app.route("/delivery", methods=['POST'])
def delivery():
    api = ordrin.APIs(app.config["ORDRIN_API_KEY"], ordrin.TEST) 
    address = request.form["address"]
    future_datetime = datetime.datetime.now() + datetime.timedelta(hours=12) 
    return api.restaurant.get_delivery_list(future_datetime, address)


if __name__ == "__main__":
    app.run(debug=True)
    init_db()


# vim: filetype=python
