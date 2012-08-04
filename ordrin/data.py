"""This module contains all of the data structures that the ordrin package uses
to pass around non-builtin groups of data"""

import inspect
from hashlib import sha256

from normalize import normalize

class OrdrinData(object):
  """Base class for objects that can save any data with the constructor and then
  extract it as a dictionary"""

  def __init__(self, **kwargs):
    for k in kwargs:
      setattr(self, k, kwargs[k])

  def make_dict(self):
    """Return a dictionary of particular fields to values, determined per subclass"""
    return {f:getattr(self, f) for f in self.fields}

class Address(OrdrinData):
  """Represents a street address."""

  fields = ('addr', 'city', 'state', 'zip', 'phone')

  def __init__(self, addr, city, state, zip, phone, addr2="", **kwargs):
    """Store the parts of the address as fields in this object. Any additional keyword arguments
    will be discarded.

    Arguments:
    addr -- Street address
    city -- City
    state -- State
    zip -- Zip code
    phone -- Phone number

    Keyword Arguments:
    addr2 -- Optional second street address line
    
    """
    state = normalize(state, 'state')
    zip = normalize(zip, 'zip')
    phone = normalize(phone, 'phone')
    frame = inspect.currentframe()
    args, _, _, values = inspect.getargvalues(frame)
    OrdrinData.__init__(self, **{k:values[k] for k in args if k!='self'})

class CreditCard(OrdrinData):
  """Represents information about a credit card"""

  fields = ('number', 'cvc', 'expiry_month', 'expiry_year', 'expiry',
            'bill_addr', 'bill_addr2', 'bill_city', 'bill_state', 'bill_zip', 'phone',
            'name')

  def __init__(self, name, expiry_month, expiry_year, bill_address, number, cvc, **kwargs):
    """Store the credit card info as fields in this object. Any additional keyword arguments
    will be discarded

    Arguments:
    name -- The name (first and last) on the credit card
    expiry_month -- The month that the card expires (two digits)
    expiry_year -- The year that the card expires (four digits)
    bill_address -- The billing address. Should be an ordrin.data.Address object
    number -- The credit card number
    cvc -- The card verification number

    """
    expiry_month = normalize(expiry_month, 'month')
    expiry_year = normalize(expiry_year, 'year')
    number, cvc, self.type = normalize((number, cvc), 'credit_card')
    frame = inspect.currentframe()
    args, _, _, values = inspect.getargvalues(frame)
    OrdrinData.__init__(self, **{k:values[k] for k in args if k!='self'})

  @property
  def bill_addr(self):
    return self.bill_address.addr

  @property
  def bill_addr2(self):
    return self.bill_address.addr2

  @property
  def bill_city(self):
    return self.bill_address.city

  @property
  def bill_state(self):
    return self.bill_address.state

  @property
  def bill_zip(self):
    return self.bill_address.zip

  @property
  def phone(self):
    return self.bill_address.phone

  @property
  def expiry(self):
    """A combination of the expiry_month and expiry_date"""
    return '{}/{}'.format(self.expiry_month, self.expiry_year)

class UserLogin(OrdrinData):
  """Represents a user's login information"""

  fields = ('email', 'password')

  def __init__(self, email, password):
    """Store the email and password in this object. Saves only the hash of the
    password, not the password itself

    Arguments:
    email -- The user's email address
    password -- The user's password (in plain text)

    """
    self.email = normalize(email, 'email')
    self.password = UserLogin.hash_password(password)

  @classmethod
  def hash_password(cls, password):
    return sha256(password).hexdigest()

class TrayItem(object):
  """Represents a single item in an order"""
  
  def __init__(self, item_id, quantity, *options):
    """Store the descriptors of an order item in this object.

    Arguments:
    item_id -- the restaurants's numerial ID for the item
    quantity -- the quantity
    options -- any number of options to apply to the item

    """
    self.item_id = normalize(item_id, 'number')
    self.quantity = normalize(quantity, 'number')
    self.options = [normalize(option, 'number') for option in options]

  def __str__(self):
    return '{}/{},{}'.format(self.item_id, self.quantity, ','.join(str(opt) for opt in self.options))

class Tray(object):
  """Represents a list of items in an order"""

  def __init__(self, *items):
    """Store the list of items in this object. Each argument should be of type
    Item

    Arguments:
    items -- A list of items to be ordered in this tray"""
    self.items = items

  def __str__(self):
    return '+'.join(str(i) for i in self.items)
