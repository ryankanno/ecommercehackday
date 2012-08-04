from ordrinapi import OrdrinApi
from normalize import normalize
from data import UserLogin

class OrderApi(OrdrinApi):
  """This class will be used to access the order API. All return values
  are documented at http://ordr.in/developers/order"""
  
  def _build_dict(self, restaurant_id, tray, tip, delivery_date_time, first_name, last_name, address, credit_card, email, login=None):
    """Put all of the data that needs to be passed to the POST request normalized into a dict."""
    data = {'restaurant_id':restaurant_id, 'tray':str(tray), 'tip':tip}
    data['delivery_date'] = normalize(delivery_date_time, 'date')
    if data['delivery_date'] != 'ASAP':
      data['delivery_time'] = normalize(delivery_date_time, 'time')
    data['first_name'] = normalize(first_name, 'name')
    data['last_name'] = normalize(last_name, 'name')
    try:
      data.update(address.make_dict())
    except AttributeError:
      data['nick'] = normalize(address, 'nick')
    if not login:
      data['em'] = normalize(email, 'email')
    try:
      data.update({"card_"+k:v for k,v in credit_card.make_dict().iteritems()})
    except AttributeError:
      data['card_nick'] = normalize(credit_card, 'nick')
    data['type'] = 'res'
    return data

  def order(self, restaurant_id, tray, tip, delivery_date_time, first_name, last_name, address, credit_card, email=None, login=None):
    """Place an order, either anonymously or as a logged in user. At least one
    of email and login must be passed. If both are passed, email will be ignored.

    Arguments:
    restaurant_id -- Ordr.in's restaurant identifier
    tray -- A tray of food to order. Should be an ordrin.data.Tray object
    tip -- The tip amount
    delivery_date_time -- Either 'ASAP' or a datetime object in the future
    first_name -- The orderer's first name
    last_name -- The orderer's last name
    address -- An address object (ordrin.data.Address) or the nickname of a saved address
    credit_card -- A credit card object (ordrin.data.CreditCard) or the nickname of a saved credit card

    Keyword Arguments:
    email -- The email address of an anonymous user
    login -- The logged in user's login information. Should be an ordrin.data.UserLogin object

    """
    data = self._build_dict(restaurant_id, tray, tip, delivery_date_time, first_name, last_name, address, credit_card, email, login)
    return self._call_api('POST', ('o', restaurant_id), login=login, data=data)

  def order_create_user(self, restaurant_id, tray, tip, delivery_date_time, first_name, last_name, address, credit_card, email, password):
    """Place an order and create a user account

    Arguments:
    restaurant_id -- Ordr.in's restaurant identifier
    tray -- A tray of food to order. Should be an ordrin.data.Tray object
    tip -- The tip amount
    delivery_date_time -- Either 'ASAP' or a datetime object in the future
    first_name -- The orderer's first name
    last_name -- The orderer's last name
    address -- An address object (ordrin.data.Address) or the nickname of a saved address
    credit_card -- A credit card object (ordrin.data.CreditCard) or the nickname of a saved credit card
    email -- The email address of the user
    password -- The user's password (in plain text)

    """
    data = self._build_dict(restaurant_id, tray, tip, delivery_date_time, first_name, last_name, address, credit_card, email)
    data['pw'] = UserLogin.hash_password(password)
    return self._call_api('POST', ('o', restaurant_id), data=data)
    
    
