#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys, os

from flask import Flask, request, render_template, jsonify
from flaskext.csrf import csrf, csrf_exempt
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
from models import Feast, FeastParticipant, FeastParticipantOrder
from order import charge_order

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
        restaurant_id = 302
        feast = Feast(str(uuid.uuid1()), datetime.datetime.utcnow(), restaurant_id)
        creator = FeastParticipant(form.email.data, 
            hashlib.sha1(bytes(random.random())).hexdigest(), is_creator=True)

        feast.participants = [creator]

        for email in form.invitees.data.split(','):
            participant = FeastParticipant(email, 
                hashlib.sha1(bytes(random.random())).hexdigest())
            feast.participants.append(participant)

        db_session.add(feast)

        api = ordrin.APIs(app.config["ORDRIN_API_KEY"], ordrin.TEST) 
        restaurant = api.restaurant.get_details(restaurant_id)

        return render_template('feast_confirmation.html', feast=feast,
            restaurant=restaurant, form=form)

        try:
            db_session.commit()
            send_feast_invite(app.config["SENDGRID_USERNAME"], 
                app.config["SENDGRID_PASSWORD"],
                app.config["ORDRIN_API_KEY"], feast)

            api = ordrin.APIs(app.config["ORDRIN_API_KEY"], ordrin.TEST) 
            restaurant = api.restaurant.get_details(restaurant_id)

            return render_template('feast_confirmation.html', feast=feast,
                restaurant=restaurant, form=form)
        except Exception as e:
            print e

    return render_template('create.html', form=form)


@app.route('/<regex("[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}"):feast_guid>/<regex("[a-zA-Z0-9]{40}"):hash>')
def feast(feast_guid, hash):
    feast = Feast.query.filter_by(guid=feast_guid).first()
    if feast: 
        participant = [x for x in feast.participants if x.hash == hash]

        if participant:
            api = ordrin.APIs(app.config["ORDRIN_API_KEY"], ordrin.TEST) 
            restaurant = api.restaurant.get_details(feast.restaurant_id)

            order = FeastParticipantOrder.query.filter_by(participant_id=participant[0].id).first()

            if order:
                return render_template('order_summary.html', feast=feast,
                    participant=participant[0], restaurant=restaurant)
            else:
                return render_template('feast.html', feast=feast,
                    participant=participant[0], restaurant=restaurant)


@app.route("/delivery", methods=['POST'])
def delivery():
    api = ordrin.APIs(app.config["ORDRIN_API_KEY"], ordrin.TEST) 
    address = ordrin.data.Address(
        request.form["addr"], 
        request.form["city"], 
        'NY',
        request.form["zip"], '0123456789')
    
    future_datetime = datetime.datetime.now() + datetime.timedelta(hours=12)
    return jsonify(api.restaurant.get_delivery_list(future_datetime, address))


@app.route("/submit_order", methods=['POST'])
def submit_order():
    api = ordrin.APIs(app.config["ORDRIN_API_KEY"], ordrin.TEST) 
    address = request.form["address"]
    future_datetime = datetime.datetime.now() + datetime.timedelta(hours=12) 
    return api.restaurant.get_delivery_list(future_datetime, address)


@app.route("/order", methods=['POST'])
def order():
    cc_number = request.form['cc_number']
    cc_exp_date = request.form['cc_exp_date']
    cc_cvv = request.form['cc_cvv']
    tray_string = request.form['tray_string']
    tray_amount = request.form['tray_amount']

    if (charge_order(
        app.config["BRAINTREE_MERCHANT_ID"],
        app.config["BRAINTREE_PUBLIC_KEY"],
        app.config["BRAINTREE_PRIVATE_KEY"],
        cc_number, tray_amount, cc_exp_date)):
        feast_guid = request.form['guid']
        hash = request.form['hash']
        feast = Feast.query.filter_by(guid=feast_guid).first()

        if feast: 
            participant = [x for x in feast.participants if x.hash == hash]

            if participant:
                order = FeastParticipantOrder(participant[0].id, tray_string, tray_amount)
                db_session.add(order)
                try:
                    db_session.commit()
                    return render_template('order_confirmation.html')
                except Exception as e:
                    print e


if __name__ == "__main__":
    app.run(debug=True)
    init_db()


# vim: filetype=python
