import sendgrid
import ordrin
from jinja2 import Environment, PackageLoader
from flask import render_template 


def send_feast_invite(sendgrid_username, 
    sendgrid_password, ordrin_api_key, feast):

    s = sendgrid.Sendgrid(sendgrid_username, sendgrid_password, secure=True)
    creator = [x for x in feast.participants if x.is_creator]

    if creator:

        api = ordrin.APIs(ordrin_api_key, ordrin.TEST) 
        restaurant = api.restaurant.get_details(feast.restaurant_id)

        for participant in feast.participants:
            context = {
                'name': participant.email,
                'creator': creator[0].email,
                'start_date': feast.feast_date,
                'invite_link':
                "http://localhost:5000/{0}/{1}".format(feast.guid, participant.hash),
                'restaurant': restaurant
            }

            rendered_email = render_template('email/invite.html', **context)
            message = sendgrid.Message(creator[0].email, 
                "You've been feasted!", rendered_email)
            message.add_to(participant.email)
            s.web.send(message)
