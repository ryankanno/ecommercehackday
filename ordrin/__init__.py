"""This package is a python wrapper for the ordr.in API. The main developer
documentation for this API is located at http://ordr.in/developers"""
import restaurant, user, order

PRODUCTION = 0
TEST = 1
CUSTOM = 2

class APIs(object):

  def __init__(self, api_key, servers, restaurant_url=None, user_url=None, order_url=None):
    """Sets up this module to make API calls. The first argument is the developer's
    API key. The other three are the URLs corresponding to the three parts of the api.
    No API calls will work until this function is called. API objects will only be
    instantiated for URLs that are passed in.

    Arguments:
    api_key -- The developer's API key
    servers -- How the server URLs should be set. Must be PRODUCTION, TEST, or CUSTOM.

    Keyword Arguments:
    restaurant_url -- The base url for the restaurant API. Can only be set if servers==CUSTOM.
    user_url -- The base url for the user API. Can only be set if servers==CUSTOM.
    order_url -- The base url for the order API. Can only be set if servers==CUSTOM.

    """
    self.api_key = api_key
    if servers!=CUSTOM:
      if restaurant_url or user_url or order_url:
        raise ValueError("Individual URL parameters can only be set if servers is set to CUSTOM")
    if servers==PRODUCTION:
      retaurant_url = "https://r.ordr.in/"
      user_url = "https://u.ordr.in/"
      order_url = "https://o.ordr.in/"
    elif servers==TEST:
      restaurant_url = "https://r-test.ordr.in/"
      user_url = "https://u-test.ordr.in/"
      order_url = "https://o-test.ordr.in/"
    elif servers!=CUSTOM:
      raise ValueError("servers must be set to PRODUCTION, TEST, or CUSTOM")
    if restaurant_url:
      self.restaurant = restaurant.RestaurantApi(api_key, restaurant_url)
    if user_url:
      self.user = user.UserApi(api_key, user_url)
    if order_url:
      self.order = order.OrderApi(api_key, order_url)

  def config(self):
    return {"API key": self.api_key,
            "Restaurant URL": self.restaurant.base_url,
            "User URL": self.user.base_url,
            "Order URL": self.order.base_url}
