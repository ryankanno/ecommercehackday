from ordrinapi import OrdrinApi
from normalize import normalize

class RestaurantApi(OrdrinApi):
  """This object's methods access the ordr.in restaurant API. All return values
  are documented at http://ordr.in/developers/restaurant"""

  def get_delivery_list(self, date_time, address):
    """Get a list of dicts representing restaurants that will deliver to the
    given address at the given time. 

    Arguments:
    date_time -- Either 'ASAP' or a datetime object in the future
    address -- the address to deliver to. Should be an ordrin.data.Address object

    """
    dt = normalize(date_time, 'datetime')
    return self._call_api('GET', ('dl', dt, address.zip, address.city, address.addr))

  def get_delivery_check(self, restaurant_id, date_time, address):
    """Get data about a given restaurant, including whether it will deliver to
    the specified address at the specified time

    Arguments:
    restaurant_id -- Ordr.in's restaurant identifier
    date_time -- Either 'ASAP' or a datetime object in the future
    address -- the address to deliver to. Should be an ordrin.data.Address object

    """
    dt = normalize(date_time, 'datetime')
    restaurant_id = normalize(restaurant_id, 'number')
    return self._call_api('GET', ('dc', restaurant_id, dt, address.zip, address.city, address.addr))

  def get_fee(self, restaurant_id, subtotal, tip, date_time, address):
    """Get data about a given restaurant, including whether it will deliver to
    the specified address at the specified time, and what the fee will be on an
    order with the given subtotal and tip

    Arguments:
    restaurant_id -- Ordr.in's restaurant identifier
    subtotal -- the subtotal of the order
    tip -- the tip on the order
    date_time -- Either 'ASAP' or a datetime object in the future
    address -- the address to deliver to. Should be an ordrin.data.Address object

    """
    dt = normalize(date_time, 'datetime')
    restaurant_id = normalize(restaurant_id, 'number')
    subtotal = normalize(subtotal, 'money')
    tip = normalize(tip, 'money')
    return self._call_api('GET', ('fee', restaurant_id, subtotal, tip, dt, address.zip, address.city, address.addr))

  def get_details(self, restaurant_id):
    """Get details of the given restaurant, including contact information and
    the menu

    Arguments:
    restaurant_id -- Ordr.in's restaurant identifier
    
    """
    restaurant_id = normalize(restaurant_id, 'number')
    return self._call_api('GET', ('rd', restaurant_id))
