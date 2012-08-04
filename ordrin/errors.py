class OrdrinError(Exception):
  """This is the base class for errors specific to this ordrin package"""
  def __init__(self, msg=None):
    self.msg = msg

class ApiError(OrdrinError):
  """This error encapsulates an API error returned by the server."""
  def __init__(self, msg=None, text=None):
    OrdrinError.__init__(self, msg)
    self.text = text
    
  def __str__(self):
    return "ApiError(msg='{}', text='{}')".format(self.msg, self.text)

class ApiInvalidResponseError(OrdrinError):
  """This error indicates that the server returned a response that could not be
  parsed into JSON"""
  def __str__(self):
    return "ApiInvalidResponseError(msg='{}')".format(self.msg)

class BadValueError(OrdrinError, ValueError):
  """This error indicates that a bad value was passed into some API call"""
  def __init__(self, msg):
    OrdrinError.__init__(self, msg)
    ValueError.__init__(self, msg)

def state(value):
  return BadValueError("State must be a two letter postal code abbreviation: {}".format(value))

def money(value):
  return BadValueError("Money values must be dollars.cents: {}".format(value))

def zip_code(value):
  return BadValueError("Zip code must be exactly 5 digits: {}".format(value))

def phone(value):
  return BadValueError("Phone numbers must have exactly 10 digits: {}".format(value))

def number(value):
  return BadValueError("This value must be only digits: {}".format(value))

def month(value):
  return BadValueError("Months must be two digits: {}".format(value))

def year(value):
  return BadValueError("Years must be four digits: {}".format(value))

def cvc(value):
  return BadValueError("Credit card CVC must be 3 or 4 digits, depending on the card type: {}".format(value))

def credit_card(value):
  return BadValueError("Credit card number must be a valid AmEx, Discover, Mastercard, or Visa card number: {}".format(value))

def email(value):
  return BadValueError("Bad email format: {}".format(value))

def normalizer(value):
  return BadValueError("Unknown validator name: {}".format(value))

def nick(value):
  return BadValueError("Nick names can only have letters, nubmers, dashes, and underscores: {}".format(value))

def date_time(value):
  return BadValueError("date_time must be a datetime.datetime object or the string 'ASAP': {}".format(value))

def date(value):
  return BadValueError("date must be a datetime.datetime or datetime.date object or the string 'ASAP': {}".format(value))

def time(value):
  return BadValueError("time must be a datetime.datetime or datetime.time object: {}".format(value))

def url(value):
  return BadValueError("url must be a proper url: {}".format(value))

def method(value):
  return BadValueError("method must be a word: {}".format(value))

def alphanum(value):
  return BadValueError("This value must be alphanumeric: {}".format(value))

def request_method(value):
  return ApiError("Method not a valid HTTP request method: {}".format(value))
