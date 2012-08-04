from flask.ext.wtf import Form, TextField, TextAreaField, Required


class FeastForm(Form):
    email = TextField('Your email', validators=[Required()])
    invitees = TextAreaField('Invitees', validators=[Required()])
    feast_datetime = TextField('Feasting time', validators=[Required()])
