import re

import errors

def _normalize_regex(regex, error):
  def normalize(value):
    value = str(value)
    if re.match(regex, value):
      return value
    else:
      raise error(value)
  return normalize

def _normalize_phone(phone_number):
  phone_number = str(phone_number)
  #strips out everything but digits from the phone number
  phone = ''.join(c for c in phone_number if c in '0123456789')
  if len(phone)==10:
    return '{}{}{}-{}{}{}-{}{}{}{}'.format(*phone)
  else:
    raise errors.phone(phone_number)

def _normalize_money(money):
  money = str(money)
  match = re.match(r'^\$?(\d+(\.\d+)?)$', money.replace(',', ''))
  if match:
    return match.group(1)
  else:
    raise errors.money(money)
  
def _normalize_asap_or_datetime(date_time):
  if str(date_time).upper()=='ASAP':
    return 'ASAP'
  else:
    try:
      return date_time.strftime('%m-%d+%H:%M')
    except AttributeError:
      raise errors.date_time(date_time)

def _normalize_asap_or_date(date):
  if str(date).upper()=='ASAP':
    return 'ASAP'
  else:
    try:
      return date.strftime('%m-%d')
    except AttributeError:
      raise errors.date(date)

def _normalize_time(time):
  try:
    return time.strftime('%H:%M')
  except AttributeError:
    raise errors.time(time)

def _normalize_url(url):
  url = str(url)
  match = re.match(r'(https?://)[-\w.~]+(:\d+)?(/[-\w.~]+)*', url)
  if match:
    return match.group(0)
  else:
    raise errors.url(url)

def _normalize_method(method):
  method = str(method)
  if re.match(r'^[a-zA-Z]+$', method):
    return method.upper()
  else:
    raise errors.method

def _normalize_state(state):
  state = str(state)
  if re.match(r'^[A-Za-z]{2}$', state):
    return state.upper()
  else:
    raise errors.state(state)

def _cc_type(cc_number):
  """
  Function determines type of CC by the given number. Taken from http://code.activestate.com/recipes/577815-determine-credit-card-type-by-number/
  
  WARNING:
  Creditcard numbers used in tests are NOT valid credit card numbers.
  You can't buy anything with these. They are random numbers that happen to
  conform to the MOD 10 algorithm!
  
  >>> # Unable to determine CC type
  >>> print _cc_type(1234567812345670)
  None
  
  >>> # Test 16-Digit Visa
  >>> print _cc_type(4716182333661786), _cc_type(4916979026116921), _cc_type(4532673384076298)
  Visa Visa Visa
  
  >>> # Test 13-Digit Visa
  >>> print _cc_type(4024007141696), _cc_type(4539490414748), _cc_type(4024007163179)
  Visa Visa Visa
  
  >>> # Test Mastercard
  >>> print _cc_type(5570735810881011), _cc_type(5354591576660665), _cc_type(5263178835431086)
  Mastercard Mastercard Mastercard
  
  >>> # Test American Express
  >>> print _cc_type(371576372960229), _cc_type(344986134771067), _cc_type(379061348437448)
  American Express American Express American Express
  
  >>> # Test Discover
  >>> print _cc_type(6011350169121566), _cc_type(6011006449605014), _cc_type(6011388903339458)
  Discover Discover Discover
  """
  AMEX_CC_RE = re.compile(r"^3[47]\d{13}$")
  VISA_CC_RE = re.compile(r"^4\d{12}(?:\d{3})?$")
  MASTERCARD_CC_RE = re.compile(r"^5[1-5]\d{14}$")
  DISCOVER_CC_RE = re.compile(r"^6(?:011|5\d{2})\d{12}$")
  
  CC_MAP = {"American Express": AMEX_CC_RE, "Visa": VISA_CC_RE,
            "Mastercard": MASTERCARD_CC_RE, "Discover": DISCOVER_CC_RE}    
  
  for type, regexp in CC_MAP.items():
    if regexp.match(str(cc_number)):
      return type    
  return None

def _luhn_checksum(card_number):
  """Taken from http://en.wikipedia.org/wiki/Luhn_algorithm"""
  def digits_of(n):
    return [int(d) for d in str(n)]
  digits = digits_of(card_number)
  odd_digits = digits[-1::-2]
  even_digits = digits[-2::-2]
  checksum = 0
  checksum += sum(odd_digits)
  for d in even_digits:
    checksum += sum(digits_of(d*2))
  return checksum % 10
 
def _is_luhn_valid(card_number):
  """Taken from http://en.wikipedia.org/wiki/Luhn_algorithm"""
  return _luhn_checksum(card_number) == 0

def _normalize_credit_card((number, cvc)):
  number = str(number)
  #strips out everything but digits from the number
  number = ''.join(c for c in number if c in '0123456789')
  if not _is_luhn_valid(number):
    raise errors.credit_card(number)
  card_type = _cc_type(number)
  if card_type:
    if card_type=="American Express":
      cvc_len = 4
    else:
      cvc_len = 3
    if re.match(r'^\d{%s}' % cvc_len, cvc):
      return (number, cvc, card_type)
    else:
      raise errors.cvc(cvc)
  else:
    raise errors.credit_card(number)

def _normalize_unchecked(value):
  return str(value)

_normalizers = {'state': _normalize_state,
                'zip': _normalize_regex(r'^\d{5}$', errors.zip_code),
                'phone': _normalize_phone,
                'number': _normalize_regex(r'^\d+$', errors.number),
                'money': _normalize_money,
                'year': _normalize_regex(r'^\d{4}$', errors.year),
                'month': _normalize_regex(r'^\d{2}$', errors.month),
                'email': _normalize_regex(r'^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,3}', errors.email),
                'nick': _normalize_regex(r'^[-\w]+$', errors.nick),
                'name': _normalize_unchecked,
                'datetime': _normalize_asap_or_datetime,
                'date': _normalize_asap_or_date,
                'time': _normalize_time,
                'url': _normalize_url,
                'method': _normalize_method,
                'alphanum': _normalize_regex(r'^[a-zA-Z\d]+$', errors.alphanum),
                'credit_card': _normalize_credit_card}

def normalize(value, normalizer_name):
  try:
    normalizer = _normalizers[normalizer_name]
  except KeyError:
    raise errors.normalizer(normalizer_name)
  return normalizer(value)
