from ordrinapi import OrdrinApi
from normalize import normalize
from data import UserLogin

class UserApi(OrdrinApi):
  """This class will be used to access the user API. All return values
  are documented at http://ordr.in/developers/user"""

  def get(self, login):
    """Gets account information for the user associated with login

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    
    """
    return self._call_api('GET', ('u', login.email), login=login)

  def create(self, login, first_name, last_name):
    """Creates account for the user associated with login. Throws a relevant exception
    on failure.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    first_name -- the user's first name
    last_name -- the user's last name
    
    """
    data = {'email':login.email,
            'first_name':normalize(first_name, 'name'),
            'last_name':normalize(last_name, 'name'),
            'pw':login.password}
    return self._call_api('POST', ('u', login.email), data=data)

  def update(self, login, first_name, last_name):
    """Updates account for the user associated with login. Throws a relevant exception
    on failure.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    first_name -- the user's first name
    last_name -- the user's last name
    
    """
    data = {'email':login.email,
            'first_name':normalize(first_name, 'name'),
            'last_name':normalize(last_name, 'name'),
            'pw':login.password}
    return self._call_api('POST', ('u', login.email), login=login, data=data)

  def get_all_addresses(self, login):
    """Get a list of all saved addresses for the user associated with login.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    
    """
    return self._call_api('GET', ('u', login.email, 'addrs'), login=login)

  def get_address(self, login, addr_nick):
    """Get a saved address belonging to the logged in user by nickname.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    addr_nick -- the nickname of the address to get
    
    """
    return self._call_api('GET', ('u', login.email, 'addrs', normalize(addr_nick, 'nick')), login=login)

  def set_address(self, login, addr_nick, address):
    """Save an address by nickname for the logged in user
    Throws a relevant exception on failure

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    addr_nick -- the nickname of the address to save
    address -- the address to save. Should be an ordrin.data.Address object
    
    """
    return self._call_api('PUT', ('u', login.email, 'addrs', normalize(addr_nick, 'nick')), login=login, data=address.make_dict())
      
  def remove_address(self, login, addr_nick):
    """Remove an address, saved by the logged in user, by nickname
    Throws a relevant exception on failure.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    addr_nick -- the nickname of the address to remove
    
    """
    return self._call_api('DELETE', ('u', login.email, 'addrs', normalize(addr_nick, 'nick')), login=login)

  def get_all_credit_cards(self, login):
    """Get a list of all saved credit cards for the user associated with login.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    
    """
    return self._call_api('GET', ('u', login.email, 'ccs'), login=login)

  def get_credit_card(self, login, card_nick):
    """Get a saved credit card belonging to the logged in user by nickname.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    card_nick -- the nickname of the credit card to get

    """
    return self._call_api('GET', ('u', login.email, 'ccs', normalize(card_nick, 'nick')), login=login)

  def set_credit_card(self, login, card_nick, credit_card):
    """Save an credit card by nickname for the logged in user
    Throws a relevant exception on failure

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    card_nick -- the nickname of the credit card to save
    credit_card -- the credit card to save. Should be an ordrin.data.CreditCard object
    
    """
    card_nick = normalize(card_nick, 'nick')
    data = credit_card.make_dict()
    data.update(login.make_dict())
    data['nick'] = card_nick
    data['phone'] = normalize(credit_card.phone, 'phone')
    return self._call_api('PUT', ('u', login.email, 'ccs', card_nick), login=login, data=data)

  def remove_credit_card(self, login, card_nick):
    """Remove an credit card, saved by the logged in user, by nickname
    Throws a relevant exception on failure.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    card_nick -- the nickname of the credit card to remove
    
    """
    return self._call_api('DELETE', ('u', login.email, 'ccs', normalize(card_nick, 'nick')), login=login)

  def get_order_history(self, login):
    """Get a list of previous orders by the logged in user.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object

    """
    return self._call_api('GET', ('u', login.email, 'orders'), login=login)

  def get_order_detail(self, login, order_id):
    """Get details of a particular previous order by the logged in user.

    Arguments:
    login -- the user's login information. Should be an ordrin.data.UserLogin object
    order_id -- The order ID

    """
    return self._call_api('GET', ('u', login.email, 'orders', normalize(order_id, 'alphanum')), login=login)

  def set_password(self, login, new_password):
    """Change the logged in user's password.

    Arguments:
    login -- the user's current login information. Should be an ordrin.data.UserLogin object
    new_password -- the new password (in plain text)
    """
    data = {'email': login.email,
            'password': UserLogin.hash_password(new_password),
            'previous_password': login.password}
    return self._call_api('PUT', ('u', login.email, 'password'), login=login, data=data)
