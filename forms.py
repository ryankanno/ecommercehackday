from flask.ext.wtf import Form, TextField, SelectField, TextAreaField, Required


class FeastSelectField(SelectField):
    def __init__(self, *args, **kwargs):
        super(FeastSelectField, self).__init__(*args, **kwargs)

    def pre_validate(self, form):
        pass 

AM_HOURS = [("{0}:00 AM".format(x), "{0}:00 AM".format(x))
    for x in xrange(1, 12)] 
AM_HOURS.insert(0, ("12:00 AM", "12:00 AM"))

PM_HOURS = [("{0}:00 PM".format(x), "{0}:00 PM".format(x))
    for x in xrange(1, 12)] 
PM_HOURS.insert(0, ("12:00 PM", "12:00 PM"))

class FeastForm(Form):
    email = TextField('Your email', validators=[Required()])
    invitees = TextAreaField('Invitees', validators=[Required()])
    feast_date = TextField('Feasting date', validators=[Required()])
    feast_time = SelectField('Feasting time', 
        choices=AM_HOURS + PM_HOURS, validators=[Required()])
    street = TextField('Street', validators=[Required()])
    city = TextField('City', validators=[Required()])
    zip = TextField('Zip', validators=[Required()])
    restaurant = FeastSelectField('Restaurant', coerce=int)
