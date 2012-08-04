from hashlib import sha256
import requests
import json
import re
import urllib

import errors
from normalize import normalize

class OrdrinApi(object):
  """A base object for calling one part of the ordr.in API"""

  def __init__(self, key, base_url):
    """Save the url and key parameters in the object

    Arguments:
    key -- The developer's API key
    base_url -- the url that all API call urls will expand from

    """
    self.base_url = normalize(base_url, 'url')
    #As far as I can tell, there is no good test for an invalid key
    self.key = key

  _methods = {'GET':requests.get, 'POST':requests.post, 'PUT':requests.put, 'DELETE':requests.delete}

  def _call_api(self, method, arguments, login=None, data=None):
    """Calls the api at the saved url and returns the return value as Python data structures.
    Rethrows any api error as a Python exception"""
    method = normalize(method, 'method')
    uri = '/'+('/'.join(urllib.quote_plus(str(arg)) for arg in arguments))
    full_url = self.base_url+uri
    headers = {}
    if self.key:
      headers['X-NAAMA-CLIENT-AUTHENTICATION'] = 'id="{}", version="1"'.format(self.key)
    if login:
      hash_code = sha256(''.join((login.password, login.email, uri))).hexdigest()
      headers['X-NAAMA-AUTHENTICATION'] = 'username="{}", response="{}", version="1"'.format(login.email, hash_code)
    try:
      r = self._methods[method](full_url, data=data, headers=headers)
    except KeyError:
      raise error.request_method(method)
    r.raise_for_status()
    try:
      result = json.loads(r.text)
    except ValueError:
      raise ApiInvalidResponseError(r.text)
    if '_error' in result and result['_error']:
      if 'text' in result:
        raise errors.ApiError((result['msg'], result['text']))
      else:
        raise errors.ApiError(result['msg'])
    return result
