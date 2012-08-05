from flask.ext.wtf import Form, TextField, SelectField, TextAreaField, Required


class FeastForm(Form):
    email = TextField('Your email', validators=[Required()])
    invitees = TextAreaField('Invitees', validators=[Required()])
    feast_datetime = TextField('Feasting time', validators=[Required()])
    street = TextField('Street', validators=[Required()])
    city = TextField('City', validators=[Required()])
    zip = TextField('Zip', validators=[Required()])
    restaurant = SelectField('Restaurant', coerce=int,
            choices=((0,'Places nearby'),))
